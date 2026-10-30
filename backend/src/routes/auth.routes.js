const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const auth = require('../middleware/auth');
const { fail, text, optionalText, specialtyCode } = require('../lib/policy');
const router = express.Router();
const include = { techProfile: true, companyOwned: true };
const safe = ({ passwordHash, ...user }) => user;
const session = (user) => ({
  user: safe(user),
  token: jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d', algorithm: 'HS256' }),
});
const emailValue = (value) => {
  const email = text(value, 'Correo', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Correo inválido');
  return email;
};
router.post('/register', async (req, res) => {
  const body = req.body || {};
  const email = emailValue(body.email);
  const password = body.password;
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) fail(400, 'La contraseña debe tener entre 8 y 72 bytes');
  const fullName = text(body.fullName, 'Nombre', 150);
  const role = body.role || 'CLIENTE';
  if (!['CLIENTE', 'TECNICO', 'EMPRESA'].includes(role)) fail(400, 'Rol inválido');
  const phone = optionalText(body.phone, 'Teléfono', 40);
  const address = optionalText(body.address, 'Dirección', 500);
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, fullName, role, phone, address,
      ...(role === 'TECNICO' ? { techProfile: { create: {} } } : {}),
      ...(role === 'EMPRESA' ? { companyOwned: { create: { name: fullName, address } } } : {}),
    }, include,
  });
  res.status(201).json(session(user));
});
router.post('/login', async (req, res) => {
  const email = emailValue(req.body?.email);
  const password = req.body?.password;
  if (typeof password !== 'string' || !password || Buffer.byteLength(password) > 72) fail(400, 'Contraseña inválida');
  const user = await prisma.user.findUnique({ where: { email }, include });
  if (!user || !await bcrypt.compare(password, user.passwordHash)) fail(401, 'Credenciales incorrectas');
  if (!user.isActive) fail(403, 'Cuenta desactivada');
  res.json(session(user));
});
router.get('/me', auth, async (req, res) => {
  res.json(safe(await prisma.user.findUniqueOrThrow({ where: { id: req.user.id }, include })));
});
router.put('/me', auth, async (req, res) => {
  const body = req.body || {};
  const data = {};
  if (body.fullName !== undefined) data.fullName = text(body.fullName, 'Nombre', 150);
  for (const [key, max] of [['phone', 40], ['address', 500]]) {
    if (body[key] !== undefined) data[key] = optionalText(body[key], key, max) || null;
  }
  if (body.avatarUrl !== undefined) {
    if (body.avatarUrl && !/^https?:\/\//.test(body.avatarUrl)) fail(400, 'URL de avatar inválida');
    data.avatarUrl = optionalText(body.avatarUrl, 'Avatar', 1000) || null;
  }
  if (body.specialty !== undefined || body.bio !== undefined) {
    if (req.user.role !== 'TECNICO') fail(403, 'Solo un técnico puede editar su especialidad y biografía');
    const profile = {};
    if (body.specialty !== undefined) {
      profile.specialty = text(body.specialty, 'Especialidad', 80);
      const current = await prisma.techProfile.findUnique({ where: { userId: req.user.id }, select: { specialty: true } });
      if (profile.specialty !== current?.specialty) {
        const categories = await prisma.serviceCategory.findMany({ select: { name: true } });
        if (!categories.some(category => specialtyCode(category.name) === profile.specialty)) fail(400, 'Especialidad inválida');
      }
    }
    if (body.bio !== undefined) profile.bio = optionalText(body.bio, 'Biografía', 1000) || null;
    data.techProfile = { update: profile };
  }
  if (!Object.keys(data).length) fail(400, 'No hay cambios');
  const user = await prisma.user.update({ where: { id: req.user.id }, data, include });
  res.json(safe(user));
});
module.exports = router;
