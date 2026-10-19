const express = require('express');
const router = express.Router();
const {
  createFolder,
  getFolders,
  trashFolder,
  restoreFolder,
  toggleFolderStar,
  touchFolder
} = require('../controllers/folderController');
const { protect } = require('../middleware/authMiddleware');

// Protect all folder routes
router.use(protect);

router.route('/')
  .post(createFolder)
  .get(getFolders);

router.route('/:id')
  .delete(trashFolder);

router.route('/:id/trash')
  .patch(trashFolder);

router.route('/:id/restore')
  .patch(restoreFolder);

router.route('/:id/star')
  .patch(toggleFolderStar);

router.route('/:id/activity')
  .patch(touchFolder);

module.exports = router;