const FileMeta = require('../models/FileMeta');
const User = require('../models/User');

// @desc    Get storage analytics for authenticated user
// @route   GET /api/analytics/storage
// @access  Private
const getStorageAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const stats = await FileMeta.aggregate([
      {
        $match: {
          ownerId: userId
        }
      },
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$size' },
          totalFiles: { $sum: 1 }
        }
      }
    ]);

    // Aggregate breakdown by MIME type
    const mimeBreakdown = await FileMeta.aggregate([
      {
        $match: {
          ownerId: userId
        }
      },
      {
        $group: {
          _id: '$mimeType',
          count: { $sum: 1 },
          size: { $sum: '$size' }
        }
      },
      {
        $sort: { size: -1 }
      }
    ]);

    const storageData = stats.length > 0 ? stats[0] : { totalSize: 0, totalFiles: 0 };
    const largestFiles = await FileMeta.find({
      ownerId: userId
    })
      .sort({ size: -1 })
      .limit(5)
      .select('originalName size mimeType isTrashed');
    const user = await User.findById(userId).select('storageLimit');

    res.json({
      success: true,
      data: {
        totalSize: storageData.totalSize,
        totalFiles: storageData.totalFiles,
        storageLimit: user.storageLimit,
        mimeBreakdown,
        largestFiles
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStorageAnalytics
};