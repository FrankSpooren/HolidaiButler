/**
 * Authentication Middleware
 * =========================
 * JWT token verification and user authentication
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { query } = require('../config/database');

/**
 * Verify JWT access token
 */
const verifyToken = (req, res, next) => {
  try {
    // Get token from Authorization header
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

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      uuid: decoded.uuid,
      email: decoded.email
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired'
        }
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token'
        }
      });
    }

    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error'
      }
    });
  }
};

/**
 * Optional auth - attach user if token present, but don't require it
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = {
        id: decoded.userId,
        uuid: decoded.uuid,
        email: decoded.email
      };
    }

    next();
  } catch {
    // If token is invalid, just continue without user
    next();
  }
};

/**
 * Check if user has completed onboarding
 */
const requireOnboarding = (req, res, next) => {
  // This would check the database for onboarding status
  // For now, we'll assume it's checked in the route handler
  next();
};

/**
 * Require Admin Privileges
 * Must be used AFTER verifyToken middleware
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'NOT_AUTHENTICATED',
        message: 'Authentication required'
      }
    });
  }

  if (!req.user.isAdmin) {
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
};

/**
 * Check User Permission (Granular RBAC)
 * =====================================
 * Checks if user has a specific permission through their role or direct assignment
 *
 * @param {number} userId - User ID
 * @param {string} permissionName - Permission name (e.g., 'poi.create', 'user.update')
 * @returns {Promise<boolean>} - True if user has permission
 */
async function checkUserPermission(userId, permissionName) {
  try {
    // Check role-based permissions
    const roleSql = `
      SELECT COUNT(*) as has_permission
      FROM Users u
      JOIN Roles r ON u.role_id = r.id
      JOIN Role_Permissions rp ON r.id = rp.role_id
      JOIN Permissions p ON rp.permission_id = p.id
      WHERE u.id = ? AND p.name = ? AND rp.granted = TRUE
    `;

    const [roleResult] = await query(roleSql, [userId, permissionName]);

    if (roleResult.has_permission > 0) {
      return true;
    }

    // Check user-specific permission overrides
    const userSql = `
      SELECT granted
      FROM User_Permissions up
      JOIN Permissions p ON up.permission_id = p.id
      WHERE up.user_id = ?
        AND p.name = ?
        AND (up.expires_at IS NULL OR up.expires_at > NOW())
    `;

    const userResults = await query(userSql, [userId, permissionName]);

    if (userResults.length > 0) {
      return userResults[0].granted === 1;
    }

    // No permission found
    return false;
  } catch (error) {
    logger.error('Permission check error:', error);
    return false;
  }
}

/**
 * Check Multiple Permissions (ANY logic)
 * User needs at least ONE of the specified permissions
 *
 * @param {number} userId - User ID
 * @param {Array<string>} permissionNames - Array of permission names
 * @returns {Promise<boolean>} - True if user has any of the permissions
 */
async function checkAnyPermission(userId, permissionNames) {
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
 *
 * @param {number} userId - User ID
 * @param {Array<string>} permissionNames - Array of permission names
 * @returns {Promise<boolean>} - True if user has all permissions
 */
async function checkAllPermissions(userId, permissionNames) {
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
 *
 * @param {number} userId - User ID
 * @returns {Promise<Array>} - Array of permission objects
 */
async function getUserPermissions(userId) {
  try {
    const sql = `
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
      WHERE u.id = ? AND rp.granted = TRUE

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
      WHERE up.user_id = ?
        AND up.granted = TRUE
        AND (up.expires_at IS NULL OR up.expires_at > NOW())

      ORDER BY resource, action
    `;

    return await query(sql, [userId, userId]);
  } catch (error) {
    logger.error('Get user permissions error:', error);
    return [];
  }
}

/**
 * Require Permission Middleware Factory
 * ======================================
 * Creates a middleware that checks if user has a specific permission
 * Must be used AFTER verifyToken middleware
 *
 * @param {string|Array<string>} permissions - Permission name(s) required
 * @param {string} logic - 'ANY' or 'ALL' (default: 'ANY' if array, not used for single)
 * @returns {Function} - Express middleware
 *
 * @example
 * // Single permission
 * router.post('/pois', verifyToken, requirePermission('poi.create'), createPOI);
 *
 * // Any of multiple permissions
 * router.put('/pois/:id', verifyToken, requirePermission(['poi.update', 'poi.moderate'], 'ANY'), updatePOI);
 *
 * // All permissions required
 * router.delete('/users/:id', verifyToken, requirePermission(['user.delete', 'user.manage_all'], 'ALL'), deleteUser);
 */
const requirePermission = (permissions, logic = 'ANY') => {
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
        // Single permission check
        hasPermission = await checkUserPermission(userId, permArray[0]);
      } else if (logic === 'ALL') {
        // All permissions required
        hasPermission = await checkAllPermissions(userId, permArray);
      } else {
        // Any permission sufficient (default)
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

      // Permission granted - continue
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
};

/**
 * Require Role Middleware
 * =======================
 * Simpler role-based check (less granular than permissions)
 * Checks if user has one of the specified roles
 *
 * @param {string|Array<string>} roles - Role name(s) required
 * @returns {Function} - Express middleware
 *
 * @example
 * router.get('/admin/dashboard', verifyToken, requireRole('admin'), getDashboard);
 * router.get('/moderation', verifyToken, requireRole(['admin', 'moderator']), getModeration);
 */
const requireRole = (roles) => {
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
      const roleArray = Array.isArray(roles) ? roles : [roles];

      // Get user's role
      const sql = `
        SELECT r.name
        FROM Users u
        JOIN Roles r ON u.role_id = r.id
        WHERE u.id = ?
      `;

      const [result] = await query(sql, [userId]);

      if (!result || !roleArray.includes(result.name)) {
        logger.warn(`Role check failed for user ${req.user.email}. Required: ${roleArray.join(' or ')}`);

        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_ROLE',
            message: 'You do not have the required role to perform this action',
            required_roles: roleArray
          }
        });
      }

      // Role check passed
      req.user.role = result.name; // Attach role to request
      next();
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
};

/**
 * Rate Limiting for Authentication Endpoints
 * Prevents brute force attacks on login/signup
 */
const rateLimit = require('express-rate-limit');

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
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
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development';
  }
});

module.exports = {
  verifyToken,
  optionalAuth,
  requireOnboarding,
  requireAdmin,
  requirePermission,
  requireRole,
  checkUserPermission,
  getUserPermissions,
  authRateLimiter
};
