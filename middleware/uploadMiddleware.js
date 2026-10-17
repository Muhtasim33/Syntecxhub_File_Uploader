const multer = require('multer');

// Use memory storage so the file is kept in buffer before streaming to GridFS
const storage = multer.memoryStorage();

// File filter (optional: can be customized to restrict specific file types)
const fileFilter = (req, file, cb) => {
  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // Limit file size to 50MB
  },
  fileFilter: fileFilter
});

module.exports = upload;