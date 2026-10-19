const passport = require('passport');

// Middleware to protect routes using JWT authentication
const protect = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed or missing'
      });
    }
    req.user = user;
    next();
  })(req, res, next);
};

module.exports = { protect };