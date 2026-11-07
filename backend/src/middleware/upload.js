const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { fail } = require('../lib/policy');
const { client: supabase } = require('../supabase');
const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
const extensions = { 'image/jpeg': '.jpg', 'image/png': '.png', 'application/pdf': '.pdf' };
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => { fs.mkdir(uploadsDir, { recursive: true }, error => cb(error, uploadsDir)); },
  filename: (req, file, cb) => cb(null, req.user.id + '-' + file.fieldname + '-' + crypto.randomUUID() + extensions[file.mimetype]),
});
const upload = multer({
  storage: supabase ? multer.memoryStorage() : diskStorage, limits: { fileSize: 5 * 1024 * 1024, files: 2 },
  fileFilter: (req, file, cb) => {
    if (extensions[file.mimetype]) cb(null, true);
    else { const error = new Error('Solo se permiten JPG, PNG o PDF'); error.status = 400; cb(error); }
  },
});
upload.validateFiles = async (files) => {
  if (process.env.DEMO_VERIFICATION === 'true') return;
  for (const file of files) {
    const header = Buffer.alloc(8);
    if (file.buffer) file.buffer.copy(header, 0, 0, 8);
    else {
      const handle = await fs.promises.open(file.path, 'r');
      try { await handle.read(header, 0, 8, 0); } finally { await handle.close(); }
    }
    const valid = file.mimetype === 'application/pdf' ? header.subarray(0, 5).toString() === '%PDF-' :
      file.mimetype === 'image/png' ? header.equals(Buffer.from([137,80,78,71,13,10,26,10])) :
      header[0] === 255 && header[1] === 216 && header[2] === 255;
    if (!valid) fail(400, 'El contenido del documento no corresponde con su tipo');
  }
};
upload.cleanup = async files => Promise.all(files.filter(file => file.path).map(file => fs.promises.unlink(file.path).catch(() => {})));
module.exports = upload;
