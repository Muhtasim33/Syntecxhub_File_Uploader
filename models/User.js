const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false // Do not return password by default in queries
    },
    storageUsed: {
      type: Number,
      default: 0 // Storage used in bytes
    },
    storageLimit: {
      type: Number,
      default: 15 * 1024 * 1024 * 1024 // Default 15 GB storage limit in bytes
    },
    profilePicture: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Method to format storage used into MB/GB string
userSchema.methods.getFormattedStorage = function () {
  const mbUsed = (this.storageUsed / (1024 * 1024)).toFixed(2);
  const gbLimit = (this.storageLimit / (1024 * 1024 * 1024)).toFixed(2);
  return `${mbUsed} MB of ${gbLimit} GB used`;
};

module.exports = mongoose.model('User', userSchema);