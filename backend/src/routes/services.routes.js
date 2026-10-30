const express = require('express');
const prisma = require('../prisma');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const { id, text, optionalText, publicProfile, fail } = require('../lib/policy');
const router = express.Router();
router.get('/categories', async (req, res) => res.json(await prisma.serviceCategory.findMany({ orderBy: { id: 'asc' } })));
router.get('/technicians', auth, async (req, res) => {
  const where = { role: 'TECNICO', isActive: true, techProfile: { verificationStatus: 'VERIFICADO' } };
  if (req.query.category) where.techProfile.specialty = text(req.query.category, 'Categoría', 80).toUpperCase();
  if (req.query.location) where.address = { contains: text(req.query.location, 'Ubicación', 150), mode: 'insensitive' };
  res.json(await prisma.user.findMany({ where,
    select: { id: true, fullName: true, avatarUrl: true, address: true, techProfile: { select: publicProfile } }, orderBy: { fullName: 'asc' } }));
});
router.post('/categories', auth, roleGuard('ADMIN'), async (req, res) => {
  res.status(201).json(await prisma.serviceCategory.create({ data: { name: text(req.body?.name, 'Nombre', 150), icon: text(req.body?.icon, 'Icono', 80), description: optionalText(req.body?.description, 'Descripción') } }));
});
router.put('/categories/:id', auth, roleGuard('ADMIN'), async (req, res) => {
  const data = {};
  if (req.body?.name !== undefined) data.name = text(req.body.name, 'Nombre', 150);
  if (req.body?.icon !== undefined) data.icon = text(req.body.icon, 'Icono', 80);
  if (req.body?.description !== undefined) data.description = optionalText(req.body.description, 'Descripción') || null;
  if (!Object.keys(data).length) fail(400, 'No hay cambios');
  res.json(await prisma.serviceCategory.update({ where: { id: id(req.params.id) }, data }));
});
module.exports = router;
