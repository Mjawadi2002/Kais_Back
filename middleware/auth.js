const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(500).json({ message: 'Server error during authentication' });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

const requireAdmin = authorizeRoles('admin');
const requireAdminOrDelivery = authorizeRoles('admin', 'delivery');
const requireAdminOrClient = authorizeRoles('admin', 'client');

// Keep authMiddleware as an alias for backward compatibility
const authMiddleware = authenticateToken;
const requireRole = (roles) => authorizeRoles(...roles);

module.exports = {
  authenticateToken,
  authorizeRoles,
  authMiddleware,
  requireRole,
  requireAdmin,
  requireAdminOrDelivery,
  requireAdminOrClient
};
