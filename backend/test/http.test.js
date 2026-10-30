const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const request = require('supertest');

process.env.JWT_SECRET = 'secreto-solo-para-pruebas-automatizadas';

// Prisma simulado: estas pruebas nunca se conectan a una base de datos.
let currentUser = null;
let queryRaw = async () => [{ '?column?': 1 }];
const prismaPath = require.resolve('../src/prisma');
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: {
  $queryRawUnsafe: (...args) => queryRaw(...args),
  user: { findUnique: async () => currentUser },
} };
const app = require('../src/server');
const tokenFor = (user) => {
  currentUser = user;
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, { algorithm: 'HS256' });
};
const silenced = async (action) => {
  const original = console.error;
  console.error = () => {};
  try { return await action(); } finally { console.error = original; }
};

test('health responde 200 cuando la base responde', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'OK');
});
test('health responde 500 sin revelar el error de la base', async () => {
  queryRaw = async () => { throw new Error('detalle interno'); };
  const response = await silenced(() => request(app).get('/api/health'));
  queryRaw = async () => [{ '?column?': 1 }];
  assert.equal(response.status, 500);
  assert.equal(response.body.message, 'Error interno del servidor');
});
for (const [method, url] of [['get', '/api/auth/me'], ['get', '/api/users'], ['put', '/api/requests/1/accept'], ['get', '/api/companies/mine'], ['get', '/uploads/documento.pdf']]) {
  test(method.toUpperCase() + ' ' + url + ' sin token responde 401', async () => {
    assert.equal((await request(app)[method](url)).status, 401);
  });
}
test('token inválido responde 401', async () => {
  assert.equal((await request(app).get('/api/users').set('Authorization', 'Bearer invalido')).status, 401);
});
test('cuenta desactivada responde 401', async () => {
  const token = tokenFor({ id: 1, role: 'ADMIN', isActive: false });
  assert.equal((await request(app).get('/api/users').set('Authorization', 'Bearer ' + token)).status, 401);
});
for (const [role, method, url] of [['CLIENTE', 'get', '/api/users'], ['CLIENTE', 'put', '/api/requests/1/accept'], ['TECNICO', 'post', '/api/requests'], ['TECNICO', 'get', '/api/reports/overview'], ['CLIENTE', 'get', '/api/companies/mine']]) {
  test(role + ' en ' + method.toUpperCase() + ' ' + url + ' responde 403', async () => {
    const token = tokenFor({ id: 1, role, isActive: true });
    assert.equal((await request(app)[method](url).set('Authorization', 'Bearer ' + token)).status, 403);
  });
}
for (const [name, body] of [['sin correo', { password: 'clave-valida' }], ['correo inválido', { email: 'no-es-correo', password: 'clave-valida' }], ['sin contraseña', { email: 'a@b.co' }]]) {
  test('login ' + name + ' responde 400', async () => {
    assert.equal((await request(app).post('/api/auth/login').send(body)).status, 400);
  });
}
test('solo un técnico puede editar especialidad', async () => {
  const token = tokenFor({ id: 1, role: 'CLIENTE', isActive: true });
  const response = await request(app).put('/api/auth/me').set('Authorization', 'Bearer ' + token).send({ specialty: 'PLOMERIA' });
  assert.equal(response.status, 403);
});
test('ruta inexistente responde 404', async () => {
  assert.equal((await request(app).get('/api/no-existe')).status, 404);
});
