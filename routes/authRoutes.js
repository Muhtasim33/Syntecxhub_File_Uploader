const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  loginUser, 
  getUserProfile 
} = require('../controllers/authController');

// Route for user signup
router.post('/register', registerUser);

// Route for user login
router.post('/login', loginUser);

// Optional: Route to get logged-in user profile (if authMiddleware is implemented)
// router.get('/me', getUserProfile);

module.exports = router;