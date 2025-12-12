const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No authentication token provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    req.user = {
      id: decoded.userId || decoded.id,
      email: decoded.email,
      role: decoded.role || 'user',
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }
  next();
};

module.exports = { authenticate, requireAdmin };
