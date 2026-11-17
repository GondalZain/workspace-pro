const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');

const profileDirectory = path.join(__dirname, '../../uploads/profiles');
fs.mkdirSync(profileDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: profileDirectory,
  filename: (request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  }
});

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const profileUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (request, file, callback) => {
    callback(null, imageTypes.has(file.mimetype));
  }
});

module.exports = { profileUpload };
