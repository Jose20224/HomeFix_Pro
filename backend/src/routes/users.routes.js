const express = require('express');
const bcrypt = require('bcrypt');
const prisma = require('../prisma');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const { id, fail, text, optionalText } = require('../lib/policy');
const router = express.Router();
const select = { id: true, email: true, fullName: true, phone: true, role: true, isActive: true, createdAt: true, address: true, techProfile: true };
router.use(auth, roleGuard('ADMIN'));
router.get('/', async (req, res) => {
  const where = {};
  if (req.query.role) {
    if (!['CLIENTE', 'TECNICO', 'EMPRESA', 'ADMIN'].includes(req.query.role)) fail(400, 'Rol inválido');
    where.role = req.query.role;
  }
  if (req.query.search) { const search = text(req.query.search, 'Búsqueda', 150); where.OR = [{ fullName: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }]; }
  res.json(await prisma.user.findMany({ where, select, orderBy: { createdAt: 'desc' } }));
});
router.get('/companies/pending', async (req, res) => {
  res.json(await prisma.company.findMany({ where: { verificationStatus: 'PENDIENTE' }, include: { owner: { select: { id: true, fullName: true, email: true } } } }));
});
router.put('/companies/:id/verification', async (req, res) => {
  const companyId = id(req.params.id);
  const status = req.body?.status;
  if (!['VERIFICADO', 'RECHAZADO'].includes(status)) fail(400, 'Estado inválido');
  res.json(await prisma.$transaction(async tx => {
    const company = await tx.company.findUnique({ where: { id: companyId } });
    if (!company) fail(404, 'Empresa no encontrada');
    if (company.verificationStatus !== 'PENDIENTE') fail(409, 'La empresa ya fue revisada');
    if (status === 'VERIFICADO' && !company.ruc) fail(409, 'La empresa debe proporcionar su RUC');
    const changed = await tx.company.updateMany({ where: { id: companyId, verificationStatus: 'PENDIENTE' }, data: { verificationStatus: status } });
    if (!changed.count) fail(409, 'La empresa ya fue revisada');
    await tx.notification.create({ data: { userId: company.ownerId, title: 'Verificación de empresa', message: 'Tu empresa fue ' + status.toLowerCase() } });
    return tx.company.findUniqueOrThrow({ where: { id: companyId } });
  }));
});
router.post('/', async (req, res) => {
  const body = req.body || {};
  const email = text(body.email, 'Correo', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Correo inválido');
  const password = body.password;
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) fail(400, 'Contraseña inválida: mínimo 8 caracteres, máximo 72 bytes');
  const role = body.role || 'CLIENTE';
  if (!['CLIENTE', 'TECNICO', 'EMPRESA', 'ADMIN'].includes(role)) fail(400, 'Rol inválido');
  const fullName = text(body.fullName, 'Nombre', 150);
  res.status(201).json(await prisma.user.create({ data: {
    email, fullName, role, passwordHash: await bcrypt.hash(password, 12),
    phone: optionalText(body.phone, 'Teléfono', 40),
    ...(role === 'TECNICO' ? { techProfile: { create: {} } } : {}),
    ...(role === 'EMPRESA' ? { companyOwned: { create: { name: fullName } } } : {}),
  }, select }));
});
router.get('/:id', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: id(req.params.id) }, select });
  if (!user) fail(404, 'Usuario no encontrado');
  res.json(user);
});
router.put('/:id', async (req, res) => {
  const data = {};
  if (req.body?.fullName !== undefined) data.fullName = text(req.body.fullName, 'Nombre', 150);
  if (req.body?.phone !== undefined) data.phone = optionalText(req.body.phone, 'Teléfono', 40) || null;
  if (req.body?.address !== undefined) data.address = optionalText(req.body.address, 'Dirección', 500) || null;
  if (req.body?.password) {
    const password = req.body.password;
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) fail(400, 'La contraseña debe tener al menos 8 caracteres y máximo 72 bytes');
    data.passwordHash = await bcrypt.hash(password, 12);
  }
  if (!Object.keys(data).length) fail(400, 'No hay cambios');
  res.json(await prisma.user.update({ where: { id: id(req.params.id) }, data, select }));
});
router.put('/:id/toggle', async (req, res) => {
  const userId = id(req.params.id);
  if (userId === req.user.id) fail(409, 'No puedes desactivar tu propia cuenta');
  res.json(await prisma.$transaction(async tx => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) fail(404, 'Usuario no encontrado');
    if (user.role === 'ADMIN' && user.isActive && await tx.user.count({ where: { role: 'ADMIN', isActive: true } }) <= 1) fail(409, 'Debe existir un administrador activo');
    return tx.user.update({ where: { id: userId }, data: { isActive: !user.isActive }, select });
  }));
});
module.exports = router;
