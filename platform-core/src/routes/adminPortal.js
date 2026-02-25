/**
 * Admin Portal Routes — Fase 8C-0 + 8C-1 + 8D + 9A + 9B
 * ===================================================
 * Unified admin API endpoints in platform-core (port 3001).
 * Path prefix: /api/v1/admin-portal
 *
 * Endpoints:
 *   POST /auth/login           — Admin login (rate limited, admin_users table)
 *   POST /auth/refresh         — Refresh access token
 *   POST /auth/logout          — Admin logout
 *   GET  /auth/me              — Current admin user info
 *   GET  /dashboard            — KPI data (Redis cached 120s)
 *   GET  /health               — System health checks
 *   GET  /agents/status        — Agent status dashboard (Redis cached 60s)
 *   GET  /agents/config        — Agent configurations (MongoDB)
 *   PUT  /agents/config/:key   — Update agent configuration (admin audit)
 *   GET  /pois                 — POI list with pagination, search, filters
 *   GET  /pois/stats           — POI statistics per destination (Redis cached 5min)
 *   GET  /pois/categories      — Distinct categories for filter dropdowns
 *   GET  /pois/:id             — POI detail with content, images, reviews
 *   PUT  /pois/:id             — Update POI content + category (audit logged, undo snapshot)
 *   PUT  /pois/:id/images      — Reorder POI images (display_order)
 *   GET  /reviews              — Review list with pagination, filters, summary
 *   GET  /reviews/:id          — Single review detail
 *   PUT  /reviews/:id          — Archive/unarchive review (audit logged, undo snapshot)
 *   GET  /analytics            — Analytics overview (Redis cached 10min)
 *   GET  /analytics/export     — CSV export (pois/reviews/summary)
 *   GET  /analytics/chatbot    — Chatbot analytics (sessions, messages, languages)
 *   GET  /analytics/trend/:metric — Time-series trend data (grouped by month)
 *   GET  /analytics/snapshot   — Point-in-time KPI snapshot
 *   GET  /settings             — System info, destinations, features
 *   GET  /settings/audit-log   — Admin audit log (paginated)
 *   POST /settings/undo/:auditLogId — Undo reversible action
 *   POST /settings/cache/clear — Redis cache invalidation
 *   GET  /settings/branding    — Brand configuration per destination
 *   PUT  /settings/branding/:destination — Update brand colors/settings
 *   POST /settings/branding/:destination/logo — Upload brand logo (multipart/form-data)
 *   GET  /users                — List admin users (platform_admin only)
 *   POST /users                — Create admin user (platform_admin only)
 *   GET  /users/:id            — Admin user detail (platform_admin only)
 *   PUT  /users/:id            — Update admin user (platform_admin only)
 *   DELETE /users/:id          — Soft-delete admin user (platform_admin only)
 *   POST /users/:id/reset-password — Reset admin user password (platform_admin only)
 *   GET  /analytics/pageviews  — Pageview analytics (page_views table, GDPR compliant)
 *
 * @module routes/adminPortal
 * @version 3.9.0
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mysqlSequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';
import {
  verifyAdminToken,
  generateAdminToken,
  authRateLimiter,
  adminApiRateLimiter
} from '../middleware/auth.js';
import logger from '../utils/logger.js';
import emailService from '../services/emailService.js';

const router = Router();

// Admin API rate limiter — applied to all admin endpoints (Fase 9F — B3)
// 300 req/15min, platform_admin + trusted IPs exempt
router.use(adminApiRateLimiter);

// Redis client for dashboard caching
let redisClient = null;
function getRedis() {
  if (!redisClient) {
    try {
      redisClient = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 1,
        lazyConnect: true
      });
      redisClient.connect().catch(() => {
        logger.warn('[AdminPortal] Redis connection failed, caching disabled');
        redisClient = null;
      });
    } catch {
      redisClient = null;
    }
  }
  return redisClient;
}

/** Resolve destination filter value to numeric ID. Accepts 'calpe', 'texel', 1, 2, '1', '2'. */
function resolveDestinationId(val) {
  if (!val) return null;
  const codeMap = { calpe: 1, texel: 2 };
  const lower = String(val).toLowerCase();
  if (codeMap[lower]) return codeMap[lower];
  const parsed = parseInt(val);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Enterprise password validation (Fase 9B).
 * Returns array of validation error messages (empty = valid).
 */
function validatePassword(password, email, name) {
  const errors = [];
  if (!password || password.length < 12) errors.push('Minimaal 12 karakters');
  if (!/[A-Z]/.test(password)) errors.push('Minimaal 1 hoofdletter');
  if (!/[a-z]/.test(password)) errors.push('Minimaal 1 kleine letter');
  if (!/[0-9]/.test(password)) errors.push('Minimaal 1 cijfer');
  if (!/[!@#$%^&*()\-_+=.,;:?]/.test(password)) errors.push('Minimaal 1 speciaal teken');
  if (email && password.toLowerCase().includes(email.split('@')[0].toLowerCase())) {
    errors.push('Mag geen deel van email bevatten');
  }
  if (name && name.trim() && password.toLowerCase().includes(name.split(' ')[0].toLowerCase())) {
    errors.push('Mag geen deel van naam bevatten');
  }
  return errors;
}

// ============================================================
// RBAC ROLE HIERARCHY + MIDDLEWARE (Fase 9A-1)
// ============================================================

const ROLE_HIERARCHY = {
  platform_admin: 100,
  poi_owner: 70,
  editor: 50,
  reviewer: 30
};

/**
 * RBAC middleware for admin endpoints.
 * Verifies JWT, checks role hierarchy, and validates destination access.
 * Uses admin_users table (not Users table).
 *
 * @param {string} requiredRole - Minimum role required (default: 'reviewer')
 * @returns {Function} Express middleware
 */
function adminAuth(requiredRole = 'reviewer') {
  return async (req, res, next) => {
    try {
      // 1. Extract and verify JWT
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: { code: 'NO_TOKEN', message: 'No admin token provided.' }
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

      // 2. Verify user still exists and is active in admin_users
      const userId = decoded.userId || decoded.id;
      const adminUsers = await mysqlSequelize.query(
        `SELECT id, email, first_name, last_name, role, allowed_destinations, owned_pois, permissions, status
         FROM admin_users WHERE id = ? AND status = 'active'`,
        { replacements: [userId], type: QueryTypes.SELECT }
      );

      if (adminUsers.length === 0) {
        return res.status(401).json({
          success: false,
          error: { code: 'USER_INACTIVE', message: 'Admin account not found or suspended.' }
        });
      }

      const user = adminUsers[0];

      // 3. Check role hierarchy
      const userLevel = ROLE_HIERARCHY[user.role] || 0;
      const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
      if (userLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          error: { code: 'INSUFFICIENT_ROLE', message: `Role '${requiredRole}' or higher required.` }
        });
      }

      // 4. Parse allowed destinations
      let allowedDests = [];
      try { allowedDests = JSON.parse(user.allowed_destinations || '[]'); } catch { allowedDests = []; }

      // 5. Check destination access (if destination filter applied)
      const destFilter = req.query.destination || req.headers['x-admin-destination'] || null;
      if (destFilter && user.role !== 'platform_admin' && allowedDests.length > 0) {
        const destCode = String(destFilter).toLowerCase();
        if (!allowedDests.includes(destCode)) {
          return res.status(403).json({
            success: false,
            error: { code: 'DESTINATION_FORBIDDEN', message: `No access to destination '${destFilter}'.` }
          });
        }
      }

      // 6. Set enriched adminUser on request
      let parsedPerms = {};
      try { parsedPerms = JSON.parse(user.permissions || '{}'); } catch { /* empty */ }

      // Parse owned POIs
      let ownedPois = [];
      try { ownedPois = JSON.parse(user.owned_pois || '[]'); } catch { ownedPois = []; }

      // Resolve destination codes to IDs for query scoping
      const destCodeToId = { calpe: 1, texel: 2, alicante: 3 };
      const allowedDestIds = allowedDests.map(code => destCodeToId[code]).filter(Boolean);

      req.adminUser = {
        id: user.id,
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        allowed_destinations: allowedDests,
        allowed_destination_ids: allowedDestIds,
        owned_pois: ownedPois,
        permissions: parsedPerms,
        ...decoded
      };

      next();
    } catch (error) {
      logger.error('[AdminPortal] RBAC middleware error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'AUTH_ERROR', message: 'Server error during authentication.' }
      });
    }
  };
}

/**
 * Destination scope middleware — automatically filters data by user's allowed destinations.
 * Platform Admins bypass scoping. POI Owners are scoped to their owned POIs.
 * Must run AFTER adminAuth().
 */
function destinationScope(req, res, next) {
  const user = req.adminUser;
  if (!user) return next(); // adminAuth not run yet

  // Platform Admin: no restriction
  if (user.role === 'platform_admin') {
    req.destScope = null;
    req.poiScope = null;
    return next();
  }

  // POI Owner: scoped to specific POIs (across any destination)
  if (user.role === 'poi_owner' && user.owned_pois && user.owned_pois.length > 0) {
    req.poiScope = user.owned_pois.map(id => parseInt(id)).filter(Boolean);
    req.destScope = null; // POI scope overrides destination scope
    return next();
  }

  // Editor/Reviewer: scoped to allowed destination IDs
  if (user.allowed_destination_ids && user.allowed_destination_ids.length > 0) {
    req.destScope = user.allowed_destination_ids;
  } else {
    req.destScope = null; // no restrictions if empty (backward compat)
  }
  req.poiScope = null;
  next();
}

/**
 * Write access middleware — blocks write operations for roles without permission.
 * @param {string[]} allowedRoles - Roles that can perform this write operation.
 */
function writeAccess(allowedRoles) {
  return (req, res, next) => {
    if (!req.adminUser) return next();
    if (!allowedRoles.includes(req.adminUser.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'WRITE_FORBIDDEN',
          message: `Role '${req.adminUser.role}' does not have write access for this operation.`
        }
      });
    }
    next();
  };
}

/**
 * Save an undo snapshot to MongoDB admin_action_snapshots.
 * Returns the snapshot _id for linking to audit log.
 */
async function saveUndoSnapshot({ auditLogId, action, entityType, entityId, previousState, newState, createdBy }) {
  try {
    if (mongoose.connection.readyState !== 1) return null;
    const db = mongoose.connection.db;
    const result = await db.collection('admin_action_snapshots').insertOne({
      audit_log_id: auditLogId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      previous_state: previousState,
      new_state: newState,
      is_undone: false,
      undone_at: null,
      undone_by: null,
      created_at: new Date(),
      created_by: createdBy,
      ttl: new Date(Date.now() + 30 * 24 * 3600 * 1000) // 30 days
    });
    return result.insertedId;
  } catch (err) {
    logger.warn('[AdminPortal] Snapshot save failed:', err.message);
    return null;
  }
}

/**
 * Save an audit log entry to MongoDB. Returns the _id.
 */
async function saveAuditLog({ action, adminId, adminEmail, details, entityType, entityId, metadata, actorType }) {
  try {
    if (mongoose.connection.readyState !== 1) return null;
    const db = mongoose.connection.db;
    // actorType: 'admin' (manual by user), 'agent' (automated agent), 'system' (cron/scheduled)
    const resolvedActorType = actorType || (adminId ? 'admin' : 'system');
    const result = await db.collection('audit_logs').insertOne({
      action,
      admin_id: adminId,
      admin_email: adminEmail,
      details,
      entity_type: entityType || null,
      entity_id: entityId || null,
      metadata: metadata || {},
      timestamp: new Date(),
      actor: { type: resolvedActorType, name: resolvedActorType === 'admin' ? 'admin-portal' : (resolvedActorType === 'agent' ? (metadata?.agentName || 'unknown-agent') : 'system') }
    });
    return result.insertedId;
  } catch {
    return null;
  }
}

// ============================================================
// AUTH ENDPOINTS
// ============================================================

/**
 * POST /auth/login
 * Admin login with email/password. Rate limited: 15 per 15 min (trusted IPs exempt).
 * Queries admin_users table first, falls back to Users table for backward compatibility.
 */
router.post('/auth/login', authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Email and password are required' }
      });
    }

    // Try admin_users table FIRST (Fase 9A)
    let user = null;
    let userSource = null;

    const adminUsers = await mysqlSequelize.query(
      `SELECT id, email, password, first_name, last_name, role, allowed_destinations, permissions, status, login_attempts, lock_until
       FROM admin_users WHERE email = ?`,
      { replacements: [email], type: QueryTypes.SELECT }
    );

    if (adminUsers.length > 0) {
      const au = adminUsers[0];

      // Check account status
      if (au.status !== 'active') {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCOUNT_INACTIVE', message: 'Account is suspended or pending activation.' }
        });
      }

      // Check account lock
      if (au.lock_until && new Date(au.lock_until) > new Date()) {
        return res.status(429).json({
          success: false,
          error: { code: 'ACCOUNT_LOCKED', message: 'Account temporarily locked due to too many failed attempts.' }
        });
      }

      // Verify password (admin_users uses 'password' column)
      if (!au.password) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
        });
      }

      const passwordValid = await bcrypt.compare(password, au.password);
      if (!passwordValid) {
        // Increment login_attempts
        const attempts = (au.login_attempts || 0) + 1;
        const lockUntil = attempts >= 10 ? 'DATE_ADD(NOW(), INTERVAL 5 MINUTE)' : 'NULL';
        await mysqlSequelize.query(
          `UPDATE admin_users SET login_attempts = ?, lock_until = ${lockUntil} WHERE id = ?`,
          { replacements: [attempts, au.id] }
        ).catch(() => {});
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
        });
      }

      // Reset login attempts on success
      await mysqlSequelize.query(
        `UPDATE admin_users SET login_attempts = 0, lock_until = NULL WHERE id = ?`,
        { replacements: [au.id] }
      ).catch(() => {});

      let allowedDests = [];
      try { allowedDests = JSON.parse(au.allowed_destinations || '[]'); } catch { /* empty */ }

      user = {
        id: au.id,
        email: au.email,
        name: `${au.first_name || ''} ${au.last_name || ''}`.trim() || au.email,
        role: au.role,
        allowed_destinations: allowedDests
      };
      userSource = 'admin_users';
    } else {
      // Fallback: try Users table for backward compatibility
      const legacyUsers = await mysqlSequelize.query(
        `SELECT u.id, u.uuid, u.email, u.name, u.password_hash, r.name as role
         FROM Users u LEFT JOIN Roles r ON u.role_id = r.id
         WHERE u.email = ?`,
        { replacements: [email], type: QueryTypes.SELECT }
      );

      if (legacyUsers.length === 0) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
        });
      }

      const lu = legacyUsers[0];
      const legacyAdminRoles = ['admin', 'owner', 'super_admin'];
      if (!lu.role || !legacyAdminRoles.includes(lu.role)) {
        logger.warn(`[AdminPortal] Non-admin login attempt: ${email} (role: ${lu.role || 'none'})`);
        return res.status(403).json({
          success: false,
          error: { code: 'ADMIN_REQUIRED', message: 'Admin access required' }
        });
      }

      if (!lu.password_hash) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
        });
      }

      const passwordValid = await bcrypt.compare(password, lu.password_hash);
      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
        });
      }

      // Map legacy role to admin_users role
      const roleMap = { admin: 'platform_admin', owner: 'platform_admin', super_admin: 'platform_admin' };
      user = {
        id: lu.uuid || lu.id,
        email: lu.email,
        name: lu.name || lu.email,
        role: roleMap[lu.role] || 'reviewer',
        allowed_destinations: ['calpe', 'texel']
      };
      userSource = 'Users';
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      allowed_destinations: user.allowed_destinations
    };
    const accessToken = generateAdminToken(tokenPayload, '8h');

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'admin_refresh' },
      process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Store refresh token in Sessions table (non-blocking — UUID admin_users vs INT Sessions.user_id)
    mysqlSequelize.query(
      `INSERT INTO Sessions (user_id, refresh_token, expires_at, created_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())`,
      { replacements: [user.id, refreshToken] }
    ).catch(err => logger.warn('[AdminPortal] Session store skipped (non-critical):', err.message));

    logger.info(`[AdminPortal] Admin login: ${email} (source: ${userSource})`);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          allowed_destinations: user.allowed_destinations
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('[AdminPortal] Login error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred during login' }
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token.
 */
router.post('/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'Refresh token is required' }
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token' }
      });
    }

    // Check session exists and is not expired
    const sessions = await mysqlSequelize.query(
      `SELECT id FROM Sessions
       WHERE user_id = ? AND refresh_token = ? AND expires_at > NOW()`,
      { replacements: [decoded.userId, refreshToken], type: QueryTypes.SELECT }
    );

    if (sessions.length === 0) {
      return res.status(401).json({
        success: false,
        error: { code: 'SESSION_EXPIRED', message: 'Session has expired. Please log in again.' }
      });
    }

    // Get user from admin_users (primary) or Users (fallback)
    let user = null;
    const adminUsers = await mysqlSequelize.query(
      `SELECT id, email, first_name, last_name, role, allowed_destinations, status
       FROM admin_users WHERE id = ? AND status = 'active'`,
      { replacements: [decoded.userId], type: QueryTypes.SELECT }
    );

    if (adminUsers.length > 0) {
      const au = adminUsers[0];
      let allowedDests = [];
      try { allowedDests = JSON.parse(au.allowed_destinations || '[]'); } catch { /* empty */ }
      user = { id: au.id, email: au.email, role: au.role, allowed_destinations: allowedDests };
    } else {
      // Fallback to Users table
      const legacyUsers = await mysqlSequelize.query(
        `SELECT u.id, u.uuid, u.email, u.name, r.name as role
         FROM Users u LEFT JOIN Roles r ON u.role_id = r.id WHERE u.id = ?`,
        { replacements: [decoded.userId], type: QueryTypes.SELECT }
      );
      if (legacyUsers.length > 0) {
        const lu = legacyUsers[0];
        const roleMap = { admin: 'platform_admin', owner: 'platform_admin', super_admin: 'platform_admin' };
        user = { id: lu.uuid || lu.id, email: lu.email, role: roleMap[lu.role] || 'reviewer', allowed_destinations: ['calpe', 'texel'] };
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User no longer exists' }
      });
    }

    const accessToken = generateAdminToken(
      { userId: user.id, email: user.email, role: user.role, allowed_destinations: user.allowed_destinations },
      '8h'
    );

    res.json({ success: true, data: { accessToken } });
  } catch (error) {
    logger.error('[AdminPortal] Refresh error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred during token refresh' }
    });
  }
});

/**
 * POST /auth/logout
 * Admin logout — removes session.
 */
router.post('/auth/logout', adminAuth('reviewer'), async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const userId = req.adminUser.id || req.adminUser.userId;

    if (refreshToken) {
      await mysqlSequelize.query(
        `DELETE FROM Sessions WHERE user_id = ? AND refresh_token = ?`,
        { replacements: [userId, refreshToken] }
      );
    } else {
      // Delete all sessions for this user
      await mysqlSequelize.query(
        `DELETE FROM Sessions WHERE user_id = ?`,
        { replacements: [userId] }
      );
    }

    logger.info(`[AdminPortal] Admin logout: ${req.adminUser.email}`);
    res.json({ success: true });
  } catch (error) {
    logger.error('[AdminPortal] Logout error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred during logout' }
    });
  }
});

/**
 * GET /auth/me
 * Get current admin user info from admin_users table.
 */
router.get('/auth/me', adminAuth('reviewer'), async (req, res) => {
  try {
    // adminAuth already verified and populated req.adminUser
    res.json({
      success: true,
      data: {
        id: req.adminUser.id,
        email: req.adminUser.email,
        name: req.adminUser.name,
        firstName: req.adminUser.firstName,
        lastName: req.adminUser.lastName,
        role: req.adminUser.role,
        allowed_destinations: req.adminUser.allowed_destinations,
        owned_pois: req.adminUser.owned_pois,
        permissions: req.adminUser.permissions
      }
    });
  } catch (error) {
    logger.error('[AdminPortal] GetMe error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred' }
    });
  }
});

// ============================================================
// DASHBOARD ENDPOINT
// ============================================================

/**
 * GET /dashboard
 * Aggregated KPI data. Redis cached for 120 seconds.
 */
