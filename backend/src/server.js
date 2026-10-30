const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const prisma = require('./prisma');
const auth = require('./middleware/auth');
const { fail } = require('./lib/policy');
const { client: supabase, bucket } = require('./supabase');
const app = express();
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(value => value.trim()) }));
app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000, message: { message: 'Demasiadas peticiones; intenta más tarde' } }));
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, message: { message: 'Demasiados intentos de inicio de sesión' } }));
app.use('/api/auth/register', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, message: { message: 'Demasiados registros' } }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(require('./swagger')));
app.get('/uploads/:filename', auth, async (req, res, next) => {
  const filename = req.params.filename;
  if (filename !== path.basename(filename) || !/^[\w.-]+$/.test(filename)) fail(400, 'Archivo inválido');
  const url = '/uploads/' + filename;
  const profile = await prisma.techProfile.findFirst({ where: { OR: [{ cedulaDocUrl: url }, { policeRecordUrl: url }] }, select: { userId: true } });
  if (!profile) fail(404, 'Documento no encontrado');
  if (req.user.role !== 'ADMIN' && profile.userId !== req.user.id) fail(403, 'No autorizado');
  res.set('Cache-Control', 'private, no-store');
  res.set('Content-Disposition', 'attachment; filename="' + filename + '"');
  if (supabase) {
    const { data, error } = await supabase.storage.from(bucket).download(filename);
    if (error || !data) fail(404, 'Documento no encontrado');
    const buffer = Buffer.from(await data.arrayBuffer());
    return res.type(filename.endsWith('.pdf') ? 'application/pdf' : filename.endsWith('.png') ? 'image/png' : 'image/jpeg').send(buffer);
  }
  res.sendFile(filename, { root: process.env.UPLOAD_DIR || path.join(__dirname, '../uploads') }, error => { if (error) next(error); });
});
for (const name of ['auth', 'services', 'requests', 'reviews', 'notifications', 'users', 'verification', 'schedule', 'reports', 'companies']) app.use('/api/' + name, require('./routes/' + name + '.routes'));
app.get('/api/health', async (req, res) => {
  await prisma.$queryRawUnsafe('SELECT 1');
  res.json({ status: 'OK', message: 'HomeFix Pro API funcionando', timestamp: new Date().toISOString() });
});
app.use((req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let message = error.message;
  if (error.code === 'P2002') { status = 409; message = 'El registro ya existe'; }
  if (error.code === 'P2025') { status = 404; message = 'Registro no encontrado'; }
  if (error.code === 'P2003') { status = 400; message = 'Referencia inválida'; }
  if (error.code === 'P2034' || error.code === 'P2028') { status = 409; message = 'La operación coincidió con otro cambio. Intenta de nuevo'; }
  if (error.name === 'MulterError') { status = 400; message = error.code === 'LIMIT_FILE_SIZE' ? 'Cada documento debe pesar menos de 5 MB' : 'Carga de documentos inválida'; }
  if (status >= 500) { console.error(error); message = 'Error interno del servidor'; }
  res.status(status).json({ message });
});
if (require.main === module) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('Configura JWT_SECRET con al menos 32 caracteres en backend/.env');
  prisma.$connect().then(() => app.listen(process.env.PORT || 3001, () => console.log('HomeFix Pro API lista'))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = app;
