const express = require('express');
const prisma = require('../prisma');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const { fail, id, text, optionalText, participant, transition, person } = require('../lib/policy');
const router = express.Router();
const include = { category: true, client: { select: person }, technician: { select: person }, appointment: true, review: true };
router.use(auth);
router.post('/', roleGuard('CLIENTE'), async (req, res) => {
  const body = req.body || {};
  const categoryId = id(body.categoryId);
  if (!await prisma.serviceCategory.findUnique({ where: { id: categoryId } })) fail(400, 'Categoría no encontrada');
  const urgency = body.urgency || 'MEDIA';
  if (!['BAJA', 'MEDIA', 'ALTA'].includes(urgency)) fail(400, 'Urgencia inválida');
  res.status(201).json(await prisma.serviceRequest.create({ data: {
    clientId: req.user.id, categoryId, urgency,
    title: text(body.title, 'Título', 200), description: text(body.description, 'Descripción', 5000),
    address: text(body.address, 'Dirección', 500), neighborhood: optionalText(body.neighborhood, 'Barrio', 150),
  }, include }));
});
router.get('/mine', async (req, res) => {
  res.json(await prisma.serviceRequest.findMany({
    where: req.user.role === 'CLIENTE' ? { clientId: req.user.id } : { technicianId: req.user.id },
    include, orderBy: { createdAt: 'desc' },
  }));
});
router.get('/all', roleGuard('ADMIN'), async (req, res) => {
  res.json(await prisma.serviceRequest.findMany({ include, orderBy: { createdAt: 'desc' } }));
});
router.get('/available', roleGuard('TECNICO', 'EMPRESA'), async (req, res) => {
  const where = { status: 'SOLICITADO', technicianId: null };
  if (req.query.category) where.categoryId = id(req.query.category);
  if (req.query.neighborhood) where.neighborhood = { contains: text(req.query.neighborhood, 'Barrio', 150), mode: 'insensitive' };
  const requests = await prisma.serviceRequest.findMany({
    where, select: { id: true, title: true, description: true, neighborhood: true, urgency: true, createdAt: true, category: true },
    orderBy: { createdAt: 'asc' },
  });
  const rank = { ALTA: 3, MEDIA: 2, BAJA: 1 };
  requests.sort((a, b) => rank[b.urgency] - rank[a.urgency]);
  res.json(requests);
});
router.get('/:id', async (req, res) => {
  const request = await prisma.serviceRequest.findUnique({ where: { id: id(req.params.id) }, include });
  if (!request) fail(404, 'Solicitud no encontrada');
  if (!participant(req.user, request)) fail(403, 'No autorizado');
  res.json(request);
});
router.put('/:id/accept', roleGuard('TECNICO'), async (req, res) => {
  const requestId = id(req.params.id);
  const updated = await prisma.$transaction(async (tx) => {
    const profile = await tx.techProfile.findUnique({ where: { userId: req.user.id } });
    if (profile?.verificationStatus !== 'VERIFICADO') fail(403, 'Debes verificar tu perfil antes de aceptar trabajos');
    const changed = await tx.serviceRequest.updateMany({
      where: { id: requestId, status: 'SOLICITADO', technicianId: null },
      data: { technicianId: req.user.id, status: 'ASIGNADO' },
    });
    if (!changed.count) fail(409, 'La solicitud ya no está disponible');
    const request = await tx.serviceRequest.findUniqueOrThrow({ where: { id: requestId }, include });
    await tx.notification.create({ data: { userId: request.clientId, title: 'Técnico asignado', message: 'Tu solicitud "' + request.title + '" fue aceptada.', type: 'INFO' } });
    return request;
  });
  res.json(updated);
});
router.put('/:id/status', roleGuard('TECNICO', 'ADMIN'), async (req, res) => {
  const requestId = id(req.params.id);
  const next = req.body?.status;
  if (!['EN_PROGRESO', 'FINALIZADO'].includes(next)) fail(400, 'Estado inválido');
  const updated = await prisma.$transaction(async (tx) => {
    const request = await tx.serviceRequest.findUnique({ where: { id: requestId } });
    if (!request) fail(404, 'Solicitud no encontrada');
    if (req.user.role !== 'ADMIN' && request.technicianId !== req.user.id) fail(403, 'No autorizado');
    if (!request.technicianId || !transition(request.status, next)) fail(409, 'Transición de estado inválida');
    const changed = await tx.serviceRequest.updateMany({ where: { id: requestId, status: request.status, technicianId: request.technicianId }, data: { status: next } });
    if (!changed.count) fail(409, 'La solicitud cambió. Actualiza la página');
    if (next === 'FINALIZADO') await tx.techProfile.updateMany({ where: { userId: request.technicianId }, data: { totalJobs: { increment: 1 } } });
    await tx.notification.create({ data: { userId: request.clientId, title: 'Estado del servicio', message: request.title + ': ' + next, type: 'INFO' } });
    return tx.serviceRequest.findUniqueOrThrow({ where: { id: requestId }, include });
  });
  res.json(updated);
});
router.put('/:id/cancel', async (req, res) => {
  const requestId = id(req.params.id);
  const updated = await prisma.$transaction(async (tx) => {
    const request = await tx.serviceRequest.findUnique({ where: { id: requestId } });
    if (!request) fail(404, 'Solicitud no encontrada');
    if (req.user.role !== 'ADMIN' && request.clientId !== req.user.id) fail(403, 'Solo el cliente o administrador puede cancelar');
    if (!['SOLICITADO', 'ASIGNADO'].includes(request.status)) fail(409, 'Este servicio ya no puede cancelarse');
    const changed = await tx.serviceRequest.updateMany({ where: { id: requestId, status: request.status }, data: { status: 'CANCELADO' } });
    if (!changed.count) fail(409, 'La solicitud cambió. Actualiza la página');
    await tx.appointment.deleteMany({ where: { requestId } });
    if (request.technicianId) await tx.notification.create({ data: { userId: request.technicianId, title: 'Servicio cancelado', message: request.title, type: 'ALERTA' } });
    return tx.serviceRequest.findUniqueOrThrow({ where: { id: requestId }, include });
  });
  res.json(updated);
});
module.exports = router;
