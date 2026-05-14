/**
 * Admin Auth Middleware — Shared role-based admin authentication
 *
 * Extracted from adminPortal.js for reuse across admin route modules.
 * Behavior MUST match adminAuth() in adminPortal.js to avoid drift.
 *
 * Exports:
 *   - ROLE_HIERARCHY: role-level mapping
 *   - adminAuth(requiredRole='reviewer'): middleware factory
 *   - writeAccess(allowedRoles): middleware for write-action gating
 *
 * @module middleware/adminAuth
 * @version 1.0.0
 */

import jwt from 'jsonwebtoken';
import { QueryTypes } from 'sequelize';
import { mysqlSequelize } from '../config/database.js';

export const ROLE_HIERARCHY = {
  platform_admin: 100,
  destination_admin: 90,
  poi_owner: 70,
  content_manager: 60,
  editor: 50,
  reviewer: 30,
};

/**
 * Admin authentication middleware factory.
 *
 * @param {string} requiredRole - Minimum role required (default 'reviewer')
 * @returns {Function} Express middleware
 */
export function adminAuth(requiredRole = 'reviewer') {
  return async (req, res, next) => {
    try {
      // 1. Extract and verify JWT
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: { code: 'NO_TOKEN', message: 'No admin token provided.' },
        });
      }

      const token = authHeader.substring(7);
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET);
      } catch (err) {
        const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
        const message = err.name === 'TokenExpiredError' ? 'Admin token has expired.' : 'Invalid admin token.';
        return res.status(401).json({ success: false, error: { code, message } });
      }

      // 2. Verify user still active
      const userId = decoded.userId || decoded.id;
      const adminUsers = await mysqlSequelize.query(
        `SELECT id, email, first_name, last_name, role, allowed_destinations, owned_pois, permissions, status
         FROM admin_users WHERE id = ? AND status = 'active'`,
        { replacements: [userId], type: QueryTypes.SELECT }
      );

      if (adminUsers.length === 0) {
        return res.status(401).json({
          success: false,
          error: { code: 'USER_INACTIVE', message: 'Admin account not found or suspended.' },
        });
      }

      const user = adminUsers[0];

      // 3. Role hierarchy check
      const userLevel = ROLE_HIERARCHY[user.role] || 0;
      const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
      if (userLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          error: { code: 'INSUFFICIENT_ROLE', message: `Role '${requiredRole}' or higher required.` },
        });
      }

      // 4. Parse allowed destinations
      let allowedDests = [];
      try {
        allowedDests = JSON.parse(user.allowed_destinations || '[]');
      } catch {
        allowedDests = [];
      }

      // 5. Attach normalized user to request
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        allowed_destinations: allowedDests,
        owned_pois: (() => {
          try { return JSON.parse(user.owned_pois || '[]'); } catch { return []; }
        })(),
        permissions: (() => {
          try { return JSON.parse(user.permissions || '[]'); } catch { return []; }
        })(),
      };

      next();
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: { code: 'AUTH_ERROR', message: err.message },
      });
    }
  };
}

/**
 * Write-access middleware. Must run AFTER adminAuth().
 * Blocks write actions for roles not in allowedRoles.
 *
 * @param {string[]} allowedRoles
 * @returns {Function}
 */
export function writeAccess(allowedRoles) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return next(); // adminAuth not run yet — let it fail downstream
    const role = user.role;
    if (!Array.isArray(allowedRoles) || !allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'WRITE_FORBIDDEN', message: 'Write access denied for your role.' },
      });
    }
    next();
  };
}

export default { adminAuth, writeAccess, ROLE_HIERARCHY };
