const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');

const profileDirectory = path.join(__dirname, '../../uploads/profiles');
try { fs.mkdirSync(profileDirectory, { recursive: true }); } catch {}

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']);

// Memory storage to eliminate EROFS crashes on serverless platforms (e.g., Vercel)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (request, file, callback) => {
    callback(null, imageTypes.has(file.mimetype));
  }
});

function handleProfileFile(file) {
  if (!file || !file.buffer) return null;

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
    // In serverless / read-only filesystem (e.g. Vercel), fall back to base64 Data URL safely
    const mime = file.mimetype || 'image/png';
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
        if (err) return next(err);
        if (req.file) {
          handleProfileFile(req.file);
        }
        next();
      });
    };
  }
};

module.exports = { profileUpload, handleProfileFile };
