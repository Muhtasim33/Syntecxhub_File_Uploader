const FileMeta = require('../models/FileMeta');
const { getGfsBucket } = require('../config/db');
const { Readable } = require('stream');

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
    const { folderId } = req.body;

    // Create a readable stream from the buffer
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);

    const filename = `${Date.now()}-${originalname}`;
    const uploadStream = gfsBucket.openUploadStream(filename, {
      contentType: mimetype,
      metadata: {
        userId: req.user._id,
        originalName: originalname
      }
    });

    readableStream.pipe(uploadStream);

    uploadStream.on('error', (err) => {
      return next(err);
    });

    uploadStream.on('finish', async () => {
      // Save metadata in MongoDB
      const fileMeta = await FileMeta.create({
        filename: originalname,
        fileSize: size,
        mimeType: mimetype,
        gridFsFileId: uploadStream.id,
        user: req.user._id,
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
    const { folderId } = req.query;
    const query = {
      user: req.user._id,
      isDeleted: false,
      folderId: folderId ? folderId : null
    };

    const files = await FileMeta.find(query).sort({ createdAt: -1 });

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
      user: req.user._id
    });

    if (!fileMeta) {
      res.status(404);
      throw new Error('File not found');
    }

    const gfsBucket = getGfsBucket();
    res.set('Content-Type', fileMeta.mimeType);
    res.set('Content-Disposition', `attachment; filename="${fileMeta.filename}"`);

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

// @desc    Move file to trash (soft delete)
// @route   DELETE /api/files/:id
// @access  Private
const deleteFile = async (req, res, next) => {
  try {
    const fileMeta = await FileMeta.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!fileMeta) {
      res.status(404);
      throw new Error('File not found');
    }

    fileMeta.isDeleted = true;
    fileMeta.deletedAt = new Date();
    await fileMeta.save();

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFile,
  getFiles,
  downloadFile,
  deleteFile
};