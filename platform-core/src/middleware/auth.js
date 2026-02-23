/**
 * Authentication Middleware
 * =========================
 * JWT-based authentication for gateway requests
 * Merged from ORIGINAL backend with enhanced RBAC support
 *
 * Features:
 * - JWT verification with security fallback
 * - Optional authentication
 * - Role-based access control (RBAC)
 * - Granular permission system
 * - Rate limiting for auth endpoints
 * - Activity logging
 * - Field validation (mass assignment protection)
 *
 * @updated 30-11-2025 - Merged ORIGINAL auth features
 */

import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';
import { mysqlSequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';

// ============================================================================
// JWT SECRET MANAGEMENT
// ============================================================================

/**
 * Get JWT secret (lazy evaluation to allow dotenv to load first)
 * SECURITY FIX: Changed from process.env.getJwtSecret() to process.env.JWT_SECRET
 * Bug fixed: 30-11-2025
 */
const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('JWT_SECRET not set - using development fallback (DO NOT USE IN PRODUCTION)');
      return 'development-secret-change-in-production';
    }
    logger.error('FATAL: JWT_SECRET environment variable is not set');
    throw new Error('JWT_SECRET must be set in environment variables for production');
  }
  return process.env.JWT_SECRET;
};

/**
 * Get Admin JWT secret (separate secret for admin tokens)
 */
const getAdminJwtSecret = () => {
  if (!process.env.JWT_ADMIN_SECRET) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('JWT_ADMIN_SECRET not set - using JWT_SECRET as fallback');
      return getJwtSecret();
    }
    return getJwtSecret(); // Fall back to regular secret
  }
  return process.env.JWT_ADMIN_SECRET;
};

// ============================================================================
// CORE AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Verify JWT token
 * Attaches decoded user info to req.user
 */
export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'No authentication token provided'
        }
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, getJwtSecret());

      // Normalize user object structure
      req.user = {
        id: decoded.userId || decoded.id,
        uuid: decoded.uuid,
        email: decoded.email,
        role: decoded.role || 'user',
        ...decoded
      };

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Your session has expired. Please log in again.'
          }
        });
      }

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Authentication token is invalid'
          }
        });
      }

      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'Authentication failed'
        }
      });
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'An error occurred during authentication'
      }
    });
  }
}

// Alias for backwards compatibility
export const verifyToken = authenticate;

/**
 * Optional authentication (doesn't fail if no token)
 * Attaches user info if valid token present, otherwise continues
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, getJwtSecret());
      req.user = {
        id: decoded.userId || decoded.id,
        uuid: decoded.uuid,
        email: decoded.email,
        role: decoded.role || 'user',
        ...decoded
      };
    } catch (error) {
      // Token invalid, but continue anyway
      logger.debug('Invalid token in optional auth');
    }
  }

  next();
}

// ============================================================================
// ADMIN AUTHENTICATION
// ============================================================================

/**
 * Verify Admin JWT token with account status checks
 * Use this for admin-specific endpoints
 */
export async function verifyAdminToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'No admin token provided. Authorization denied.'
        }
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, getAdminJwtSecret());

    // Attach admin user to request
    req.adminUser = {
      id: decoded.userId || decoded.id,
      email: decoded.email,
      role: decoded.role || 'admin',
      ...decoded
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid admin token.'
        }
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Admin token has expired.'
        }
      });
    }

    logger.error('Admin auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Server error during admin authentication.'
      }
    });
  }
}

/**
 * Require Admin Privileges
 * Must be used AFTER authenticate middleware
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'NOT_AUTHENTICATED',
        message: 'Authentication required'
      }
    });
  }

  if (req.user.role !== 'admin' && !req.user.isAdmin) {
    logger.warn(`Admin access denied for user: ${req.user.email}`);
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin privileges required'
      }
    });
  }

  next();
}

// ============================================================================
// ROLE-BASED ACCESS CONTROL (RBAC)
// ============================================================================

/**
 * Check if user has a specific permission
 * Checks both role-based and user-specific permissions in database
 *
 * @param {number} userId - User ID
 * @param {string} permissionName - Permission name (e.g., 'poi.create', 'user.update')
 * @returns {Promise<boolean>} - True if user has permission
 */
export async function checkUserPermission(userId, permissionName) {
  try {
    // Check role-based permissions
    const [roleResult] = await mysqlSequelize.query(`
      SELECT COUNT(*) as has_permission
      FROM Users u
      JOIN Roles r ON u.role_id = r.id
      JOIN Role_Permissions rp ON r.id = rp.role_id
      JOIN Permissions p ON rp.permission_id = p.id
      WHERE u.id = :userId AND p.name = :permissionName AND rp.granted = TRUE
    `, {
      replacements: { userId, permissionName },
      type: QueryTypes.SELECT
    });

    if (roleResult && roleResult.has_permission > 0) {
      return true;
    }

    // Check user-specific permission overrides
    const userResults = await mysqlSequelize.query(`
      SELECT granted
      FROM User_Permissions up
      JOIN Permissions p ON up.permission_id = p.id
      WHERE up.user_id = :userId
        AND p.name = :permissionName
        AND (up.expires_at IS NULL OR up.expires_at > NOW())
    `, {
      replacements: { userId, permissionName },
      type: QueryTypes.SELECT
    });

    if (userResults.length > 0) {
      return userResults[0].granted === 1;
    }

    return false;
  } catch (error) {
    logger.error('Permission check error:', error);
    return false;
  }
}

