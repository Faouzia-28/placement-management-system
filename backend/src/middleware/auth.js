const jwt = require('jsonwebtoken');
const config = require('../config');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    // Do a case-insensitive role comparison to avoid issues with stored role casing
    const userRole = (req.user.role || '').toString().toUpperCase();
    const allowedUpper = allowedRoles.map(r => r.toString().toUpperCase());
    if (!allowedUpper.includes(userRole)) {
      console.warn('authorizeRoles: user role mismatch', { expected: allowedUpper, actual: req.user.role });
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = { authenticateToken, authorizeRoles };
