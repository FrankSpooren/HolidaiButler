import jwt from 'jsonwebtoken';
import AdminUser from '../models/AdminUser.js';

// JWT Secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_ADMIN_SECRET = process.env.JWT_ADMIN_SECRET || 'your-admin-secret-key-change-in-production';

/**
 * Verify admin JWT token
 */
export const verifyAdminToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Authorization denied.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, JWT_ADMIN_SECRET);

    // Get user from token (without password)
    const user = await AdminUser.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token is invalid.'
      });
    }

    // Check if account is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}. Access denied.`
      });
    }

    // Check if account is locked
    if (AdminUser.isLocked(user)) {
      return res.status(423).json({
        success: false,
        message: 'Account is locked due to too many failed login attempts.'
      });
    }

    // Attach user to request
    req.adminUser = user;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired.'
      });
    }

    console.error('Admin auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

/**
 * Check if user has specific role
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.adminUser) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.adminUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions. Required role: ' + roles.join(' or ')
      });
    }

    next();
  };
};

/**
 * Check if user has specific permission
 */
export const requirePermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.adminUser) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!AdminUser.hasPermission(req.adminUser, resource, action)) {
      return res.status(403).json({
        success: false,
        message: `Permission denied. You don't have permission to ${action} ${resource}.`
      });
    }

    next();
  };
};

/**
 * Check if user can manage specific POI
 */
export const requirePOIAccess = async (req, res, next) => {
  try {
    if (!req.adminUser) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const poiId = req.params.id || req.params.poiId || req.body.poiId;

    if (!poiId) {
      return res.status(400).json({
        success: false,
        message: 'POI ID is required.'
      });
    }

    const canManage = await AdminUser.canManagePOI(req.adminUser.id, poiId, req.adminUser.role);

    if (!canManage) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to manage this POI.'
      });
    }

    next();

  } catch (error) {
    console.error('POI access check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking POI access.'
    });
  }
};

/**
 * Rate limiting for admin endpoints (more strict than public)
 */
export const adminRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const identifier = req.adminUser?.id || req.ip;
    const now = Date.now();

    if (!requests.has(identifier)) {
      requests.set(identifier, []);
    }

    const userRequests = requests.get(identifier);

    // Filter out old requests outside the window
    const recentRequests = userRequests.filter(time => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
      });
    }

    recentRequests.push(now);
    requests.set(identifier, recentRequests);

    next();
  };
};

/**
 * Log admin activity
 */
export const logActivity = (action, resource) => {
  return async (req, res, next) => {
    try {
      if (req.adminUser) {
        const resourceId = req.params.id || req.params.poiId || req.body.id || null;

        await AdminUser.logActivity(req.adminUser.id, action, resource, resourceId, req);
      }
      next();
    } catch (error) {
      // Log error but don't block the request
      console.error('Activity logging error:', error);
      next();
    }
  };
};

/**
 * Validate request data against allowed fields (prevent mass assignment)
 */
export const validateFields = (allowedFields) => {
  return (req, res, next) => {
    const providedFields = Object.keys(req.body);
    const invalidFields = providedFields.filter(field => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid fields in request.',
        invalidFields
      });
    }

    next();
  };
};

export default {
  verifyAdminToken,
  requireRole,
  requirePermission,
  requirePOIAccess,
  adminRateLimit,
  logActivity,
  validateFields
};
