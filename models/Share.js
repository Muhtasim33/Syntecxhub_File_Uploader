const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FileMeta',
      default: null,
      index: true
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null
    },
    itemType: {
      type: String,
      enum: ['file', 'folder'],
      default: 'file'
    },
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    recipientEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: null
    },
    isSpam: {
      type: Boolean,
      default: false
    },
    shareToken: {
      type: String,
      required: true,
      unique: true,
      index: true // Used for lookup via public URLs (e.g., /api/share/:token)
    },
    permission: {
      type: String,
      enum: ['view', 'download'],
      default: 'view'
    },
    expiresAt: {
      type: Date,
      default: null // null means the share link never expires
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Share', shareSchema);