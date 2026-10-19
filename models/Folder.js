const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a folder name'],
      trim: true,
      maxlength: [255, 'Folder name cannot exceed 255 characters']
    },
    parentFolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null // null indicates the folder is located at the root of "My Drive"
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
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
    },
    lastAccessedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound index to optimize folder listing queries per user
folderSchema.index({ ownerId: 1, parentFolderId: 1, isTrashed: 1 });

module.exports = mongoose.model('Folder', folderSchema);