router.get('/dashboard', adminAuth('reviewer'), async (req, res) => {
  try {
    const cacheKey = 'admin:dashboard:kpis';
    const redis = getRedis();

    // Try cache first
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
      } catch {
        // Cache miss, continue
      }
    }

    // Collect KPI data with graceful degradation
    const result = {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        destinations: { calpe: { id: 1 }, texel: { id: 2 } },
        platform: {}
      }
    };

    // 1. POI counts per destination
    try {
      const poiCounts = await mysqlSequelize.query(
        `SELECT destination_id,
                COUNT(*) as total,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
         FROM POI GROUP BY destination_id`,
        { type: QueryTypes.SELECT }
      );
      for (const row of poiCounts) {
        const destKey = row.destination_id === 1 ? 'calpe' : row.destination_id === 2 ? 'texel' : null;
        if (destKey) {
          result.data.destinations[destKey].pois = {
            total: parseInt(row.total),
            active: parseInt(row.active)
          };
        }
      }
    } catch (err) {
      logger.warn('[AdminPortal] POI count query failed:', err.message);
      result.data.destinations.calpe.pois = { total: 0, active: 0, error: true };
      result.data.destinations.texel.pois = { total: 0, active: 0, error: true };
    }

    // 2. Review counts per destination
    try {
      const reviewCounts = await mysqlSequelize.query(
        `SELECT destination_id, COUNT(*) as total FROM reviews GROUP BY destination_id`,
        { type: QueryTypes.SELECT }
      );
      for (const row of reviewCounts) {
        const destKey = row.destination_id === 1 ? 'calpe' : row.destination_id === 2 ? 'texel' : null;
        if (destKey) {
          result.data.destinations[destKey].reviews = parseInt(row.total);
        }
      }
    } catch (err) {
      logger.warn('[AdminPortal] Review count query failed:', err.message);
    }

    // Ensure defaults
    if (!result.data.destinations.calpe.reviews) result.data.destinations.calpe.reviews = 0;
    if (!result.data.destinations.texel.reviews) result.data.destinations.texel.reviews = 0;

    // 3. Admin user count (from admin_users, not customer Users table)
    try {
      const userCount = await mysqlSequelize.query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active FROM admin_users`,
        { type: QueryTypes.SELECT }
      );
      result.data.platform.totalUsers = parseInt(userCount[0]?.total || 0);
      result.data.platform.activeUsers = parseInt(userCount[0]?.active || 0);
    } catch {
      result.data.platform.totalUsers = 0;
      result.data.platform.activeUsers = 0;
    }

    // 4. Chatbot sessions (last 7 days)
    try {
      const chatSessions = await mysqlSequelize.query(
        `SELECT COUNT(*) as total FROM holibot_sessions
         WHERE started_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`,
        { type: QueryTypes.SELECT }
      );
      result.data.platform.chatbotSessions7d = parseInt(chatSessions[0]?.total || 0);
    } catch {
      result.data.platform.chatbotSessions7d = 0;
    }

    // 5. Agent count (from registry)
    result.data.platform.totalAgents = 18;

    // 6. Scheduled jobs
    result.data.platform.scheduledJobs = 40;

    // 7. System uptime
    result.data.platform.uptimeHours = parseFloat((process.uptime() / 3600).toFixed(1));

    // 8. Agent health summary (shared with daily briefing — B5 consistency fix)
    try {
      const { getSystemHealthSummary } = await import('../services/orchestrator/auditTrail/index.js');
      result.data.platform.healthSummary = await getSystemHealthSummary(24);
    } catch {
      result.data.platform.healthSummary = { jobs: 0, alerts: 0, errors: 0 };
    }

    // Cache result
    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 120);
      } catch {
        // Cache write failure is non-critical
      }
    }

    res.json(result);
  } catch (error) {
    logger.error('[AdminPortal] Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred fetching dashboard data' }
    });
  }
});

// ============================================================
// HEALTH ENDPOINT
// ============================================================

/**
 * GET /health
 * System health checks: MySQL, MongoDB, Redis, BullMQ.
 */
router.get('/health', adminAuth('reviewer'), async (req, res) => {
  const checks = {};

  // MySQL
  try {
    await mysqlSequelize.query('SELECT 1', { type: QueryTypes.SELECT });
    checks.mysql = { status: 'healthy', latency_ms: 0 };
  } catch (err) {
    checks.mysql = { status: 'unhealthy', error: err.message };
  }

  // MongoDB
  try {
    const state = mongoose.connection.readyState;
    // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    if (state === 1) {
      checks.mongodb = { status: 'healthy' };
    } else if (state === 2) {
      checks.mongodb = { status: 'degraded', detail: 'connecting' };
    } else {
      checks.mongodb = { status: 'unhealthy', detail: `readyState=${state}` };
    }
  } catch (err) {
    checks.mongodb = { status: 'unhealthy', error: err.message };
  }

  // Redis
  try {
    const redis = getRedis();
    if (redis) {
      const pong = await redis.ping();
      checks.redis = { status: pong === 'PONG' ? 'healthy' : 'degraded' };
    } else {
      checks.redis = { status: 'unhealthy', detail: 'not connected' };
    }
  } catch (err) {
    checks.redis = { status: 'unhealthy', error: err.message };
  }

  // BullMQ queue stats
  try {
    const { Queue } = await import('bullmq');
    const queue = new Queue('scheduled-tasks', {
      connection: { host: process.env.REDIS_HOST || '127.0.0.1', port: parseInt(process.env.REDIS_PORT || '6379') }
    });
    const jobs = await queue.getRepeatableJobs();
    checks.bullmq = { status: 'healthy', repeatableJobs: jobs.length };
    await queue.close();
  } catch (err) {
    checks.bullmq = { status: 'degraded', error: err.message };
  }

  // API uptime
  checks.uptime = {
    status: 'healthy',
    uptimeHours: parseFloat((process.uptime() / 3600).toFixed(1))
  };

  // Overall status
  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
  const anyUnhealthy = Object.values(checks).some(c => c.status === 'unhealthy');

  res.json({
    success: true,
    data: {
      overall: anyUnhealthy ? 'degraded' : allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString()
    }
  });
});

// ============================================================
// AGENT STATUS ENDPOINT (Fase 8C-1)
// ============================================================

/**
 * Static agent metadata — avoids importing the full agentRegistry tree
 * which would trigger initialization of all agent modules.
 * Kept in sync with agentRegistry.js entries.
 */
const AGENT_METADATA = [
  { id: 'maestro', name: 'De Maestro', englishName: 'Orchestrator', category: 'core', type: 'A',
    description: 'Orkestreert alle agents en scheduled jobs',
    description_en: 'Orchestrates all agents and scheduled jobs',
    tasks: ['Aansturing en coördinatie van alle 18 agents', 'Beheer van 40 scheduled jobs via BullMQ', 'Foutafhandeling en retry-logica bij gefaalde jobs', 'Prioritering van taken bij hoge systeembelasting'],
    monitoring_scope: 'Alle agents, BullMQ queues, job statussen',
    output_description: 'Job scheduling, error logging, agent lifecycle management',
    schedule: null, actorNames: ['orchestrator'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "Orchestrator"
2. Controleer BullMQ queues: redis-cli LLEN bull:scheduled-tasks:wait
3. Bij queue overflow: controleer of workers actief zijn (pm2 status)
4. Herstart API: pm2 restart holidaibutler-api
5. Verifieer scheduled jobs: node -e "..." (zie Quick Health Check in CLAUDE.md)
6. Wacht op volgende run cyclus en verifieer status` } },
  { id: 'bode', name: 'De Bode', englishName: 'Owner Interface Agent', category: 'core', type: 'A',
    description: 'Daily briefing en owner communicatie',
    description_en: 'Daily briefing and owner communication',
    tasks: ['Dagelijkse status briefing email genereren', 'Per-destination statistieken verzamelen', 'Smoke test en backup resultaten samenvatten', 'Budget en kostenrapportage', 'Prediction alerts aggregeren'],
    monitoring_scope: 'Alle systeem KPIs, agent statussen, kosten',
    output_description: 'Dagelijkse email via MailerLite met [OK]/[MEDIUM]/[HOOG]/[URGENT] prefix',
    schedule: '0 8 * * *', actorNames: ['orchestrator'],
    errorInstructions: { default: `1. Controleer SMTP configuratie in .env (SMTP_HOST, SMTP_PORT, SMTP_USER)
2. Test email verbinding: node -e "require('./src/services/emailService').testConnection()"
3. Controleer MailerLite API key in .env
4. Bekijk verzonden emails in audit log (MongoDB audit_logs)
5. Herstart API: pm2 restart holidaibutler-api
6. Verifieer volgende ochtend (08:00 UTC) of briefing email aankomt` } },
  { id: 'dokter', name: 'De Dokter', englishName: 'Health Monitor Agent', category: 'operations', type: 'A',
    description: 'Systeem monitoring en health checks',
    description_en: 'System monitoring and health checks',
    tasks: ['Uptime monitoring van 7 portals', 'SSL certificaat expiry bewaking (5 domeinen)', 'API response time tracking', 'Database connectiviteit checks', 'Disk space monitoring'],
    monitoring_scope: 'Alle portals, SSL certs, API endpoints, disk space',
    output_description: 'Health alerts, SSL expiry waarschuwingen, uptime rapportage',
    schedule: '0 * * * *', actorNames: ['health-monitor'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "Health Monitor"
2. Controleer health endpoint: curl -s https://api.holidaibutler.com/health
3. Bij 404: controleer route configuratie in adminPortal.js
4. Bij timeout: controleer database connecties (MySQL + MongoDB + Redis)
5. Controleer SSL certificaten: openssl s_client -connect api.holidaibutler.com:443
6. Herstart API: pm2 restart holidaibutler-api
7. Wacht op volgende scheduled run (elk uur) en verifieer status` } },
  { id: 'koerier', name: 'De Koerier', englishName: 'Data Sync Agent', category: 'operations', type: 'A',
    description: 'POI en review data synchronisatie',
    description_en: 'POI and review data synchronization',
    tasks: ['POI data synchronisatie vanuit externe bronnen', 'Review data import en verwerking', 'Content quality monitoring per destination', 'Database integriteit checks'],
    monitoring_scope: 'POI tabel, reviews tabel, content kwaliteit',
    output_description: 'Gesynchroniseerde POI/review data, content quality audits',
    schedule: '0 6 * * *', actorNames: ['data-sync', 'reviews-manager'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "Data Sync"
2. Controleer MySQL connectie: mysql -u pxoziy_1 -h jotx.your-database.de pxoziy_db1 -e "SELECT 1"
3. Bij "no POIs": controleer destination configuratie in config/destinations/
4. Controleer review import: SELECT COUNT(*) FROM reviews WHERE created_at > NOW() - INTERVAL 1 DAY
5. Herstart API: pm2 restart holidaibutler-api
6. Wacht op volgende run (dagelijks 06:00 UTC) en verifieer status` } },
  { id: 'geheugen', name: 'Het Geheugen', englishName: 'HoliBot Sync Agent', category: 'operations', type: 'A',
    description: 'ChromaDB vectorisatie en QnA sync',
    description_en: 'ChromaDB vectorization and QnA sync',
    tasks: ['POI content vectorisatie naar ChromaDB', 'QnA data synchronisatie', 'ChromaDB state snapshots (wekelijks)', 'Embedding kwaliteitscontrole'],
    monitoring_scope: 'ChromaDB collecties (calpe_pois, texel_pois), vector counts',
    output_description: 'Gevectoriseerde content in ChromaDB, state snapshots in MongoDB',
    schedule: '0 4 * * *', actorNames: ['holibot-sync'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "HoliBot Sync"
2. Controleer ChromaDB connectie: curl -s https://api.trychroma.com/api/v1/heartbeat
3. Bij embedding errors: controleer Mistral API key in .env
4. Controleer vectoren: node -e "..." (ChromaDB state snapshot)
5. Herstart API: pm2 restart holidaibutler-api
6. Wacht op volgende run (dagelijks 04:00 UTC) en verifieer vector counts` } },
  { id: 'gastheer', name: 'De Gastheer', englishName: 'Communication Flow Agent', category: 'operations', type: 'A',
    description: 'Gebruikerscommunicatie en journey processing',
    description_en: 'User communication and journey processing',
    tasks: ['User journey tracking en analyse', 'Communicatie triggers verwerken', 'Engagement metrics berekenen', 'Notificatie flow management'],
    monitoring_scope: 'User journeys, communicatie triggers, engagement',
    output_description: 'Journey analytics, communicatie logs',
    schedule: '0 */4 * * *', actorNames: ['communication-flow'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "Communication Flow"
2. Controleer user_journeys tabel: SELECT COUNT(*) FROM user_journeys WHERE updated_at > NOW() - INTERVAL 1 DAY
3. Bij Redis errors: redis-cli ping
4. Herstart API: pm2 restart holidaibutler-api
5. Wacht op volgende run (elke 4 uur) en verifieer status` } },
  { id: 'poortwachter', name: 'De Poortwachter', englishName: 'GDPR Agent', category: 'operations', type: 'A',
    description: 'GDPR compliance en data bescherming',
    description_en: 'GDPR compliance and data protection',
    tasks: ['Consent audit (wekelijks)', 'Data retention policy handhaving', 'Verwijderverzoeken verwerken', 'Privacy impact assessments'],
    monitoring_scope: 'User consent records, data retention, verwijderverzoeken',
    output_description: 'GDPR compliance rapportages, consent audit logs',
    schedule: '0 */4 * * *', actorNames: ['gdpr'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "GDPR"
2. Controleer consent records: SELECT COUNT(*) FROM Users WHERE consent_given IS NOT NULL
3. Bij data retention errors: controleer MySQL connectie
4. Controleer verwijderverzoeken in audit log
5. Herstart API: pm2 restart holidaibutler-api
6. Wacht op volgende run (elke 4 uur) en verifieer status` } },
  { id: 'stylist', name: 'De Stylist', englishName: 'UX/UI Agent', category: 'development', type: 'B',
    description: 'UX/UI review en brand consistency',
    description_en: 'UX/UI review and brand consistency',
    tasks: ['Brand kleur consistentie checks', 'Destination-specifieke styling verificatie', 'Accessibility compliance', 'UI component kwaliteit'],
    monitoring_scope: 'Frontend componenten, brand kleuren, styling',
    output_description: 'UX review rapporten, brand violation alerts',
    schedule: '0 6 * * 1', actorNames: ['dev-layer'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "UX"
2. Controleer brand configuratie per destination in config/destinations/
3. Bij accessibility fouten: controleer frontend build output
4. Herstart API: pm2 restart holidaibutler-api
5. Agent draait wekelijks (maandag 06:00 UTC) — wacht op volgende run` } },
  { id: 'corrector', name: 'De Corrector', englishName: 'Code Agent', category: 'development', type: 'B',
    description: 'Code quality en best practices',
    description_en: 'Code quality and best practices',
    tasks: ['Code kwaliteit analyse', 'Best practices verificatie', 'Dependency vulnerability checks', 'Performance bottleneck detectie'],
    monitoring_scope: 'Codebase kwaliteit, dependencies, performance',
    output_description: 'Code quality rapporten, vulnerability alerts',
    schedule: '0 6 * * 1', actorNames: ['dev-layer'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "Code"
2. Bij dependency vulnerabilities: npm audit --production
3. Controleer ESLint config en linting output
4. Herstart API: pm2 restart holidaibutler-api
5. Agent draait wekelijks (maandag 06:00 UTC) — wacht op volgende run` } },
  { id: 'bewaker', name: 'De Bewaker', englishName: 'Security Agent', category: 'development', type: 'B',
    description: 'Security scanning en vulnerability checks',
    description_en: 'Security scanning and vulnerability checks',
    tasks: ['Dependency vulnerability scanning', 'API security checks', 'Authentication flow verificatie', 'Rate limiting effectiviteit'],
    monitoring_scope: 'Dependencies, API endpoints, auth flows',
    output_description: 'Security scan rapporten, vulnerability alerts',
    schedule: '0 2 * * *', actorNames: ['dev-layer'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "Security"
2. Bij dependency vulnerabilities: npm audit --production
3. Controleer rate limiting: redis-cli keys "ratelimit:*" | head -20
4. Controleer auth flows: curl -s https://api.holidaibutler.com/api/v1/health
5. Herstart API: pm2 restart holidaibutler-api
6. Agent draait dagelijks (02:00 UTC) — wacht op volgende run` } },
  { id: 'inspecteur', name: 'De Inspecteur', englishName: 'Quality Agent', category: 'development', type: 'A',
    description: 'Kwaliteitscontrole en rapportage',
    description_en: 'Quality control and reporting',
    tasks: ['End-to-end kwaliteitscontrole', 'API response validatie', 'Data integriteit checks', 'Rapportage generatie'],
    monitoring_scope: 'API responses, data integriteit, kwaliteitsmetrics',
    output_description: 'Kwaliteitsrapporten, integriteit alerts',
    schedule: '0 6 * * 1', actorNames: ['dev-layer'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "Quality"
2. Controleer API response validatie: curl -s https://api.holidaibutler.com/api/v1/pois?destination_id=1&limit=5
3. Bij data integriteit errors: controleer MySQL connectie en POI counts
4. Herstart API: pm2 restart holidaibutler-api
5. Agent draait wekelijks (maandag 06:00 UTC) — wacht op volgende run` } },
  { id: 'architect', name: 'De Architect', englishName: 'Architecture Agent', category: 'strategy', type: 'B',
    description: 'Architectuur assessment en aanbevelingen',
    description_en: 'Architecture assessment and recommendations',
    tasks: ['Architectuur compliance checks', 'Schaalbaarheid analyse', 'Technische schuld detectie', 'Multi-destination architectuur review'],
    monitoring_scope: 'Systeemarchitectuur, schaalbaarheid, tech debt',
    output_description: 'Architectuur rapporten, aanbevelingen',
    schedule: '0 3 * * 0', actorNames: ['strategy-layer'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "Architecture"
2. Controleer tech debt metrics in de codebase
3. Bij schaalbaarheid issues: controleer server resources (htop, df -h)
4. Herstart API: pm2 restart holidaibutler-api
5. Agent draait wekelijks (zondag 03:00 UTC) — wacht op volgende run` } },
  { id: 'leermeester', name: 'De Leermeester', englishName: 'Learning Agent', category: 'strategy', type: 'A',
    description: 'Pattern learning en optimalisatie',
    description_en: 'Pattern learning and optimization',
    tasks: ['Gebruikerspatronen herkennen', 'Optimalisatie suggesties genereren', 'A/B test resultaten analyseren', 'Learning patterns opslaan in MongoDB'],
    monitoring_scope: 'Gebruikersgedrag, conversie patterns, optimalisatie kansen',
    output_description: 'Optimalisatie suggesties, learning patterns in MongoDB',
    schedule: '30 5 * * 1', actorNames: ['strategy-layer'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "Learning"
2. Controleer MongoDB collectie: mongosh --eval "db.agent_learning_patterns.countDocuments()"
3. Bij pattern recognition errors: controleer input data kwaliteit
4. Herstart API: pm2 restart holidaibutler-api
5. Agent draait wekelijks (maandag 05:30 UTC) — wacht op volgende run` } },
  { id: 'thermostaat', name: 'De Thermostaat', englishName: 'Adaptive Config Agent', category: 'strategy', type: 'A',
    description: 'Configuratie evaluatie en alerting',
    description_en: 'Configuration evaluation and alerting',
    tasks: ['Systeem configuratie evalueren', 'Performance threshold monitoring', 'Configuratie drift detectie', 'Alerting bij afwijkingen'],
    monitoring_scope: 'Systeem configuratie, performance thresholds, Redis state',
    output_description: 'Configuratie alerts, evaluatie resultaten in Redis',
    schedule: '0 */6 * * *', actorNames: ['strategy-layer'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "Thermostaat"
2. Controleer Redis state: redis-cli get "thermostaat:last_evaluation"
3. Controleer Redis history: redis-cli lrange "thermostaat:history" 0 5
4. Bij configuratie drift: vergelijk actuele .env met verwachte waarden
5. Herstart API: pm2 restart holidaibutler-api
6. Agent draait elke 6 uur — wacht op volgende run` } },
  { id: 'weermeester', name: 'De Weermeester', englishName: 'Prediction Agent', category: 'strategy', type: 'A',
    description: 'Voorspellingen en trend analyse',
    description_en: 'Predictions and trend analysis',
    tasks: ['Trend analyse op POI data', 'Seizoensgebonden voorspellingen', 'Capaciteitsplanning', 'Risico voorspellingen'],
    monitoring_scope: 'POI trends, seizoenspatronen, capaciteit',
    output_description: 'Prediction alerts, trend rapporten',
    schedule: '0 3 * * 0', actorNames: ['strategy-layer'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "Prediction"
2. Controleer trend data: SELECT COUNT(*) FROM POI WHERE last_updated > NOW() - INTERVAL 7 DAY
3. Bij seizoensvoorspelling errors: controleer agenda tabel data
4. Herstart API: pm2 restart holidaibutler-api
5. Agent draait wekelijks (zondag 03:00 UTC) — wacht op volgende run` } },
  { id: 'contentQuality', name: 'Content Quality Checker', englishName: 'Content Quality Checker', category: 'monitoring', type: 'A',
    description: 'POI content completeness en consistency',
    description_en: 'POI content completeness and consistency checks',
    tasks: ['Content completeness check per destination', 'Taalconsistentie verificatie (EN/NL/DE/ES)', 'Lege of onvolledige beschrijvingen detecteren', 'Content kwaliteitsscore berekenen'],
    monitoring_scope: 'POI beschrijvingen, vertalingen, content coverage',
    output_description: 'Content quality audits in MongoDB, kwaliteitsscore per destination',
    schedule: '0 5 * * 1', actorNames: ['data-sync'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "Content Quality"
2. Controleer POI content coverage: SELECT destination_id, COUNT(*) FROM POI WHERE enriched_detail_description IS NOT NULL GROUP BY destination_id
3. Controleer vertalingen: SELECT destination_id, COUNT(*) FROM POI WHERE enriched_detail_description_nl IS NULL AND is_active=1 GROUP BY destination_id
4. Controleer MongoDB audits: mongosh --eval "db.content_quality_audits.find().sort({timestamp:-1}).limit(1).pretty()"
5. Herstart API: pm2 restart holidaibutler-api
6. Agent draait wekelijks (maandag 05:00 UTC) — wacht op volgende run` } },
  { id: 'smokeTest', name: 'Smoke Test Runner', englishName: 'Smoke Test Runner', category: 'monitoring', type: 'A',
    description: 'E2E smoke tests per destination',
    description_en: 'End-to-end smoke tests per destination',
    tasks: ['5 smoke tests per destination uitvoeren', '3 infrastructuur tests uitvoeren', 'Threema configuratie status checken', 'Test resultaten opslaan in MongoDB'],
    monitoring_scope: 'API endpoints, frontend beschikbaarheid, Threema',
    output_description: 'Smoke test resultaten in MongoDB, failure alerts',
    schedule: '45 7 * * *', actorNames: ['health-monitor'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "Smoke Test"
2. Test API handmatig: curl -s https://api.holidaibutler.com/api/v1/health
3. Test frontend: curl -sI https://texelmaps.nl | head -5
4. Test frontend: curl -sI https://holidaibutler.com | head -5
5. Controleer MongoDB resultaten: mongosh --eval "db.smoke_test_results.find().sort({timestamp:-1}).limit(1).pretty()"
6. Herstart API: pm2 restart holidaibutler-api
7. Agent draait dagelijks (07:45 UTC) — wacht op volgende run` } },
  { id: 'backupHealth', name: 'Backup Health Checker', englishName: 'Backup Health Checker', category: 'monitoring', type: 'B',
    description: 'Backup recency en disk space monitoring',
    description_en: 'Backup recency and disk space monitoring',
    tasks: ['MySQL backup recency controleren', 'MongoDB backup recency controleren', 'Disk space monitoring', 'CRITICAL alerts bij verouderde backups'],
    monitoring_scope: '/root/backups/, disk space, backup timestamps',
    output_description: 'Backup health checks in MongoDB, CRITICAL alerts',
    schedule: '30 7 * * *', actorNames: ['health-monitor'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "Backup"
2. Controleer backup bestanden: ls -la /root/backups/
3. Controleer disk space: df -h /
4. Handmatige MySQL backup: mysqldump --no-defaults -u pxoziy_1 -h jotx.your-database.de pxoziy_db1 | gzip > /root/backups/manual_backup.sql.gz
5. Controleer MongoDB backups: mongosh --eval "db.backup_health_checks.find().sort({timestamp:-1}).limit(1).pretty()"
6. Herstart API: pm2 restart holidaibutler-api
7. Agent draait dagelijks (07:30 UTC) — wacht op volgende run` } }
];

/**
 * Scheduled jobs metadata for admin dashboard (Fase 9B)
 */
const SCHEDULED_JOBS_METADATA = [
  { name: 'daily-briefing', agent: 'De Bode', cron: '0 8 * * *', description: 'Genereert dagelijkse status email voor eigenaar' },
  { name: 'health-check', agent: 'De Dokter', cron: '0 * * * *', description: 'Systeem health checks (portals, SSL, API)' },
  { name: 'data-sync', agent: 'De Koerier', cron: '0 6 * * *', description: 'POI en review data synchronisatie' },
  { name: 'holibot-sync', agent: 'Het Geheugen', cron: '0 4 * * *', description: 'ChromaDB vectorisatie en QnA sync' },
  { name: 'communication-flow', agent: 'De Gastheer', cron: '0 */4 * * *', description: 'User journey processing en communicatie' },
  { name: 'gdpr-consent-audit', agent: 'De Poortwachter', cron: '0 */4 * * *', description: 'GDPR consent controle en data retention' },
  { name: 'ux-review', agent: 'De Stylist', cron: '0 6 * * 1', description: 'Wekelijkse UX/UI en brand consistency review' },
  { name: 'code-quality', agent: 'De Corrector', cron: '0 6 * * 1', description: 'Wekelijkse code quality analyse' },
  { name: 'security-scan', agent: 'De Bewaker', cron: '0 2 * * *', description: 'Dagelijkse security en vulnerability scan' },
  { name: 'quality-check', agent: 'De Inspecteur', cron: '0 6 * * 1', description: 'Wekelijkse kwaliteitscontrole' },
  { name: 'architecture-review', agent: 'De Architect', cron: '0 3 * * 0', description: 'Wekelijkse architectuur assessment' },
  { name: 'learning-cycle', agent: 'De Leermeester', cron: '30 5 * * 1', description: 'Wekelijkse pattern learning en optimalisatie' },
  { name: 'config-evaluation', agent: 'De Thermostaat', cron: '0 */6 * * *', description: 'Configuratie evaluatie en drift detectie' },
  { name: 'predictions', agent: 'De Weermeester', cron: '0 3 * * 0', description: 'Wekelijkse trend analyse en voorspellingen' },
  { name: 'content-quality-audit', agent: 'Content Quality Checker', cron: '0 5 * * 1', description: 'Wekelijkse content completeness audit' },
  { name: 'smoke-test', agent: 'Smoke Test Runner', cron: '45 7 * * *', description: 'Dagelijkse E2E smoke tests alle destinations' },
  { name: 'backup-recency-check', agent: 'Backup Health Checker', cron: '30 7 * * *', description: 'Dagelijkse backup recency en disk check' },
  { name: 'chromadb-state-snapshot', agent: 'Het Geheugen', cron: '0 3 * * 0', description: 'Wekelijkse ChromaDB vector count snapshot' },
  { name: 'agent-success-rate', agent: 'De Maestro', cron: '30 5 * * 1', description: 'Wekelijkse agent success rate aggregatie' },
  { name: 'tier-update', agent: 'De Koerier', cron: '0 5 * * *', description: 'Dagelijkse POI tier herberekening' },
  { name: 'session-cleanup', agent: 'De Poortwachter', cron: '0 3 * * *', description: 'Dagelijkse verlopen sessies opruimen' },
  { name: 'review-sentiment', agent: 'De Koerier', cron: '0 7 * * *', description: 'Review sentiment analyse en aggregatie' },
  { name: 'cache-warmup', agent: 'De Maestro', cron: '0 5 * * *', description: 'Dagelijkse Redis cache opwarming' }
];

