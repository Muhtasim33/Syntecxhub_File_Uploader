const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT token helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d'
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (normalizedName.length < 2 || normalizedName.length > 50) {
      res.status(400);
      throw new Error('Name must be between 2 and 50 characters');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail) || normalizedEmail.length > 254) {
      res.status(400);
      throw new Error('Please provide a valid email address');
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      res.status(400);
      throw new Error('Password must be between 8 and 128 characters');
    }

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      res.status(409);
      throw new Error('User already exists with this email');
    }

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password
    });

    if (user) {
      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          storageUsed: user.storageUsed,
          storageLimit: user.storageLimit,
          token: generateToken(user._id)
        }
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.email) {
      res.status(409);
      error.message = 'User already exists with this email';
    }
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail) || normalizedEmail.length > 254) {
      res.status(400);
      throw new Error('Please provide a valid email address');
    }
    if (typeof password !== 'string' || password.length === 0) {
      res.status(400);
      throw new Error('Please provide a password');
    }

    // Explicitly select password since schema has select: false
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (user && (await user.matchPassword(password))) {
      res.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          storageUsed: user.storageUsed,
          storageLimit: user.storageLimit,
          token: generateToken(user._id)
        }
      });
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json({
        success: true,
        data: user
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile
};