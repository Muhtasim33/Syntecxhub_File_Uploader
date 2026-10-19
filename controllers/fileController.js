const FileMeta = require('../models/FileMeta'); 
const Folder = require('../models/Folder');
const Share = require('../models/Share');
const { getGfsBucket } = require('../config/db');
const { Readable } = require('stream');

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/xml',
  'text/xml',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]);

const isSupportedFile = ({ mimetype, originalname }) => (
  allowedMimeTypes.has(mimetype) ||
  mimetype.startsWith('image/') ||
  mimetype.startsWith('video/') ||
  /\.(pdf|docx?|xml|pptx?)$/i.test(originalname)
);

// @desc    Upload a file
// @route   POST /api/files/upload
// @access  Private
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('Please upload a file');
    }

    const gfsBucket = getGfsBucket();
    const { originalname, mimetype, buffer, size } = req.file;
    const folderId = req.body.folderId || null;

    if (!isSupportedFile({ mimetype, originalname })) {
      res.status(400);
      throw new Error('Supported files are PDF, DOC, DOCX, XML, PPT, PPTX, images, and videos');
    }

    if (folderId) {
      const folder = await Folder.findOne({
        _id: folderId,
        ownerId: req.user._id,
        isTrashed: false
      });
      if (!folder) {
        res.status(404);
        throw new Error('Destination folder not found');
      }
    }

    const [{ totalSize = 0 } = {}] = await FileMeta.aggregate([
      { $match: { ownerId: req.user._id } },
      { $group: { _id: null, totalSize: { $sum: '$size' } } }
    ]);
    if (totalSize + size > req.user.storageLimit) {
      res.status(413);
      throw new Error('This upload exceeds your available storage space');
    }

    // Create a readable stream from the buffer
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);

    const filename = `${Date.now()}-${originalname}`;
    const uploadStream = gfsBucket.openUploadStream(filename, {
      contentType: mimetype,
      metadata: {
        ownerId: req.user._id,
        originalName: originalname
      }
    });

    readableStream.pipe(uploadStream);

    uploadStream.on('error', (err) => {
      return next(err);
    });

    uploadStream.on('finish', async () => {
      // Save metadata in MongoDB matching the schema fields
      const fileMeta = await FileMeta.create({
        originalName: originalname,
        filename: filename,
        size: size,
        mimeType: mimetype,
        gridfsId: uploadStream.id,
        ownerId: req.user._id,
        folderId: folderId || null
      });

      res.status(201).json({
        success: true,
        data: fileMeta
      });
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all files for user (optional filter by folder)
// @route   GET /api/files
// @access  Private
const getFiles = async (req, res, next) => {
  try {
    const { folderId, view, search } = req.query;
    const isTrashed = view === 'trash' || req.query.trashed === 'true';

    const query = {
      ownerId: req.user._id,
      isTrashed
    };
    if (view === 'starred') {
      query.isStarred = true;
    } else if (view === 'recent') {
      query.lastAccessedAt = { $ne: null };
    } else if (!isTrashed && view !== 'home' && view !== 'all') {
      query.folderId = folderId || null;
    }
    if (search) {
      const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.originalName = { $regex: escapedSearch, $options: 'i' };
    }

    const sort = view === 'recent'
      ? { lastAccessedAt: -1 }
      : view === 'home'
        ? { lastAccessedAt: -1, isStarred: -1, updatedAt: -1 }
        : { createdAt: -1 };
    const files = await FileMeta.find(query).sort(sort);

    res.json({
      success: true,
      count: files.length,
      data: files
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download file by ID
// @route   GET /api/files/download/:id
// @access  Private
const downloadFile = async (req, res, next) => {
  try {
    const fileMeta = await FileMeta.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
      isTrashed: false
    });

    if (!fileMeta) {
      res.status(404);
      throw new Error('File not found');
    }

    const gfsBucket = getGfsBucket();
    await FileMeta.updateOne({ _id: fileMeta._id }, { lastAccessedAt: new Date() });
    res.set('Content-Type', fileMeta.mimeType);
    res.set('Content-Disposition', `attachment; filename="${fileMeta.originalName}"`);

    const downloadStream = gfsBucket.openDownloadStream(fileMeta.gridfsId);
    downloadStream.on('error', () => {
      res.status(404);
      next(new Error('File stream not found in storage'));
    });

    downloadStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Move file to trash (soft delete)
// @route   DELETE /api/files/:id
// @access  Private
const deleteFile = async (req, res, next) => {
  try {
    const fileMeta = await FileMeta.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
      isTrashed: false
    });

    if (!fileMeta) {
      res.status(404);
      throw new Error('File not found');
    }

    fileMeta.isTrashed = true;
    fileMeta.trashedAt = new Date();
    await fileMeta.save();

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

const renameFile = async (req, res, next) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 255) {
      res.status(400);
      throw new Error('File name must be between 1 and 255 characters');
    }

    const file = await FileMeta.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id, isTrashed: false },
      { originalName: name },
      { new: true, runValidators: true }
    );
    if (!file) {
      res.status(404);
      throw new Error('File not found');
    }

    res.json({ success: true, data: file });
  } catch (error) {
    next(error);
  }
};

const updateFileActivity = async (req, res, next) => {
  try {
    const file = await FileMeta.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id, isTrashed: false },
      { lastAccessedAt: new Date() },
      { new: true }
    );
    if (!file) {
      res.status(404);
      throw new Error('File not found');
    }
    res.json({ success: true, data: file });
  } catch (error) {
    next(error);
  }
};

const toggleFileStar = async (req, res, next) => {
  try {
    const file = await FileMeta.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
      isTrashed: false
    });
    if (!file) {
      res.status(404);
      throw new Error('File not found');
    }
    file.isStarred = !file.isStarred;
    await file.save();
    res.json({ success: true, data: file });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore a file from trash
// @route   PATCH /api/files/:id/restore
// @access  Private
const restoreFile = async (req, res, next) => {
  try {
    const fileMeta = await FileMeta.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
      isTrashed: true
    });

    if (!fileMeta) {
      res.status(404);
      throw new Error('Trashed file not found');
    }
    if (fileMeta.folderId) {
      const parent = await Folder.findOne({ _id: fileMeta.folderId, ownerId: req.user._id });
      if (parent?.isTrashed) {
        res.status(400);
        throw new Error('Restore the containing folder before restoring this file');
      }
    }

    fileMeta.isTrashed = false;
    fileMeta.trashedAt = null;
    await fileMeta.save();

    res.json({
      success: true,
      data: fileMeta
    });
  } catch (error) {
    next(error);
  }
};

const permanentlyDeleteFile = async (req, res, next) => {
  try {
    const file = await FileMeta.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
      isTrashed: true
    });
    if (!file) {
      res.status(404);
      throw new Error('Trashed file not found');
    }
    await getGfsBucket().delete(file.gridfsId);
    await Promise.all([
      file.deleteOne(),
      Share.deleteMany({ fileId: file._id })
    ]);
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFile,
  getFiles,
  downloadFile,
  updateFileActivity,
  toggleFileStar,
  renameFile,
  deleteFile,
  restoreFile,
  permanentlyDeleteFile
};