const Share = require('../models/Share');
const FileMeta = require('../models/FileMeta');
const { getGfsBucket } = require('../config/db');
const crypto = require('crypto');

// @desc    Create a share link for a file
// @route   POST /api/share/:fileId
// @access  Private
const createShareLink = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const { permission, expiresInDays } = req.body;

    const file = await FileMeta.findOne({
      _id: fileId,
      user: req.user._id,
      isDeleted: false
    });

    if (!file) {
      res.status(404);
      throw new Error('File not found or unauthorized');
    }

    const shareToken = crypto.randomBytes(20).toString('hex');
    
    let expiresAt = null;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(expiresInDays));
    }

    const share = await Share.create({
      fileId,
      sharedBy: req.user._id,
      shareToken,
      permission: permission || 'view',
      expiresAt
    });

    res.status(201).json({
      success: true,
      data: {
        shareToken: share.shareToken,
        shareUrl: `/api/share/${share.shareToken}`,
        permission: share.permission,
        expiresAt: share.expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Access and download/view shared file via token
// @route   GET /api/share/:token
// @access  Public
const accessSharedFile = async (req, res, next) => {
  try {
    const { token } = req.params;

    const share = await Share.findOne({ shareToken: token }).populate('fileId');

    if (!share) {
      res.status(404);
      throw new Error('Invalid or expired share link');
    }

    if (share.expiresAt && new Date() > share.expiresAt) {
      res.status(410);
      throw new Error('This share link has expired');
    }

    const fileMeta = share.fileId;
    if (!fileMeta || fileMeta.isDeleted) {
      res.status(404);
      throw new Error('The shared file no longer exists');
    }

    const gfsBucket = getGfsBucket();
    res.set('Content-Type', fileMeta.mimeType);
    res.set('Content-Disposition', `inline; filename="${fileMeta.filename}"`);

    const downloadStream = gfsBucket.openDownloadStream(fileMeta.gridFsFileId);
    downloadStream.on('error', () => {
      res.status(404);
      next(new Error('File stream not found in storage'));
    });

    downloadStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createShareLink,
  accessSharedFile
};