const express = require('express');
const router = express.Router();
const {
  uploadFile,
  getFiles,
  downloadFile,
  updateFileActivity,
  toggleFileStar,
  deleteFile,
  restoreFile,
  permanentlyDeleteFile,
  renameFile
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

router.route('/:id/activity')
  .patch(updateFileActivity);

router.route('/:id/star')
  .patch(toggleFileStar);

router.route('/:id/permanent')
  .delete(permanentlyDeleteFile);

router.route('/:id/restore')
  .patch(restoreFile);

router.route('/:id')
  .patch(renameFile)
  .delete(deleteFile);

module.exports = router;