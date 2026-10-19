const express = require('express');
const router = express.Router();
const {
  createShareLink,
  getSharedWithMe,
  browseSharedFolder,
  toggleShareSpam,
  openSharedFolderFile,
  accessSharedFile
} = require('../controllers/shareController');
const { protect } = require('../middleware/authMiddleware');

router.get('/shared-with-me', protect, getSharedWithMe);
router.patch('/:id/spam', protect, toggleShareSpam);
router.get('/:id/folder', protect, browseSharedFolder);
router.get('/folder/:token/files/:fileId', openSharedFolderFile);
router.post('/:fileId', protect, createShareLink);

// Public route to view/download shared file via token
router.get('/:token', accessSharedFile);

module.exports = router;