/**
 * Extended agent data: dependencies + output per agent (Fase 9C BLOK 2A)
 */
const AGENT_EXTENDED_DATA = {
  maestro: {
    dependencies: ['BullMQ', 'Redis', 'MongoDB audit_logs'],
    output: { type: 'Job Scheduling', frequency: 'Continu', recipients: 'Intern', description: 'Job scheduling, error logging, agent lifecycle management' }
  },
  bode: {
    dependencies: ['MongoDB audit_logs', 'Redis agent status', 'MailerLite API', 'MySQL POI/review counts'],
    output: { type: 'Email + MailerLite', frequency: 'Dagelijks 08:00', recipients: 'Eigenaar (via MailerLite)', description: 'Status email met agent health, budget, alerts en aanbevolen acties' }
  },
  dokter: {
    dependencies: ['HTTP portals (7)', 'SSL certs via tls.connect (5 domeinen)', 'MySQL', 'MongoDB', 'Redis'],
    output: { type: 'Health Alerts', frequency: 'Elk uur', recipients: 'MongoDB + De Bode', description: 'Uptime monitoring, SSL expiry waarschuwingen, health rapportage' }
  },
  koerier: {
    dependencies: ['MySQL POI/reviews', 'Google Places API', 'MongoDB content_quality_audits'],
    output: { type: 'Data Sync', frequency: 'Dagelijks 06:00', recipients: 'MySQL Database', description: 'Gesynchroniseerde POI/review data, content quality audits' }
  },
  geheugen: {
    dependencies: ['MySQL POI/QnA', 'ChromaDB Cloud', 'Mistral Embed API', 'MongoDB chromadb_state_snapshots'],
    output: { type: 'Vectorisatie', frequency: 'Dagelijks 04:00', recipients: 'ChromaDB Cloud', description: 'Gevectoriseerde POI/QnA content, state snapshots in MongoDB' }
  },
  gastheer: {
    dependencies: ['MySQL user_journeys', 'Redis session state', 'MailerLite API'],
    output: { type: 'Journey Analytics', frequency: 'Elke 4 uur', recipients: 'MySQL Database', description: 'User journey analytics, communicatie logs, engagement metrics' }
  },
  poortwachter: {
    dependencies: ['MySQL Users/consent', 'Redis sessions', 'MongoDB audit_logs'],
    output: { type: 'GDPR Compliance', frequency: 'Elke 4 uur', recipients: 'MySQL + MongoDB', description: 'GDPR compliance rapportages, consent audit logs, data retention' }
  },
  stylist: {
    dependencies: ['Frontend codebase', 'Destination brand configs'],
    output: { type: 'UX Review', frequency: 'Wekelijks (maandag 06:00)', recipients: 'MongoDB audit_logs', description: 'UX review rapporten, brand violation alerts' }
  },
  corrector: {
    dependencies: ['Node.js codebase', 'npm dependencies', 'ESLint config'],
    output: { type: 'Code Quality', frequency: 'Wekelijks (maandag 06:00)', recipients: 'MongoDB audit_logs', description: 'Code quality rapporten, dependency vulnerability alerts' }
  },
  bewaker: {
    dependencies: ['npm audit', 'API endpoints', 'Auth middleware', 'Rate limiter config'],
    output: { type: 'Security Scan', frequency: 'Dagelijks 02:00', recipients: 'MongoDB audit_logs', description: 'Security scan rapporten, vulnerability alerts' }
  },
  inspecteur: {
    dependencies: ['MySQL data integriteit', 'API endpoints', 'MongoDB audit_logs'],
    output: { type: 'Quality Reports', frequency: 'Wekelijks (maandag 06:00)', recipients: 'MongoDB audit_logs', description: 'Kwaliteitsrapporten, data integriteit alerts' }
  },
  architect: {
    dependencies: ['Codebase structuur', 'Dependencies graph', 'Destination configs'],
    output: { type: 'Architecture Review', frequency: 'Wekelijks (zondag 03:00)', recipients: 'MongoDB audit_logs', description: 'Architectuur rapporten, schaalbaarheids aanbevelingen' }
  },
  leermeester: {
    dependencies: ['MongoDB agent_learning_patterns', 'MySQL analytics data', 'Redis cache'],
    output: { type: 'Learning Patterns', frequency: 'Wekelijks (maandag 05:30)', recipients: 'MongoDB', description: 'Optimalisatie suggesties, learning patterns in MongoDB' }
  },
  thermostaat: {
    dependencies: ['Redis config state', 'MySQL performance metrics', 'MongoDB audit_logs'],
    output: { type: 'Config Alerts', frequency: 'Elke 6 uur', recipients: 'Redis + Eigenaar', description: 'Configuratie alerts, evaluatie resultaten in Redis' }
  },
  weermeester: {
    dependencies: ['MySQL POI/review trends', 'MongoDB agent_learning_patterns', 'Seizoensdata'],
    output: { type: 'Predictions', frequency: 'Wekelijks (zondag 03:00)', recipients: 'MongoDB + De Bode', description: 'Trend analyses, prediction alerts, seizoensvoorspellingen' }
  },
  contentQuality: {
    dependencies: ['MySQL POI content (4 talen)', 'MongoDB content_quality_audits'],
    output: { type: 'Content Audit', frequency: 'Wekelijks (maandag 05:00)', recipients: 'MongoDB', description: 'Content completeness audits, kwaliteitsscore per destination' }
  },
  smokeTest: {
    dependencies: ['HTTP endpoints (5 per destination + 3 infra)', 'MongoDB smoke_test_results'],
    output: { type: 'Test Results', frequency: 'Dagelijks 07:45', recipients: 'MongoDB + De Bode', description: 'E2E smoke test resultaten, failure alerts' }
  },
  backupHealth: {
    dependencies: ['/root/backups/ directory', 'Disk space (df)', 'MongoDB backup_health_checks'],
    output: { type: 'Backup Health', frequency: 'Dagelijks 07:30', recipients: 'MongoDB + De Bode', description: 'Backup recency checks, disk space monitoring, CRITICAL alerts' }
  }
};

/**
 * Convert cron expression to human-readable Dutch string
 */
function cronToHuman(cron) {
  if (!cron) return 'On-demand';
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;
  const [min, hour, dom, , dow] = parts;

  // Every N minutes
  if (min.startsWith('*/') && hour === '*') return `Elke ${min.slice(2)} min`;
  // Every N hours
  if (min === '0' && hour.startsWith('*/')) return `Elke ${hour.slice(2)} uur`;
  // Specific hour:min patterns
  const hh = hour.padStart(2, '0');
  const mm = min.padStart(2, '0');
  const time = `${hh}:${mm}`;
  // Monthly on Nth
  if (dom !== '*') return `Maandelijks ${dom}e ${time}`;
  // Day of week
  const dayNames = { '0': 'Zondag', '1': 'Maandag', '2': 'Dinsdag', '3': 'Woensdag', '4': 'Donderdag', '5': 'Vrijdag', '6': 'Zaterdag' };
  if (dow !== '*') return `${dayNames[dow] || `Dag ${dow}`} ${time}`;
  // Daily at specific time
  return `Dagelijks ${time}`;
}

/**
 * Calculate agent status based on last run and schedule
 */
function calculateAgentStatus(lastRun, schedule) {
  if (!lastRun) return 'unknown';
  if (lastRun.status === 'error' || lastRun.status === 'failed') return 'error';

  if (!schedule) return (lastRun.status === 'completed' || lastRun.status === 'success') ? 'healthy' : 'warning';

  // Parse cron schedule to determine expected interval in ms
  // Format: min hour dayOfMonth month dayOfWeek
  const parts = schedule.split(' ');
  const [min, hour, dayOfMonth, , dayOfWeek] = parts;
  let intervalMs;

  if (dayOfWeek && dayOfWeek !== '*') {
    // Weekly schedule (e.g., '0 5 * * 1' = Monday 05:00)
    intervalMs = 7 * 24 * 3600 * 1000; // 168 hours
  } else if (dayOfMonth && dayOfMonth !== '*') {
    // Monthly schedule (e.g., '0 3 1 * *' = 1st of month)
    intervalMs = 30 * 24 * 3600 * 1000;
  } else if (min.startsWith('*/') && hour === '*') {
    // Sub-hourly (e.g., '*/30 * * * *' = every 30 min)
    intervalMs = parseInt(min.slice(2)) * 60 * 1000;
  } else if (min === '0' && hour.startsWith('*/')) {
    // Multi-hourly (e.g., '0 */4 * * *' = every 4 hours)
    intervalMs = parseInt(hour.slice(2)) * 3600 * 1000;
  } else if (hour === '*') {
    // Hourly (e.g., '0 * * * *')
    intervalMs = 60 * 60 * 1000;
  } else {
    // Daily default (e.g., '0 6 * * *')
    intervalMs = 24 * 3600 * 1000;
  }

  const elapsed = Date.now() - new Date(lastRun.timestamp).getTime();
  // Healthy if within 2x the expected interval
  if (elapsed < intervalMs * 2) return 'healthy';
  // Warning if within 3x the expected interval
  if (elapsed < intervalMs * 3) return 'warning';
  // Error if very stale (more than 3x expected interval)
  return 'error';
}

/**
 * GET /agents/status
 * Agent dashboard data. Redis cached for 60 seconds.
 * Sources: static metadata + MongoDB audit_logs + Redis state + monitoring collections
 */
router.get('/agents/status', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const { category, destination, refresh } = req.query;
    const scopeSuffix = req.destScope ? `:scope:${req.destScope.join(',')}` : '';
    const cacheKey = `admin:agents:status${scopeSuffix}`;
    const redis = getRedis();

    // Check cache (unless force refresh)
    if (redis && refresh !== 'true') {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return res.json(JSON.parse(cached));
      } catch { /* cache miss */ }
    }

    // Build agent list from static metadata + extended data
    const agents = AGENT_METADATA.map(meta => {
      const ext = AGENT_EXTENDED_DATA[meta.id] || {};
      return {
        id: meta.id,
        name: meta.name,
        englishName: meta.englishName,
        category: meta.category,
        type: meta.type,
        description: meta.description,
        description_en: meta.description_en,
        tasks: meta.tasks || [],
        monitoring_scope: meta.monitoring_scope || null,
        output_description: meta.output_description || null,
        dependencies: ext.dependencies || [],
        output: ext.output || null,
        scheduledJobs: SCHEDULED_JOBS_METADATA.filter(j => j.agent === meta.name).map(j => ({
          name: j.name,
          cron: j.cron,
          cronHuman: cronToHuman(j.cron),
          description: j.description
        })),
        schedule: meta.schedule,
        scheduleHuman: cronToHuman(meta.schedule),
        errorInstructions: meta.errorInstructions || null,
        destinationAware: meta.type === 'A',
        status: 'unknown',
        lastRun: null,
        destinations: meta.type === 'A' ? { calpe: { lastRun: null, status: 'unknown' }, texel: { lastRun: null, status: 'unknown' } } : null
      };
    });

    let partial = false;
    const recentActivity = [];

    // BRON 1b: MongoDB agent_configurations (merge custom config over static metadata)
    try {
      if (mongoose.connection.readyState === 1) {
        const db = mongoose.connection.db;
        const dbConfigs = await db.collection('agent_configurations').find({}).toArray();
        const configMap = {};
        dbConfigs.forEach(c => { configMap[c.agent_key] = c; });

        for (const agent of agents) {
          const dbConfig = configMap[agent.id];
          if (dbConfig) {
            if (dbConfig.display_name) agent.name = dbConfig.display_name;
            if (dbConfig.emoji) agent.emoji = dbConfig.emoji;
            if (dbConfig.description_nl) agent.description = dbConfig.description_nl;
            if (dbConfig.description_en) agent.description_en = dbConfig.description_en;
            if (dbConfig.description_de) agent.description_de = dbConfig.description_de;
            if (dbConfig.description_es) agent.description_es = dbConfig.description_es;
            if (dbConfig.tasks) agent.tasks = dbConfig.tasks;
            if (dbConfig.is_active !== undefined) agent.is_active = dbConfig.is_active;
          }
        }
      }
    } catch (configErr) {
      logger.warn('[AdminPortal] Agent config merge failed:', configErr.message);
      // Non-critical: continue with static metadata
    }

    // BRON 2: MongoDB audit_logs (last 24h)
    try {
      if (mongoose.connection.readyState === 1) {
        const db = mongoose.connection.db;
        const auditLogs = db.collection('audit_logs');
        const since = new Date(Date.now() - 24 * 3600 * 1000);

        // Get last runs per actor
        const lastRuns = await auditLogs.aggregate([
          { $match: { 'actor.type': 'agent', timestamp: { $gte: since } } },
          { $sort: { timestamp: -1 } },
          { $group: {
            _id: '$actor.name',
            lastTimestamp: { $first: '$timestamp' },
            lastAction: { $first: '$action' },
            lastStatus: { $first: '$status' },
            lastDuration: { $first: '$duration' },
            lastDescription: { $first: '$description' },
            lastResult: { $first: '$result' }
          }}
        ]).toArray();

        // Map audit log actors to agents
        for (const agent of agents) {
          const meta = AGENT_METADATA.find(m => m.id === agent.id);
          if (!meta) continue;

          const matchingRuns = lastRuns.filter(r => meta.actorNames.includes(r._id));
          if (matchingRuns.length > 0) {
            // Use the most recent run across all actor names
            const latest = matchingRuns.sort((a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp))[0];
            agent.lastRun = {
              timestamp: latest.lastTimestamp,
              duration: latest.lastDuration || null,
              status: latest.lastStatus === 'completed' ? 'success' : latest.lastStatus || 'unknown',
              error: latest.lastResult?.success === false ? (latest.lastResult?.error || latest.lastDescription) : null
            };
            agent.status = calculateAgentStatus(agent.lastRun, meta.schedule);
          }
        }

        // Populate per-destination status for Cat A agents from audit_logs
        const destIds = { 1: 'calpe', 2: 'texel' };
        for (const agent of agents) {
          if (agent.type !== 'A' || !agent.destinations) continue;
          const meta = AGENT_METADATA.find(m => m.id === agent.id);
          if (!meta) continue;
          for (const [numId, destKey] of Object.entries(destIds)) {
            const destRun = await auditLogs.findOne(
              { 'actor.name': { $in: meta.actorNames }, 'metadata.destinationId': parseInt(numId), timestamp: { $gte: since } },
              { sort: { timestamp: -1 } }
            );
            if (destRun) {
              const destStatus = (destRun.status === 'completed' || destRun.status === 'success') ? 'success'
                : (destRun.status === 'error' || destRun.status === 'failed') ? 'error'
                : 'partial';
              agent.destinations[destKey] = {
                lastRun: destRun.timestamp,
                status: destStatus
              };
            } else if (agent.lastRun) {
              // If agent ran but no destination-specific log, inherit overall status
              agent.destinations[destKey] = {
                lastRun: agent.lastRun.timestamp,
                status: agent.lastRun.status === 'success' ? 'success' : agent.lastRun.status === 'error' ? 'error' : 'partial'
              };
            }
          }
        }

        // Get recent activity (last 50 entries)
        const recentLogs = await auditLogs.find(
          { 'actor.type': 'agent', timestamp: { $gte: since } }
        ).sort({ timestamp: -1 }).limit(50).toArray();

        for (const log of recentLogs) {
          // Map actor name to agent display name
          const matchedAgent = AGENT_METADATA.find(m => m.actorNames.includes(log.actor?.name));
          recentActivity.push({
            timestamp: log.timestamp,
            agent: matchedAgent ? matchedAgent.name : (log.actor?.name || 'Unknown'),
            action: log.action?.replace(/^job_(started|completed)_/, '') || log.description || 'unknown',
            destination: log.metadata?.destinationId ? (log.metadata.destinationId === 1 ? 'calpe' : log.metadata.destinationId === 2 ? 'texel' : 'all') : 'all',
            status: log.status === 'completed' ? 'success' : log.status || 'unknown',
            details: log.description || null,
            duration: log.duration || null
          });
        }

        // BRON 4: MongoDB monitoring collections
        try {
          const smokeAgent = agents.find(a => a.id === 'smokeTest');
          if (smokeAgent) {
            const smokeResult = await db.collection('smoke_test_results').findOne({}, { sort: { timestamp: -1 } });
            if (smokeResult) {
              smokeAgent.lastRun = {
                timestamp: smokeResult.timestamp,
                duration: null,
                status: smokeResult.total_failed === 0 ? 'success' : 'partial',
                error: smokeResult.total_failed > 0 ? `${smokeResult.total_failed}/${smokeResult.total_tests} tests failed` : null
              };
              smokeAgent.status = calculateAgentStatus(smokeAgent.lastRun, AGENT_METADATA.find(m => m.id === 'smokeTest').schedule);
              if (smokeAgent.destinations) {
                if (smokeResult.destinations?.calpe) {
                  smokeAgent.destinations.calpe = {
                    lastRun: smokeResult.timestamp,
                    status: smokeResult.destinations.calpe.tests_failed === 0 ? 'success' : 'partial'
                  };
                }
                if (smokeResult.destinations?.texel) {
                  smokeAgent.destinations.texel = {
                    lastRun: smokeResult.timestamp,
                    status: smokeResult.destinations.texel.tests_failed === 0 ? 'success' : 'partial'
                  };
                }
              }
            }
          }

          const contentAgent = agents.find(a => a.id === 'contentQuality');
          if (contentAgent) {
            const contentResult = await db.collection('content_quality_audits').findOne({}, { sort: { timestamp: -1 } });
            if (contentResult) {
              contentAgent.lastRun = {
                timestamp: contentResult.timestamp,
                duration: null,
                status: contentResult.overall_score >= 8 ? 'success' : 'partial',
                error: contentResult.overall_score < 8 ? `Quality score: ${contentResult.overall_score}/10` : null
              };
              contentAgent.status = calculateAgentStatus(contentAgent.lastRun, AGENT_METADATA.find(m => m.id === 'contentQuality').schedule);
            }
          }

          const backupAgent = agents.find(a => a.id === 'backupHealth');
          if (backupAgent) {
            const backupResult = await db.collection('backup_health_checks').findOne({}, { sort: { timestamp: -1 } });
            if (backupResult) {
              backupAgent.lastRun = {
                timestamp: backupResult.timestamp,
                duration: null,
                status: backupResult.overall === 'HEALTHY' ? 'success' : 'error',
                error: backupResult.overall !== 'HEALTHY' ? `Backup status: ${backupResult.overall}` : null
              };
              backupAgent.status = backupResult.overall === 'HEALTHY' ? 'healthy' : 'error';
            }
          }
        } catch (monitorErr) {
          logger.warn('[AdminPortal] Monitoring collections query failed:', monitorErr.message);
        }
      } else {
        partial = true;
      }
    } catch (mongoErr) {
      logger.warn('[AdminPortal] MongoDB agent query failed:', mongoErr.message);
      partial = true;
    }

    // BRON 3: Redis agent state (thermostaat)
    if (redis) {
      try {
        const thermoData = await redis.get('thermostaat:last_evaluation');
        if (thermoData) {
          const thermo = JSON.parse(thermoData);
          const thermoAgent = agents.find(a => a.id === 'thermostaat');
          if (thermoAgent && thermo.timestamp) {
            if (!thermoAgent.lastRun || new Date(thermo.timestamp) > new Date(thermoAgent.lastRun.timestamp)) {
              thermoAgent.lastRun = {
                timestamp: thermo.timestamp,
                duration: null,
                status: 'success',
                error: null
              };
              thermoAgent.status = calculateAgentStatus(thermoAgent.lastRun, AGENT_METADATA.find(m => m.id === 'thermostaat').schedule);
            }
          }
        }
      } catch (redisErr) {
        logger.warn('[AdminPortal] Redis agent state query failed:', redisErr.message);
      }
    }

    // Populate warningDetail + recommendedAction for warning/error agents
    for (const agent of agents) {
      if (agent.status === 'warning' || agent.status === 'error') {
        if (agent.lastRun?.error) {
          agent.warningDetail = agent.lastRun.error;
        } else if (agent.status === 'warning') {
          agent.warningDetail = 'Agent draait niet volgens schema';
        } else {
          // Check if last run actually failed vs agent just being stale
          if (agent.lastRun && (agent.lastRun.status === 'success' || agent.lastRun.status === 'completed')) {
            agent.warningDetail = 'Agent draait niet meer (laatste run was succesvol, maar te lang geleden)';
          } else {
            agent.warningDetail = 'Laatste run gefaald';
          }
        }
        agent.recommendedAction = agent.status === 'error'
          ? `Check logs: pm2 logs holidaibutler-api --lines 100 | grep "${agent.englishName || agent.name}"`
          : 'Controleer scheduler status en agent configuratie';
      }
    }

    // Populate recentActivity per agent (last 5 entries)
    if (mongoose.connection.readyState === 1) {
      try {
        const db = mongoose.connection.db;
        const auditLogs = db.collection('audit_logs');
        const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
        for (const agent of agents) {
          const meta = AGENT_METADATA.find(m => m.id === agent.id);
          if (!meta) continue;
          const logs = await auditLogs.find(
            { 'actor.name': { $in: meta.actorNames }, timestamp: { $gte: since } }
          ).sort({ timestamp: -1 }).limit(5).toArray();
          agent.recentRuns = logs.map(l => ({
            timestamp: l.timestamp,
            action: l.action || l.description || 'unknown',
            status: (l.status === 'completed' || l.status === 'success') ? 'success' : l.status || 'unknown',
            destination: l.metadata?.destinationId ? (l.metadata.destinationId === 1 ? 'calpe' : 'texel') : null
          }));
        }
      } catch { /* non-critical */ }
    }

    // Build summary
    const summary = {
      total: agents.length,
      healthy: agents.filter(a => a.status === 'healthy').length,
      warning: agents.filter(a => a.status === 'warning').length,
      error: agents.filter(a => a.status === 'error').length,
      unknown: agents.filter(a => a.status === 'unknown').length
    };

    // ── RBAC: filter Cat A agent destination data + recentActivity by destScope ──
    const idToCode = { 1: 'calpe', 2: 'texel', 3: 'alicante' };
    if (req.destScope) {
      const allowedCodes = req.destScope.map(id => idToCode[id]).filter(Boolean);
      for (const agent of agents) {
        if (agent.destinations) {
          const filtered = {};
          for (const code of allowedCodes) {
            if (agent.destinations[code]) filtered[code] = agent.destinations[code];
          }
          agent.destinations = Object.keys(filtered).length > 0 ? filtered : null;
        }
      }
    }

    // Apply server-side filters (client can also filter)
    let filteredAgents = agents;
    if (category && category !== 'all') {
      filteredAgents = agents.filter(a => a.category === category);
    }

    // Build destinations overview (only allowed destinations)
    const destOverview = {};
    const destEntries = req.destScope
      ? req.destScope.map(id => [idToCode[id], id]).filter(([code]) => code)
      : [['calpe', 1], ['texel', 2]];
    for (const [code, id] of destEntries) {
      destOverview[code] = { id, activeAgents: agents.filter(a => a.type === 'A').length };
    }

    // Filter recentActivity by destScope
    const scopedActivity = req.destScope
      ? recentActivity.filter(a => a.destination === 'all' || req.destScope.includes(a.destination === 'calpe' ? 1 : a.destination === 'texel' ? 2 : 0))
      : recentActivity;

    const result = {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        partial,
        summary,
        destinations: destOverview,
        agents: filteredAgents,
        recentActivity: scopedActivity,
        scheduledJobs: SCHEDULED_JOBS_METADATA
      }
    };

    // Cache for 60 seconds
    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 60);
      } catch { /* non-critical */ }
    }

    res.json(result);
  } catch (error) {
    logger.error('[AdminPortal] Agent status error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred fetching agent status' }
    });
  }
});

