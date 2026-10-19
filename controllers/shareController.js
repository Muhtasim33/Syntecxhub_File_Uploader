const Share = require('../models/Share');
const FileMeta = require('../models/FileMeta');
const Folder = require('../models/Folder');
const User = require('../models/User');
const { getGfsBucket } = require('../config/db');
const crypto = require('crypto');

const createShareLink = async (req, res, next) => {
  try {
    const { permission, expiresInDays, recipientEmail, itemType = 'file' } = req.body || {};
    if (!['file', 'folder'].includes(itemType)) {
      res.status(400);
      throw new Error('Shared item type must be file or folder');
    }
    if (permission && !['view', 'download'].includes(permission)) {
      res.status(400);
      throw new Error('Permission must be view or download');
    }

    let expiresAt = null;
    if (expiresInDays !== undefined && expiresInDays !== null && expiresInDays !== '') {
      const days = Number(expiresInDays);
      if (!Number.isInteger(days) || days < 1 || days > 365) {
        res.status(400);
        throw new Error('Share expiry must be between 1 and 365 days');
      }
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    let file = null;
    let folder = null;
    if (itemType === 'file') {
      file = await FileMeta.findOne({
        _id: req.params.fileId,
        ownerId: req.user._id,
        isTrashed: false
      });
      if (!file) {
        res.status(404);
        throw new Error('File not found or unauthorized');
      }
    } else {
      folder = await Folder.findOne({
        _id: req.params.fileId,
        ownerId: req.user._id,
        isTrashed: false
      });
      if (!folder) {
        res.status(404);
        throw new Error('Folder not found or unauthorized');
      }
    }

    let recipient = null;
    if (recipientEmail) {
      const normalizedEmail = String(recipientEmail).trim().toLowerCase();
      recipient = await User.findOne({ email: normalizedEmail }).select('_id email');
      if (!recipient) {
        res.status(404);
        throw new Error('No account exists for that email address');
      }
      if (recipient._id.equals(req.user._id)) {
        res.status(400);
        throw new Error('You cannot share an item with yourself');
      }
    }

    const share = await Share.create({
      fileId: file?._id || null,
      folderId: folder?._id || null,
      itemType,
      sharedBy: req.user._id,
      recipientId: recipient?._id || null,
      recipientEmail: recipient?.email || null,
      shareToken: crypto.randomBytes(20).toString('hex'),
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

const getSharedWithMe = async (req, res, next) => {
  try {
    const query = {
      recipientId: req.user._id,
      isSpam: req.query.spam === 'true',
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
    };
    const shares = await Share.find(query)
      .populate('sharedBy', 'name email')
      .populate('fileId', 'originalName mimeType size isTrashed')
      .populate('folderId', 'name isTrashed')
      .sort({ createdAt: -1 });
    const data = shares.filter(share => (
      share.itemType === 'file'
        ? share.fileId && !share.fileId.isTrashed
        : share.folderId && !share.folderId.isTrashed
    ));
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

const browseSharedFolder = async (req, res, next) => {
  try {
    const share = await Share.findOne({
      _id: req.params.id,
      recipientId: req.user._id,
      itemType: 'folder',
      isSpam: false
    });
    if (!share || (share.expiresAt && share.expiresAt <= new Date())) {
      res.status(404);
      throw new Error('Shared folder not found or unavailable');
    }

    const root = await Folder.findOne({
      _id: share.folderId,
      ownerId: share.sharedBy,
      isTrashed: false
    });
    if (!root) {
      res.status(404);
      throw new Error('Shared folder is no longer available');
    }

    const folderId = req.query.folderId || root._id;
    let current = await Folder.findOne({
      _id: folderId,
      ownerId: share.sharedBy,
      isTrashed: false
    });
    if (!current) {
      res.status(404);
      throw new Error('Folder not found');
    }

    let isWithinSharedFolder = false;
    while (current) {
      if (current._id.equals(root._id)) {
        isWithinSharedFolder = true;
        break;
      }
      current = current.parentFolderId
        ? await Folder.findOne({ _id: current.parentFolderId, ownerId: share.sharedBy })
        : null;
    }
    if (!isWithinSharedFolder) {
      res.status(403);
      throw new Error('Folder is outside the shared folder');
    }

    await Folder.updateOne({ _id: folderId }, { lastAccessedAt: new Date() });
    const [folders, files, currentFolder] = await Promise.all([
      Folder.find({ ownerId: share.sharedBy, parentFolderId: folderId, isTrashed: false }).sort({ name: 1 }),
      FileMeta.find({ ownerId: share.sharedBy, folderId, isTrashed: false }).sort({ originalName: 1 }),
      Folder.findById(folderId).select('name parentFolderId')
    ]);
    res.json({ success: true, data: { folders, files, currentFolder } });
  } catch (error) {
    next(error);
  }
};

const toggleShareSpam = async (req, res, next) => {
  try {
    const share = await Share.findOne({
      _id: req.params.id,
      recipientId: req.user._id
    });
    if (!share) {
      res.status(404);
      throw new Error('Shared item not found');
    }
    share.isSpam = !share.isSpam;
    await share.save();
    res.json({ success: true, data: { isSpam: share.isSpam } });
  } catch (error) {
    next(error);
  }
};

const openSharedFolderFile = async (req, res, next) => {
  try {
    const share = await Share.findOne({
      shareToken: req.params.token,
      itemType: 'folder',
      isSpam: false
    });
    if (!share || (share.expiresAt && share.expiresAt <= new Date())) {
      res.status(404);
      throw new Error('Shared folder link is unavailable');
    }

    const file = await FileMeta.findOne({
      _id: req.params.fileId,
      ownerId: share.sharedBy,
      isTrashed: false
    });
    if (!file) {
      res.status(404);
      throw new Error('File not found in shared folder');
    }

    let folder = file.folderId
      ? await Folder.findOne({ _id: file.folderId, ownerId: share.sharedBy })
      : null;
    let isWithinSharedFolder = false;
    while (folder) {
      if (folder._id.equals(share.folderId)) {
        isWithinSharedFolder = true;
        break;
      }
      folder = folder.parentFolderId
        ? await Folder.findOne({ _id: folder.parentFolderId, ownerId: share.sharedBy })
        : null;
    }
    if (!isWithinSharedFolder) {
      res.status(403);
      throw new Error('File is outside the shared folder');
    }

    await FileMeta.updateOne({ _id: file._id }, { lastAccessedAt: new Date() });
    res.set('Content-Type', file.mimeType);
    res.set('Content-Disposition', `inline; filename="${file.originalName}"`);
    getGfsBucket().openDownloadStream(file.gridfsId)
      .on('error', error => next(error))
      .pipe(res);
  } catch (error) {
    next(error);
  }
};

const accessSharedFile = async (req, res, next) => {
  try {
    const share = await Share.findOne({ shareToken: req.params.token, isSpam: false });
    if (!share || share.itemType !== 'file' || !share.fileId) {
      res.status(404);
      throw new Error('Invalid or expired share link');
    }
    if (share.expiresAt && new Date() > share.expiresAt) {
      res.status(410);
      throw new Error('This share link has expired');
    }

    const fileMeta = await FileMeta.findOne({
      _id: share.fileId,
      isTrashed: false
    });
    if (!fileMeta) {
      res.status(404);
      throw new Error('The shared file no longer exists');
    }

    await FileMeta.updateOne({ _id: fileMeta._id }, { lastAccessedAt: new Date() });
    res.set('Content-Type', fileMeta.mimeType);
    res.set('Content-Disposition', `inline; filename="${fileMeta.originalName}"`);
    getGfsBucket().openDownloadStream(fileMeta.gridfsId)
      .on('error', error => next(error))
      .pipe(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createShareLink,
  getSharedWithMe,
  browseSharedFolder,
  toggleShareSpam,
  openSharedFolderFile,
  accessSharedFile
};
