const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
const validPassword = password => Boolean(password) && password.length >= 8 && Buffer.byteLength(password) <= 72;
async function main() {
  const categories = [
    ['Electricidad', 'Reparaciones e instalaciones eléctricas', 'electrical_services'],
    ['Plomería', 'Reparación de tuberías, grifos y filtraciones', 'plumbing'],
    ['Aire Acondicionado', 'Mantenimiento y reparación de A/C', 'ac_unit'],
    ['Mantenimiento General', 'Reparaciones varias y pintura', 'handyman'],
  ];
  await prisma.$transaction(async tx => {
    for (const [name, description, icon] of categories) {
      if (!await tx.serviceCategory.findFirst({ where: { name } })) await tx.serviceCategory.create({ data: { name, description, icon } });
    }
  });
  // Existing accounts are never modified: this script runs on every production start.
  if (!await prisma.user.findUnique({ where: { email: 'admin@homefix.pro' } })) {
    const password = process.env.ADMIN_PASSWORD;
    if (!validPassword(password)) throw new Error('Configura ADMIN_PASSWORD con entre 8 y 72 bytes');
    await prisma.user.create({ data: { email: 'admin@homefix.pro', fullName: 'Administrador del Sistema', role: 'ADMIN', passwordHash: await bcrypt.hash(password, 12) } });
    console.log('Administrador creado.');
  }
  const owners = await prisma.user.findMany({ where: { role: 'EMPRESA', companyOwned: null } });
  for (const owner of owners) await prisma.company.create({ data: { ownerId: owner.id, name: owner.fullName, address: owner.address } });
  // Demo accounts exist only when DEMO_PASSWORD is configured.
  const demoPassword = process.env.DEMO_PASSWORD;
  if (!demoPassword) { console.log('DEMO_PASSWORD no configurada: no se crean cuentas demo.'); return; }
  if (!validPassword(demoPassword)) { console.warn('DEMO_PASSWORD debe tener entre 8 y 72 bytes: no se crean cuentas demo.'); return; }
  const demoPasswordHash = await bcrypt.hash(demoPassword, 12);
  for (const account of [
    { email: 'maria@ejemplo.com', fullName: 'María Pérez', role: 'CLIENTE' },
    { email: 'juan@tech.com', fullName: 'Juan Pérez', role: 'TECNICO' },
  ]) {
    if (await prisma.user.findUnique({ where: { email: account.email } })) continue;
    await prisma.user.create({ data: { ...account, passwordHash: demoPasswordHash, ...(account.role === 'TECNICO' ? { techProfile: { create: { specialty: 'PLOMERIA' } } } : {}) } });
    console.log('Cuenta demo creada: ' + account.email);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
