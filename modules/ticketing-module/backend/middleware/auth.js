const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Authentication Middleware
 * Verifies JWT tokens from HolidaiButler main platform
 */
const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No authentication token provided',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Attach user info to request
    req.user = {
      id: decoded.userId || decoded.id,
      email: decoded.email,
      role: decoded.role || 'user',
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

/**
 * Optional Authentication Middleware
 * Allows both authenticated and unauthenticated requests
 */
const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = {
        id: decoded.userId || decoded.id,
        email: decoded.email,
        role: decoded.role || 'user',
      };
    }

    next();
  } catch (error) {
    // Silently continue without user info
    next();
  }
};

/**
 * Admin Authorization Middleware
 * Requires user to have admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }

  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  requireAdmin,
};
