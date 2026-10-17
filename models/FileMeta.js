const mongoose = require('mongoose');

const fileMetaSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: [true, 'Filename is required'],
      trim: true
    },
    originalName: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true
    },
    gridfsId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true // References the _id inside uploads.files GridFS bucket
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null // null means the file resides at the root level of "My Drive"
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    mimeType: {
      type: String,
      required: true // Used to classify file types (images, pdfs, audio, video)
    },
    size: {
      type: Number,
      required: true // Size in bytes
    },
    isStarred: {
      type: Boolean,
      default: false
    },
    isTrashed: {
      type: Boolean,
      default: false
    },
    trashedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes to speed up folder listing, search, and trash view queries
fileMetaSchema.index({ ownerId: 1, folderId: 1, isTrashed: 1 });
fileMetaSchema.index({ ownerId: 1, isStarred: 1 });
fileMetaSchema.index({ ownerId: 1, originalName: 'text' }); // Enables real-time text search

module.exports = mongoose.model('FileMeta', fileMetaSchema);