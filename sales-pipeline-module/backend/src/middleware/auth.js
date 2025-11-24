/**
 * Authentication Middleware
 * JWT verification and role-based access control
 */

import jwt from 'jsonwebtoken';
import { User, Session } from '../models/index.js';
import { cacheService, cacheKeys } from '../config/redis.js';
import logger from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

/**
 * Authenticate user via JWT token
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    // Check cache first
    let user = await cacheService.get(cacheKeys.user(decoded.userId));

    if (!user) {
      // Fetch from database
      const dbUser = await User.findByPk(decoded.userId);

      if (!dbUser) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      if (dbUser.status !== 'active') {
        return res.status(401).json({
          success: false,
          error: 'Account is not active',
          code: 'ACCOUNT_INACTIVE'
        });
      }

      user = dbUser.toPublicJSON();
      await cacheService.set(cacheKeys.user(decoded.userId), user, 3600);
    }

    // Check if password was changed after token was issued
    if (user.passwordChangedAt) {
      const changedTimestamp = new Date(user.passwordChangedAt).getTime() / 1000;
      if (decoded.iat < changedTimestamp) {
        return res.status(401).json({
          success: false,
          error: 'Password changed. Please log in again.',
          code: 'PASSWORD_CHANGED'
        });
      }
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      let user = await cacheService.get(cacheKeys.user(decoded.userId));

      if (!user) {
        const dbUser = await User.findByPk(decoded.userId);
        if (dbUser && dbUser.status === 'active') {
          user = dbUser.toPublicJSON();
          await cacheService.set(cacheKeys.user(decoded.userId), user, 3600);
        }
      }

      if (user) {
        req.user = user;
        req.userId = user.id;
      }
    } catch (error) {
      // Token invalid, but that's ok for optional auth
      logger.debug('Optional auth - invalid token');
    }

    next();
  } catch (error) {
    logger.error('Optional auth error:', error);
    next();
  }
};

/**
 * Require specific roles
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.security('Unauthorized role access attempt', {
        userId: req.user.id,
        requiredRoles: roles,
        userRole: req.user.role,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

/**
 * Require specific permissions
 */
export const requirePermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Super admin and admin have all permissions
    if (['super_admin', 'admin'].includes(req.user.role)) {
      return next();
    }

    const permissions = req.user.permissions || {};
    const hasPermission = permissions[resource]?.[action] === true;

    if (!hasPermission) {
      logger.security('Unauthorized permission access attempt', {
        userId: req.user.id,
        resource,
        action,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

/**
 * Check resource ownership or admin role
 */
export const requireOwnerOrAdmin = (getOwnerId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Admin can access everything
    if (['super_admin', 'admin', 'sales_manager'].includes(req.user.role)) {
      return next();
    }

    try {
      const ownerId = typeof getOwnerId === 'function'
        ? await getOwnerId(req)
        : req.params[getOwnerId];

      if (ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'FORBIDDEN'
        });
      }

      next();
    } catch (error) {
      logger.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization check failed'
      });
    }
  };
};

/**
 * Rate limiting per user
 */
export const userRateLimit = (limit = 100, windowMs = 60000) => {
  return async (req, res, next) => {
    if (!req.user) return next();

    const key = cacheKeys.rateLimit(req.user.id, req.path);
    const current = await cacheService.incr(key);

    if (current === 1) {
      // Set expiry on first request
      const redis = (await import('../config/redis.js')).redis;
      await redis.pexpire(key, windowMs);
    }

    if (current > limit) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - current));

    next();
  };
};

export default {
  authenticate,
  optionalAuth,
  requireRole,
  requirePermission,
  requireOwnerOrAdmin,
  userRateLimit
};