// ============================================================
// MODULE 8D-1: POI MANAGEMENT
// ============================================================

/**
 * GET /pois
 * POI list with pagination, search, and filters.
 */
router.get('/pois', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const {
      destination, category, search, hasContent, isActive,
      page = 1, limit = 25, sort = 'name', order = 'asc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 25));
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clauses
    const where = [];
    const params = [];

    // RBAC: POI scope (poi_owner sees only their POIs)
    if (req.poiScope) {
      where.push(`p.id IN (${req.poiScope.map(() => '?').join(',')})`);
      params.push(...req.poiScope);
    }
    // RBAC: Destination scope (editor/reviewer sees only their destinations)
    else if (req.destScope) {
      where.push(`p.destination_id IN (${req.destScope.map(() => '?').join(',')})`);
      params.push(...req.destScope);
    }

    if (destination) {
      const destId = resolveDestinationId(destination);
      if (destId) {
        where.push('p.destination_id = ?');
        params.push(destId);
      }
    }
    if (category) {
      where.push('p.category = ?');
      params.push(category);
    }
    if (search) {
      where.push('(p.name LIKE ? OR p.enriched_detail_description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (hasContent === 'true') {
      where.push("p.enriched_detail_description IS NOT NULL AND p.enriched_detail_description != ''");
    } else if (hasContent === 'false') {
      where.push("(p.enriched_detail_description IS NULL OR p.enriched_detail_description = '')");
    }
    if (isActive === 'true') {
      where.push('p.is_active = 1');
    } else if (isActive === 'false') {
      where.push('p.is_active = 0');
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    // Sort mapping
    const sortMap = {
      name: 'p.name', category: 'p.category', rating: 'p.rating',
      updated: 'p.last_updated', destination: 'p.destination_id'
    };
    const sortCol = sortMap[sort] || 'p.name';
    const sortDir = order === 'desc' ? 'DESC' : 'ASC';

    // Count query
    const countResult = await mysqlSequelize.query(
      `SELECT COUNT(*) as total FROM POI p ${whereClause}`,
      { replacements: params, type: QueryTypes.SELECT }
    );
    const total = parseInt(countResult[0]?.total || 0);

    // Data query with aggregated counts
    const pois = await mysqlSequelize.query(
      `SELECT p.id, p.name, p.destination_id, p.category, p.subcategory,
              p.is_active, p.rating, p.last_updated,
              p.enriched_detail_description,
              p.enriched_detail_description_nl,
              p.enriched_detail_description_de,
              p.enriched_detail_description_es,
              (SELECT COUNT(*) FROM imageurls i WHERE i.poi_id = p.id) as imageCount,
              (SELECT COUNT(*) FROM reviews r WHERE r.poi_id = p.id) as reviewCount,
              (SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.poi_id = p.id) as avgRating
       FROM POI p
       ${whereClause}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ? OFFSET ?`,
      { replacements: [...params, limitNum, offset], type: QueryTypes.SELECT }
    );

    // Compute content language count
    const poiList = pois.map(p => ({
      id: p.id,
      name: p.name,
      destination_id: p.destination_id,
      destinationName: p.destination_id === 1 ? 'Calpe' : p.destination_id === 2 ? 'Texel' : 'Unknown',
      category: p.category,
      subcategory: p.subcategory,
      is_active: !!p.is_active,
      hasContent: !!(p.enriched_detail_description && p.enriched_detail_description.trim()),
      contentLanguages:
        (p.enriched_detail_description ? 1 : 0) +
        (p.enriched_detail_description_nl ? 1 : 0) +
        (p.enriched_detail_description_de ? 1 : 0) +
        (p.enriched_detail_description_es ? 1 : 0),
      imageCount: parseInt(p.imageCount) || 0,
      reviewCount: parseInt(p.reviewCount) || 0,
      avgRating: p.avgRating ? parseFloat(p.avgRating) : null,
      last_updated: p.last_updated
    }));

    // Get filter options
    const categories = await mysqlSequelize.query(
      `SELECT DISTINCT category FROM POI WHERE category IS NOT NULL ORDER BY category`,
      { type: QueryTypes.SELECT }
    );

    res.json({
      success: true,
      data: {
        pois: poiList,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        },
        filters: {
          categories: categories.map(c => c.category),
          destinations: [
            { id: 1, name: 'Calpe' },
            { id: 2, name: 'Texel' }
          ]
        }
      }
    });
  } catch (error) {
    logger.error('[AdminPortal] POI list error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred fetching POIs' }
    });
  }
});

/**
 * GET /pois/stats
 * POI statistics per destination. Redis cached 5 minutes.
 */
router.get('/pois/stats', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const { destination } = req.query;
    const scopeKey = req.poiScope ? `poi:${req.poiScope.join(',')}` : req.destScope ? `dest:${req.destScope.join(',')}` : 'all';
    const cacheKey = destination ? `admin:pois:stats:${destination}:${scopeKey}` : `admin:pois:stats:${scopeKey}`;
    const redis = getRedis();

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return res.json(JSON.parse(cached));
      } catch { /* cache miss */ }
    }

    const destId = resolveDestinationId(destination);
    // Build base filter combining RBAC scope + destination filter
    const baseWhere = [];
    const baseParams = [];
    if (req.poiScope) {
      baseWhere.push(`p.id IN (${req.poiScope.map(() => '?').join(',')})`);
      baseParams.push(...req.poiScope);
    } else if (req.destScope) {
      baseWhere.push(`p.destination_id IN (${req.destScope.map(() => '?').join(',')})`);
      baseParams.push(...req.destScope);
    }
    if (destId) {
      baseWhere.push('p.destination_id = ?');
      baseParams.push(destId);
    }
    const destFilter = baseWhere.length > 0 ? 'WHERE ' + baseWhere.join(' AND ') : '';
    const destParams = baseParams;

    // Basic counts
    const counts = await mysqlSequelize.query(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
         SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive
       FROM POI p ${destFilter}`,
      { replacements: destParams, type: QueryTypes.SELECT }
    );

    // Content coverage
    const coverage = await mysqlSequelize.query(
      `SELECT
         SUM(CASE WHEN enriched_detail_description IS NOT NULL AND enriched_detail_description != '' THEN 1 ELSE 0 END) as en,
         SUM(CASE WHEN enriched_detail_description_nl IS NOT NULL AND enriched_detail_description_nl != '' THEN 1 ELSE 0 END) as nl,
         SUM(CASE WHEN enriched_detail_description_de IS NOT NULL AND enriched_detail_description_de != '' THEN 1 ELSE 0 END) as de_lang,
         SUM(CASE WHEN enriched_detail_description_es IS NOT NULL AND enriched_detail_description_es != '' THEN 1 ELSE 0 END) as es
       FROM POI p ${destFilter}`,
      { replacements: destParams, type: QueryTypes.SELECT }
    );

    // By destination (respects RBAC scope)
    const byDestWhere = [];
    const byDestParams = [];
    if (req.poiScope) {
      byDestWhere.push(`id IN (${req.poiScope.map(() => '?').join(',')})`);
      byDestParams.push(...req.poiScope);
    } else if (req.destScope) {
      byDestWhere.push(`destination_id IN (${req.destScope.map(() => '?').join(',')})`);
      byDestParams.push(...req.destScope);
    }
    const byDestWhereClause = byDestWhere.length > 0 ? 'WHERE ' + byDestWhere.join(' AND ') : '';
    const byDest = await mysqlSequelize.query(
      `SELECT destination_id, COUNT(*) as total,
              SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
       FROM POI ${byDestWhereClause} GROUP BY destination_id`,
      { replacements: byDestParams, type: QueryTypes.SELECT }
    );

    const byDestMap = {};
    for (const d of byDest) {
      const key = d.destination_id === 1 ? 'calpe' : d.destination_id === 2 ? 'texel' : `dest_${d.destination_id}`;
      byDestMap[key] = { total: parseInt(d.total), active: parseInt(d.active) };
    }

    // By category
    // byCat respects the same RBAC base filter
    const byCatWhere = ['is_active = 1'];
    const byCatParams = [];
    if (req.poiScope) {
      byCatWhere.push(`id IN (${req.poiScope.map(() => '?').join(',')})`);
      byCatParams.push(...req.poiScope);
    } else if (req.destScope) {
      byCatWhere.push(`destination_id IN (${req.destScope.map(() => '?').join(',')})`);
      byCatParams.push(...req.destScope);
    }
    if (destId) {
      byCatWhere.push('destination_id = ?');
      byCatParams.push(destId);
    }
    const byCat = await mysqlSequelize.query(
      `SELECT category, COUNT(*) as cnt FROM POI p
       WHERE ${byCatWhere.join(' AND ')}
       GROUP BY category ORDER BY cnt DESC`,
      { replacements: byCatParams, type: QueryTypes.SELECT }
    );

    const totalActive = parseInt(counts[0]?.active || 0);
    const byCategory = byCat.map(c => ({
      category: c.category,
      count: parseInt(c.cnt),
      pct: totalActive > 0 ? parseFloat(((parseInt(c.cnt) / totalActive) * 100).toFixed(1)) : 0
    }));

    // Image stats (respects RBAC scope)
    const imgWhere = [];
    const imgParams = [];
    if (req.poiScope) {
      imgWhere.push(`i.poi_id IN (${req.poiScope.map(() => '?').join(',')})`);
      imgParams.push(...req.poiScope);
    } else if (req.destScope || destId) {
      // Need JOIN to POI table for destination filter
      imgWhere.push('1=1'); // placeholder, join handles filtering
    }
    const imgJoin = (req.destScope || destId) ? 'INNER JOIN POI p ON i.poi_id = p.id' : '';
    if (req.destScope && !req.poiScope) {
      imgWhere.push(`p.destination_id IN (${req.destScope.map(() => '?').join(',')})`);
      imgParams.push(...req.destScope);
    }
    if (destId) {
      imgWhere.push('p.destination_id = ?');
      imgParams.push(destId);
    }
    const imgWhereClause = imgWhere.length > 0 ? 'WHERE ' + imgWhere.join(' AND ') : '';
    const imgStats = await mysqlSequelize.query(
      `SELECT COUNT(*) as totalImages,
              COUNT(DISTINCT i.poi_id) as poisWithImages
       FROM imageurls i ${imgJoin} ${imgWhereClause}`,
      { replacements: imgParams, type: QueryTypes.SELECT }
    );

    // Review stats (respects RBAC scope)
    const revWhere = [];
    const revParams = [];
    if (req.poiScope) {
      revWhere.push(`poi_id IN (${req.poiScope.map(() => '?').join(',')})`);
      revParams.push(...req.poiScope);
    } else if (req.destScope) {
      revWhere.push(`destination_id IN (${req.destScope.map(() => '?').join(',')})`);
      revParams.push(...req.destScope);
    }
    if (destId) {
      revWhere.push('destination_id = ?');
      revParams.push(destId);
    }
    const revWhereClause = revWhere.length > 0 ? 'WHERE ' + revWhere.join(' AND ') : '';
    const revStats = await mysqlSequelize.query(
      `SELECT COUNT(*) as totalReviews,
              COUNT(DISTINCT poi_id) as poisWithReviews,
              ROUND(AVG(rating), 1) as avgRating
       FROM reviews ${revWhereClause}`,
      { replacements: revParams, type: QueryTypes.SELECT }
    );

    // Per-destination content coverage (respects RBAC scope)
    const destCovWhere = [];
    const destCovParams = [];
    if (req.poiScope) {
      destCovWhere.push(`id IN (${req.poiScope.map(() => '?').join(',')})`);
      destCovParams.push(...req.poiScope);
    } else if (req.destScope) {
      destCovWhere.push(`destination_id IN (${req.destScope.map(() => '?').join(',')})`);
      destCovParams.push(...req.destScope);
    }
    const destCovWhereClause = destCovWhere.length > 0 ? 'WHERE ' + destCovWhere.join(' AND ') : '';
    const destContentCoverage = await mysqlSequelize.query(
      `SELECT destination_id,
              COUNT(*) as total,
              SUM(CASE WHEN enriched_detail_description IS NOT NULL AND enriched_detail_description != '' THEN 1 ELSE 0 END) as withContent
       FROM POI ${destCovWhereClause} GROUP BY destination_id`,
      { replacements: destCovParams, type: QueryTypes.SELECT }
    );
    const destCoverageMap = {};
    for (const dc of destContentCoverage) {
      const total = parseInt(dc.total) || 1;
      destCoverageMap[dc.destination_id] = parseFloat(((parseInt(dc.withContent) || 0) / total * 100).toFixed(1));
    }

    // Per-destination avg rating from reviews (respects RBAC scope)
    const destRatWhere = [];
    const destRatParams = [];
    if (req.poiScope) {
      destRatWhere.push(`poi_id IN (${req.poiScope.map(() => '?').join(',')})`);
      destRatParams.push(...req.poiScope);
    } else if (req.destScope) {
      destRatWhere.push(`destination_id IN (${req.destScope.map(() => '?').join(',')})`);
      destRatParams.push(...req.destScope);
    }
    const destRatWhereClause = destRatWhere.length > 0 ? 'WHERE ' + destRatWhere.join(' AND ') : '';
    const destAvgRating = await mysqlSequelize.query(
      `SELECT destination_id, ROUND(AVG(rating), 1) as avgRating FROM reviews ${destRatWhereClause} GROUP BY destination_id`,
      { replacements: destRatParams, type: QueryTypes.SELECT }
    );
    const destRatingMap = {};
    for (const dr of destAvgRating) {
      destRatingMap[dr.destination_id] = dr.avgRating ? parseFloat(dr.avgRating) : null;
    }

    // Build top-level per-destination objects (what frontend expects: data.calpe, data.texel)
    const perDest = {};
    for (const d of byDest) {
      const key = d.destination_id === 1 ? 'calpe' : d.destination_id === 2 ? 'texel' : `dest_${d.destination_id}`;
      perDest[key] = {
        total: parseInt(d.total),
        active: parseInt(d.active),
        contentCoverage: destCoverageMap[d.destination_id] || 0,
        avgRating: destRatingMap[d.destination_id] || null
      };
    }

    const result = {
      success: true,
      data: {
        ...perDest,
        total: parseInt(counts[0]?.total || 0),
        active: totalActive,
        inactive: parseInt(counts[0]?.inactive || 0),
        withContent: {
          en: parseInt(coverage[0]?.en || 0),
          nl: parseInt(coverage[0]?.nl || 0),
          de: parseInt(coverage[0]?.de_lang || 0),
          es: parseInt(coverage[0]?.es || 0)
        },
        byDestination: byDestMap,
        byCategory,
        imageStats: {
          totalImages: parseInt(imgStats[0]?.totalImages || 0),
          poisWithImages: parseInt(imgStats[0]?.poisWithImages || 0),
          avgPerPoi: totalActive > 0 ? parseFloat((parseInt(imgStats[0]?.totalImages || 0) / totalActive).toFixed(1)) : 0
        },
        reviewStats: {
          totalReviews: parseInt(revStats[0]?.totalReviews || 0),
          poisWithReviews: parseInt(revStats[0]?.poisWithReviews || 0),
          avgRating: revStats[0]?.avgRating ? parseFloat(revStats[0].avgRating) : null
        }
      }
    };

    if (redis) {
      try { await redis.set(cacheKey, JSON.stringify(result), 'EX', 300); } catch { /* non-critical */ }
    }

    res.json(result);
  } catch (error) {
    logger.error('[AdminPortal] POI stats error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred fetching POI stats' }
    });
  }
});

/**
 * GET /pois/categories
 * Distinct categories from POI table for filter dropdowns.
 */
router.get('/pois/categories', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const { destination } = req.query;
    const destId = resolveDestinationId(destination);

    // Build RBAC + destination filter
    const catWhere = ["category IS NOT NULL AND category != ''"];
    const catParams = [];
    if (req.poiScope) {
      catWhere.push(`id IN (${req.poiScope.map(() => '?').join(',')})`);
      catParams.push(...req.poiScope);
    } else if (req.destScope) {
      catWhere.push(`destination_id IN (${req.destScope.map(() => '?').join(',')})`);
      catParams.push(...req.destScope);
    }
    if (destId) {
      catWhere.push('destination_id = ?');
      catParams.push(destId);
    }

    const categories = await mysqlSequelize.query(
      `SELECT category, COUNT(*) as count
       FROM POI
       WHERE ${catWhere.join(' AND ')}
       GROUP BY category ORDER BY count DESC`,
      { replacements: catParams, type: QueryTypes.SELECT }
    );

    // Also fetch subcategories grouped by category
    const subWhere = ["subcategory IS NOT NULL AND subcategory != ''"];
    const subParams = [];
    if (req.poiScope) {
      subWhere.push(`id IN (${req.poiScope.map(() => '?').join(',')})`);
      subParams.push(...req.poiScope);
    } else if (req.destScope) {
      subWhere.push(`destination_id IN (${req.destScope.map(() => '?').join(',')})`);
      subParams.push(...req.destScope);
    }
    if (destId) {
      subWhere.push('destination_id = ?');
      subParams.push(destId);
    }

    const subcategories = await mysqlSequelize.query(
      `SELECT category, subcategory, COUNT(*) as count
       FROM POI
       WHERE ${subWhere.join(' AND ')}
       GROUP BY category, subcategory ORDER BY category, count DESC`,
      { replacements: subParams, type: QueryTypes.SELECT }
    );

    // Build subcategory map: { "Food & Drinks": ["Restaurant", "Bar", ...] }
    const subcatMap = {};
    for (const s of subcategories) {
      if (!subcatMap[s.category]) subcatMap[s.category] = [];
      subcatMap[s.category].push(s.subcategory);
    }

    res.json({
      success: true,
      data: {
        categories: categories.map(c => ({ name: c.category, count: parseInt(c.count) })),
        subcategories: subcatMap
      }
    });
  } catch (error) {
    logger.error('[AdminPortal] POI categories error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred fetching categories' }
    });
  }
});

/**
 * GET /pois/:id
 * POI detail with content, images, and reviews summary.
 */
router.get('/pois/:id', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const poiId = parseInt(req.params.id);
    if (!poiId || isNaN(poiId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid POI ID' } });
    }

    const pois = await mysqlSequelize.query(
      `SELECT * FROM POI WHERE id = ?`,
      { replacements: [poiId], type: QueryTypes.SELECT }
    );

    if (pois.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'POI not found' } });
    }

    const poi = pois[0];

    // RBAC: check user has access to this POI
    if (req.poiScope && !req.poiScope.includes(poi.id)) {
      return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'You do not have access to this POI.' } });
    }
    if (req.destScope && !req.destScope.includes(poi.destination_id)) {
      return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'You do not have access to this destination.' } });
    }

    // Images
    const images = await mysqlSequelize.query(
      `SELECT id, image_url, local_path, source, display_order FROM imageurls WHERE poi_id = ? ORDER BY COALESCE(display_order, 999), id LIMIT 20`,
      { replacements: [poiId], type: QueryTypes.SELECT }
    );

    // Reviews summary
    const reviewSummary = await mysqlSequelize.query(
      `SELECT COUNT(*) as total, ROUND(AVG(rating), 1) as avgRating,
              SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as r5,
              SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as r4,
              SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as r3,
              SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as r2,
              SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as r1
       FROM reviews WHERE poi_id = ?`,
      { replacements: [poiId], type: QueryTypes.SELECT }
    );

    const rs = reviewSummary[0] || {};

    res.json({
      success: true,
      data: {
        poi: {
          id: poi.id,
          name: poi.name,
          destination_id: poi.destination_id,
          destinationName: poi.destination_id === 1 ? 'Calpe' : poi.destination_id === 2 ? 'Texel' : 'Unknown',
          category: poi.category,
          subcategory: poi.subcategory,
          address: poi.address,
          city: poi.city,
          latitude: poi.latitude ? parseFloat(poi.latitude) : null,
          longitude: poi.longitude ? parseFloat(poi.longitude) : null,
          phone: poi.phone,
          website: poi.website,
          email: poi.email,
          is_active: !!poi.is_active,
          content: {
            en: {
              detail: poi.enriched_detail_description || '',
              tile: poi.enriched_tile_description_en || poi.enriched_tile_description || '',
              highlights: poi.enriched_highlights || ''
            },
            nl: { detail: poi.enriched_detail_description_nl || '' },
            de: { detail: poi.enriched_detail_description_de || '' },
            es: { detail: poi.enriched_detail_description_es || '' }
          },
          images: images.map((img, idx) => ({
            id: img.id,
            url: img.local_path
              ? `${process.env.IMAGE_BASE_URL || 'https://test.holidaibutler.com'}${img.local_path}`
              : img.image_url,
            localPath: img.local_path,
            source: img.source,
            display_order: img.display_order ?? idx,
            isPrimary: idx === 0
          })),
          reviewSummary: {
            total: parseInt(rs.total) || 0,
            avgRating: rs.avgRating ? parseFloat(rs.avgRating) : null,
            distribution: [5, 4, 3, 2, 1].map(r => ({
              rating: r,
              count: parseInt(rs[`r${r}`]) || 0
            }))
          },
          created_at: poi.created_at,
          last_updated: poi.last_updated
        }
      }
    });
  } catch (error) {
    logger.error('[AdminPortal] POI detail error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred fetching POI details' }
    });
  }
});

/**
 * PUT /pois/:id
 * Update POI content and/or is_active. Audit logged.
 */
router.put('/pois/:id', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'poi_owner', 'editor']), async (req, res) => {
  try {
    const poiId = parseInt(req.params.id);
    if (!poiId || isNaN(poiId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid POI ID' } });
    }

    const { content, descriptions, is_active, category, subcategory } = req.body;
    if (!content && !descriptions && is_active === undefined && category === undefined && subcategory === undefined) {
      return res.status(400).json({ success: false, error: { code: 'NO_CHANGES', message: 'No fields to update' } });
    }

    // Verify POI exists
    const existing = await mysqlSequelize.query(
      `SELECT id, destination_id, name, category, subcategory, enriched_detail_description,
              enriched_detail_description_nl, enriched_detail_description_de,
              enriched_detail_description_es, is_active FROM POI WHERE id = ?`,
      { replacements: [poiId], type: QueryTypes.SELECT }
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'POI not found' } });
    }

    const old = existing[0];

    // RBAC: check user has write access to this POI
    if (req.poiScope && !req.poiScope.includes(old.id)) {
      return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'You do not have write access to this POI.' } });
    }
    if (req.destScope && !req.destScope.includes(old.destination_id)) {
      return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'You do not have write access to this destination.' } });
    }
    const sets = [];
    const vals = [];
    const changes = {};

    // Content updates
    const langMap = {
      en: 'enriched_detail_description',
      nl: 'enriched_detail_description_nl',
      de: 'enriched_detail_description_de',
      es: 'enriched_detail_description_es'
    };

    // Accept both formats: content: { en: { description: '...' } } or descriptions: { en: '...' }
    const contentSource = content || (descriptions ? Object.fromEntries(
      Object.entries(descriptions).map(([lang, text]) => [lang, { description: text }])
    ) : null);

    if (contentSource) {
      for (const [lang, fields] of Object.entries(contentSource)) {
        const desc = typeof fields === 'string' ? fields : fields?.description;
        if (desc !== undefined && langMap[lang]) {
          const trimmed = String(desc).slice(0, 2000);
          sets.push(`${langMap[lang]} = ?`);
          vals.push(trimmed);
          const oldVal = old[langMap[lang]] || '';
          changes[lang] = { description: `${oldVal.slice(0, 50)}... → ${trimmed.slice(0, 50)}...` };
        }
      }
    }

    if (is_active !== undefined) {
      sets.push('is_active = ?');
      vals.push(is_active ? 1 : 0);
      changes.is_active = `${old.is_active} → ${is_active ? 1 : 0}`;
    }

    if (category !== undefined) {
      sets.push('category = ?');
      vals.push(String(category).slice(0, 100));
      changes.category = `${old.category || '—'} → ${category}`;
    }

    if (subcategory !== undefined) {
      sets.push('subcategory = ?');
      vals.push(subcategory ? String(subcategory).slice(0, 100) : null);
      changes.subcategory = `${old.subcategory || '—'} → ${subcategory || '—'}`;
    }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_CHANGES', message: 'No valid fields to update' } });
    }

    // Update
    await mysqlSequelize.query(
      `UPDATE POI SET ${sets.join(', ')} WHERE id = ?`,
      { replacements: [...vals, poiId] }
    );

    // Audit log + undo snapshot
    const auditId = await saveAuditLog({
      action: 'poi_update',
      adminId: req.adminUser.id,
      adminEmail: req.adminUser.email,
      details: `Updated POI #${poiId}: ${old.name}`,
      entityType: 'poi',
      entityId: String(poiId),
      metadata: { poi_name: old.name, destination_id: old.destination_id, changes }
    });
    if (auditId) {
      await saveUndoSnapshot({
        auditLogId: auditId,
        action: 'poi_update',
        entityType: 'poi',
        entityId: String(poiId),
        previousState: old,
        newState: { ...changes, poiId },
        createdBy: req.adminUser.email
      });
    }

    // Invalidate POI stats cache
    const redis = getRedis();
    if (redis) {
      try {
        await redis.del('admin:pois:stats');
        await redis.del(`admin:pois:stats:${old.destination_id}`);
      } catch { /* non-critical */ }
    }

    // Return updated POI (re-fetch)
    const updatedReq = { params: { id: String(poiId) }, adminUser: req.adminUser };
    const updatedPois = await mysqlSequelize.query(
      `SELECT id, name, destination_id, category FROM POI WHERE id = ?`,
      { replacements: [poiId], type: QueryTypes.SELECT }
    );

    res.json({
      success: true,
      data: { message: 'POI updated successfully', poi: updatedPois[0] || { id: poiId }, changes }
    });
  } catch (error) {
    logger.error('[AdminPortal] POI update error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred updating the POI' }
    });
  }
});

