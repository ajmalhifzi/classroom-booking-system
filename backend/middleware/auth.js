const jwt = require('jsonwebtoken');
require('dotenv').config();

// This function runs BEFORE any protected route
// It checks if the user has a valid JWT token
const authenticateToken = (req, res, next) => {

  // Get the token from the request header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // If no token found, block the request
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  // Verify the token is valid and not expired
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }

    // Token is valid — attach user info to the request
    req.user = user;
    next(); // move on to the actual route
  });
};

// This checks if the user has the required role
// Usage: authorizeRole('admin') or authorizeRole('teacher')
const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. You do not have permission.' 
      });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRole };