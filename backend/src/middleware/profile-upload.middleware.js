const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');

const profileDirectory = path.join(__dirname, '../../uploads/profiles');
if (!process.env.VERCEL) {
  try { fs.mkdirSync(profileDirectory, { recursive: true }); } catch {}
}

const imageTypes = new Set([
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/jfif',
  'image/png',
  'image/x-png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/bmp',
  'image/avif',
  'image/heic',
  'image/heif'
]);

// Memory storage to eliminate EROFS crashes on serverless platforms (e.g., Vercel)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (request, file, callback) => {
    const mime = (file.mimetype || '').toLowerCase();
    const isImage = imageTypes.has(mime) || mime.startsWith('image/');
    callback(null, isImage);
  }
});

function handleProfileFile(file) {
  if (!file || !file.buffer) return null;

  // In serverless / read-only filesystem (e.g. Vercel), persist as a compact base64 Data URL
  if (process.env.VERCEL) {
    const mime = file.mimetype || 'image/jpeg';
    const base64Data = file.buffer.toString('base64');
    const dataUrl = `data:${mime};base64,${base64Data}`;
    file.filename = null;
    file.profileImagePath = dataUrl;
    return dataUrl;
  }

  const extension = (path.extname(file.originalname) || '.png').toLowerCase();
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
  const filePath = path.join(profileDirectory, filename);

  try {
    fs.mkdirSync(profileDirectory, { recursive: true });
    fs.writeFileSync(filePath, file.buffer);
    file.filename = filename;
    file.profileImagePath = `/uploads/profiles/${filename}`;
    return file.profileImagePath;
  } catch (fsErr) {
    // If local write fails, gracefully fall back to base64 Data URL
    const mime = file.mimetype || 'image/jpeg';
    const base64Data = file.buffer.toString('base64');
    const dataUrl = `data:${mime};base64,${base64Data}`;
    file.filename = null;
    file.profileImagePath = dataUrl;
    return dataUrl;
  }
}

const profileUpload = {
  single: (fieldName) => {
    const multerSingle = upload.single(fieldName);
    return (req, res, next) => {
      multerSingle(req, res, (err) => {
        if (err) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Profile image must be smaller than 10MB.' });
          }
          return res.status(400).json({ error: err.message || 'Failed to process uploaded image.' });
        }
        if (req.file) {
          handleProfileFile(req.file);
        }
        next();
      });
    };
  }
};

module.exports = { profileUpload, handleProfileFile };