/**
 * PUT /pois/:id/images
 * Reorder POI images. Accepts ordered array of image IDs.
 * Requires display_order column in imageurls table.
 */
router.put('/pois/:id/images', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'poi_owner', 'editor']), async (req, res) => {
  try {
    const poiId = parseInt(req.params.id);
    if (!poiId || isNaN(poiId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid POI ID' } });
    }

    // RBAC: check user has access to this POI's destination
    if (req.poiScope || req.destScope) {
      const poiCheck = await mysqlSequelize.query(
        `SELECT id, destination_id FROM POI WHERE id = ?`,
        { replacements: [poiId], type: QueryTypes.SELECT }
      );
      if (poiCheck.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'POI not found' } });
      }
      if (req.poiScope && !req.poiScope.includes(poiCheck[0].id)) {
        return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'You do not have access to this POI.' } });
      }
      if (req.destScope && !req.destScope.includes(poiCheck[0].destination_id)) {
        return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'You do not have access to this destination.' } });
      }
    }

    const { imageIds } = req.body;
    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_DATA', message: 'imageIds array required' } });
    }

    // Verify images belong to this POI
    const existing = await mysqlSequelize.query(
      `SELECT id FROM imageurls WHERE poi_id = ?`,
      { replacements: [poiId], type: QueryTypes.SELECT }
    );
    const existingIds = new Set(existing.map(i => i.id));
    const validIds = imageIds.filter(id => existingIds.has(parseInt(id)));

    if (validIds.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_VALID_IMAGES', message: 'No valid image IDs for this POI' } });
    }

    // Update display_order for each image (1-based: 1, 2, 3, ... — C2 spec)
    for (let i = 0; i < validIds.length; i++) {
      await mysqlSequelize.query(
        `UPDATE imageurls SET display_order = ? WHERE id = ? AND poi_id = ?`,
        { replacements: [i + 1, parseInt(validIds[i]), poiId] }
      );
    }

    // Audit log
    try {
      if (mongoose.connection.readyState === 1) {
        const db = mongoose.connection.db;
        await db.collection('audit_logs').insertOne({
          action: 'poi_images_reordered',
          poi_id: poiId,
          admin_id: req.adminUser.id || req.adminUser.userId,
          admin_email: req.adminUser.email,
          imageOrder: validIds.map(Number),
          timestamp: new Date(),
          actor: { type: 'admin', name: 'admin-portal' }
        });
      }
    } catch { /* non-critical */ }

    // Invalidate POI detail cache
    const redis = getRedis();
    if (redis) {
      try { await redis.del(`admin:poi:${poiId}`); } catch { /* */ }
    }

    res.json({ success: true, data: { message: 'Image order updated', count: validIds.length } });
  } catch (error) {
    logger.error('[AdminPortal] Image reorder error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred reordering images' }
    });
  }
});

/**
 * DELETE /pois/:poiId/images/:imageId
 * Permanently delete a POI image. Removes from DB, renumbers remaining images.
 * C1: Fase 9F audit — image permanent verwijderen.
 */
router.delete('/pois/:poiId/images/:imageId', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'poi_owner', 'editor']), async (req, res) => {
  try {
    const poiId = parseInt(req.params.poiId);
    const imageId = parseInt(req.params.imageId);
    if (!poiId || isNaN(poiId) || !imageId || isNaN(imageId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid POI or image ID' } });
    }

    // RBAC: check destination access
    if (req.destScope) {
      const poiCheck = await mysqlSequelize.query(
        `SELECT destination_id FROM POI WHERE id = ?`,
        { replacements: [poiId], type: QueryTypes.SELECT }
      );
      if (poiCheck.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'POI not found' } });
      }
      if (!req.destScope.includes(poiCheck[0].destination_id)) {
        return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'No access to this destination' } });
      }
    }

    // Fetch image info before deleting (for audit)
    const imageRows = await mysqlSequelize.query(
      `SELECT id, image_url, local_path, source FROM imageurls WHERE id = ? AND poi_id = ?`,
      { replacements: [imageId, poiId], type: QueryTypes.SELECT }
    );
    if (imageRows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'IMAGE_NOT_FOUND', message: 'Image not found for this POI' } });
    }

    // Delete from DB
    await mysqlSequelize.query(
      `DELETE FROM imageurls WHERE id = ? AND poi_id = ?`,
      { replacements: [imageId, poiId] }
    );

    // Renumber remaining images: 1, 2, 3, ... (no gaps)
    const remaining = await mysqlSequelize.query(
      `SELECT id FROM imageurls WHERE poi_id = ? ORDER BY COALESCE(display_order, 999), id`,
      { replacements: [poiId], type: QueryTypes.SELECT }
    );
    for (let i = 0; i < remaining.length; i++) {
      await mysqlSequelize.query(
        `UPDATE imageurls SET display_order = ? WHERE id = ?`,
        { replacements: [i + 1, remaining[i].id] }
      );
    }

    // Audit log
    await saveAuditLog({
      action: 'image_deleted',
      adminId: req.adminUser.id || req.adminUser.userId,
      adminEmail: req.adminUser.email,
      details: `Deleted image ${imageId} from POI ${poiId} (${imageRows[0].source || 'unknown source'})`,
      entityType: 'poi',
      entityId: poiId,
      metadata: { imageId, imageUrl: imageRows[0].image_url || imageRows[0].local_path }
    });

    // Invalidate caches
    const redis = getRedis();
    if (redis) {
      try {
        await redis.del(`admin:poi:${poiId}`);
        await redis.del(`admin:pois:stats`);
      } catch { /* non-critical */ }
    }

    res.json({ success: true, data: { remaining: remaining.length } });
  } catch (error) {
    logger.error('[AdminPortal] Image delete error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred deleting the image' }
    });
  }
});

// ============================================================
// MODULE 8D-2: REVIEWS MODERATION
// ============================================================

/**
 * GET /reviews
 * Review list with pagination, filters, and summary stats.
 */
router.get('/reviews', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const {
      destination, rating, sentiment, archived = 'false', search, poi_id,
      dateFrom, dateTo, page = 1, limit = 25, sort = 'date'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 25));
    const offset = (pageNum - 1) * limitNum;

    const where = [];
    const params = [];

    // RBAC: scope reviews to user's allowed destinations/POIs
    if (req.poiScope) {
      where.push(`r.poi_id IN (${req.poiScope.map(() => '?').join(',')})`);
      params.push(...req.poiScope);
    } else if (req.destScope) {
      where.push(`r.destination_id IN (${req.destScope.map(() => '?').join(',')})`);
      params.push(...req.destScope);
    }

    if (destination) {
      const destId = resolveDestinationId(destination);
      if (destId) {
        where.push('r.destination_id = ?');
        params.push(destId);
      }
    }
    if (rating) {
      where.push('r.rating = ?');
      params.push(parseInt(rating));
    }
    if (sentiment) {
      where.push('r.sentiment = ?');
      params.push(sentiment);
    }
    if (archived === 'true') {
      where.push('r.is_archived = 1');
    } else if (archived === 'false') {
      where.push('r.is_archived = 0');
    }
    if (search) {
      where.push('(r.user_name LIKE ? OR r.review_text LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (poi_id) {
      where.push('r.poi_id = ?');
      params.push(parseInt(poi_id));
    }
    if (dateFrom) {
      where.push('r.created_at >= ?');
      params.push(dateFrom);
    }
    if (dateTo) {
      where.push('r.created_at <= ?');
      params.push(`${dateTo} 23:59:59`);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    // Sort mapping
    const sortMap = {
      date: 'r.created_at DESC',
      rating: 'r.rating DESC',
      poi: 'p.name ASC'
    };
    const orderBy = sortMap[sort] || 'r.created_at DESC';

    // Count
    const countResult = await mysqlSequelize.query(
      `SELECT COUNT(*) as total FROM reviews r ${whereClause}`,
      { replacements: params, type: QueryTypes.SELECT }
    );
    const total = parseInt(countResult[0]?.total || 0);

    // Data
    const reviews = await mysqlSequelize.query(
      `SELECT r.id, r.poi_id, p.name as poiName, r.destination_id,
              r.user_name, r.rating, r.review_text, r.sentiment,
              r.visit_date, r.language, r.is_archived, r.created_at
       FROM reviews r
       LEFT JOIN POI p ON r.poi_id = p.id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      { replacements: [...params, limitNum, offset], type: QueryTypes.SELECT }
    );

    const reviewList = reviews.map(r => ({
      id: r.id,
      poi_id: r.poi_id,
      poiName: r.poiName || 'Unknown POI',
      destination_id: r.destination_id,
      destinationName: r.destination_id === 1 ? 'Calpe' : r.destination_id === 2 ? 'Texel' : 'Unknown',
      user_name: r.user_name,
      rating: r.rating,
      review_text: r.review_text,
      sentiment: r.sentiment,
      visit_date: r.visit_date,
      language: r.language,
      is_archived: !!r.is_archived,
      created_at: r.created_at
    }));

    // Summary (filtered by RBAC scope + destination)
    const summaryWhere = [];
    const summaryParams = [];
    // RBAC scope for summary
    if (req.poiScope) {
      summaryWhere.push(`poi_id IN (${req.poiScope.map(() => '?').join(',')})`);
      summaryParams.push(...req.poiScope);
    } else if (req.destScope) {
      summaryWhere.push(`destination_id IN (${req.destScope.map(() => '?').join(',')})`);
      summaryParams.push(...req.destScope);
    }
    if (destination) {
      const destId = resolveDestinationId(destination);
      if (destId) {
        summaryWhere.push('destination_id = ?');
        summaryParams.push(destId);
      }
    }
    const summaryWhereClause = summaryWhere.length > 0 ? 'WHERE ' + summaryWhere.join(' AND ') : '';

    const summaryResult = await mysqlSequelize.query(
      `SELECT
         COUNT(*) as totalReviews,
         ROUND(AVG(rating), 1) as avgRating,
         SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as r5,
         SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as r4,
         SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as r3,
         SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as r2,
         SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as r1,
         SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive,
         SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) as neutral,
         SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative,
         SUM(CASE WHEN is_archived = 1 THEN 1 ELSE 0 END) as archived
       FROM reviews ${summaryWhereClause}`,
      { replacements: summaryParams, type: QueryTypes.SELECT }
    );

    const s = summaryResult[0] || {};

    // Per destination (respects RBAC scope)
    const destSumWhere = [];
    const destSumParams = [];
    if (req.poiScope) {
      destSumWhere.push(`poi_id IN (${req.poiScope.map(() => '?').join(',')})`);
      destSumParams.push(...req.poiScope);
    } else if (req.destScope) {
      destSumWhere.push(`destination_id IN (${req.destScope.map(() => '?').join(',')})`);
      destSumParams.push(...req.destScope);
    }
    const destSumWhereClause = destSumWhere.length > 0 ? 'WHERE ' + destSumWhere.join(' AND ') : '';
    const destSummary = await mysqlSequelize.query(
      `SELECT destination_id, COUNT(*) as total, ROUND(AVG(rating), 1) as avgRating
       FROM reviews ${destSumWhereClause} GROUP BY destination_id`,
      { replacements: destSumParams, type: QueryTypes.SELECT }
    );

    const byDest = {};
    for (const d of destSummary) {
      const key = d.destination_id === 1 ? 'calpe' : d.destination_id === 2 ? 'texel' : `dest_${d.destination_id}`;
      byDest[key] = { total: parseInt(d.total), avgRating: d.avgRating ? parseFloat(d.avgRating) : null };
    }

    res.json({
      success: true,
      data: {
        reviews: reviewList,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
        summary: {
          total: parseInt(s.totalReviews) || 0,
          avgRating: s.avgRating ? parseFloat(s.avgRating) : null,
          positive: parseInt(s.positive) || 0,
          neutral: parseInt(s.neutral) || 0,
          negative: parseInt(s.negative) || 0,
          distribution: {
            5: parseInt(s.r5) || 0, 4: parseInt(s.r4) || 0, 3: parseInt(s.r3) || 0,
            2: parseInt(s.r2) || 0, 1: parseInt(s.r1) || 0
          },
          archived: parseInt(s.archived) || 0,
          byDestination: byDest
        }
      }
    });
  } catch (error) {
    logger.error('[AdminPortal] Reviews list error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred fetching reviews' }
    });
  }
});

/**
 * GET /reviews/:id
 * Single review detail with POI context.
 */
router.get('/reviews/:id', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);
    if (!reviewId || isNaN(reviewId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid review ID' } });
    }

    const reviews = await mysqlSequelize.query(
      `SELECT r.*, p.name as poiName, p.category as poiCategory, p.destination_id as poiDest
       FROM reviews r
       LEFT JOIN POI p ON r.poi_id = p.id
       WHERE r.id = ?`,
      { replacements: [reviewId], type: QueryTypes.SELECT }
    );

    if (reviews.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Review not found' } });
    }

    const r = reviews[0];

    // RBAC: check user has access to this review's destination
    if (req.poiScope && !req.poiScope.includes(r.poi_id)) {
      return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'You do not have access to this review.' } });
    }
    if (req.destScope && !req.destScope.includes(r.destination_id)) {
      return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'You do not have access to this destination.' } });
    }
    res.json({
      success: true,
      data: {
        review: {
          ...r,
          is_archived: !!r.is_archived,
          destinationName: r.destination_id === 1 ? 'Calpe' : r.destination_id === 2 ? 'Texel' : 'Unknown',
          poi: { id: r.poi_id, name: r.poiName, category: r.poiCategory }
        }
      }
    });
  } catch (error) {
    logger.error('[AdminPortal] Review detail error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred fetching review details' }
    });
  }
});

/**
 * PUT /reviews/:id
 * Archive or unarchive a review. Audit logged.
 */
router.put('/reviews/:id', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'poi_owner', 'editor']), async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);
    if (!reviewId || isNaN(reviewId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid review ID' } });
    }

    const { is_archived } = req.body;
    if (is_archived === undefined) {
      return res.status(400).json({ success: false, error: { code: 'NO_CHANGES', message: 'is_archived field required' } });
    }

    // Verify review exists
    const existing = await mysqlSequelize.query(
      `SELECT r.id, r.poi_id, r.destination_id, r.is_archived, p.name as poiName
       FROM reviews r LEFT JOIN POI p ON r.poi_id = p.id WHERE r.id = ?`,
      { replacements: [reviewId], type: QueryTypes.SELECT }
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Review not found' } });
    }

    const old = existing[0];

    // RBAC: check user has write access to this review's destination
    if (req.poiScope && !req.poiScope.includes(old.poi_id)) {
      return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'You do not have write access to this review.' } });
    }
    if (req.destScope && !req.destScope.includes(old.destination_id)) {
      return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'You do not have write access to this destination.' } });
    }
    const archivedVal = is_archived ? 1 : 0;
    const archivedAt = is_archived ? 'NOW()' : 'NULL';

    await mysqlSequelize.query(
      `UPDATE reviews SET is_archived = ?, archived_at = ${archivedAt} WHERE id = ?`,
      { replacements: [archivedVal, reviewId] }
    );

    // Audit log + undo snapshot
    const archiveAction = is_archived ? 'review_archive' : 'review_unarchive';
    const auditId = await saveAuditLog({
      action: archiveAction,
      adminId: req.adminUser.id,
      adminEmail: req.adminUser.email,
      details: `${is_archived ? 'Archived' : 'Unarchived'} review #${reviewId} (${old.poiName || 'POI #' + old.poi_id})`,
      entityType: 'review',
      entityId: String(reviewId),
      metadata: { review_id: reviewId, poi_id: old.poi_id, poi_name: old.poiName, destination_id: old.destination_id }
    });
    if (auditId) {
      await saveUndoSnapshot({
        auditLogId: auditId,
        action: archiveAction,
        entityType: 'review',
        entityId: String(reviewId),
        previousState: { is_archived: old.is_archived },
        newState: { is_archived: archivedVal },
        createdBy: req.adminUser.email
      });
    }

    res.json({
      success: true,
      data: { message: is_archived ? 'Review archived' : 'Review unarchived', review: { id: reviewId, is_archived: !!is_archived } }
    });
  } catch (error) {
    logger.error('[AdminPortal] Review update error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred updating the review' }
    });
  }
});

// ============================================================
// MODULE 8D-3: ANALYTICS DASHBOARD
// ============================================================

/**
 * GET /analytics
 * Analytics overview data. Redis cached 10 minutes.
 */
router.get('/analytics', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const { destination } = req.query;
    const scopeKey = req.poiScope ? `poi:${req.poiScope.join(',')}` : req.destScope ? `dest:${req.destScope.join(',')}` : 'all';
    const cacheKey = destination ? `admin:analytics:${destination}:${scopeKey}` : `admin:analytics:${scopeKey}`;
    const redis = getRedis();

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return res.json(JSON.parse(cached));
      } catch { /* cache miss */ }
    }

    // Build RBAC + destination filter for POI table
    const poiWhere = [];
    const poiParams = [];
    if (req.poiScope) {
      poiWhere.push(`destination_id IN (SELECT destination_id FROM POI WHERE id IN (${req.poiScope.map(() => '?').join(',')}))`);
      poiParams.push(...req.poiScope);
    } else if (req.destScope) {
      poiWhere.push(`destination_id IN (${req.destScope.map(() => '?').join(',')})`);
      poiParams.push(...req.destScope);
    }
    if (destination) {
      poiWhere.push('destination_id = ?');
      poiParams.push(resolveDestinationId(destination));
    }
    const destFilter = poiWhere.length > 0 ? 'WHERE ' + poiWhere.join(' AND ') : '';
    const destFilterAnd = poiWhere.length > 0 ? 'AND ' + poiWhere.join(' AND ') : '';
    const destParams = poiParams;

    // Overview
    const poiOverview = await mysqlSequelize.query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
       FROM POI ${destFilter}`,
      { replacements: destParams, type: QueryTypes.SELECT }
    );

    const reviewOverview = await mysqlSequelize.query(
      `SELECT COUNT(*) as total, ROUND(AVG(rating), 1) as avgRating
       FROM reviews ${destFilter}`,
      { replacements: destParams, type: QueryTypes.SELECT }
    );

    const imageOverview = await mysqlSequelize.query(
      `SELECT COUNT(*) as total FROM imageurls i
       ${destination ? 'INNER JOIN POI p ON i.poi_id = p.id WHERE p.destination_id = ?' : ''}`,
      { replacements: destParams, type: QueryTypes.SELECT }
    );

    // Content coverage
    const contentCov = await mysqlSequelize.query(
      `SELECT
         SUM(CASE WHEN enriched_detail_description IS NOT NULL AND enriched_detail_description != '' THEN 1 ELSE 0 END) as en,
         SUM(CASE WHEN enriched_detail_description_nl IS NOT NULL AND enriched_detail_description_nl != '' THEN 1 ELSE 0 END) as nl,
         SUM(CASE WHEN enriched_detail_description_de IS NOT NULL AND enriched_detail_description_de != '' THEN 1 ELSE 0 END) as de_lang,
         SUM(CASE WHEN enriched_detail_description_es IS NOT NULL AND enriched_detail_description_es != '' THEN 1 ELSE 0 END) as es,
         COUNT(*) as total
       FROM POI WHERE is_active = 1 ${destFilterAnd}`,
      { replacements: destParams, type: QueryTypes.SELECT }
    );

    const cov = contentCov[0] || {};
    const covTotal = parseInt(cov.total) || 1;

    // Review trends (last 12 months)
    const reviewTrends = await mysqlSequelize.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month,
              COUNT(*) as count,
              ROUND(AVG(rating), 1) as avgRating
       FROM reviews
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH) ${destFilterAnd}
       GROUP BY month ORDER BY month`,
      { replacements: destParams, type: QueryTypes.SELECT }
    );

    // Top POIs by review count
    const topPOIs = await mysqlSequelize.query(
      `SELECT p.id, p.name, p.destination_id, COUNT(r.id) as reviewCount,
              ROUND(AVG(r.rating), 1) as avgRating
       FROM reviews r
       INNER JOIN POI p ON r.poi_id = p.id
       WHERE p.is_active = 1 ${destFilterAnd.replace('destination_id', 'r.destination_id')}
       GROUP BY p.id ORDER BY reviewCount DESC LIMIT 10`,
      { replacements: destParams, type: QueryTypes.SELECT }
    );

    // Category distribution
    const catDist = await mysqlSequelize.query(
      `SELECT category, COUNT(*) as cnt FROM POI
       WHERE is_active = 1 ${destFilterAnd}
       GROUP BY category ORDER BY cnt DESC`,
      { replacements: destParams, type: QueryTypes.SELECT }
    );

    const totalActive = parseInt(poiOverview[0]?.active || 0);

    const result = {
      success: true,
      data: {
        overview: {
          totalPois: parseInt(poiOverview[0]?.total || 0),
          activePois: totalActive,
          totalReviews: parseInt(reviewOverview[0]?.total || 0),
          avgRating: reviewOverview[0]?.avgRating ? parseFloat(reviewOverview[0].avgRating) : null,
          totalImages: parseInt(imageOverview[0]?.total || 0),
          totalAgents: 18,
          healthyAgents: 16
        },
        contentCoverage: {
          en: { total: parseInt(cov.en || 0), pct: parseFloat(((parseInt(cov.en || 0) / covTotal) * 100).toFixed(1)) },
          nl: { total: parseInt(cov.nl || 0), pct: parseFloat(((parseInt(cov.nl || 0) / covTotal) * 100).toFixed(1)) },
          de: { total: parseInt(cov.de_lang || 0), pct: parseFloat(((parseInt(cov.de_lang || 0) / covTotal) * 100).toFixed(1)) },
          es: { total: parseInt(cov.es || 0), pct: parseFloat(((parseInt(cov.es || 0) / covTotal) * 100).toFixed(1)) }
        },
        reviewTrends: reviewTrends.map(t => ({
          month: t.month,
          count: parseInt(t.count),
          avgRating: t.avgRating ? parseFloat(t.avgRating) : null
        })),
        topPois: topPOIs.map(p => ({
          id: p.id,
          name: p.name,
          destination_id: p.destination_id,
          destinationName: p.destination_id === 1 ? 'Calpe' : 'Texel',
          reviewCount: parseInt(p.reviewCount),
          avgRating: p.avgRating ? parseFloat(p.avgRating) : null
        })),
        categoryDistribution: catDist.map(c => ({
          category: c.category,
          count: parseInt(c.cnt),
          pct: totalActive > 0 ? parseFloat(((parseInt(c.cnt) / totalActive) * 100).toFixed(1)) : 0
        }))
      }
    };

    if (redis) {
      try { await redis.set(cacheKey, JSON.stringify(result), 'EX', 600); } catch { /* non-critical */ }
    }

    res.json(result);
  } catch (error) {
    logger.error('[AdminPortal] Analytics error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred fetching analytics' }
    });
  }
});

