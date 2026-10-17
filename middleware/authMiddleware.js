const passport = require('passport');

// Middleware to protect routes using JWT authentication
const protect = (req, res, next) => {
  // Debug log to verify incoming authorization header on server terminal
  console.log('[Auth Middleware] Incoming Authorization Header:', req.headers.authorization);

  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      console.log('[Auth Middleware] Authentication failed. Info:', info);
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