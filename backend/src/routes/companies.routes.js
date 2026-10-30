const express = require('express');
const prisma = require('../prisma');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const { id, fail, text, optionalText, person, transition } = require('../lib/policy');
const router = express.Router();
router.use(auth, roleGuard('EMPRESA'));
const mine = async (tx, userId) => {
  const company = await tx.company.findUnique({ where: { ownerId: userId } });
  if (!company) fail(404, 'Empresa no encontrada');
  return company;
};
router.get('/mine', async (req, res) => res.json(await mine(prisma, req.user.id)));
router.put('/mine', async (req, res) => {
  const company = await mine(prisma, req.user.id);
  const data = {};
  if (req.body?.name !== undefined) data.name = text(req.body.name, 'Nombre', 150);
  if (req.body?.address !== undefined) data.address = text(req.body.address, 'Dirección', 500);
  if (req.body?.ruc !== undefined) {
    data.ruc = text(req.body.ruc, 'RUC', 40);
    if (data.ruc !== company.ruc) data.verificationStatus = 'PENDIENTE';
  }
  if (!Object.keys(data).length) fail(400, 'No hay cambios');
  res.json(await prisma.company.update({ where: { id: company.id }, data }));
});
router.get('/mine/employees', async (req, res) => {
  const company = await mine(prisma, req.user.id);
  res.json(await prisma.companyEmployee.findMany({ where: { companyId: company.id }, include: { user: { select: { ...person, email: true, isActive: true } } } }));
});
router.post('/mine/employees', async (req, res) => {
  const email = text(req.body?.email, 'Correo', 254).toLowerCase();
  const role = optionalText(req.body?.role, 'Cargo', 150);
  const employee = await prisma.$transaction(async (tx) => {
    const company = await mine(tx, req.user.id);
    const technician = await tx.user.findUnique({ where: { email }, include: { companyEmployment: true } });
    if (!technician || technician.role !== 'TECNICO' || !technician.isActive || technician.companyEmployment) fail(400, 'No se pudo agregar al técnico. Verifica el correo e inténtalo de nuevo');
    return tx.companyEmployee.create({ data: { companyId: company.id, userId: technician.id, role }, include: { user: { select: person } } });
  });
  res.status(201).json(employee);
});
router.delete('/mine/employees/:id', async (req, res) => {
  const employeeId = id(req.params.id);
  await prisma.$transaction(async (tx) => {
    const company = await mine(tx, req.user.id);
    const employee = await tx.companyEmployee.findFirst({ where: { id: employeeId, companyId: company.id } });
    if (!employee) fail(404, 'Empleado no encontrado');
    const active = await tx.serviceRequest.count({ where: { companyId: company.id, technicianId: employee.userId, status: { in: ['ASIGNADO', 'EN_PROGRESO'] } } });
    if (active) fail(409, 'El técnico tiene servicios activos');
    await tx.companyEmployee.delete({ where: { id: employeeId } });
  });
  res.json({ message: 'Empleado retirado' });
});
router.get('/mine/jobs', async (req, res) => {
  const company = await mine(prisma, req.user.id);
  res.json(await prisma.serviceRequest.findMany({
    where: { companyId: company.id },
    include: { category: true, client: { select: person }, technician: { select: person }, appointment: true },
    orderBy: { createdAt: 'desc' },
  }));
});
router.post('/mine/assign', async (req, res) => {
  const requestId = id(req.body?.requestId);
  const technicianId = id(req.body?.technicianId);
  res.json(await prisma.$transaction(async (tx) => {
    const company = await mine(tx, req.user.id);
    if (company.verificationStatus !== 'VERIFICADO') fail(403, 'La empresa debe estar verificada');
    const employee = await tx.companyEmployee.findFirst({ where: { companyId: company.id, userId: technicianId }, include: { user: { include: { techProfile: true } } } });
    if (!employee || !employee.user.isActive || employee.user.techProfile?.verificationStatus !== 'VERIFICADO') fail(403, 'El empleado debe ser un técnico activo y verificado');
    const changed = await tx.serviceRequest.updateMany({ where: { id: requestId, status: 'SOLICITADO', technicianId: null }, data: { companyId: company.id, technicianId, status: 'ASIGNADO' } });
    if (!changed.count) fail(409, 'La solicitud ya no está disponible');
    const request = await tx.serviceRequest.findUniqueOrThrow({ where: { id: requestId } });
    await tx.notification.createMany({ data: [
      { userId: request.clientId, title: 'Técnico asignado', message: company.name + ' asignó un técnico a tu servicio' },
      { userId: technicianId, title: 'Nuevo trabajo asignado', message: request.title },
    ] });
    return request;
  }));
});
router.put('/mine/jobs/:id/status', async (req, res) => {
  const requestId = id(req.params.id);
  const status = req.body?.status;
  if (!['EN_PROGRESO', 'FINALIZADO'].includes(status)) fail(400, 'Estado inválido');
  res.json(await prisma.$transaction(async (tx) => {
    const company = await mine(tx, req.user.id);
    const request = await tx.serviceRequest.findFirst({ where: { id: requestId, companyId: company.id } });
    if (!request) fail(404, 'Trabajo no encontrado');
    if (!transition(request.status, status)) fail(409, 'Transición de estado inválida');
    const changed = await tx.serviceRequest.updateMany({ where: { id: requestId, technicianId: request.technicianId, status: request.status }, data: { status } });
    if (!changed.count) fail(409, 'El servicio cambió');
    if (status === 'FINALIZADO') await tx.techProfile.update({ where: { userId: request.technicianId }, data: { totalJobs: { increment: 1 } } });
    await tx.notification.create({ data: { userId: request.clientId, title: 'Estado del servicio', message: request.title + ': ' + status } });
    return tx.serviceRequest.findUniqueOrThrow({ where: { id: requestId } });
  }));
});
module.exports = router;