/**
 * GET /analytics/export
 * CSV export for POIs, reviews, or summary.
 */
router.get('/analytics/export', adminAuth('editor'), destinationScope, async (req, res) => {
  try {
    const { type = 'summary', destination, format = 'csv' } = req.query;

    if (format !== 'csv') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_FORMAT', message: 'Only CSV format is supported' } });
    }

    // Build RBAC + destination filter
    const exportWhere = [];
    const exportParams = [];
    if (req.poiScope) {
      exportWhere.push(`destination_id IN (SELECT destination_id FROM POI WHERE id IN (${req.poiScope.map(() => '?').join(',')}))`);
      exportParams.push(...req.poiScope);
    } else if (req.destScope) {
      exportWhere.push(`destination_id IN (${req.destScope.map(() => '?').join(',')})`);
      exportParams.push(...req.destScope);
    }
    if (destination) {
      exportWhere.push('destination_id = ?');
      exportParams.push(resolveDestinationId(destination));
    }
    const destFilter = exportWhere.length > 0 ? 'WHERE ' + exportWhere.join(' AND ') : '';
    const destParams = exportParams;
    let csvContent = '';

    if (type === 'pois') {
      const pois = await mysqlSequelize.query(
        `SELECT p.id, p.name, p.destination_id, p.category, p.is_active, p.rating,
                LEFT(p.enriched_detail_description, 200) as description_preview,
                (SELECT COUNT(*) FROM reviews r WHERE r.poi_id = p.id) as review_count,
                (SELECT COUNT(*) FROM imageurls i WHERE i.poi_id = p.id) as image_count
         FROM POI p ${destFilter}
         ORDER BY p.id LIMIT 10000`,
        { replacements: destParams, type: QueryTypes.SELECT }
      );

      csvContent = 'id,name,destination,category,is_active,rating,description_preview,review_count,image_count\n';
      for (const p of pois) {
        const dest = p.destination_id === 1 ? 'Calpe' : 'Texel';
        const desc = (p.description_preview || '').replace(/"/g, '""').replace(/\n/g, ' ');
        csvContent += `${p.id},"${(p.name || '').replace(/"/g, '""')}",${dest},"${(p.category || '').replace(/"/g, '""')}",${p.is_active},${p.rating || ''},"${desc}",${p.review_count || 0},${p.image_count || 0}\n`;
      }
    } else if (type === 'reviews') {
      const reviews = await mysqlSequelize.query(
        `SELECT r.id, p.name as poi_name, r.destination_id, r.user_name, r.rating,
                r.sentiment, LEFT(r.review_text, 500) as review_text, r.created_at
         FROM reviews r
         LEFT JOIN POI p ON r.poi_id = p.id
         ${destFilter.replace('destination_id', 'r.destination_id')}
         ORDER BY r.created_at DESC LIMIT 10000`,
        { replacements: destParams, type: QueryTypes.SELECT }
      );

      csvContent = 'id,poi_name,destination,user_name,rating,sentiment,review_text,date\n';
      for (const r of reviews) {
        const dest = r.destination_id === 1 ? 'Calpe' : 'Texel';
        const text = (r.review_text || '').replace(/"/g, '""').replace(/\n/g, ' ');
        csvContent += `${r.id},"${(r.poi_name || '').replace(/"/g, '""')}",${dest},"${(r.user_name || '').replace(/"/g, '""')}",${r.rating},${r.sentiment || ''},"${text}",${r.created_at || ''}\n`;
      }
    } else {
      // Summary export (respects RBAC scope)
      const sumExpWhere = [];
      const sumExpParams = [];
      if (req.poiScope) {
        sumExpWhere.push(`id IN (${req.poiScope.map(() => '?').join(',')})`);
        sumExpParams.push(...req.poiScope);
      } else if (req.destScope) {
        sumExpWhere.push(`destination_id IN (${req.destScope.map(() => '?').join(',')})`);
        sumExpParams.push(...req.destScope);
      }
      const sumExpFilter = sumExpWhere.length > 0 ? 'WHERE ' + sumExpWhere.join(' AND ') : '';
      const stats = await mysqlSequelize.query(
        `SELECT destination_id, COUNT(*) as pois, SUM(is_active) as active
         FROM POI ${sumExpFilter} GROUP BY destination_id`, { replacements: sumExpParams, type: QueryTypes.SELECT });
      const revExpWhere = [];
      const revExpParams = [];
      if (req.poiScope) {
        revExpWhere.push(`poi_id IN (${req.poiScope.map(() => '?').join(',')})`);
        revExpParams.push(...req.poiScope);
      } else if (req.destScope) {
        revExpWhere.push(`destination_id IN (${req.destScope.map(() => '?').join(',')})`);
        revExpParams.push(...req.destScope);
      }
      const revExpFilter = revExpWhere.length > 0 ? 'WHERE ' + revExpWhere.join(' AND ') : '';
      const revStats = await mysqlSequelize.query(
        `SELECT destination_id, COUNT(*) as reviews, ROUND(AVG(rating),1) as avg_rating
         FROM reviews ${revExpFilter} GROUP BY destination_id`, { replacements: revExpParams, type: QueryTypes.SELECT });

      csvContent = 'metric,calpe,texel,total\n';
      const calpe = stats.find(s => s.destination_id === 1) || {};
      const texel = stats.find(s => s.destination_id === 2) || {};
      const cRev = revStats.find(s => s.destination_id === 1) || {};
      const tRev = revStats.find(s => s.destination_id === 2) || {};

      csvContent += `total_pois,${calpe.pois || 0},${texel.pois || 0},${(parseInt(calpe.pois || 0) + parseInt(texel.pois || 0))}\n`;
      csvContent += `active_pois,${calpe.active || 0},${texel.active || 0},${(parseInt(calpe.active || 0) + parseInt(texel.active || 0))}\n`;
      csvContent += `reviews,${cRev.reviews || 0},${tRev.reviews || 0},${(parseInt(cRev.reviews || 0) + parseInt(tRev.reviews || 0))}\n`;
      csvContent += `avg_rating,${cRev.avg_rating || ''},${tRev.avg_rating || ''},\n`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="holidaibutler_${type}_export.csv"`);
    res.send(csvContent);
  } catch (error) {
    logger.error('[AdminPortal] Export error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred generating the export' }
    });
  }
});

// ============================================================
// MODULE 9B: PAGEVIEW ANALYTICS
// ============================================================

/**
 * GET /analytics/pageviews
 * Pageview analytics from page_views table.
 */
router.get('/analytics/pageviews', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    // ── RBAC: enforce destination scope ──
    if (req.destScope) {
      const reqDestCode = req.query.destination;
      if (reqDestCode) {
        const reqDestId = resolveDestinationId(reqDestCode);
        if (reqDestId && !req.destScope.includes(reqDestId)) {
          return res.status(403).json({ success: false, error: { code: 'DESTINATION_FORBIDDEN', message: 'You do not have access to this destination.' } });
        }
      } else if (req.destScope.length === 1) {
        const idToCode = { 1: 'calpe', 2: 'texel', 3: 'alicante' };
        req.query.destination = idToCode[req.destScope[0]];
      }
    }
    const { destination, period = 'month' } = req.query;
    const destWhere = [];
    const destParams = [];
    if (destination) {
      const destId = resolveDestinationId(destination);
      if (destId) { destWhere.push('destination_id = ?'); destParams.push(destId); }
    }
    const whereClause = destWhere.length > 0 ? 'WHERE ' + destWhere.join(' AND ') : '';

    // Total + today
    const [totals] = await mysqlSequelize.query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today
       FROM page_views ${whereClause}`,
      { replacements: destParams, type: QueryTypes.SELECT }
    ).then(r => [r[0] || { total: 0, today: 0 }]);

    // Trend (grouped by period)
    let groupBy, dateFormat;
    if (period === 'day') { groupBy = 'DATE(created_at)'; dateFormat = '%Y-%m-%d'; }
    else if (period === 'week') { groupBy = "DATE(DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY))"; dateFormat = '%Y-%m-%d'; }
    else { groupBy = "DATE_FORMAT(created_at, '%Y-%m-01')"; dateFormat = '%Y-%m'; }

    const trend = await mysqlSequelize.query(
      `SELECT DATE_FORMAT(${groupBy}, '${dateFormat}') as date, COUNT(*) as views
       FROM page_views ${whereClause}
       GROUP BY ${groupBy}
       ORDER BY ${groupBy} DESC LIMIT 90`,
      { replacements: destParams, type: QueryTypes.SELECT }
    );

    // Date range filter based on period (shared by byPageType and topPois)
    let periodDateFilter = '';
    let pvPeriodDateFilter = ''; // For JOINed queries using pv alias
    const periodParams = [...destParams];
    if (period === 'day') {
      periodDateFilter = ' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
      pvPeriodDateFilter = ' AND pv.created_at >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
    } else if (period === 'week') {
      periodDateFilter = ' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 90 WEEK)';
      pvPeriodDateFilter = ' AND pv.created_at >= DATE_SUB(CURDATE(), INTERVAL 90 WEEK)';
    }
    // month = all time (no additional filter)

    // By page type (filtered by period)
    const byTypeWhere = destWhere.length > 0
      ? `WHERE ${destWhere[0]}${periodDateFilter}`
      : (periodDateFilter ? `WHERE 1=1${periodDateFilter}` : '');
    const byPageType = await mysqlSequelize.query(
      `SELECT page_type as type, COUNT(*) as count
       FROM page_views ${byTypeWhere}
       GROUP BY page_type ORDER BY count DESC`,
      { replacements: periodParams, type: QueryTypes.SELECT }
    );

    // Top POIs (by views, filtered by period)
    const topPois = await mysqlSequelize.query(
      `SELECT pv.poi_id, p.name, COUNT(*) as views
       FROM page_views pv
       LEFT JOIN POI p ON pv.poi_id = p.id
       WHERE pv.poi_id IS NOT NULL ${destWhere.length > 0 ? 'AND pv.' + destWhere[0] : ''}${pvPeriodDateFilter}
       GROUP BY pv.poi_id, p.name
       ORDER BY views DESC LIMIT 10`,
      { replacements: periodParams, type: QueryTypes.SELECT }
    );

    // First record date
    const [first] = await mysqlSequelize.query(
      `SELECT MIN(created_at) as first_date FROM page_views ${whereClause}`,
      { replacements: destParams, type: QueryTypes.SELECT }
    ).then(r => [r[0] || { first_date: null }]);

    res.json({
      success: true,
      data: {
        total: parseInt(totals.total) || 0,
        today: parseInt(totals.today) || 0,
        trend: trend.reverse(),
        by_page_type: byPageType,
        top_pois: topPois,
        first_date: first.first_date
      }
    });
  } catch (error) {
    logger.error('[AdminPortal] Pageview analytics error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred fetching pageview analytics' }
    });
  }
});

// ============================================================
// MODULE 9A-2: CHATBOT ANALYTICS
// ============================================================

/**
 * GET /analytics/chatbot
 * Chatbot usage analytics: sessions, languages, fallbacks, engagement, popular POIs.
 */
router.get('/analytics/chatbot', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    // ── RBAC: enforce destination scope ──
    if (req.destScope) {
      const reqDestCode = req.query.destination;
      if (reqDestCode) {
        const reqDestId = resolveDestinationId(reqDestCode);
        if (reqDestId && !req.destScope.includes(reqDestId)) {
          return res.status(403).json({ success: false, error: { code: 'DESTINATION_FORBIDDEN', message: 'You do not have access to this destination.' } });
        }
      } else if (req.destScope.length === 1) {
        const idToCode = { 1: 'calpe', 2: 'texel', 3: 'alicante' };
        req.query.destination = idToCode[req.destScope[0]];
      }
    }
    const { destination, period = '30' } = req.query;
    const days = Math.min(parseInt(period) || 30, 365);
    const cacheKey = `admin:analytics:chatbot:${destination || 'all'}:${days}`;
    const redis = getRedis();

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return res.json(JSON.parse(cached));
      } catch { /* cache miss */ }
    }

    const destFilter = destination ? 'AND hs.destination_id = ?' : '';
    const destParams = destination ? [resolveDestinationId(destination)] : [];

    // 1. Sessions per day
    const sessionsPerDay = await mysqlSequelize.query(
      `SELECT DATE(hs.started_at) as date,
              COUNT(*) as sessions,
              SUM(hs.message_count) as messages,
              ROUND(AVG(hs.message_count), 1) as avgMessages,
              ROUND(AVG(hs.avg_response_time_ms), 0) as avgResponseMs,
              SUM(CASE WHEN hs.had_fallback = 1 THEN 1 ELSE 0 END) as fallbacks
       FROM holibot_sessions hs
       WHERE hs.started_at >= DATE_SUB(NOW(), INTERVAL ? DAY) ${destFilter}
       GROUP BY date ORDER BY date`,
      { replacements: [days, ...destParams], type: QueryTypes.SELECT }
    );

    // 2. Language breakdown
    const languages = await mysqlSequelize.query(
      `SELECT hs.language, COUNT(*) as count
       FROM holibot_sessions hs
       WHERE hs.started_at >= DATE_SUB(NOW(), INTERVAL ? DAY) ${destFilter}
       GROUP BY hs.language ORDER BY count DESC`,
      { replacements: [days, ...destParams], type: QueryTypes.SELECT }
    );

    // 3. Overall totals
    const totals = await mysqlSequelize.query(
      `SELECT COUNT(*) as totalSessions,
              SUM(hs.message_count) as totalMessages,
              ROUND(AVG(hs.message_count), 1) as avgMessagesPerSession,
              ROUND(AVG(hs.avg_response_time_ms), 0) as avgResponseMs,
              SUM(CASE WHEN hs.had_fallback = 1 THEN 1 ELSE 0 END) as fallbackSessions,
              ROUND(AVG(CASE WHEN hs.user_satisfaction IS NOT NULL THEN hs.user_satisfaction END), 1) as avgSatisfaction,
              ROUND(AVG(TIMESTAMPDIFF(SECOND, hs.started_at, COALESCE(hs.ended_at, hs.last_activity_at))), 0) as avgDurationSec
       FROM holibot_sessions hs
       WHERE hs.started_at >= DATE_SUB(NOW(), INTERVAL ? DAY) ${destFilter}`,
      { replacements: [days, ...destParams], type: QueryTypes.SELECT }
    );

    // 4. Per-destination breakdown (only when no destination filter)
    let perDestination = null;
    if (!destination) {
      const destBreakdown = await mysqlSequelize.query(
        `SELECT hs.destination_id,
                COUNT(*) as sessions,
                SUM(hs.message_count) as messages,
                ROUND(AVG(hs.message_count), 1) as avgMessages
         FROM holibot_sessions hs
         WHERE hs.started_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY hs.destination_id`,
        { replacements: [days], type: QueryTypes.SELECT }
      );
      perDestination = {};
      for (const row of destBreakdown) {
        const code = row.destination_id === 2 ? 'texel' : 'calpe';
        perDestination[code] = {
          sessions: parseInt(row.sessions),
          messages: parseInt(row.messages || 0),
          avgMessages: parseFloat(row.avgMessages || 0)
        };
      }
    }

    // 5. Popular POIs (from holibot_poi_clicks)
    const destClickFilter = destination ? 'AND hpc.session_id IN (SELECT id FROM holibot_sessions WHERE destination_id = ?)' : '';
    const popularPois = await mysqlSequelize.query(
      `SELECT hpc.poi_id, hpc.poi_name, COUNT(*) as clicks,
              COUNT(DISTINCT hpc.session_id) as uniqueSessions
       FROM holibot_poi_clicks hpc
       WHERE hpc.clicked_at >= DATE_SUB(NOW(), INTERVAL ? DAY) ${destClickFilter}
       GROUP BY hpc.poi_id, hpc.poi_name
       ORDER BY clicks DESC LIMIT 10`,
      { replacements: [days, ...destParams], type: QueryTypes.SELECT }
    );

    // 6. Quick action usage (from holibot_poi_clicks)
    const actionUsage = await mysqlSequelize.query(
      `SELECT hpc.click_type, COUNT(*) as count
       FROM holibot_poi_clicks hpc
       WHERE hpc.clicked_at >= DATE_SUB(NOW(), INTERVAL ? DAY) ${destClickFilter}
       GROUP BY hpc.click_type ORDER BY count DESC`,
      { replacements: [days, ...destParams], type: QueryTypes.SELECT }
    );

    const t = totals[0] || {};
    const totalSessions = parseInt(t.totalSessions || 0);

    const result = {
      success: true,
      data: {
        period: days,
        totals: {
          sessions: totalSessions,
          messages: parseInt(t.totalMessages || 0),
          avgMessagesPerSession: parseFloat(t.avgMessagesPerSession || 0),
          avgResponseMs: parseInt(t.avgResponseMs || 0),
          fallbackSessions: parseInt(t.fallbackSessions || 0),
          fallbackRate: totalSessions > 0 ? parseFloat(((parseInt(t.fallbackSessions || 0) / totalSessions) * 100).toFixed(1)) : 0,
          avgSatisfaction: t.avgSatisfaction ? parseFloat(t.avgSatisfaction) : null,
          avgDurationSec: parseInt(t.avgDurationSec || 0)
        },
        sessionsPerDay: sessionsPerDay.map(d => ({
          date: d.date,
          sessions: parseInt(d.sessions),
          messages: parseInt(d.messages || 0),
          avgMessages: parseFloat(d.avgMessages || 0),
          avgResponseMs: parseInt(d.avgResponseMs || 0),
          fallbacks: parseInt(d.fallbacks || 0)
        })),
        languages: languages.map(l => ({
          language: l.language,
          count: parseInt(l.count),
          pct: totalSessions > 0 ? parseFloat(((parseInt(l.count) / totalSessions) * 100).toFixed(1)) : 0
        })),
        perDestination,
        popularPois: popularPois.map(p => ({
          poiId: p.poi_id,
          poiName: p.poi_name,
          clicks: parseInt(p.clicks),
          uniqueSessions: parseInt(p.uniqueSessions)
        })),
        actionUsage: actionUsage.map(a => ({
          type: a.click_type,
          count: parseInt(a.count)
        }))
      }
    };

    if (redis) {
      try { await redis.set(cacheKey, JSON.stringify(result), 'EX', 300); } catch { /* non-critical */ }
    }

    res.json(result);
  } catch (error) {
    logger.error('[AdminPortal] Chatbot analytics error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred fetching chatbot analytics' }
    });
  }
});

/**
 * GET /analytics/trend/:metric
 * Drill-down trend data for a specific metric over time.
 * Supported metrics: sessions, reviews, pois, messages
 */
router.get('/analytics/trend/:metric', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const { metric } = req.params;
    // ── RBAC: enforce destination scope ──
    if (req.destScope) {
      const reqDestCode = req.query.destination;
      if (reqDestCode) {
        const reqDestId = resolveDestinationId(reqDestCode);
        if (reqDestId && !req.destScope.includes(reqDestId)) {
          return res.status(403).json({ success: false, error: { code: 'DESTINATION_FORBIDDEN', message: 'You do not have access to this destination.' } });
        }
      } else if (req.destScope.length === 1) {
        const idToCode = { 1: 'calpe', 2: 'texel', 3: 'alicante' };
        req.query.destination = idToCode[req.destScope[0]];
      }
    }
    const { destination, period = '30' } = req.query;
    const days = Math.min(parseInt(period) || 30, 365);

    const validMetrics = ['sessions', 'reviews', 'pois', 'messages'];
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_METRIC', message: `Metric must be one of: ${validMetrics.join(', ')}` }
      });
    }

    const destId = destination ? resolveDestinationId(destination) : null;
    let query, replacements;

    switch (metric) {
      case 'sessions':
        query = `SELECT DATE(hs.started_at) as date, COUNT(*) as value,
                        ROUND(AVG(hs.message_count), 1) as avgMessages
                 FROM holibot_sessions hs
                 WHERE hs.started_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                 ${destId ? 'AND hs.destination_id = ?' : ''}
                 GROUP BY date ORDER BY date`;
        replacements = destId ? [days, destId] : [days];
        break;
      case 'reviews':
        query = `SELECT DATE(r.created_at) as date, COUNT(*) as value,
                        ROUND(AVG(r.rating), 1) as avgRating
                 FROM reviews r
                 WHERE r.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                 ${destId ? 'AND r.destination_id = ?' : ''}
                 GROUP BY date ORDER BY date`;
        replacements = destId ? [days, destId] : [days];
        break;
      case 'pois':
        query = `SELECT DATE(p.last_updated) as date, COUNT(*) as value
                 FROM POI p
                 WHERE p.last_updated >= DATE_SUB(NOW(), INTERVAL ? DAY)
                 ${destId ? 'AND p.destination_id = ?' : ''}
                 GROUP BY date ORDER BY date`;
        replacements = destId ? [days, destId] : [days];
        break;
      case 'messages':
        query = `SELECT DATE(hm.created_at) as date, COUNT(*) as value,
                        SUM(CASE WHEN hm.role = 'user' THEN 1 ELSE 0 END) as userMessages,
                        SUM(CASE WHEN hm.role = 'assistant' THEN 1 ELSE 0 END) as botMessages
                 FROM holibot_messages hm
                 ${destId ? 'INNER JOIN holibot_sessions hs ON hm.session_id = hs.id' : ''}
                 WHERE hm.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                 ${destId ? 'AND hs.destination_id = ?' : ''}
                 GROUP BY date ORDER BY date`;
        replacements = destId ? [days, destId] : [days];
        break;
    }

    const data = await mysqlSequelize.query(query, { replacements, type: QueryTypes.SELECT });

    res.json({
      success: true,
      data: {
        metric,
        period: days,
        destination: destination || 'all',
        points: data.map(d => ({
          date: d.date,
          value: parseInt(d.value),
          ...(d.avgMessages !== undefined && { avgMessages: parseFloat(d.avgMessages || 0) }),
          ...(d.avgRating !== undefined && { avgRating: parseFloat(d.avgRating || 0) }),
          ...(d.userMessages !== undefined && { userMessages: parseInt(d.userMessages || 0) }),
          ...(d.botMessages !== undefined && { botMessages: parseInt(d.botMessages || 0) })
        }))
      }
    });
  } catch (error) {
    logger.error('[AdminPortal] Trend error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred fetching trend data' }
    });
  }
});

