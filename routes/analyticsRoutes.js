const express = require('express');
const router = express.Router();
const { getStorageAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

// Protect all analytics routes
router.use(protect);

router.get('/storage', getStorageAnalytics);

module.exports = router;