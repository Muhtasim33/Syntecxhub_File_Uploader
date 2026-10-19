const FileMeta = require('../models/FileMeta');
const Folder = require('../models/Folder');
const Share = require('../models/Share');
const { getGfsBucket } = require('../config/db');

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const cleanupExpiredItems = async () => {
  const cutoff = new Date(Date.now() - RETENTION_MS);
  const files = await FileMeta.find({
    isTrashed: true,
    trashedAt: { $lte: cutoff }
  }).select('_id gridfsId');
  const fileIds = files.map(file => file._id);

  for (const file of files) {
    try {
      await getGfsBucket().delete(file.gridfsId);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
  if (fileIds.length) {
    await Promise.all([
      FileMeta.deleteMany({ _id: { $in: fileIds } }),
      Share.deleteMany({ fileId: { $in: fileIds } })
    ]);
  }

  const folders = await Folder.find({
    isTrashed: true,
    trashedAt: { $lte: cutoff }
  }).select('_id');
  const folderIds = folders.map(folder => folder._id);
  if (folderIds.length) {
    await Promise.all([
      Folder.deleteMany({ _id: { $in: folderIds } }),
      Share.deleteMany({ folderId: { $in: folderIds } })
    ]);
  }

  await Share.deleteMany({
    $or: [
      { isSpam: true, updatedAt: { $lte: cutoff } },
      { expiresAt: { $lte: new Date() } }
    ]
  });
};

const startTrashCleanup = () => {
  const runCleanup = () => {
    cleanupExpiredItems().catch(error => {
      console.error('Failed to clean up expired trash and spam items:', error);
    });
  };
  runCleanup();
  const timer = setInterval(runCleanup, 24 * 60 * 60 * 1000);
  timer.unref();
};

module.exports = { startTrashCleanup };