/**
 * GET /analytics/snapshot
 * Daily snapshot for delta badges (today vs yesterday, vs last week).
 * Uses live MySQL queries — no separate snapshot table needed.
 */
router.get('/analytics/snapshot', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    // ── RBAC: enforce destination scope ──
    if (req.destScope) {
      const reqDestCode = req.query.destination;
      if (reqDestCode) {
        const reqDestId = resolveDestinationId(reqDestCode);
        if (reqDestId && !req.destScope.includes(reqDestId)) {
          return res.status(403).json({ success: false, error: { code: 'DESTINATION_FORBIDDEN', message: 'You do not have access to this destination.' } });
        }
      } else if (req.destScope.length === 1) {
        const idToCode = { 1: 'calpe', 2: 'texel', 3: 'alicante' };
        req.query.destination = idToCode[req.destScope[0]];
      }
    }
    const { destination } = req.query;
    const cacheKey = `admin:analytics:snapshot:${destination || 'all'}`;
    const redis = getRedis();

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return res.json(JSON.parse(cached));
      } catch { /* cache miss */ }
    }

    const destId = destination ? resolveDestinationId(destination) : null;
    const destFilterPoi = destId ? 'AND destination_id = ?' : '';
    const destFilterReview = destId ? 'AND destination_id = ?' : '';
    const destFilterSession = destId ? 'AND destination_id = ?' : '';
    const destParams = destId ? [destId] : [];

    // Helper: get count for a date range
    const getCount = async (table, dateCol, daysBack, daysEnd = 0, extraFilter = '') => {
      const result = await mysqlSequelize.query(
        `SELECT COUNT(*) as c FROM ${table}
         WHERE ${dateCol} >= DATE_SUB(NOW(), INTERVAL ? DAY)
         AND ${dateCol} < DATE_SUB(NOW(), INTERVAL ? DAY)
         ${extraFilter}`,
        { replacements: [daysBack, daysEnd, ...destParams], type: QueryTypes.SELECT }
      );
      return parseInt(result[0]?.c || 0);
    };

    // Current totals
    const [poiTotal] = await mysqlSequelize.query(
      `SELECT COUNT(*) as c FROM POI WHERE is_active = 1 ${destFilterPoi}`,
      { replacements: destParams, type: QueryTypes.SELECT }
    );
    const [reviewTotal] = await mysqlSequelize.query(
      `SELECT COUNT(*) as c, ROUND(AVG(rating), 2) as avgRating FROM reviews WHERE 1=1 ${destFilterReview}`,
      { replacements: destParams, type: QueryTypes.SELECT }
    );
    const [sessionTotal] = await mysqlSequelize.query(
      `SELECT COUNT(*) as c FROM holibot_sessions WHERE 1=1 ${destFilterSession}`,
      { replacements: destParams, type: QueryTypes.SELECT }
    );

    // Deltas: last 24h vs previous 24h, last 7d vs previous 7d
    const reviewsToday = await getCount('reviews', 'created_at', 1, 0, destFilterReview);
    const reviewsYesterday = await getCount('reviews', 'created_at', 2, 1, destFilterReview);
    const reviewsWeek = await getCount('reviews', 'created_at', 7, 0, destFilterReview);
    const reviewsPrevWeek = await getCount('reviews', 'created_at', 14, 7, destFilterReview);

    const sessionsToday = await getCount('holibot_sessions', 'started_at', 1, 0, destFilterSession);
    const sessionsYesterday = await getCount('holibot_sessions', 'started_at', 2, 1, destFilterSession);
    const sessionsWeek = await getCount('holibot_sessions', 'started_at', 7, 0, destFilterSession);
    const sessionsPrevWeek = await getCount('holibot_sessions', 'started_at', 14, 7, destFilterSession);

    const result = {
      success: true,
      data: {
        current: {
          totalPois: parseInt(poiTotal?.c || 0),
          totalReviews: parseInt(reviewTotal?.c || 0),
          avgRating: reviewTotal?.avgRating ? parseFloat(reviewTotal.avgRating) : null,
          totalSessions: parseInt(sessionTotal?.c || 0)
        },
        deltas: {
          reviews: {
            today: reviewsToday,
            yesterday: reviewsYesterday,
            dailyChange: reviewsToday - reviewsYesterday,
            week: reviewsWeek,
            prevWeek: reviewsPrevWeek,
            weeklyChange: reviewsWeek - reviewsPrevWeek
          },
          sessions: {
            today: sessionsToday,
            yesterday: sessionsYesterday,
            dailyChange: sessionsToday - sessionsYesterday,
            week: sessionsWeek,
            prevWeek: sessionsPrevWeek,
            weeklyChange: sessionsWeek - sessionsPrevWeek
          }
        }
      }
    };

    if (redis) {
      try { await redis.set(cacheKey, JSON.stringify(result), 'EX', 300); } catch { /* non-critical */ }
    }

    res.json(result);
  } catch (error) {
    logger.error('[AdminPortal] Snapshot error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred fetching snapshot data' }
    });
  }
});

// ============================================================
// MODULE 8D-4: SETTINGS
// ============================================================

/**
 * GET /settings
 * System info, destinations, admin info, feature flags.
 */
router.get('/settings', adminAuth('reviewer'), async (req, res) => {
  try {
    // System info
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    let redisStatus = 'disconnected';

    const redis = getRedis();
    if (redis) {
      try {
        const pong = await redis.ping();
        redisStatus = pong === 'PONG' ? 'connected' : 'disconnected';
      } catch { /* leave disconnected */ }
    }

    // MySQL status: if we got this far the query below will confirm
    let mysqlStatus = 'disconnected';
    try {
      await mysqlSequelize.query('SELECT 1', { type: QueryTypes.SELECT });
      mysqlStatus = 'connected';
    } catch { /* leave disconnected */ }

    const system = {
      nodeVersion: process.version,
      uptime: parseFloat((process.uptime() / 3600).toFixed(1)),
      uptimeFormatted: formatUptime(process.uptime()),
      pm2Name: 'holidaibutler-api',
      environment: process.env.NODE_ENV || 'development',
      mysql: mysqlStatus,
      mongodb: mongoStatus,
      redis: redisStatus
    };

    // Destination data
    const destStats = await mysqlSequelize.query(
      `SELECT destination_id,
              COUNT(*) as poiCount,
              SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as activeCount
       FROM POI GROUP BY destination_id`,
      { type: QueryTypes.SELECT }
    );

    const revCounts = await mysqlSequelize.query(
      `SELECT destination_id, COUNT(*) as cnt FROM reviews GROUP BY destination_id`,
      { type: QueryTypes.SELECT }
    );

    const destMap = {};
    for (const d of destStats) destMap[d.destination_id] = { pois: parseInt(d.poiCount), active: parseInt(d.activeCount) };
    const revMap = {};
    for (const r of revCounts) revMap[r.destination_id] = parseInt(r.cnt);

    const destinations = {
      calpe: {
        id: 1, code: 'calpe', name: 'Calpe', domain: 'holidaibutler.com',
        chatbotName: 'HoliBot', poiCount: destMap[1]?.pois || 0, activePoiCount: destMap[1]?.active || 0,
        reviewCount: revMap[1] || 0, chromaCollection: 'calpe_pois', isActive: true
      },
      texel: {
        id: 2, code: 'texel', name: 'Texel', domain: 'texelmaps.nl',
        chatbotName: 'Tessa', poiCount: destMap[2]?.pois || 0, activePoiCount: destMap[2]?.active || 0,
        reviewCount: revMap[2] || 0, chromaCollection: 'texel_pois', isActive: true
      }
    };

    // Admin info from JWT
    const admin = {
      id: req.adminUser.id || req.adminUser.userId,
      email: req.adminUser.email,
      role: req.adminUser.role || 'admin'
    };

    // Feature flags
    const features = {
      agentSystem: true,
      reviewsLive: true,
      chatbotCalpe: true,
      chatbotTexel: true,
      adminPortal: true
    };

    res.json({
      success: true,
      data: { system, destinations, admin, features }
    });
  } catch (error) {
    logger.error('[AdminPortal] Settings error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred fetching settings' }
    });
  }
});

/** Format uptime seconds to human readable string */
function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(' ') || '< 1m';
}

/**
 * GET /settings/audit-log
 * Admin audit log from MongoDB.
 */
router.get('/settings/audit-log', adminAuth('reviewer'), async (req, res) => {
  try {
    const { page = 1, limit = 25, action } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 25));
    const skip = (pageNum - 1) * limitNum;

    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: true,
        data: { entries: [], pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 }, partial: true }
      });
    }

    const db = mongoose.connection.db;
    const collection = db.collection('audit_logs');

    const filter = {};
    if (action) filter.action = action;

    const total = await collection.countDocuments(filter);
    const entries = await collection.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray();

    const entryList = entries.map(e => {
      const actorType = e.actor?.type || (e.admin_email ? 'admin' : 'system');
      return {
        _id: e._id,
        timestamp: e.timestamp,
        action: e.action,
        actor: {
          email: e.admin_email || e.actor?.name || 'system',
          type: actorType
        },
        detail: buildAuditDetail(e),
        destination: e.destination_id === 1 ? 'calpe' : e.destination_id === 2 ? 'texel' : null,
        changes: e.changes || null
      };
    });

    res.json({
      success: true,
      data: {
        entries: entryList,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
      }
    });
  } catch (error) {
    logger.error('[AdminPortal] Audit log error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred fetching audit log' }
    });
  }
});

/** Build human-readable audit detail string */
function buildAuditDetail(entry) {
  if (entry.action === 'poi_update' || entry.action === 'poi_content_updated') {
    const langs = entry.changes ? Object.keys(entry.changes).join(', ') : '';
    return `POI #${entry.poi_id || entry.entityId || ''} (${entry.poi_name || 'unknown'}): ${langs} updated`;
  }
  if (entry.action === 'review_archive' || entry.action === 'review_unarchive' || entry.action === 'review_archived' || entry.action === 'review_unarchived') {
    const action = entry.action.replace('review_', '').replace('d', '');
    return `Review #${entry.review_id || entry.entityId || ''} (${entry.poi_name || 'POI'}): ${action}`;
  }
  return entry.description || entry.action || 'unknown action';
}

/**
 * POST /settings/cache/clear
 * Clear Redis cache keys.
 */
router.post('/settings/cache/clear', adminAuth('poi_owner'), async (req, res) => {
  try {
    const { keys, all } = req.body;
    const redis = getRedis();

    if (!redis) {
      return res.status(503).json({
        success: false,
        error: { code: 'REDIS_UNAVAILABLE', message: 'Redis is not connected' }
      });
    }

    let cleared = 0;

    if (all) {
      // Clear all admin cache keys
      const adminKeys = await redis.keys('admin:*');
      if (adminKeys.length > 0) {
        cleared = await redis.del(...adminKeys);
      }
    } else if (Array.isArray(keys) && keys.length > 0) {
      // Validate keys are admin-only
      const safeKeys = keys.filter(k => k.startsWith('admin:'));
      if (safeKeys.length > 0) {
        cleared = await redis.del(...safeKeys);
      }
    } else {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_KEYS', message: 'Specify keys array or all: true' }
      });
    }

    // Audit log
    try {
      if (mongoose.connection.readyState === 1) {
        const db = mongoose.connection.db;
        await db.collection('audit_logs').insertOne({
          action: 'cache_cleared',
          admin_id: req.adminUser.id || req.adminUser.userId,
          admin_email: req.adminUser.email,
          details: all ? `all admin keys (${cleared})` : `${cleared} specific keys`,
          cleared_count: cleared,
          timestamp: new Date(),
          actor: { type: 'admin', name: 'admin-portal' }
        });
      }
    } catch { /* non-critical */ }

    res.json({
      success: true,
      data: { cleared, timestamp: new Date().toISOString() }
    });
  } catch (error) {
    logger.error('[AdminPortal] Cache clear error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred clearing cache' }
    });
  }
});

// ============================================================
// MODULE 9A-3C: BRANDING
// ============================================================

/** Default brand configuration per destination */
const DEFAULT_BRAND_CONFIG = {
  calpe: {
    primary: '#7FA594', secondary: '#5E8B7E', accent: '#ffffff',
    domain: 'holidaibutler.com', chatbotName: 'HoliBot', logo: 'HolidaiButler_Icon_Web.png'
  },
  texel: {
    primary: '#30c59b', secondary: '#3572de', accent: '#ecde3c',
    domain: 'texelmaps.nl', chatbotName: 'Tessa', logo: 'texelmaps-icon.png'
  }
};

/**
 * GET /settings/branding
 * Brand configuration per destination. MongoDB overrides on top of defaults.
 */
router.get('/settings/branding', adminAuth('reviewer'), async (req, res) => {
  try {
    let overrides = {};
    if (mongoose.connection.readyState === 1) {
      try {
        const db = mongoose.connection.db;
        const docs = await db.collection('brand_configurations').find({}).toArray();
        for (const d of docs) {
          overrides[d.destination] = d;
        }
      } catch { /* fallback to defaults */ }
    }

    const branding = {};
    for (const [dest, defaults] of Object.entries(DEFAULT_BRAND_CONFIG)) {
      const ov = overrides[dest] || {};
      branding[dest] = {
        primary: ov.primary || defaults.primary,
        secondary: ov.secondary || defaults.secondary,
        accent: ov.accent || defaults.accent,
        domain: defaults.domain,
        chatbotName: ov.chatbotName || defaults.chatbotName,
        logo: ov.logo || defaults.logo,
        logo_url: ov.logo_url || null,
        brand_name: ov.brand_name || null,
        payoff: ov.payoff || null,
        customized: !!overrides[dest]
      };
    }

    res.json({ success: true, data: { branding } });
  } catch (error) {
    logger.error('[AdminPortal] Branding fetch error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'An error occurred' } });
  }
});

/**
 * PUT /settings/branding/:destination
 * Update brand colors for a destination. Stored in MongoDB.
 */
router.put('/settings/branding/:destination', adminAuth('poi_owner'), async (req, res) => {
  try {
    const dest = req.params.destination.toLowerCase();
    if (!DEFAULT_BRAND_CONFIG[dest]) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_DESTINATION', message: 'Unknown destination' } });
    }

    const { primary, secondary, accent, chatbotName, brand_name, payoff } = req.body;
    const hexRegex = /^#[0-9a-fA-F]{6}$/;

    if (primary && !hexRegex.test(primary)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_COLOR', message: 'primary must be a hex color (#RRGGBB)' } });
    }
    if (secondary && !hexRegex.test(secondary)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_COLOR', message: 'secondary must be a hex color (#RRGGBB)' } });
    }
    if (accent && !hexRegex.test(accent)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_COLOR', message: 'accent must be a hex color (#RRGGBB)' } });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: { code: 'MONGODB_UNAVAILABLE', message: 'MongoDB not connected' } });
    }

    const db = mongoose.connection.db;
    const update = {
      destination: dest,
      ...(primary && { primary }),
      ...(secondary && { secondary }),
      ...(accent && { accent }),
      ...(chatbotName && { chatbotName: String(chatbotName).slice(0, 50) }),
      ...(brand_name !== undefined && { brand_name: brand_name ? String(brand_name).slice(0, 100) : null }),
      ...(payoff !== undefined && { payoff: payoff ? String(payoff).slice(0, 200) : null }),
      updated_at: new Date(),
      updated_by: req.adminUser.email
    };

    await db.collection('brand_configurations').updateOne(
      { destination: dest },
      { $set: update },
      { upsert: true }
    );

    // Audit log
    try {
      await db.collection('audit_logs').insertOne({
        action: 'branding_updated',
        destination: dest,
        admin_id: req.adminUser.id || req.adminUser.userId,
        admin_email: req.adminUser.email,
        changes: update,
        timestamp: new Date(),
        actor: { type: 'admin', name: 'admin-portal' }
      });
    } catch { /* non-critical */ }

    res.json({ success: true, data: { message: `Branding updated for ${dest}`, destination: dest } });
  } catch (error) {
    logger.error('[AdminPortal] Branding update error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'An error occurred' } });
  }
});

/**
 * POST /settings/branding/:destination/logo
 * Upload a brand logo for a destination. Accepts PNG, JPG, SVG (max 2MB).
 * Stores file in public/branding/ and updates MongoDB logo_url.
 */
const BRANDING_DIR = process.env.NODE_ENV === 'production'
  ? '/var/www/api.holidaibutler.com/platform-core/public/branding'
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/branding');

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(BRANDING_DIR, { recursive: true });
    cb(null, BRANDING_DIR);
  },
  filename: (req, file, cb) => {
    const dest = req.params.destination.toLowerCase();
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `${dest}_logo${ext}`);
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, and SVG files are allowed'));
    }
  }
});

router.post('/settings/branding/:destination/logo', adminAuth('poi_owner'), (req, res) => {
  const dest = req.params.destination.toLowerCase();
  if (!DEFAULT_BRAND_CONFIG[dest]) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_DESTINATION', message: 'Unknown destination' } });
  }

  logoUpload.single('logo')(req, res, async (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 2MB)' : err.message;
      return res.status(400).json({ success: false, error: { code: 'UPLOAD_ERROR', message } });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded' } });
    }

    try {
      const logoUrl = `/branding/${req.file.filename}`;

      // Update MongoDB
      if (mongoose.connection.readyState === 1) {
        const db = mongoose.connection.db;
        await db.collection('brand_configurations').updateOne(
          { destination: dest },
          { $set: { logo_url: logoUrl, updated_at: new Date(), updated_by: req.adminUser.email } },
          { upsert: true }
        );

        // Audit log
        try {
          await db.collection('audit_logs').insertOne({
            action: 'branding_logo_uploaded',
            destination: dest,
            admin_id: req.adminUser.id || req.adminUser.userId,
            admin_email: req.adminUser.email,
            changes: { logo_url: logoUrl, filename: req.file.filename, size: req.file.size },
            timestamp: new Date(),
            actor: { type: 'admin', name: 'admin-portal' }
          });
        } catch { /* non-critical */ }
      }

      res.json({ success: true, data: { logo_url: logoUrl } });
    } catch (error) {
      logger.error('[AdminPortal] Logo upload error:', error);
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'An error occurred' } });
    }
  });
});

// ============================================================
// UNDO ENDPOINT (Fase 9A-1B)
// ============================================================

/**
 * POST /settings/undo/:auditLogId
 * Undo a reversible admin action using the snapshot system.
 */
router.post('/settings/undo/:auditLogId', adminAuth('poi_owner'), async (req, res) => {
  try {
    const { auditLogId } = req.params;
    const { confirm } = req.body;

    if (!confirm) {
      return res.status(400).json({
        success: false,
        error: { code: 'CONFIRM_REQUIRED', message: 'Set confirm: true to undo this action.' }
      });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: { code: 'DB_UNAVAILABLE', message: 'MongoDB not available for undo.' }
      });
    }

    const db = mongoose.connection.db;
    let objectId;
    try { objectId = new mongoose.Types.ObjectId(auditLogId); } catch {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid audit log ID format.' }
      });
    }

    const snapshot = await db.collection('admin_action_snapshots').findOne({ audit_log_id: objectId });
    if (!snapshot) {
      return res.status(404).json({
        success: false,
        error: { code: 'SNAPSHOT_NOT_FOUND', message: 'No undo snapshot found for this action.' }
      });
    }

    if (snapshot.is_undone) {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_UNDONE', message: 'This action has already been undone.' }
      });
    }

    // Check age (30 days max)
    const ageMs = Date.now() - new Date(snapshot.created_at).getTime();
    if (ageMs > 30 * 24 * 3600 * 1000) {
      return res.status(410).json({
        success: false,
        error: { code: 'SNAPSHOT_EXPIRED', message: 'This snapshot is older than 30 days and can no longer be undone.' }
      });
    }

    // Execute undo based on entity type
    const prev = snapshot.previous_state;
    switch (snapshot.entity_type) {
      case 'poi': {
        const fields = [];
        const values = [];
        for (const [key, val] of Object.entries(prev)) {
          if (['id', 'destination_id', 'google_place_id', 'created_at'].includes(key)) continue;
          fields.push(`\`${key}\` = ?`);
          values.push(val);
        }
        if (fields.length > 0) {
          values.push(snapshot.entity_id);
          await mysqlSequelize.query(
            `UPDATE POI SET ${fields.join(', ')} WHERE id = ?`,
            { replacements: values }
          );
        }
        break;
      }
      case 'review': {
        if (prev.is_archived !== undefined) {
          await mysqlSequelize.query(
            `UPDATE reviews SET is_archived = ?, archived_at = ? WHERE id = ?`,
            { replacements: [prev.is_archived ? 1 : 0, prev.archived_at || null, snapshot.entity_id] }
          );
        }
        break;
      }
      case 'user': {
        if (snapshot.action === 'user_created') {
          await mysqlSequelize.query(
            `UPDATE admin_users SET status = 'suspended' WHERE id = ?`,
            { replacements: [snapshot.entity_id] }
          );
        } else if (snapshot.action === 'user_deleted') {
          await mysqlSequelize.query(
            `UPDATE admin_users SET status = 'active' WHERE id = ?`,
            { replacements: [snapshot.entity_id] }
          );
        } else if (snapshot.action === 'user_updated' && prev) {
          const updateFields = [];
          const updateVals = [];
          for (const [key, val] of Object.entries(prev)) {
            if (['id', 'password', 'created_at'].includes(key)) continue;
            updateFields.push(`\`${key}\` = ?`);
            updateVals.push(typeof val === 'object' ? JSON.stringify(val) : val);
          }
          if (updateFields.length > 0) {
            updateVals.push(snapshot.entity_id);
            await mysqlSequelize.query(
              `UPDATE admin_users SET ${updateFields.join(', ')} WHERE id = ?`,
              { replacements: updateVals }
            );
          }
        }
        break;
      }
      case 'agent_config': {
        await db.collection('agent_configurations').updateOne(
          { agent_key: snapshot.entity_id },
          { $set: prev }
        );
        // Invalidate agent status cache
        const redis = getRedis();
        if (redis) await redis.del('admin:agents:status').catch(() => {});
        break;
      }
      default:
        return res.status(400).json({
          success: false,
          error: { code: 'UNKNOWN_ENTITY', message: `Cannot undo entity type '${snapshot.entity_type}'.` }
        });
    }

    // Mark snapshot as undone
    await db.collection('admin_action_snapshots').updateOne(
      { _id: snapshot._id },
      { $set: { is_undone: true, undone_at: new Date(), undone_by: req.adminUser.email } }
    );

    // Log the undo action
    await saveAuditLog({
      action: 'action_undone',
      adminId: req.adminUser.id,
      adminEmail: req.adminUser.email,
      details: `Undone: ${snapshot.action} on ${snapshot.entity_type} ${snapshot.entity_id}`,
      entityType: snapshot.entity_type,
      entityId: snapshot.entity_id
    });

    logger.info(`[AdminPortal] Action undone: ${snapshot.action} on ${snapshot.entity_type} ${snapshot.entity_id} by ${req.adminUser.email}`);

    res.json({
      success: true,
      data: { action: 'undone', entity_type: snapshot.entity_type, entity_id: snapshot.entity_id }
    });
  } catch (error) {
    logger.error('[AdminPortal] Undo error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred during undo.' }
    });
  }
});

