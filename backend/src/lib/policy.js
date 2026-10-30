const fail = (status, message) => { const error = new Error(message); error.status = status; throw error; };
const id = (value) => {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) fail(400, 'Identificador inválido');
  return number;
};
const text = (value, name, max = 2000) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(400, name + ' inválido');
  return value.trim();
};
const optionalText = (value, name, max = 2000) => value == null || value === '' ? undefined : text(value, name, max);
const participant = (user, request) => user.role === 'ADMIN' || request.clientId === user.id || request.technicianId === user.id;
const transition = (current, next) => (current === 'ASIGNADO' && next === 'EN_PROGRESO') || (current === 'EN_PROGRESO' && next === 'FINALIZADO');
const specialtyCode = (name) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replaceAll(' ', '_').toUpperCase();
const publicProfile = { specialty: true, bio: true, verificationStatus: true, avgRating: true, totalJobs: true };
const person = { id: true, fullName: true, phone: true, avatarUrl: true, techProfile: { select: publicProfile } };
module.exports = { fail, id, text, optionalText, participant, transition, specialtyCode, publicProfile, person };