/**
 * Check Multiple Permissions (ANY logic)
 * User needs at least ONE of the specified permissions
 */
export async function checkAnyPermission(userId, permissionNames) {
  try {
    const results = await Promise.all(
      permissionNames.map(perm => checkUserPermission(userId, perm))
    );
    return results.some(result => result === true);
  } catch (error) {
    logger.error('Multiple permission check error:', error);
    return false;
  }
}

/**
 * Check Multiple Permissions (ALL logic)
 * User needs ALL of the specified permissions
 */
export async function checkAllPermissions(userId, permissionNames) {
  try {
    const results = await Promise.all(
      permissionNames.map(perm => checkUserPermission(userId, perm))
    );
    return results.every(result => result === true);
  } catch (error) {
    logger.error('Multiple permission check error:', error);
    return false;
  }
}

/**
 * Get All User Permissions
 * Returns complete list of user's permissions from role and direct assignments
 */
export async function getUserPermissions(userId) {
  try {
    const permissions = await mysqlSequelize.query(`
      SELECT DISTINCT
        p.id,
        p.name,
        p.description,
        p.resource,
        p.action,
        'role' as source
      FROM Users u
      JOIN Roles r ON u.role_id = r.id
      JOIN Role_Permissions rp ON r.id = rp.role_id
      JOIN Permissions p ON rp.permission_id = p.id
      WHERE u.id = :userId AND rp.granted = TRUE

      UNION

      SELECT DISTINCT
        p.id,
        p.name,
        p.description,
        p.resource,
        p.action,
        'user' as source
      FROM User_Permissions up
      JOIN Permissions p ON up.permission_id = p.id
      WHERE up.user_id = :userId
        AND up.granted = TRUE
        AND (up.expires_at IS NULL OR up.expires_at > NOW())

      ORDER BY resource, action
    `, {
      replacements: { userId },
      type: QueryTypes.SELECT
    });

    return permissions;
  } catch (error) {
    logger.error('Get user permissions error:', error);
    return [];
  }
}

/**
 * Require Permission Middleware Factory
 * Creates a middleware that checks if user has a specific permission
 * Must be used AFTER authenticate middleware
 *
 * @param {string|Array<string>} permissions - Permission name(s) required
 * @param {string} logic - 'ANY' or 'ALL' (default: 'ANY' if array)
 * @returns {Function} - Express middleware
 *
 * @example
 * router.post('/pois', authenticate, requirePermission('poi.create'), createPOI);
 * router.put('/pois/:id', authenticate, requirePermission(['poi.update', 'poi.moderate'], 'ANY'), updatePOI);
 * router.delete('/users/:id', authenticate, requirePermission(['user.delete', 'user.manage_all'], 'ALL'), deleteUser);
 */
export function requirePermission(permissions, logic = 'ANY') {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'NOT_AUTHENTICATED',
            message: 'Authentication required'
          }
        });
      }

      const userId = req.user.id;
      const permArray = Array.isArray(permissions) ? permissions : [permissions];

      let hasPermission = false;

      if (permArray.length === 1) {
        hasPermission = await checkUserPermission(userId, permArray[0]);
      } else if (logic === 'ALL') {
        hasPermission = await checkAllPermissions(userId, permArray);
      } else {
        hasPermission = await checkAnyPermission(userId, permArray);
      }

      if (!hasPermission) {
        const permissionStr = permArray.join(logic === 'ALL' ? ' AND ' : ' OR ');
        logger.warn(`Permission denied for user ${req.user.email}: ${permissionStr}`);

        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to perform this action',
            required_permissions: permArray
          }
        });
      }

      next();
    } catch (error) {
      logger.error('Permission middleware error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'PERMISSION_CHECK_ERROR',
          message: 'Error checking permissions'
        }
      });
    }
  };
}

/**
 * Require Role Middleware Factory
 * Simpler role-based check (less granular than permissions)
 *
 * @param {string|Array<string>} roles - Role name(s) required
 * @returns {Function} - Express middleware
 *
 * @example
 * router.get('/admin/dashboard', authenticate, requireRole('admin'), getDashboard);
 * router.get('/moderation', authenticate, requireRole(['admin', 'moderator']), getModeration);
 */
