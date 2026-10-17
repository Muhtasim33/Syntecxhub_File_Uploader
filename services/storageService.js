const FileMeta = require('../models/FileMeta');

// Check if the user has enough storage quota left for an incoming file
const checkStorageQuota = async (userId, incomingFileSize) => {
  const MAX_STORAGE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB storage limit

  const stats = await FileMeta.aggregate([
    {
      $match: {
        user: userId,
        isDeleted: false
      }
    },
    {
      $group: {
        _id: null,
        totalSize: { $sum: '$fileSize' }
      }
    }
  ]);

  const currentUsage = stats.length > 0 ? stats[0].totalSize : 0;
  const projectedUsage = currentUsage + incomingFileSize;

  return {
    hasSpace: projectedUsage <= MAX_STORAGE_BYTES,
    currentUsage,
    remainingSpace: Math.max(0, MAX_STORAGE_BYTES - currentUsage)
  };
};

module.exports = {
  checkStorageQuota
};