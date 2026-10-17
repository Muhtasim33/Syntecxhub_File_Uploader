const express = require('express');
const router = express.Router();
const {
  createShareLink,
  accessSharedFile
} = require('../controllers/shareController');
const { protect } = require('../middleware/authMiddleware');

// Public route to view/download shared file via token
router.get('/:token', accessSharedFile);

// Protected route to create a share link for a file
router.post('/:fileId', protect, createShareLink);

module.exports = router;