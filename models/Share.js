const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FileMeta',
      required: true,
      index: true
    },
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
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