const mongoose = require('mongoose');
const { getGfsBucket } = require('../config/db');
const { Readable } = require('stream');

// Helper to upload a file buffer to MongoDB GridFS
const uploadToGridFS = (fileBuffer, filename, contentType, metadata) => {
  return new Promise((resolve, reject) => {
    const gfsBucket = getGfsBucket();
    const readableStream = new Readable();
    readableStream.push(fileBuffer);
    readableStream.push(null);

    const uploadStream = gfsBucket.openUploadStream(filename, {
      contentType,
      metadata
    });

    readableStream.pipe(uploadStream);

    uploadStream.on('error', (err) => reject(err));
    uploadStream.on('finish', () => resolve(uploadStream.id));
  });
};

// Helper to delete a file from GridFS by its file ID
const deleteFromGridFS = async (fileId) => {
  const gfsBucket = getGfsBucket();
  const _id = new mongoose.Types.ObjectId(fileId);
  await gfsBucket.delete(_id);
};

module.exports = {
  uploadToGridFS,
  deleteFromGridFS
};