// ============================================================
// USER MANAGEMENT ENDPOINTS (Fase 9A-1A)
// ============================================================

/**
 * GET /users
 * List all admin users. Platform_admin only.
 */
router.get('/users', adminAuth('platform_admin'), async (req, res) => {
  try {
    const { page = 1, limit = 25, role, status: statusFilter, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = '1=1';
    const replacements = [];

    if (role) {
      where += ' AND role = ?';
      replacements.push(role);
    }
    if (statusFilter) {
      where += ' AND status = ?';
      replacements.push(statusFilter);
    }
    if (search) {
      where += ' AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
      const s = `%${search}%`;
      replacements.push(s, s, s);
    }

    const countResult = await mysqlSequelize.query(
      `SELECT COUNT(*) as total FROM admin_users WHERE ${where}`,
      { replacements, type: QueryTypes.SELECT }
    );
    const total = parseInt(countResult[0]?.total || 0);

    replacements.push(parseInt(limit), offset);
    const users = await mysqlSequelize.query(
      `SELECT id, email, first_name, last_name, role, allowed_destinations, permissions,
              status, email_verified, two_factor_enabled, created_at, updated_at,
              login_attempts, created_by_id
       FROM admin_users WHERE ${where}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      { replacements, type: QueryTypes.SELECT }
    );

    // Parse JSON fields
    const parsed = users.map(u => ({
      ...u,
      name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
      allowed_destinations: (() => { try { return JSON.parse(u.allowed_destinations || '[]'); } catch { return []; } })(),
      permissions: (() => { try { return JSON.parse(u.permissions || '{}'); } catch { return {}; } })()
    }));

    res.json({
      success: true,
      data: {
        users: parsed,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
      }
    });
  } catch (error) {
    logger.error('[AdminPortal] List users error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred listing users.' }
    });
  }
});

/**
 * POST /users
 * Create new admin user. Platform_admin only.
 */
router.post('/users', adminAuth('platform_admin'), async (req, res) => {
  try {
    const { email, firstName, lastName, password, role, allowed_destinations } = req.body;

    // Validate required fields
    if (!email || !firstName || !lastName || !password || !role) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'email, firstName, lastName, password, and role are required.' }
      });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_EMAIL', message: 'Invalid email format.' }
      });
    }

    // Validate name: not a role name, at least 2 chars
    const roleNames = ['platform admin', 'poi owner', 'content editor', 'content reviewer', 'editor', 'reviewer', 'admin'];
    if (roleNames.some(rn => firstName.toLowerCase() === rn || (lastName && `${firstName} ${lastName}`.toLowerCase() === rn))) {
      return res.status(422).json({
        success: false,
        error: { code: 'INVALID_NAME', message: 'Name cannot be a role name. Use a real first and last name.' }
      });
    }

    // Validate enterprise password policy
    const pwErrors = validatePassword(password, email, `${firstName} ${lastName || ''}`);
    if (pwErrors.length > 0) {
      return res.status(422).json({
        success: false,
        error: { code: 'WEAK_PASSWORD', message: pwErrors.join('; '), details: pwErrors }
      });
    }

    // Validate role
    const validRoles = Object.keys(ROLE_HIERARCHY);
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ROLE', message: `Role must be one of: ${validRoles.join(', ')}` }
      });
    }

    // Check duplicate email
    const existing = await mysqlSequelize.query(
      `SELECT id FROM admin_users WHERE email = ?`,
      { replacements: [email], type: QueryTypes.SELECT }
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'An admin user with this email already exists.' }
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();
    const dests = JSON.stringify(allowed_destinations || ['calpe', 'texel']);

    await mysqlSequelize.query(
      `INSERT INTO admin_users (id, email, password, first_name, last_name, role, allowed_destinations, permissions, status, email_verified, created_by_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, '{}', 'active', 1, ?, NOW(), NOW())`,
      { replacements: [userId, email, hashedPassword, firstName, lastName || '', role, dests, req.adminUser.id] }
    );

    // Audit log + snapshot
    const auditId = await saveAuditLog({
      action: 'user_created',
      adminId: req.adminUser.id,
      adminEmail: req.adminUser.email,
      details: `Created admin user: ${email} (role: ${role})`,
      entityType: 'user',
      entityId: userId
    });
    if (auditId) {
      await saveUndoSnapshot({
        auditLogId: auditId,
        action: 'user_created',
        entityType: 'user',
        entityId: userId,
        previousState: null,
        newState: { email, firstName, lastName, role, allowed_destinations: allowed_destinations || ['calpe', 'texel'] },
        createdBy: req.adminUser.email
      });
    }

    logger.info(`[AdminPortal] User created: ${email} by ${req.adminUser.email}`);

    // Send welcome email (non-blocking — user IS created, email failure is not critical)
    const roleLabels = { platform_admin: 'Platform Admin', poi_owner: 'POI Owner', editor: 'Content Editor', reviewer: 'Content Reviewer' };
    const welcomeHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
        <tr><td style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5a87 100%);padding:40px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:600;">HolidaiButler Admin Portal</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="color:#1e3a5f;margin:0 0 20px 0;font-size:24px;">Welkom, ${firstName}!</h2>
          <p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0 0 20px 0;">
            Er is een account voor je aangemaakt op het HolidaiButler Admin Portal.
          </p>
          <table style="border-collapse:collapse;margin:20px 0;width:100%;">
            <tr><td style="padding:10px 12px;font-weight:bold;color:#1e3a5f;border-bottom:1px solid #e2e8f0;">Login URL:</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;"><a href="https://admin.holidaibutler.com" style="color:#2d5a87;">admin.holidaibutler.com</a></td></tr>
            <tr><td style="padding:10px 12px;font-weight:bold;color:#1e3a5f;border-bottom:1px solid #e2e8f0;">Email:</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${email}</td></tr>
            <tr><td style="padding:10px 12px;font-weight:bold;color:#1e3a5f;border-bottom:1px solid #e2e8f0;">Tijdelijk wachtwoord:</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:15px;">${password}</td></tr>
            <tr><td style="padding:10px 12px;font-weight:bold;color:#1e3a5f;">Rol:</td>
                <td style="padding:10px 12px;">${roleLabels[role] || role}</td></tr>
          </table>
          <p style="color:#e53e3e;font-size:15px;font-weight:600;margin:20px 0;">
            Wijzig je wachtwoord direct na je eerste login.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
            <tr><td align="center">
              <a href="https://admin.holidaibutler.com" style="display:inline-block;background:linear-gradient(135deg,#d4af37 0%,#c9a227 100%);color:#1e3a5f;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:600;font-size:16px;">
                Inloggen
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background-color:#f7fafc;padding:30px 40px;text-align:center;">
          <p style="color:#718096;font-size:14px;margin:0;">&copy; ${new Date().getFullYear()} HolidaiButler. Alle rechten voorbehouden.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    const welcomeText = `Welkom ${firstName}!\n\nEr is een account voor je aangemaakt op het HolidaiButler Admin Portal.\n\nLogin URL: https://admin.holidaibutler.com\nEmail: ${email}\nTijdelijk wachtwoord: ${password}\nRol: ${roleLabels[role] || role}\n\nWijzig je wachtwoord direct na je eerste login.\n\n---\nHolidaiButler Team`;

    emailService.sendEmail({
      to: email,
      toName: `${firstName} ${lastName || ''}`.trim(),
      subject: 'Welkom bij HolidaiButler Admin Portal \u2014 Inloggegevens',
      html: welcomeHtml,
      text: welcomeText
    }).then(result => {
      if (result.success) {
        logger.info(`[AdminPortal] Welcome email sent to ${email}`);
      } else {
        logger.warn(`[AdminPortal] Welcome email failed for ${email}: ${result.error}`);
      }
    }).catch(err => {
      logger.warn(`[AdminPortal] Welcome email error for ${email}: ${err.message}`);
    });

    res.status(201).json({
      success: true,
      data: { id: userId, email, firstName, lastName: lastName || '', role, allowed_destinations: allowed_destinations || ['calpe', 'texel'] }
    });
  } catch (error) {
    logger.error('[AdminPortal] Create user error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred creating the user.' }
    });
  }
});

/**
 * GET /users/:id
 * Get admin user detail. Platform_admin only.
 */
router.get('/users/:id', adminAuth('platform_admin'), async (req, res) => {
  try {
    const users = await mysqlSequelize.query(
      `SELECT id, email, first_name, last_name, role, allowed_destinations, permissions,
              owned_pois, status, email_verified, two_factor_enabled,
              login_attempts, lock_until, activity_log, preferences,
              created_by_id, created_at, updated_at
       FROM admin_users WHERE id = ?`,
      { replacements: [req.params.id], type: QueryTypes.SELECT }
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Admin user not found.' }
      });
    }

    const u = users[0];
    res.json({
      success: true,
      data: {
        ...u,
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
        allowed_destinations: (() => { try { return JSON.parse(u.allowed_destinations || '[]'); } catch { return []; } })(),
        permissions: (() => { try { return JSON.parse(u.permissions || '{}'); } catch { return {}; } })(),
        owned_pois: (() => { try { return JSON.parse(u.owned_pois || '[]'); } catch { return []; } })(),
        activity_log: (() => { try { return JSON.parse(u.activity_log || '[]'); } catch { return []; } })(),
        preferences: (() => { try { return JSON.parse(u.preferences || '{}'); } catch { return {}; } })()
      }
    });
  } catch (error) {
    logger.error('[AdminPortal] Get user error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred.' }
    });
  }
});

/**
 * PUT /users/:id
 * Update admin user. Platform_admin only.
 */
router.put('/users/:id', adminAuth('platform_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, allowed_destinations, status, permissions } = req.body;

    // Fetch current state for undo snapshot
    const current = await mysqlSequelize.query(
      `SELECT id, email, first_name, last_name, role, allowed_destinations, permissions, status
       FROM admin_users WHERE id = ?`,
      { replacements: [id], type: QueryTypes.SELECT }
    );
    if (current.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Admin user not found.' }
      });
    }

    // Prevent self-demotion
    if (id === req.adminUser.id && role && role !== current[0].role) {
      return res.status(400).json({
        success: false,
        error: { code: 'SELF_DEMOTION', message: 'You cannot change your own role.' }
      });
    }

    // Prevent self-status change (e.g. suspending yourself)
    if (id === req.adminUser.id && status && status !== current[0].status) {
      return res.status(400).json({
        success: false,
        error: { code: 'SELF_STATUS_CHANGE', message: 'You cannot change your own status.' }
      });
    }

    // Build update
    const updates = [];
    const values = [];
    if (firstName !== undefined) { updates.push('first_name = ?'); values.push(firstName); }
    if (lastName !== undefined) { updates.push('last_name = ?'); values.push(lastName); }
    if (role !== undefined) {
      if (!Object.keys(ROLE_HIERARCHY).includes(role)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_ROLE', message: `Role must be one of: ${Object.keys(ROLE_HIERARCHY).join(', ')}` }
        });
      }
      updates.push('role = ?'); values.push(role);
    }
    if (allowed_destinations !== undefined) {
      updates.push('allowed_destinations = ?'); values.push(JSON.stringify(allowed_destinations));
    }
    if (status !== undefined) {
      if (!['active', 'suspended', 'pending'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Status must be active, suspended, or pending.' }
        });
      }
      updates.push('status = ?'); values.push(status);
    }
    if (permissions !== undefined) {
      updates.push('permissions = ?'); values.push(JSON.stringify(permissions));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_CHANGES', message: 'No fields to update.' }
      });
    }

    updates.push('updated_at = NOW()');
    values.push(id);
    await mysqlSequelize.query(
      `UPDATE admin_users SET ${updates.join(', ')} WHERE id = ?`,
      { replacements: values }
    );

    // Audit log + undo snapshot
    const auditId = await saveAuditLog({
      action: 'user_updated',
      adminId: req.adminUser.id,
      adminEmail: req.adminUser.email,
      details: `Updated admin user: ${current[0].email}`,
      entityType: 'user',
      entityId: id
    });
    if (auditId) {
      await saveUndoSnapshot({
        auditLogId: auditId,
        action: 'user_updated',
        entityType: 'user',
        entityId: id,
        previousState: current[0],
        newState: req.body,
        createdBy: req.adminUser.email
      });
    }

    logger.info(`[AdminPortal] User updated: ${current[0].email} by ${req.adminUser.email}`);
    res.json({ success: true, data: { id, updated: true } });
  } catch (error) {
    logger.error('[AdminPortal] Update user error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred updating the user.' }
    });
  }
});

/**
 * PUT /users/:id/deactivate
 * Toggle admin user active/inactive status. Platform_admin only.
 * Inactive users cannot log in but their account data is preserved.
 */
router.put('/users/:id/deactivate', adminAuth('platform_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deactivation
    if (id === req.adminUser.id) {
      return res.status(400).json({
        success: false,
        error: { code: 'SELF_DEACTIVATE', message: 'You cannot deactivate your own account.' }
      });
    }

    const current = await mysqlSequelize.query(
      `SELECT id, email, first_name, last_name, role, status FROM admin_users WHERE id = ?`,
      { replacements: [id], type: QueryTypes.SELECT }
    );
    if (current.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Admin user not found.' }
      });
    }

    // Toggle: active → suspended, anything else → active
    const newStatus = current[0].status === 'active' ? 'suspended' : 'active';

    await mysqlSequelize.query(
      `UPDATE admin_users SET status = ?, updated_at = NOW() WHERE id = ?`,
      { replacements: [newStatus, id] }
    );

    // Invalidate sessions when deactivating
    if (newStatus === 'suspended') {
      await mysqlSequelize.query(
        `DELETE FROM Sessions WHERE user_id = ?`,
        { replacements: [id] }
      ).catch(() => {});
    }

    // Audit log + undo snapshot
    const auditId = await saveAuditLog({
      action: 'user_deactivated',
      adminId: req.adminUser.id,
      adminEmail: req.adminUser.email,
      details: `User ${current[0].email} status changed: ${current[0].status} → ${newStatus}`,
      entityType: 'user',
      entityId: id
    });
    if (auditId) {
      await saveUndoSnapshot({
        auditLogId: auditId,
        action: 'user_deactivated',
        entityType: 'user',
        entityId: id,
        previousState: current[0],
        newState: { status: newStatus },
        createdBy: req.adminUser.email
      });
    }

    logger.info(`[AdminPortal] User ${newStatus === 'suspended' ? 'deactivated' : 'reactivated'}: ${current[0].email} by ${req.adminUser.email}`);
    res.json({ success: true, data: { id, status: newStatus } });
  } catch (error) {
    logger.error('[AdminPortal] Deactivate user error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred changing user status.' }
    });
  }
});

/**
 * DELETE /users/:id
 * Permanently delete admin user (hard delete). Platform_admin only.
 * Requires { confirm: true } in request body for safety.
 */
router.delete('/users/:id', adminAuth('platform_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Require explicit confirmation
    if (!req.body?.confirm) {
      return res.status(400).json({
        success: false,
        error: { code: 'CONFIRM_REQUIRED', message: 'Confirmation required. Send { confirm: true } in body.' }
      });
    }

    // Prevent self-deletion
    if (id === req.adminUser.id) {
      return res.status(400).json({
        success: false,
        error: { code: 'SELF_DELETE', message: 'You cannot delete your own account.' }
      });
    }

    const current = await mysqlSequelize.query(
      `SELECT id, email, first_name, last_name, role, status FROM admin_users WHERE id = ?`,
      { replacements: [id], type: QueryTypes.SELECT }
    );
    if (current.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Admin user not found.' }
      });
    }

    // Invalidate sessions first
    await mysqlSequelize.query(
      `DELETE FROM Sessions WHERE user_id = ?`,
      { replacements: [id] }
    ).catch(() => {});

    // Hard delete the user
    await mysqlSequelize.query(
      `DELETE FROM admin_users WHERE id = ?`,
      { replacements: [id] }
    );

    // Audit log (no undo for hard delete — data is gone)
    await saveAuditLog({
      action: 'user_permanently_deleted',
      adminId: req.adminUser.id,
      adminEmail: req.adminUser.email,
      details: `Permanently deleted admin user: ${current[0].email} (role: ${current[0].role})`,
      entityType: 'user',
      entityId: id
    });

    logger.info(`[AdminPortal] User permanently deleted: ${current[0].email} by ${req.adminUser.email}`);
    res.json({ success: true, data: { id, permanentlyDeleted: true } });
  } catch (error) {
    logger.error('[AdminPortal] Delete user error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred deleting the user.' }
    });
  }
});

/**
 * POST /users/:id/reset-password
 * Generate a temporary password for admin user. Platform_admin only.
 */
router.post('/users/:id/reset-password', adminAuth('platform_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const users = await mysqlSequelize.query(
      `SELECT id, email FROM admin_users WHERE id = ?`,
      { replacements: [id], type: QueryTypes.SELECT }
    );
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Admin user not found.' }
      });
    }

    // Generate temporary password (16 chars, meets enterprise policy)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*-_+=';
    let tempPassword;
    do {
      tempPassword = Array.from(crypto.randomBytes(16))
        .map(b => chars[b % chars.length])
        .join('');
    } while (validatePassword(tempPassword, '', '').length > 0);

    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    await mysqlSequelize.query(
      `UPDATE admin_users SET password = ?, login_attempts = 0, lock_until = NULL, updated_at = NOW() WHERE id = ?`,
      { replacements: [hashedPassword, id] }
    );

    // Invalidate sessions
    await mysqlSequelize.query(
      `DELETE FROM Sessions WHERE user_id = ?`,
      { replacements: [id] }
    ).catch(() => {});

    // Audit log
    await saveAuditLog({
      action: 'password_reset',
      adminId: req.adminUser.id,
      adminEmail: req.adminUser.email,
      details: `Password reset for: ${users[0].email}`,
      entityType: 'user',
      entityId: id
    });

    logger.info(`[AdminPortal] Password reset: ${users[0].email} by ${req.adminUser.email}`);

    res.json({
      success: true,
      data: {
        tempPassword,
        message: 'Temporary password generated. Share securely with the user. They should change it after first login.'
      }
    });
  } catch (error) {
    logger.error('[AdminPortal] Password reset error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred resetting the password.' }
    });
  }
});

// ============================================================
// AGENT CONFIGURATION ENDPOINTS (Fase 9A-1C)
// ============================================================

/**
 * GET /agents/config
 * Get all agent configurations from MongoDB (fallback to AGENT_METADATA).
 */
router.get('/agents/config', adminAuth('editor'), destinationScope, async (req, res) => {
  try {
    let dbConfigs = [];

    if (mongoose.connection.readyState === 1) {
      const db = mongoose.connection.db;
      dbConfigs = await db.collection('agent_configurations').find({}).sort({ agent_key: 1 }).toArray();
    }

    // Build configs for ALL 18 agents: MongoDB data merged with static fallback
    const dbConfigMap = {};
    for (const dc of dbConfigs) {
      dbConfigMap[dc.agent_key] = dc;
    }

    const configs = AGENT_METADATA.map(m => {
      const dbEntry = dbConfigMap[m.id];
      if (dbEntry) {
        // MongoDB entry exists — return it with static fallbacks for missing fields
        return {
          ...dbEntry,
          english_name: dbEntry.english_name || m.englishName,
          category: dbEntry.category || m.category,
          type: dbEntry.type || m.type,
          schedule: dbEntry.schedule || m.schedule,
          source: 'mongodb'
        };
      }
      // No MongoDB entry — return static metadata
      return {
        agent_key: m.id,
        display_name: m.name,
        english_name: m.englishName,
        emoji: '',
        category: m.category,
        type: m.type,
        description_nl: m.description,
        description_en: '',
        tasks: [],
        schedule: m.schedule,
        is_active: true,
        source: 'static'
      };
    });

    res.json({ success: true, data: { configs } });
  } catch (error) {
    logger.error('[AdminPortal] Get agent configs error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred fetching agent configs.' }
    });
  }
});

/**
 * PUT /agents/config/:key
 * Update agent configuration in MongoDB. Platform_admin only.
 */
router.put('/agents/config/:key', adminAuth('platform_admin'), async (req, res) => {
  try {
    const { key } = req.params;

    // Validate agent_key exists in known agents
    const knownAgent = AGENT_METADATA.find(m => m.id === key);
    if (!knownAgent) {
      return res.status(404).json({
        success: false,
        error: { code: 'AGENT_NOT_FOUND', message: `Unknown agent key: ${key}` }
      });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: { code: 'DB_UNAVAILABLE', message: 'MongoDB not available.' }
      });
    }

    const db = mongoose.connection.db;
    const collection = db.collection('agent_configurations');

    // Get current state for undo snapshot
    const currentConfig = await collection.findOne({ agent_key: key });

    // Validate tasks array (max 10, must be array of strings)
    if (req.body.tasks !== undefined) {
      if (!Array.isArray(req.body.tasks)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_TASKS', message: 'tasks must be an array' } });
      }
      if (req.body.tasks.length > 10) {
        return res.status(400).json({ success: false, error: { code: 'TOO_MANY_TASKS', message: 'Maximum 10 tasks allowed' } });
      }
    }

    // Build update from allowed fields — NO truncation, full array saved
    const allowedFields = ['display_name', 'emoji', 'description_nl', 'description_en', 'description_de', 'description_es', 'tasks', 'monitoring_scope', 'schedule', 'is_active', 'custom_config'];
    const updateDoc = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateDoc[field] = req.body[field];
      }
    }

    if (Object.keys(updateDoc).length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_CHANGES', message: 'No valid fields to update.' }
      });
    }

    updateDoc.updated_at = new Date();
    updateDoc.updated_by = req.adminUser.email;

    // Upsert: create if not exists (first edit after migration)
    await collection.updateOne(
      { agent_key: key },
      {
        $set: updateDoc,
        $setOnInsert: {
          agent_key: key,
          english_name: knownAgent.englishName,
          category: knownAgent.category,
          type: knownAgent.type,
          created_at: new Date()
        }
      },
      { upsert: true }
    );

    // Invalidate agent status cache
    const redis = getRedis();
    if (redis) await redis.del('admin:agents:status').catch(() => {});

    // Audit log + undo snapshot
    const auditId = await saveAuditLog({
      action: 'agent_config_updated',
      adminId: req.adminUser.id,
      adminEmail: req.adminUser.email,
      details: `Updated agent config: ${key} (${knownAgent.name})`,
      entityType: 'agent_config',
      entityId: key
    });
    if (auditId && currentConfig) {
      await saveUndoSnapshot({
        auditLogId: auditId,
        action: 'agent_config_updated',
        entityType: 'agent_config',
        entityId: key,
        previousState: currentConfig,
        newState: updateDoc,
        createdBy: req.adminUser.email
      });
    }

    logger.info(`[AdminPortal] Agent config updated: ${key} by ${req.adminUser.email}`);
    res.json({ success: true, data: { agent_key: key, updated: true } });
  } catch (error) {
    logger.error('[AdminPortal] Update agent config error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred updating agent config.' }
    });
  }
});

export default router;
