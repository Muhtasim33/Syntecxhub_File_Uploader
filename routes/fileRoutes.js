const express = require('express');
const router = express.Router();
const {
  uploadFile,
  getFiles,
  downloadFile,
  deleteFile
} = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Protect all file routes
router.use(protect);

router.route('/upload')
  .post(upload.single('file'), uploadFile);

router.route('/')
  .get(getFiles);

router.route('/download/:id')
  .get(downloadFile);

router.route('/:id')
  .delete(deleteFile);

module.exports = router;