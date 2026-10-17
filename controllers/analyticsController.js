const FileMeta = require('../models/FileMeta');

// @desc    Get storage analytics for authenticated user
// @route   GET /api/analytics/storage
// @access  Private
const getStorageAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Aggregate total size and file count for non-deleted files
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
          totalSize: { $sum: '$fileSize' },
          totalFiles: { $sum: 1 }
        }
      }
    ]);

    // Aggregate breakdown by MIME type
    const mimeBreakdown = await FileMeta.aggregate([
      {
        $match: {
          user: userId,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$mimeType',
          count: { $sum: 1 },
          size: { $sum: '$fileSize' }
        }
      },
      {
        $sort: { size: -1 }
      }
    ]);

    const storageData = stats.length > 0 ? stats[0] : { totalSize: 0, totalFiles: 0 };

    res.json({
      success: true,
      data: {
        totalSize: storageData.totalSize,
        totalFiles: storageData.totalFiles,
        mimeBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStorageAnalytics
};