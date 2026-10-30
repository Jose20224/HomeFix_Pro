const express = require('express');
const prisma = require('../prisma');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const { id, fail, optionalText } = require('../lib/policy');
const router = express.Router();
router.post('/', auth, roleGuard('CLIENTE'), async (req, res) => {
  const requestId = id(req.body?.requestId);
  const rating = req.body?.rating;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) fail(400, 'La calificación debe ser un entero entre 1 y 5');
  const comment = optionalText(req.body?.comment, 'Comentario');
  const review = await prisma.$transaction(async (tx) => {
    const request = await tx.serviceRequest.findUnique({ where: { id: requestId } });
    if (!request) fail(404, 'Solicitud no encontrada');
    if (request.clientId !== req.user.id) fail(403, 'No autorizado');
    if (request.status !== 'FINALIZADO' || !request.technicianId) fail(409, 'Solo puedes calificar servicios finalizados');
    const created = await tx.review.create({ data: { requestId, clientId: req.user.id, technicianId: request.technicianId, rating, comment } });
    const result = await tx.review.aggregate({ where: { technicianId: request.technicianId }, _avg: { rating: true } });
    await tx.techProfile.updateMany({ where: { userId: request.technicianId }, data: { avgRating: Number(result._avg.rating.toFixed(2)) } });
    return created;
  });
  res.status(201).json(review);
});
router.get('/technician/:id', async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { technicianId: id(req.params.id) },
    select: { id: true, rating: true, comment: true, createdAt: true,
      client: { select: { fullName: true } },
      request: { select: { category: { select: { name: true, icon: true } } } },
    }, orderBy: { createdAt: 'desc' },
  });
  res.json(reviews.map(({ client, ...review }) => ({ ...review, clientName: client.fullName.trim().split(/\s+/)[0] })));
});
module.exports = router;