export function requireRole(roles) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'NOT_AUTHENTICATED',
            message: 'Authentication required'
          }
        });
      }

      const roleArray = Array.isArray(roles) ? roles : [roles];

      // First check if role is in token
      if (req.user.role && roleArray.includes(req.user.role)) {
        return next();
      }

      // Otherwise check database
      try {
        const [result] = await mysqlSequelize.query(`
          SELECT r.name
          FROM Users u
          JOIN Roles r ON u.role_id = r.id
          WHERE u.id = :userId
        `, {
          replacements: { userId: req.user.id },
          type: QueryTypes.SELECT
        });

        if (result && roleArray.includes(result.name)) {
          req.user.role = result.name;
          return next();
        }
      } catch (dbError) {
        // If database check fails, rely on token role only
        logger.debug('Role database check failed, using token role:', dbError.message);
      }

      logger.warn(`Role check failed for user ${req.user.email}. Required: ${roleArray.join(' or ')}`);

      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: 'You do not have the required role to perform this action',
          required_roles: roleArray
        }
      });
    } catch (error) {
      logger.error('Role check middleware error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'ROLE_CHECK_ERROR',
          message: 'Error checking user role'
        }
      });
    }
  };
}

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Generate JWT token
 */
export function generateToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn,
  });
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
}

/**
 * Generate Admin JWT token
 */
export function generateAdminToken(payload, expiresIn = '8h') {
  return jwt.sign(payload, getAdminJwtSecret(), {
    expiresIn,
  });
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Parse trusted admin IPs from env var (comma-separated).
 * Example: ADMIN_RATE_LIMIT_EXEMPT_IPS=91.98.71.87,127.0.0.1,::1
 */
const trustedAdminIPs = (process.env.ADMIN_RATE_LIMIT_EXEMPT_IPS || '')
  .split(',')
  .map(ip => ip.trim())
  .filter(Boolean);

/**
 * Check if request IP is in the trusted admin IP whitelist.
 */
function isExemptAdminIP(req) {
  const ip = req.ip || req.connection?.remoteAddress || '';
  // Normalize IPv6-mapped IPv4 (::ffff:127.0.0.1 → 127.0.0.1)
  const normalizedIP = ip.replace(/^::ffff:/, '');
  return trustedAdminIPs.includes(normalizedIP) || trustedAdminIPs.includes(ip);
}

/**
 * Rate Limiting for Authentication Endpoints
 * Prevents brute force attacks on login/signup.
 * Exempt: development env, trusted admin IPs.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 requests per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again in 15 minutes.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.NODE_ENV === 'development') return true;
    if (isExemptAdminIP(req)) return true;
    return false;
  }
});

/**
 * General API Rate Limiter
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.NODE_ENV === 'development') return true;
    if (isExemptAdminIP(req)) return true;
    return false;
  }
});

/**
 * Admin Portal API Rate Limiter (Fase 9F — B3).
 * Higher limit (300/15min) for admin portal endpoints.
 * Exempt: development env, trusted admin IPs, valid admin JWT (platform_admin role).
 */
export const adminApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per window (admins do bulk operations)
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many admin API requests. Please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.NODE_ENV === 'development') return true;
    if (isExemptAdminIP(req)) return true;
    // Peek at JWT to check platform_admin role (lightweight, no DB call)
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET || 'your-secret-key');
        if (decoded.role === 'platform_admin') return true;
      }
    } catch { /* invalid/expired token — do not skip */ }
    return false;
  }
});

// ============================================================================
// UTILITY MIDDLEWARE
// ============================================================================

/**
 * Log activity middleware
 * Logs user activity for auditing purposes
 */
export function logActivity(action, resource) {
  return async (req, res, next) => {
    try {
      if (req.user || req.adminUser) {
        const user = req.adminUser || req.user;
        const resourceId = req.params.id || req.params.poiId || req.body.id || null;

        logger.info(`Activity: ${action} on ${resource}`, {
          userId: user.id,
          email: user.email,
          action,
          resource,
          resourceId,
          ip: req.ip,
          userAgent: req.get('user-agent')
        });
      }
      next();
    } catch (error) {
      // Log error but don't block the request
      logger.error('Activity logging error:', error);
      next();
    }
  };
}

/**
 * Validate request fields middleware
 * Prevents mass assignment attacks by only allowing specified fields
 *
 * @param {Array<string>} allowedFields - List of allowed field names
 * @returns {Function} - Express middleware
 */
export function validateFields(allowedFields) {
  return (req, res, next) => {
    const providedFields = Object.keys(req.body);
    const invalidFields = providedFields.filter(field => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FIELDS',
          message: 'Invalid fields in request.',
          invalidFields
        }
      });
    }

    next();
  };
}

/**
 * Check if user has completed onboarding
 * Placeholder for onboarding flow integration
 */
export function requireOnboarding(req, res, next) {
  // Check the database for onboarding status if needed
  // For now, continue with the request
  next();
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Core authentication
  authenticate,
  verifyToken,
  optionalAuth,

  // Admin authentication
  verifyAdminToken,
  requireAdmin,

  // RBAC
  requirePermission,
  requireRole,
  checkUserPermission,
  checkAnyPermission,
  checkAllPermissions,
  getUserPermissions,

  // Token management
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateAdminToken,

  // Rate limiting
  authRateLimiter,
  apiRateLimiter,

  // Utilities
  logActivity,
  validateFields,
  requireOnboarding,
};
