const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const passport = require('passport');
const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

// Connect to MongoDB & GridFS
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Initialize Passport middleware
app.use(passport.initialize());

// Register the JWT strategy from your config file
require('./config/passport')(passport);

// Serve static frontend files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Mount API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/folders', require('./routes/folderRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));
app.use('/api/share', require('./routes/shareRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

// Optional: API status check endpoint
app.get('/api/status', (req, res) => {
  res.send('Cloud Storage API is running...');
});

// Error Handling Middleware (Must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});