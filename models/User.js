const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [254, 'Email address cannot exceed 254 characters'],
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters long'],
      maxlength: [128, 'Password cannot exceed 128 characters'],
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

// Hash password before saving to database (Signup-er jonno khuboi dorkari)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare entered password with hashed password (Login-er jonno dorkari)
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to format storage used into MB/GB string
userSchema.methods.getFormattedStorage = function () {
  const mbUsed = (this.storageUsed / (1024 * 1024)).toFixed(2);
  const gbLimit = (this.storageLimit / (1024 * 1024 * 1024)).toFixed(2);
  return `${mbUsed} MB of ${gbLimit} GB used`;
};

module.exports = mongoose.model('User', userSchema);