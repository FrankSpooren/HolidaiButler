/**
 * Admin Portal Routes — Fase 8C-0 + 8C-1 + 8D + 9A + 9B + 10A + 11B + II-B + II-C + III-A + III-B + III-C + III-E + IV-A + IV-B + IV-C + IV-E + V.4 + V.6 + Wave 1 + Content B+C+D + Wave 5 + Wave 6 + CS v5.0 + BLOK 10 RBAC (v3.32.0)
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
 *   GET  /agents/status        — Agent status dashboard (Redis cached 60s, deactivated support)
 *   GET  /agents/:key/results  — Agent run results (last 5 runs with output data)
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
 *   --- Payment endpoints (Fase III-A) ---
 *   GET  /payments              — List payment transactions
 *   GET  /payments/stats        — Payment statistics
 *   GET  /payments/reconciliation — Reconciliation report
 *   GET  /payments/:id          — Payment transaction detail
 *   POST /payments/:id/refund   — Initiate refund
 *
 *   --- Ticketing endpoints (Fase III-B) ---
 *   GET  /tickets               — List ticket definitions
 *   POST /tickets               — Create ticket definition
 *   PUT  /tickets/:id           — Update ticket definition
 *   DELETE /tickets/:id         — Soft delete ticket (deactivate)
 *   GET  /tickets/:id/inventory — Get inventory slots for ticket
 *   POST /tickets/:id/inventory — Create inventory slots (bulk)
 *   PUT  /tickets/inventory/:id — Update single inventory slot
 *   GET  /tickets/orders        — List ticket orders
 *   GET  /tickets/orders/:id    — Order detail with items
 *   POST /tickets/orders/:id/cancel — Cancel order (admin)
 *   POST /tickets/qr/validate   — Validate QR code (scanner)
 *   GET  /tickets/stats         — Ticketing statistics
 *   POST /vouchers              — Create voucher code
 *   GET  /vouchers              — List vouchers
 *   PUT  /vouchers/:id          — Update voucher
 *
 *   --- Reservation endpoints (Fase III-C) ---
 *   GET  /reservations            — List reservations (paginated, filtered)
 *   GET  /reservations/stats      — Reservation statistics
 *   GET  /reservations/calendar/:poiId — Calendar overview (month view)
 *   GET  /reservations/slots/:poiId — Slot list with availability
 *   POST /reservations/slots/:poiId — Create reservation slots (bulk)
 *   PUT  /reservations/slots/:id  — Update reservation slot
 *   GET  /reservations/:id        — Reservation detail
 *   PUT  /reservations/:id/status — Update reservation status
 *   POST /reservations/:id/no-show — Mark no-show (auto-blacklist)
 *   POST /reservations/:id/complete — Mark completed
 *   GET  /guests                  — List guest profiles
 *   GET  /guests/:id              — Guest profile detail + history
 *   PUT  /guests/:id/blacklist    — Manual blacklist toggle
 *
 *   --- Commerce Dashboard endpoints (Fase III-E) ---
 *   GET  /commerce/dashboard          — Revenue/ticket/reservation KPI dashboard
 *   GET  /commerce/reports/daily      — Daily financial report
 *   GET  /commerce/reports/weekly     — Weekly financial report
 *   GET  /commerce/reports/monthly    — Monthly financial report (by year)
 *   GET  /commerce/reports/reconciliation — Reconciliation report (single date)
 *   GET  /commerce/export/transactions — CSV export transactions
 *   GET  /commerce/export/reservations — CSV export reservations
 *   GET  /commerce/export/tickets     — CSV export ticket orders
 *   GET  /commerce/alerts             — Fraud/anomaly alerts
 *   GET  /commerce/top-pois           — Top performing POIs by metric
 *
 *   --- Partner Management endpoints (Fase IV-A) ---
 *   GET  /partners                   — List partners (paginated, filtered)
 *   GET  /partners/stats             — Partner dashboard KPIs
 *   GET  /partners/:id               — Partner detail with POIs + onboarding
 *   POST /partners                   — Create partner + onboarding steps
 *   PUT  /partners/:id               — Update partner details
 *   PUT  /partners/:id/status        — Change contract status
 *   GET  /partners/:id/transactions  — Partner transaction history (placeholder)
 *
 *   --- Intermediary endpoints (Fase IV-B) ---
 *   POST /intermediary               — Create intermediary transaction
 *   GET  /intermediary                — List intermediary transactions
 *   GET  /intermediary/stats          — Intermediary statistics
 *   GET  /intermediary/:id            — Transaction detail
 *   PUT  /intermediary/:id/consent    — Consent (toestemming)
 *   PUT  /intermediary/:id/confirm    — Confirm (bevestiging)
 *   PUT  /intermediary/:id/share      — Share voucher (delen + QR)
 *   PUT  /intermediary/:id/cancel     — Cancel transaction
 *   GET  /intermediary/:id/qr         — Get QR code image
 *
 *   --- Financial Process endpoints (Fase IV-C) ---
 *   GET  /financial/dashboard          — Financial KPI dashboard
 *   GET  /financial/reports/monthly    — Monthly financial report (by year)
 *   GET  /financial/settlements        — List settlement batches
 *   GET  /financial/settlements/:id    — Settlement batch detail
 *   POST /financial/settlements        — Create settlement batch
 *   PUT  /financial/settlements/:id/approve  — Approve settlement
 *   PUT  /financial/settlements/:id/process  — Start processing settlement
 *   PUT  /financial/settlements/:id/cancel   — Cancel settlement
 *   GET  /financial/payouts            — List partner payouts
 *   GET  /financial/payouts/:id        — Payout detail with transactions
 *   PUT  /financial/payouts/:id/paid   — Mark payout as paid
 *   PUT  /financial/payouts/:id/failed — Mark payout as failed
 *   GET  /financial/credit-notes       — List credit notes
 *   GET  /financial/credit-notes/:id   — Credit note detail
 *   POST /financial/credit-notes       — Create credit note
 *   PUT  /financial/credit-notes/:id/finalize — Finalize credit note
 *   GET  /financial/export/payouts     — CSV export payouts
 *   GET  /financial/export/credit-notes — CSV export credit notes
 *   GET  /financial/export/tax-summary — CSV export tax summary (yearly)
 *   GET  /financial/audit-log          — Financial audit log
 *
 *   --- Pages, Branding & Navigation endpoints (Fase V.4) ---
 *   GET  /pages                         — List pages (per destination)
 *   GET  /pages/:id                     — Page detail with layout JSON
 *   POST /pages                         — Create new page
 *   PUT  /pages/:id                     — Update page (title, SEO, layout, status)
 *   DELETE /pages/:id                   — Delete page (hard delete)
 *   GET  /destinations                  — List destinations with branding + feature_flags
 *   PUT  /destinations/:id/branding     — Update destinations.branding JSON (MySQL + MongoDB sync)
 *   PUT  /destinations/:id/navigation   — Update nav_items in destinations.config JSON
 *
 * @module routes/adminPortal
 * @version 3.25.0
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
import { AgentIssue } from '../services/agents/base/agentIssues.js';
import commerceService from '../services/commerce/commerceService.js';
import partnerService from '../services/partner/partnerService.js';
import intermediaryService from '../services/intermediary/intermediaryService.js';
import financialService from '../services/financial/financialService.js';

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
  const codeMap = { calpe: 1, texel: 2, alicante: 3, warrewijzer: 4 };
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
  destination_admin: 90,
  poi_owner: 70,
  content_manager: 60,
  editor: 50,
  reviewer: 30
};

// Permission matrix per role — used by frontend (GET /auth/permissions) and route guards
const ROLE_PERMISSIONS = {
  platform_admin: {
    allDestinations: true, settings: true, userManagement: true,
    contentStudio: { generate: true, edit: true, approve: true, publish: true, socialConnect: true },
  },
  destination_admin: {
    allDestinations: false, settings: false, userManagement: false,
    contentStudio: { generate: true, edit: true, approve: true, publish: true, socialConnect: true },
  },
  poi_owner: {
    allDestinations: false, settings: false, userManagement: false,
    contentStudio: { generate: false, edit: false, approve: false, publish: false, socialConnect: false },
    poiScope: 'own_pois_only',
  },
  content_manager: {
    allDestinations: false, settings: false, userManagement: false,
    contentStudio: { generate: true, edit: true, approve: false, publish: false, socialConnect: false },
  },
  editor: {
    allDestinations: false, settings: false, userManagement: false,
    contentStudio: { generate: true, edit: true, approve: false, publish: false, socialConnect: false },
  },
  reviewer: {
    allDestinations: false, settings: false, userManagement: false,
    contentStudio: { generate: false, edit: false, approve: false, publish: false, socialConnect: false },
  },
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
      if (destFilter && !['platform_admin'].includes(user.role) && allowedDests.length > 0) {
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
      const destCodeToId = { calpe: 1, texel: 2, alicante: 3, warrewijzer: 4 };
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

  // Destination Admin / Editor / Reviewer: scoped to allowed destination IDs
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

// ============================================================================
// DESTINATION TYPE HELPERS
// ============================================================================

/**
 * Default feature flags for content_only destinations
 */
const CONTENT_ONLY_DEFAULT_FLAGS = {
  hasContentStudio: true,
  hasMediaLibrary: true,
  hasBranding: true,
  hasPOI: false,
  hasEvents: false,
  hasTicketing: false,
  hasReservations: false,
  hasChatbot: false,
  hasCommerce: false,
  hasPartners: false,
  hasIntermediary: false,
  hasFinancial: false,
  hasPages: false,
  social_platforms: {
    facebook: true,
    instagram: true,
    linkedin: true,
    x: false,
    tiktok: false,
    pinterest: false,
    youtube: false
  }
};

/**
 * Check if a destination is content_only type
 * @param {number} destinationId
 * @returns {Promise<boolean>}
 */
async function isContentOnly(destinationId) {
  try {
    const [[dest]] = await mysqlSequelize.query(
      'SELECT destination_type FROM destinations WHERE id = :id',
      { replacements: { id: Number(destinationId) } }
    );
    return dest?.destination_type === 'content_only';
  } catch {
    return false;
  }
}

/**
 * Get destination type
 * @param {number} destinationId
 * @returns {Promise<string>} 'tourism' or 'content_only'
 */
async function getDestinationType(destinationId) {
  try {
    const [[dest]] = await mysqlSequelize.query(
      'SELECT destination_type FROM destinations WHERE id = :id',
      { replacements: { id: Number(destinationId) } }
    );
    return dest?.destination_type || 'tourism';
  } catch {
    return 'tourism';
  }
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

    // Check onboarding status
    let onboardingCompleted = true;
    if (userSource === 'admin_users') {
      try {
        const [[ob]] = await mysqlSequelize.query('SELECT onboarding_completed FROM admin_users WHERE id = :id', { replacements: { id: user.id } });
        onboardingCompleted = !!ob?.onboarding_completed;
      } catch { /* default true */ }
    }

    logger.info(`[AdminPortal] Admin login: ${email} (source: ${userSource}, onboarding: ${onboardingCompleted})`);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          allowed_destinations: user.allowed_destinations,
          permissions: ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS.reviewer,
          onboardingCompleted
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
 * GET /auth/permissions
 * Returns the RBAC permissions for the current user's role.
 */
router.get('/auth/permissions', adminAuth('reviewer'), (req, res) => {
  const perms = ROLE_PERMISSIONS[req.adminUser.role] || ROLE_PERMISSIONS.reviewer;
  res.json({ success: true, data: { role: req.adminUser.role, permissions: perms } });
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
    // Fetch onboarding status from DB
    let onboardingCompleted = true;
    try {
      const [[ob]] = await mysqlSequelize.query('SELECT onboarding_completed FROM admin_users WHERE id = :id', { replacements: { id: req.adminUser.id } });
      if (ob) onboardingCompleted = !!ob.onboarding_completed;
    } catch { /* default true */ }

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
        permissions: req.adminUser.permissions,
        onboardingCompleted
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

/**
 * GET /dashboard/actions — Action-oriented dashboard data
 * Returns: pending reviews, expiring tokens, top performer, trending topics, recent content
 */
router.get('/dashboard/actions', adminAuth('reviewer'), async (req, res) => {
  try {
    const user = req.adminUser;
    const isPlatformAdmin = user.role === 'platform_admin';
    // Determine destination scope
    let destFilter = '';
    let destIds = [];
    if (!isPlatformAdmin && user.allowed_destination_ids?.length > 0) {
      destIds = user.allowed_destination_ids;
      destFilter = `AND destination_id IN (${destIds.map(() => '?').join(',')})`;
    }
    const destParams = destIds.length > 0 ? destIds : [];

    // 1. Pending reviews
    let pendingReviews = 0;
    try {
      const [[pr]] = await mysqlSequelize.query(
        `SELECT COUNT(*) as cnt FROM content_items WHERE approval_status = 'pending_review' ${destFilter}`,
        { replacements: destParams }
      );
      pendingReviews = pr?.cnt || 0;
    } catch { /* */ }

    // 2. Draft items
    let draftItems = 0;
    try {
      const [[dr]] = await mysqlSequelize.query(
        `SELECT COUNT(*) as cnt FROM content_items WHERE approval_status = 'draft' ${destFilter}`,
        { replacements: destParams }
      );
      draftItems = dr?.cnt || 0;
    } catch { /* */ }

    // 3. Expiring social tokens (within 7 days)
    let expiringTokens = [];
    try {
      const [tokens] = await mysqlSequelize.query(
        `SELECT platform, account_name, token_expires_at, DATEDIFF(token_expires_at, NOW()) as days_left
         FROM social_accounts WHERE token_expires_at IS NOT NULL AND token_expires_at < DATE_ADD(NOW(), INTERVAL 7 DAY) AND status = 'active' ${destFilter}`,
        { replacements: destParams }
      );
      expiringTokens = tokens;
    } catch { /* */ }

    // 4. Top performer (last 7 days)
    let topPerformer = null;
    try {
      const [[top]] = await mysqlSequelize.query(
        `SELECT ci.title, ci.target_platform, SUM(cp.engagement) as total_engagement, SUM(cp.reach) as total_reach
         FROM content_items ci JOIN content_performance cp ON cp.content_item_id = ci.id
         WHERE cp.measured_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) ${destFilter ? destFilter.replace('destination_id', 'ci.destination_id') : ''}
         GROUP BY ci.id ORDER BY total_reach DESC LIMIT 1`,
        { replacements: destParams }
      );
      if (top?.title) topPerformer = top;
    } catch { /* */ }

    // 5. Top trending topic
    let trendingTopic = null;
    try {
      const [[trend]] = await mysqlSequelize.query(
        `SELECT keyword, relevance_score, trend_direction FROM trending_data
         WHERE trend_direction IN ('rising','breakout') ${destFilter}
         ORDER BY relevance_score DESC LIMIT 1`,
        { replacements: destParams }
      );
      if (trend?.keyword) trendingTopic = trend;
    } catch { /* */ }

    // 6. Recent content (last 5 items)
    let recentContent = [];
    try {
      const [items] = await mysqlSequelize.query(
        `SELECT id, title, target_platform, approval_status, seo_score, created_at
         FROM content_items WHERE approval_status != 'deleted' ${destFilter}
         ORDER BY updated_at DESC LIMIT 5`,
        { replacements: destParams }
      );
      recentContent = items;
    } catch { /* */ }

    // 7. Content performance summary (7d)
    let performance = { reach: 0, engagement: 0, clicks: 0, growth_reach: 0, growth_engagement: 0 };
    try {
      const [[perf]] = await mysqlSequelize.query(
        `SELECT SUM(reach) as reach, SUM(engagement) as engagement, SUM(clicks) as clicks
         FROM content_performance WHERE measured_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) ${destFilter ? destFilter.replace('destination_id', 'destination_id') : ''}`,
        { replacements: destParams }
      );
      if (perf) {
        performance.reach = perf.reach || 0;
        performance.engagement = perf.engagement || 0;
        performance.clicks = perf.clicks || 0;
      }
    } catch { /* */ }

    // 8. Failed publishes
    let failedPublishes = 0;
    try {
      const [[fp]] = await mysqlSequelize.query(
        `SELECT COUNT(*) as cnt FROM content_items WHERE approval_status = 'failed' ${destFilter}`,
        { replacements: destParams }
      );
      failedPublishes = fp?.cnt || 0;
    } catch { /* */ }

    res.json({
      success: true,
      data: {
        actions: {
          pendingReviews,
          draftItems,
          expiringTokens,
          failedPublishes,
          topPerformer,
          trendingTopic,
        },
        performance,
        recentContent,
      }
    });
  } catch (error) {
    logger.error('[AdminPortal] Dashboard actions error:', error);
    res.status(500).json({ success: false, error: { code: 'DASHBOARD_ACTIONS_ERROR', message: error.message } });
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
    description: 'HTTP performance check: TTFB, status codes, security headers per domein',
    description_en: 'HTTP performance check: TTFB, status codes, security headers per domain',
    tasks: ['TTFB meting per domein', 'HTTP status verificatie', 'Security headers controle', 'Brand kleur consistentie'],
    monitoring_scope: 'Frontend performance, security headers, brand kleuren',
    output_description: 'Wekelijks performance rapport: 4 domeinen, TTFB, headers',
    functionalityLevel: 'active',
    schedule: '0 6 * * 1', actorNames: ['ux-ui-reviewer', 'dev-layer'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "UX"
2. Controleer brand configuratie per destination in config/destinations/
3. Bij accessibility fouten: controleer frontend build output
4. Herstart API: pm2 restart holidaibutler-api
5. Agent draait wekelijks (maandag 06:00 UTC) — wacht op volgende run` } },
  { id: 'corrector', name: 'De Corrector', englishName: 'Code Agent', category: 'development', type: 'B',
    description: 'Grep-based code scan: console.log teller, secrets detectie, TODO/FIXME tracker',
    description_en: 'Grep-based code scan: console.log count, secrets detection, TODO/FIXME tracker',
    tasks: ['console.log detectie', 'Hardcoded secrets scan', 'TODO/FIXME/HACK teller', 'File/line count statistieken'],
    monitoring_scope: 'Codebase kwaliteit, tech debt, secrets',
    output_description: 'Wekelijks code scan rapport: files, lines, console.logs, TODOs',
    functionalityLevel: 'active',
    schedule: '0 6 * * 1', actorNames: ['code-reviewer', 'dev-layer'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "Code"
2. Bij dependency vulnerabilities: npm audit --production
3. Controleer ESLint config en linting output
4. Herstart API: pm2 restart holidaibutler-api
5. Agent draait wekelijks (maandag 06:00 UTC) — wacht op volgende run` } },
  { id: 'bewaker', name: 'De Bewaker', englishName: 'Security Agent', category: 'development', type: 'B',
    description: 'npm audit scan: vulnerability detectie (critical/high/moderate/low)',
    description_en: 'npm audit scan: vulnerability detection (critical/high/moderate/low)',
    tasks: ['npm audit --json scan', 'Vulnerability classificatie', 'Critical/high alerting via De Bode'],
    monitoring_scope: 'npm dependencies, security vulnerabilities',
    output_description: 'Dagelijks npm audit rapport: vulnerability counts per severity',
    functionalityLevel: 'active',
    schedule: '0 2 * * *', actorNames: ['security-reviewer', 'dev-layer'],
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
    active: false, deactivatedReason: 'Onvoldoende waarde in huidige fase (★★☆☆☆). Reactiveren bij 3+ destinations.',
    deactivatedDate: '2026-02-26',
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
    active: false, deactivatedReason: 'Onvoldoende waarde in huidige fase (★★☆☆☆). Reactiveren bij voldoende gebruikersdata.',
    deactivatedDate: '2026-02-26',
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
    active: false, deactivatedReason: 'Onvoldoende waarde in huidige fase (★★☆☆☆). Reactiveren bij complexere configuratie-eisen.',
    deactivatedDate: '2026-02-26',
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
7. Agent draait dagelijks (07:30 UTC) — wacht op volgende run` } },
  // === Fase IV-D: Commerce Monitoring Agents (3 new) ===
  { id: 'makelaar', name: 'De Makelaar', englishName: 'Intermediary Monitor Agent', category: 'operations', type: 'A',
    description: 'Bewaakt intermediaire transacties: vastgelopen deals, partner responstijden, conversie-afwijkingen',
    description_en: 'Monitors intermediary transactions: stuck deals, partner response times, conversion anomalies',
    tasks: [
      'Detectie van vastgelopen transacties (voorstel >12u, toestemming >6u)',
      'Partner responstijd monitoring en ranking',
      'Escalatie bij 3+ weigeringen per partner in 24u',
      'Conversie ratio tracking per partner per destination',
      'Automatische alerts bij afwijkende patronen'
    ],
    monitoring_scope: 'intermediary_transactions, partner responstijden, conversie metrics',
    output_description: 'Escalatie alerts, stuck transaction reminders, conversie rapporten',
    schedule: '*/15 * * * *', actorNames: ['intermediary-monitor'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "Makelaar"
2. Controleer intermediary_transactions tabel: SELECT status, COUNT(*) FROM intermediary_transactions GROUP BY status
3. Controleer vastgelopen transacties: SELECT * FROM intermediary_transactions WHERE status='voorstel' AND created_at < DATE_SUB(NOW(), INTERVAL 12 HOUR)
4. Controleer MongoDB resultaten: mongosh --eval "db.intermediary_monitor_results.find().sort({timestamp:-1}).limit(1).pretty()"
5. Herstart API: pm2 restart holidaibutler-api
6. Agent draait elke 15 minuten — wacht op volgende run en verifieer status` } },
  { id: 'kassier', name: 'De Kassier', englishName: 'Financial Monitor Agent', category: 'operations', type: 'B',
    description: 'Dagelijkse financiële reconciliatie, anomaliedetectie, settlement bewaking en fraude-indicatoren',
    description_en: 'Daily financial reconciliation, anomaly detection, settlement monitoring and fraud indicators',
    tasks: [
      'Dagelijkse reconciliatie: settlement berekeningen vs werkelijke transacties',
      'Anomaliedetectie: onverwacht hoge/lage bedragen (2σ baseline)',
      'Settlement alerts: openstaand >7 dagen',
      'Fraude-indicatoren: zelfde klant × zelfde POI × kort tijdsvenster',
      'Rapportage naar De Bode (dagelijkse briefing sectie)'
    ],
    monitoring_scope: 'settlement_batches, partner_payouts, intermediary_transactions, financial_audit_log',
    output_description: 'Reconciliatie rapporten, anomalie alerts, fraude-indicatoren',
    schedule: '30 6 * * *', actorNames: ['financial-monitor'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "Kassier"
2. Controleer settlement_batches: SELECT status, COUNT(*) FROM settlement_batches GROUP BY status
3. Controleer financiële audit log: SELECT event_type, COUNT(*) FROM financial_audit_log WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 DAY) GROUP BY event_type
4. Controleer MongoDB resultaten: mongosh --eval "db.financial_monitor_results.find().sort({timestamp:-1}).limit(1).pretty()"
5. Herstart API: pm2 restart holidaibutler-api
6. Agent draait dagelijks 06:30 — wacht op volgende run en verifieer status` } },
  { id: 'magazijnier', name: 'De Magazijnier', englishName: 'Inventory Sync Agent', category: 'operations', type: 'A',
    description: 'Voorraad synchronisatie: Redis vs MySQL, verouderde reserveringen, lage voorraad alerts',
    description_en: 'Inventory sync: Redis vs MySQL, stale reservations, low inventory alerts',
    tasks: [
      'Redis ticket reserves vs MySQL ticket_inventory synchronisatie controle',
      'Reserveringsslots beschikbaarheid verificatie per POI per dag',
      'Detectie van verouderde reserveringen (>2u niet bevestigd)',
      'Alert bij voorraad <10% resterend voor populaire items',
      'Inventaris consistentie rapportage per destination'
    ],
    monitoring_scope: 'ticket_inventory, reservation_slots, Redis reserves, ticket_orders, reservations',
    output_description: 'Sync rapporten, stale reservation alerts, lage voorraad waarschuwingen',
    schedule: '*/30 * * * *', actorNames: ['inventory-sync'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "Magazijnier"
2. Controleer Redis ticket reserves: redis-cli keys "ticket:reserve:*"
3. Controleer ticket_inventory: SELECT id, total_capacity, reserved_count, sold_count FROM ticket_inventory WHERE is_available=TRUE LIMIT 10
4. Controleer MongoDB resultaten: mongosh --eval "db.inventory_sync_results.find().sort({timestamp:-1}).limit(1).pretty()"
5. Herstart API: pm2 restart holidaibutler-api
6. Agent draait elke 30 minuten — wacht op volgende run en verifieer status` } },
  // === Content Module: Trendspotter Agent ===
  { id: 'trendspotter', name: 'De Trendspotter', englishName: 'Trendspotter Agent', category: 'content', type: 'A',
    description: 'Verzamelt en analyseert trending keywords per destination via Google Trends (Apify)',
    description_en: 'Collects and analyzes trending keywords per destination via Google Trends (Apify)',
    tasks: [
      'Google Trends data collectie via Apify per destination',
      'Keyword deduplicatie en relevance scoring (volume 40%, direction 30%, seizoen 30%)',
      'Seizoensgebonden boost per destination (Calpe zomer, Texel lente/zomer)',
      'Trend richting classificatie (breakout/rising/stable/declining)',
      'Aggregatie en opslag in trending_data tabel'
    ],
    monitoring_scope: 'trending_data tabel, Google Trends API via Apify, seizoensdata',
    output_description: 'Trending keywords met relevance scores, richting, markt en zoekvolume',
    schedule: '30 3 * * 0', actorNames: ['trendspotter'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "Trendspotter"
2. Controleer APIFY_API_TOKEN in .env
3. Controleer trending_data: SELECT destination_id, COUNT(*) FROM trending_data GROUP BY destination_id
4. Controleer recente trends: SELECT keyword, relevance_score, trend_direction FROM trending_data ORDER BY created_at DESC LIMIT 10
5. Herstart API: pm2 restart holidaibutler-api
6. Agent draait wekelijks (zondag 03:30) — wacht op volgende run en verifieer status` } },
  // === Content Module: De Redacteur & De SEO Meester ===
  { id: 'redacteur', name: 'De Redacteur', englishName: 'Content Redacteur Agent', category: 'content', type: 'A',
    description: 'AI content generatie via Mistral AI: blog posts, social posts, video scripts met tone-of-voice per destination',
    description_en: 'AI content generation via Mistral AI: blog posts, social posts, video scripts with per-destination tone of voice',
    tasks: [
      'Content suggesties genereren op basis van trending data',
      'Blog/social post/video script generatie via Mistral AI',
      'Per-destination tone-of-voice (Calpe warm, Texel adventurous, WarreWijzer slow-living)',
      'Meertalige vertaling (EN/NL/DE/ES/FR)',
      'Platform-specifieke formatting (Instagram 2200, Facebook 63206, LinkedIn 3000 chars)'
    ],
    monitoring_scope: 'content_suggestions, content_items, Mistral API',
    output_description: 'AI-gegenereerde content items met vertalingen en SEO metadata',
    schedule: null, actorNames: ['redacteur'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "Redacteur"
2. Controleer MISTRAL_API_KEY in .env
3. Controleer content_suggestions: SELECT COUNT(*), status FROM content_suggestions GROUP BY status
4. Controleer content_items: SELECT COUNT(*), approval_status FROM content_items GROUP BY approval_status
5. Herstart API: pm2 restart holidaibutler-api
6. Agent draait on-demand — trigger via Admin Portal Content Studio` } },
  { id: 'seoMeester', name: 'De SEO Meester', englishName: 'SEO Master Agent', category: 'content', type: 'B',
    description: 'SEO analyse: readability score, keyword density, heading structuur, interne links, SISTRIX visibility',
    description_en: 'SEO analysis: readability score, keyword density, heading structure, internal links, SISTRIX visibility',
    tasks: [
      'Meta title/description lengte checks (50-60 / 150-160 chars)',
      'Keyword density analyse (0.5-3% optimaal)',
      'Heading structuur controle (H1→H2→H3 hiërarchie)',
      'Readability score (Flesch-Kincaid per taal: NL/EN/DE/ES)',
      'Interne link suggesties (POI namen matchen in content)',
      'SISTRIX visibility index + keyword rankings per domein'
    ],
    monitoring_scope: 'content_items seo_data, SISTRIX API, POI tabel',
    output_description: 'SEO scores per content item, SISTRIX visibility rapportage',
    schedule: '0 4 * * 1', actorNames: ['seo-meester'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "SEO"
2. Controleer SISTRIX_API_KEY in .env
3. Controleer content_items: SELECT id, JSON_EXTRACT(seo_data, '$.overallScore') FROM content_items LIMIT 10
4. Herstart API: pm2 restart holidaibutler-api
5. Agent draait wekelijks (maandag 04:00) — wacht op volgende run en verifieer status` } },
  // === Content Module: De Uitgever (Publisher) ===
  { id: 'uitgever', name: 'De Uitgever', englishName: 'Publisher Agent', category: 'content', type: 'A',
    description: 'Content publicatie naar Facebook, Instagram en LinkedIn. Scheduled publishing, analytics collectie',
    description_en: 'Content publishing to Facebook, Instagram and LinkedIn. Scheduled publishing, analytics collection',
    tasks: [
      'Goedgekeurde content publiceren naar social media platforms',
      'Scheduled posts verwerken (elke 15 minuten)',
      'Post-publish engagement metrics ophalen (dagelijks)',
      'Publicatie-status synchroniseren met content_items tabel',
      'Token geldigheid monitoren voor social accounts'
    ],
    monitoring_scope: 'content_items publishing, social_accounts tokens, content_performance metrics',
    output_description: 'Publicatie confirmaties met post URLs, engagement metrics per platform',
    schedule: '*/15 * * * *', actorNames: ['publisher'],
    errorInstructions: { default: `1. Controleer PM2 logs: pm2 logs holidaibutler-api --lines 100 | grep "Uitgever\\|publisher"
2. Controleer META/LINKEDIN env vars: grep "META_\\|LINKEDIN_" .env | sed 's/=.*/=***/'
3. Controleer social_accounts: SELECT platform, status, token_expires_at FROM social_accounts
4. Test Meta API: curl -s "https://graph.facebook.com/v25.0/me?access_token=$META_PAGE_ACCESS_TOKEN"
5. Herstart API: pm2 restart holidaibutler-api` } }
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
  { name: 'cache-warmup', agent: 'De Maestro', cron: '0 5 * * *', description: 'Dagelijkse Redis cache opwarming' },
  // Fase IV-D: Commerce Monitoring Agents
  { name: 'intermediary-monitor', agent: 'De Makelaar', cron: '*/15 * * * *', description: 'Intermediaire transactie monitoring en escalatie' },
  { name: 'financial-monitor', agent: 'De Kassier', cron: '30 6 * * *', description: 'Dagelijkse financiële reconciliatie en anomaliedetectie' },
  { name: 'inventory-sync', agent: 'De Magazijnier', cron: '*/30 * * * *', description: 'Voorraad synchronisatie Redis vs MySQL' },
  // Content Module
  { name: 'content-trending-scan', agent: 'De Trendspotter', cron: '30 3 * * 0', description: 'Wekelijkse trending keyword collectie en analyse via Google Trends' },
  { name: 'content-website-traffic', agent: 'De Trendspotter', cron: '45 3 * * 0', description: 'Wekelijkse website traffic analyse uit Apache access logs' },
  { name: 'content-seo-audit', agent: 'De SEO Meester', cron: '0 4 * * 1', description: 'Wekelijkse SEO audit: readability, keyword density, SISTRIX visibility' },
  // Fase C: Publisher Agent
  { name: 'content-publish-scheduled', agent: 'De Uitgever', cron: '*/15 * * * *', description: 'Verwerk scheduled publicaties naar Facebook/Instagram/LinkedIn' },
  { name: 'content-analytics-collect', agent: 'De Uitgever', cron: '0 9 * * *', description: 'Dagelijkse engagement metrics ophalen per platform' },
  { name: 'seasonal-check', agent: 'De Maestro', cron: '15 0 * * *', description: 'Dagelijkse seizoenswisseling check + homepage override' },
  // Fase D: Feedback Loop
  { name: 'content-feedback-loop', agent: 'De Trendspotter', cron: '0 4 * * 0', description: 'Wekelijkse feedback loop: correleer trending keywords met content performance' },
  { name: 'content-score-calibration', agent: 'De SEO Meester', cron: '0 5 * * 0', description: 'Wekelijkse score calibratie: vergelijk voorspelde Social Score met werkelijke engagement' }
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
  },
  // Fase IV-D: Commerce Monitoring Agents
  makelaar: {
    dependencies: ['MySQL intermediary_transactions', 'MySQL partners', 'MongoDB intermediary_monitor_results'],
    output: { type: 'Intermediary Monitoring', frequency: 'Elke 15 min', recipients: 'MongoDB + De Bode', description: 'Vastgelopen transactie alerts, partner responstijden, conversie metrics' }
  },
  kassier: {
    dependencies: ['MySQL settlement_batches/partner_payouts', 'MySQL intermediary_transactions', 'MongoDB financial_monitor_results'],
    output: { type: 'Financial Reconciliation', frequency: 'Dagelijks 06:30', recipients: 'MongoDB + De Bode', description: 'Reconciliatie rapporten, anomalie alerts, fraude-indicatoren' }
  },
  magazijnier: {
    dependencies: ['MySQL ticket_inventory/reservation_slots', 'Redis ticket:reserve:*', 'MongoDB inventory_sync_results'],
    output: { type: 'Inventory Sync', frequency: 'Elke 30 min', recipients: 'MongoDB + De Bode', description: 'Sync checks, verouderde reservering alerts, lage voorraad waarschuwingen' }
  },
  // Content Module
  trendspotter: {
    dependencies: ['Apify Google Trends Scraper', 'MySQL trending_data', 'APIFY_API_TOKEN'],
    output: { type: 'Trending Keywords', frequency: 'Wekelijks (zondag 03:30)', recipients: 'MySQL trending_data', description: 'Trending keywords met relevance scores, seizoensboost, marktdata' }
  },
  redacteur: {
    dependencies: ['Mistral AI API', 'MySQL content_suggestions/content_items', 'translationService'],
    output: { type: 'Content Generation', frequency: 'On-demand', recipients: 'MySQL content_items', description: 'AI-gegenereerde blog/social/video content met vertalingen' }
  },
  seoMeester: {
    dependencies: ['MySQL content_items', 'MySQL POI (internal links)', 'SISTRIX API'],
    output: { type: 'SEO Analysis', frequency: 'Wekelijks (maandag 04:00)', recipients: 'MySQL content_items.seo_data', description: 'SEO scores, readability, keyword density, SISTRIX visibility' }
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
function calculateAgentStatus(lastRun, schedule, meta) {
  // Deactivated agents always return 'deactivated'
  if (meta?.active === false) return 'deactivated';
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
        active: meta.active !== false,
        deactivatedReason: meta.deactivatedReason || null,
        deactivatedDate: meta.deactivatedDate || null,
        destinationAware: meta.type === 'A',
        status: meta.active === false ? 'deactivated' : 'unknown',
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
            agent.status = calculateAgentStatus(agent.lastRun, meta.schedule, meta);
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
              smokeAgent.status = calculateAgentStatus(smokeAgent.lastRun, AGENT_METADATA.find(m => m.id === 'smokeTest').schedule, AGENT_METADATA.find(m => m.id === 'smokeTest'));
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
              contentAgent.status = calculateAgentStatus(contentAgent.lastRun, AGENT_METADATA.find(m => m.id === 'contentQuality').schedule, AGENT_METADATA.find(m => m.id === 'contentQuality'));
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
              thermoAgent.status = calculateAgentStatus(thermoAgent.lastRun, AGENT_METADATA.find(m => m.id === 'thermostaat').schedule, AGENT_METADATA.find(m => m.id === 'thermostaat'));
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
      unknown: agents.filter(a => a.status === 'unknown').length,
      deactivated: agents.filter(a => a.status === 'deactivated').length
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

/**
 * GET /agents/:key/results
 * Agent run results: last 5 runs with output data from MongoDB audit_logs.
 * Returns concrete run output for the Results tab in agent detail dialog.
 */
router.get('/agents/:key/results', adminAuth('reviewer'), async (req, res) => {
  try {
    const { key } = req.params;
    const meta = AGENT_METADATA.find(m => m.id === key);
    if (!meta) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Agent '${key}' not found` }
      });
    }

    const results = [];

    if (mongoose.connection.readyState === 1) {
      const db = mongoose.connection.db;
      const auditLogs = db.collection('audit_logs');

      // Get last 5 runs for this agent's actor names (last 30 days)
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
      const logs = await auditLogs.find(
        { 'actor.name': { $in: meta.actorNames }, timestamp: { $gte: since } }
      ).sort({ timestamp: -1 }).limit(5).toArray();

      for (const log of logs) {
        results.push({
          timestamp: log.timestamp,
          action: log.action || log.description || 'unknown',
          status: (log.status === 'completed' || log.status === 'success') ? 'success' : log.status || 'unknown',
          duration: log.duration || null,
          destination: log.metadata?.destinationId
            ? (log.metadata.destinationId === 1 ? 'Calpe' : log.metadata.destinationId === 2 ? 'Texel' : 'All')
            : 'All',
          details: log.description || null,
          result: { ...(log.result || {}), ...(log.metadata?.trend ? { trend: log.metadata.trend } : {}), ...(log.metadata?.vulnerabilities ? { vulnerabilities: log.metadata.vulnerabilities } : {}) }
        });
      }

      // Supplement with monitoring collection data if applicable
      if (key === 'smokeTest') {
        const smokeResults = await db.collection('smoke_test_results').find({}).sort({ timestamp: -1 }).limit(5).toArray();
        for (const sr of smokeResults) {
          if (!results.find(r => Math.abs(new Date(r.timestamp) - new Date(sr.timestamp)) < 60000)) {
            results.push({
              timestamp: sr.timestamp,
              action: 'smoke-test',
              status: sr.total_failed === 0 ? 'success' : 'partial',
              duration: null,
              destination: 'All',
              details: `${sr.total_passed}/${sr.total_tests} tests passed`,
              result: { total_tests: sr.total_tests, total_passed: sr.total_passed, total_failed: sr.total_failed, destinations: sr.destinations }
            });
          }
        }
      } else if (key === 'contentQuality') {
        const cqResults = await db.collection('content_quality_audits').find({}).sort({ timestamp: -1 }).limit(5).toArray();
        for (const cq of cqResults) {
          if (!results.find(r => Math.abs(new Date(r.timestamp) - new Date(cq.timestamp)) < 60000)) {
            results.push({
              timestamp: cq.timestamp,
              action: 'content-quality-audit',
              status: cq.overall_score >= 8 ? 'success' : 'partial',
              duration: null,
              destination: 'All',
              details: `Quality score: ${cq.overall_score}/10`,
              result: { overall_score: cq.overall_score, destinations: cq.destinations }
            });
          }
        }
      } else if (key === 'backupHealth') {
        const bhResults = await db.collection('backup_health_checks').find({}).sort({ timestamp: -1 }).limit(5).toArray();
        for (const bh of bhResults) {
          if (!results.find(r => Math.abs(new Date(r.timestamp) - new Date(bh.timestamp)) < 60000)) {
            results.push({
              timestamp: bh.timestamp,
              action: 'backup-health-check',
              status: bh.overall === 'HEALTHY' ? 'success' : 'error',
              duration: null,
              destination: 'All',
              details: `Backup status: ${bh.overall}`,
              result: { overall: bh.overall, mysql: bh.mysql, mongodb: bh.mongodb, disk: bh.disk }
            });
          }
        }
      }
    }

    // Sort by timestamp desc, limit to 5
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      data: {
        agent: { id: meta.id, name: meta.name, active: meta.active !== false },
        results: results.slice(0, 5)
      }
    });
  } catch (error) {
    logger.error('[AdminPortal] Agent results error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred fetching agent results' }
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
      destination, category, search, hasContent, isActive, freshness,
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
    if (freshness && ['fresh', 'aging', 'stale', 'unverified'].includes(freshness)) {
      where.push('p.content_freshness_status = ?');
      params.push(freshness);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    // Sort mapping
    const sortMap = {
      name: 'p.name', category: 'p.category', rating: 'p.rating',
      updated: 'p.last_updated', destination: 'p.destination_id',
      freshness: 'p.content_freshness_score'
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
              p.is_active, p.rating, p.tier, p.tier_score, p.last_updated,
              p.content_freshness_score, p.content_freshness_status,
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
      tier: p.tier || 4,
      tier_score: p.tier_score ? parseFloat(p.tier_score) : null,
      freshness: {
        score: p.content_freshness_score != null ? parseInt(p.content_freshness_score) : null,
        status: p.content_freshness_status || 'unverified'
      },
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
        },
        freshness: await (async () => {
          try {
            const fWhere = ['is_active = 1'];
            const fParams = [];
            if (req.poiScope) {
              fWhere.push(`id IN (${req.poiScope.map(() => '?').join(',')})`);
              fParams.push(...req.poiScope);
            } else if (req.destScope) {
              fWhere.push(`destination_id IN (${req.destScope.map(() => '?').join(',')})`);
              fParams.push(...req.destScope);
            }
            if (destId) { fWhere.push('destination_id = ?'); fParams.push(destId); }
            const fRows = await mysqlSequelize.query(
              `SELECT content_freshness_status as status, COUNT(*) as cnt,
                      ROUND(AVG(content_freshness_score), 1) as avg_score
               FROM POI WHERE ${fWhere.join(' AND ')}
               GROUP BY content_freshness_status
               ORDER BY FIELD(content_freshness_status, 'fresh', 'aging', 'stale', 'unverified')`,
              { replacements: fParams, type: QueryTypes.SELECT }
            );
            const f = { fresh: 0, aging: 0, stale: 0, unverified: 0, avgScore: 0 };
            let totalScore = 0, totalCount = 0;
            for (const r of fRows) {
              f[r.status] = parseInt(r.cnt);
              totalScore += parseFloat(r.avg_score || 0) * parseInt(r.cnt);
              totalCount += parseInt(r.cnt);
            }
            f.avgScore = totalCount > 0 ? Math.round(totalScore / totalCount * 10) / 10 : 0;
            return f;
          } catch { return null; }
        })()
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
 * GET /pois/freshness
 * Content freshness dashboard — per-destination breakdown.
 * Fase II Blok B.
 */
router.get('/pois/freshness', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const { destination } = req.query;
    const destId = resolveDestinationId(destination);

    const where = ['is_active = 1'];
    const params = [];
    if (req.poiScope) {
      where.push(`id IN (${req.poiScope.map(() => '?').join(',')})`);
      params.push(...req.poiScope);
    } else if (req.destScope) {
      where.push(`destination_id IN (${req.destScope.map(() => '?').join(',')})`);
      params.push(...req.destScope);
    }
    if (destId) { where.push('destination_id = ?'); params.push(destId); }

    const rows = await mysqlSequelize.query(
      `SELECT destination_id, content_freshness_status as status,
              COUNT(*) as count, ROUND(AVG(content_freshness_score), 1) as avg_score,
              MIN(content_freshness_score) as min_score, MAX(content_freshness_score) as max_score
       FROM POI WHERE ${where.join(' AND ')}
       GROUP BY destination_id, content_freshness_status
       ORDER BY destination_id, FIELD(content_freshness_status, 'fresh', 'aging', 'stale', 'unverified')`,
      { replacements: params, type: QueryTypes.SELECT }
    );

    const byDestination = {};
    for (const r of rows) {
      const dest = r.destination_id === 1 ? 'calpe' : r.destination_id === 2 ? 'texel' : `dest_${r.destination_id}`;
      if (!byDestination[dest]) byDestination[dest] = { fresh: 0, aging: 0, stale: 0, unverified: 0, total: 0, avgScore: 0 };
      byDestination[dest][r.status] = parseInt(r.count);
      byDestination[dest].total += parseInt(r.count);
    }

    // Calculate avg score per destination
    for (const dest of Object.keys(byDestination)) {
      const destIdNum = dest === 'calpe' ? 1 : dest === 'texel' ? 2 : null;
      if (destIdNum) {
        const avg = await mysqlSequelize.query(
          `SELECT ROUND(AVG(content_freshness_score), 1) as avg FROM POI
           WHERE destination_id = ? AND is_active = 1 AND content_freshness_score IS NOT NULL`,
          { replacements: [destIdNum], type: QueryTypes.SELECT }
        );
        byDestination[dest].avgScore = avg[0]?.avg ? parseFloat(avg[0].avg) : 0;
      }
    }

    // Top stale POIs (for quick action)
    const staleWhere = [...where, "content_freshness_status IN ('stale', 'unverified')"];
    const stalePois = await mysqlSequelize.query(
      `SELECT id, name, destination_id, category, content_freshness_score, content_freshness_status, last_updated
       FROM POI WHERE ${staleWhere.join(' AND ')}
       ORDER BY content_freshness_score ASC LIMIT 20`,
      { replacements: params, type: QueryTypes.SELECT }
    );

    res.json({
      success: true,
      data: {
        byDestination,
        stalePois: stalePois.map(p => ({
          id: p.id, name: p.name,
          destination: p.destination_id === 1 ? 'Calpe' : 'Texel',
          category: p.category,
          score: p.content_freshness_score,
          status: p.content_freshness_status,
          lastUpdated: p.last_updated
        }))
      }
    });
  } catch (error) {
    logger.error('[AdminPortal] Freshness dashboard error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred fetching freshness data' }
    });
  }
});

/**
 * POST /pois/freshness/recalculate
 * Recalculate freshness scores for all active POIs. Admin only.
 * Fase II Blok B.
 */
router.post('/pois/freshness/recalculate', adminAuth('platform_admin'), async (req, res) => {
  try {
    const { recalculateAll } = await import('../services/agents/dataSync/freshnessService.js');
    const results = await recalculateAll();
    res.json({ success: true, data: { message: 'Freshness scores recalculated', results } });
  } catch (error) {
    logger.error('[AdminPortal] Freshness recalculate error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred recalculating freshness' }
    });
  }
});

/**
 * POST /pois/bulk-status (Fase II-B.5)
 * Bulk update is_active status for multiple POIs.
 * Body: { poiIds: number[], is_active: boolean }
 */
router.post('/pois/bulk-status', adminAuth('editor'), destinationScope, async (req, res) => {
  try {
    const { poiIds, is_active } = req.body;

    if (!Array.isArray(poiIds) || poiIds.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'poiIds array is required' } });
    }
    if (typeof is_active !== 'boolean' && ![0, 1].includes(is_active)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'is_active must be boolean or 0/1' } });
    }
    if (poiIds.length > 500) {
      return res.status(400).json({ success: false, error: { code: 'LIMIT_EXCEEDED', message: 'Maximum 500 POIs per bulk action' } });
    }

    // RBAC check: filter to allowed POIs
    let allowedIds = poiIds;
    if (req.poiScope) {
      allowedIds = poiIds.filter(id => req.poiScope.includes(id));
    } else if (req.destScope) {
      const scopeCheck = await mysqlSequelize.query(
        `SELECT id FROM POI WHERE id IN (${poiIds.map(() => '?').join(',')}) AND destination_id IN (${req.destScope.map(() => '?').join(',')})`,
        { replacements: [...poiIds, ...req.destScope], type: QueryTypes.SELECT }
      );
      allowedIds = scopeCheck.map(r => r.id);
    }

    if (allowedIds.length === 0) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No POIs in your scope' } });
    }

    const activeVal = is_active ? 1 : 0;
    const [result] = await mysqlSequelize.query(
      `UPDATE POI SET is_active = ? WHERE id IN (${allowedIds.map(() => '?').join(',')})`,
      { replacements: [activeVal, ...allowedIds] }
    );
    const affectedRows = result?.affectedRows || 0;

    logger.info(`[AdminPortal] Bulk status update: ${affectedRows}/${allowedIds.length} POIs → is_active=${activeVal} by ${req.adminUser?.email}`);
    res.json({ success: true, data: { updated: affectedRows, is_active: activeVal } });
  } catch (error) {
    logger.error('[AdminPortal] Bulk status error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Bulk status update failed' } });
  }
});

/**
 * POST /pois/bulk-category (Fase II-B.5)
 * Bulk update category for multiple POIs.
 * Body: { poiIds: number[], category: string }
 */
router.post('/pois/bulk-category', adminAuth('editor'), destinationScope, async (req, res) => {
  try {
    const { poiIds, category } = req.body;

    if (!Array.isArray(poiIds) || poiIds.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'poiIds array is required' } });
    }
    if (!category || typeof category !== 'string') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'category string is required' } });
    }
    if (poiIds.length > 500) {
      return res.status(400).json({ success: false, error: { code: 'LIMIT_EXCEEDED', message: 'Maximum 500 POIs per bulk action' } });
    }

    // RBAC check
    let allowedIds = poiIds;
    if (req.poiScope) {
      allowedIds = poiIds.filter(id => req.poiScope.includes(id));
    } else if (req.destScope) {
      const scopeCheck = await mysqlSequelize.query(
        `SELECT id FROM POI WHERE id IN (${poiIds.map(() => '?').join(',')}) AND destination_id IN (${req.destScope.map(() => '?').join(',')})`,
        { replacements: [...poiIds, ...req.destScope], type: QueryTypes.SELECT }
      );
      allowedIds = scopeCheck.map(r => r.id);
    }

    if (allowedIds.length === 0) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No POIs in your scope' } });
    }

    const [result] = await mysqlSequelize.query(
      `UPDATE POI SET category = ? WHERE id IN (${allowedIds.map(() => '?').join(',')})`,
      { replacements: [category, ...allowedIds] }
    );
    const affectedRows = result?.affectedRows || 0;

    logger.info(`[AdminPortal] Bulk category update: ${affectedRows}/${allowedIds.length} POIs → category=${category} by ${req.adminUser?.email}`);
    res.json({ success: true, data: { updated: affectedRows, category } });
  } catch (error) {
    logger.error('[AdminPortal] Bulk category error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Bulk category update failed' } });
  }
});

/**
 * PATCH /pois/:id/tile-description (Fase II-B.5)
 * Quick edit: inline update of tile description.
 * Body: { enriched_tile_description: string }
 */
router.patch('/pois/:id/tile-description', adminAuth('editor'), destinationScope, async (req, res) => {
  try {
    const poiId = parseInt(req.params.id);
    const { enriched_tile_description } = req.body;

    if (!enriched_tile_description || typeof enriched_tile_description !== 'string') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'enriched_tile_description string is required' } });
    }
    if (enriched_tile_description.length > 500) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Tile description max 500 characters' } });
    }

    // RBAC check
    if (req.poiScope && !req.poiScope.includes(poiId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'POI not in your scope' } });
    }
    if (req.destScope) {
      const [poi] = await mysqlSequelize.query(
        'SELECT destination_id FROM POI WHERE id = ?',
        { replacements: [poiId], type: QueryTypes.SELECT }
      );
      if (!poi || !req.destScope.includes(poi.destination_id)) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'POI not in your destination scope' } });
      }
    }

    await mysqlSequelize.query(
      'UPDATE POI SET enriched_tile_description = ?, enriched_tile_description_en = ? WHERE id = ?',
      { replacements: [enriched_tile_description, enriched_tile_description, poiId] }
    );

    logger.info(`[AdminPortal] Quick edit tile description: POI ${poiId} by ${req.adminUser?.email}`);
    res.json({ success: true, data: { poiId, enriched_tile_description } });
  } catch (error) {
    logger.error('[AdminPortal] Quick edit error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Quick edit failed' } });
  }
});

/**
 * GET /pois/export (Fase II-B.5)
 * CSV export of POI data with all current filters applied.
 * Includes freshness data. Respects RBAC.
 */
router.get('/pois/export', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const { destination, category, freshness, is_active, q } = req.query;

    const where = [];
    const params = [];

    // RBAC scope
    if (req.poiScope) {
      where.push(`p.id IN (${req.poiScope.map(() => '?').join(',')})`);
      params.push(...req.poiScope);
    } else if (req.destScope) {
      where.push(`p.destination_id IN (${req.destScope.map(() => '?').join(',')})`);
      params.push(...req.destScope);
    }

    // Destination filter
    if (destination) {
      const destId = resolveDestinationId(destination);
      if (destId) {
        where.push('p.destination_id = ?');
        params.push(destId);
      }
    }

    // Category filter
    if (category) {
      where.push('p.category = ?');
      params.push(category);
    }

    // Freshness filter
    if (freshness && ['fresh', 'aging', 'stale', 'unverified'].includes(freshness)) {
      where.push('p.content_freshness_status = ?');
      params.push(freshness);
    }

    // Active filter
    if (is_active !== undefined) {
      where.push('p.is_active = ?');
      params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
    }

    // Search filter
    if (q) {
      where.push('(p.name LIKE ? OR p.category LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const pois = await mysqlSequelize.query(`
      SELECT p.id, p.name, p.destination_id, p.category, p.subcategory,
             p.is_active, p.rating, p.review_count, p.price_level,
             p.content_freshness_score, p.content_freshness_status,
             p.content_quality_score,
             LEFT(p.enriched_tile_description, 100) as tile_desc_preview,
             p.latitude, p.longitude, p.address, p.phone, p.website,
             (SELECT COUNT(*) FROM imageurls WHERE poi_id = p.id) as image_count,
             p.last_updated
      FROM POI p
      ${whereClause}
      ORDER BY p.destination_id, p.name
    `, { replacements: params, type: QueryTypes.SELECT });

    // Build CSV
    const headers = 'id,name,destination,category,subcategory,is_active,rating,review_count,price_level,freshness_score,freshness_status,quality_score,tile_description,latitude,longitude,address,phone,website,image_count,last_updated';
    const rows = pois.map(p => {
      const dest = p.destination_id === 1 ? 'Calpe' : p.destination_id === 2 ? 'Texel' : `dest-${p.destination_id}`;
      const desc = (p.tile_desc_preview || '').replace(/"/g, '""').replace(/\n/g, ' ');
      const addr = (p.address || '').replace(/"/g, '""');
      return `${p.id},"${(p.name || '').replace(/"/g, '""')}",${dest},"${(p.category || '').replace(/"/g, '""')}","${(p.subcategory || '').replace(/"/g, '""')}",${p.is_active},${p.rating || ''},${p.review_count || ''},${p.price_level || ''},${p.content_freshness_score || ''},${p.content_freshness_status || ''},${p.content_quality_score || ''},"${desc}",${p.latitude || ''},${p.longitude || ''},"${addr}","${p.phone || ''}","${(p.website || '').replace(/"/g, '""')}",${p.image_count || 0},${p.last_updated || ''}`;
    });

    const csv = headers + '\n' + rows.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="poi_export_${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (error) {
    logger.error('[AdminPortal] POI export error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Export failed' } });
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

    // Last Apify scrape from Bronze layer
    const lastScrape = await mysqlSequelize.query(
      `SELECT scraped_at, permanently_closed, temporarily_closed,
              images_count, validation_status, validation_notes
       FROM poi_apify_raw WHERE poi_id = ? ORDER BY scraped_at DESC LIMIT 1`,
      { replacements: [poiId], type: QueryTypes.SELECT }
    );

    const scrapeCount = await mysqlSequelize.query(
      `SELECT COUNT(*) as total FROM poi_apify_raw WHERE poi_id = ?`,
      { replacements: [poiId], type: QueryTypes.SELECT }
    );

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
          last_updated: poi.last_updated,
          content_updated_at: poi.content_updated_at,
          last_apify_sync: poi.last_apify_sync,
          tier: poi.tier || 4,
          tier_score: poi.tier_score ? parseFloat(poi.tier_score) : null,
          google_rating: poi.google_rating ? parseFloat(poi.google_rating) : null,
          google_review_count: poi.google_review_count,
          content_freshness_score: poi.content_freshness_score,
          content_freshness_status: poi.content_freshness_status,
          reviews_distribution: poi.reviews_distribution ? JSON.parse(poi.reviews_distribution) : null,
          lastApifyScrape: lastScrape[0] ? {
            scrapedAt: lastScrape[0].scraped_at,
            permanentlyClosed: !!lastScrape[0].permanently_closed,
            temporarilyClosed: !!lastScrape[0].temporarily_closed,
            imagesCount: lastScrape[0].images_count,
            validationStatus: lastScrape[0].validation_status,
            validationNotes: lastScrape[0].validation_notes
          } : null,
          totalScrapes: parseInt(scrapeCount[0]?.total) || 0
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
router.put('/pois/:id', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'editor']), async (req, res) => {
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
router.put('/pois/:id/images', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'editor']), async (req, res) => {
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
router.delete('/pois/:poiId/images/:imageId', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'editor']), async (req, res) => {
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
router.put('/reviews/:id', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'editor']), async (req, res) => {
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

/**
 * GET /analytics/website — SimpleAnalytics live data (visitors, top pages, referrers, events, devices)
 * Query: destination (code), period (7|30|90, default 30)
 * Cached in Redis for 15 minutes.
 */
router.get('/analytics/website', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    if (req.destScope) {
      const reqDestCode = req.query.destination;
      if (reqDestCode) {
        const reqDestId = resolveDestinationId(reqDestCode);
        if (reqDestId && !req.destScope.includes(reqDestId)) {
          return res.status(403).json({ success: false, error: { code: 'DESTINATION_FORBIDDEN', message: 'Access denied' } });
        }
      } else if (req.destScope.length === 1) {
        const idToCode = { 1: 'calpe', 2: 'texel', 3: 'alicante', 4: 'warrewijzer' };
        req.query.destination = idToCode[req.destScope[0]];
      }
    }

    const { destination, period = '30' } = req.query;
    const days = Math.min(parseInt(period) || 30, 365);
    const destId = destination ? resolveDestinationId(destination) : 1;
    const domainMap = { 1: 'calpetrip.com', 2: 'texelmaps.nl' };
    const domain = domainMap[destId];
    if (!domain) {
      return res.json({ success: true, data: { visitors: 0, pageviews: 0, pages: [], referrers: [], events: [], chart: [], devices: {} } });
    }

    const cacheKey = `admin:analytics:website:${destId}:${days}`;
    const redis = getRedis();
    if (redis) {
      try { const c = await redis.get(cacheKey); if (c) return res.json(JSON.parse(c)); } catch { /* miss */ }
    }

    const SA_API_KEY = process.env.SA_API_KEY || 'sa_api_key_tdOPtEz1nQqzPJIXbmS9PYB12KwcwGi4KQI2';
    const SA_USER_ID = process.env.SA_USER_ID || 'sa_user_id_45cbd1c2-58bb-44e3-ac9c-94797095b640';
    const saHeaders = { 'Api-Key': SA_API_KEY, 'User-Id': SA_USER_ID };
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const baseUrl = `https://simpleanalytics.com/${domain}.json?version=6&start=${startDate}&end=${endDate}`;

    // Parallel SA API calls (stats + events are separate endpoints)
    const [statsRes, pagesRes, referrersRes, deviceRes, eventsRes] = await Promise.all([
      fetch(`${baseUrl}&fields=histogram`, { headers: saHeaders, signal: AbortSignal.timeout(12000) }).then(r => r.json()).catch(() => ({})),
      fetch(`${baseUrl}&fields=pages`, { headers: saHeaders, signal: AbortSignal.timeout(12000) }).then(r => r.json()).catch(() => ({})),
      fetch(`${baseUrl}&fields=referrers`, { headers: saHeaders, signal: AbortSignal.timeout(12000) }).then(r => r.json()).catch(() => ({})),
      fetch(`${baseUrl}&fields=device_types`, { headers: saHeaders, signal: AbortSignal.timeout(12000) }).then(r => r.json()).catch(() => ({})),
      // Events use a separate SA endpoint
      fetch(`https://simpleanalytics.com/${domain}/events.json?version=1&start=${startDate}&end=${endDate}`, { headers: saHeaders, signal: AbortSignal.timeout(12000) }).then(r => r.json()).catch(() => ({})),
    ]);

    // Build daily chart from histogram
    const histogram = statsRes.histogram || [];
    const chart = histogram.map(h => ({
      date: h.date,
      pageviews: h.pageviews || 0,
      visitors: h.visitors || 0,
    }));

    const totalPageviews = chart.reduce((s, d) => s + d.pageviews, 0);
    const totalVisitors = chart.reduce((s, d) => s + d.visitors, 0);

    // Period comparison (current half vs previous half)
    const halfIdx = Math.floor(chart.length / 2);
    const recentViews = chart.slice(halfIdx).reduce((s, d) => s + d.pageviews, 0);
    const prevViews = chart.slice(0, halfIdx).reduce((s, d) => s + d.pageviews, 0);
    const recentVisitors = chart.slice(halfIdx).reduce((s, d) => s + d.visitors, 0);
    const prevVisitors = chart.slice(0, halfIdx).reduce((s, d) => s + d.visitors, 0);
    const viewsGrowth = prevViews > 0 ? Math.round(((recentViews - prevViews) / prevViews) * 100) : 0;
    const visitorsGrowth = prevVisitors > 0 ? Math.round(((recentVisitors - prevVisitors) / prevVisitors) * 100) : 0;

    // Top pages
    const pages = (pagesRes.pages || []).slice(0, 20).map(p => ({
      path: p.value,
      pageviews: p.pageviews || p.visitors || 0,
      visitors: p.visitors || 0,
    }));

    // Referrers
    const referrers = (referrersRes.referrers || []).slice(0, 15).map(r => ({
      source: r.value || 'Direct',
      pageviews: r.pageviews || r.visitors || 0,
      visitors: r.visitors || 0,
    }));

    // Device types (from SA device_types field)
    const deviceTypes = deviceRes.device_types || [];
    let mobileCount = 0, desktopCount = 0, tabletCount = 0;
    for (const dt of deviceTypes) {
      const name = (dt.value || '').toLowerCase();
      const count = dt.visitors || dt.pageviews || 0;
      if (name.includes('mobile') || name.includes('phone')) mobileCount += count;
      else if (name.includes('tablet')) tabletCount += count;
      else desktopCount += count;
    }
    const deviceTotal = mobileCount + desktopCount + tabletCount || 1;

    // Events (SA events endpoint returns different format)
    const rawEvents = Array.isArray(eventsRes) ? eventsRes : (eventsRes.events || eventsRes.data || []);
    const events = rawEvents.slice(0, 25).map(e => ({
      name: e.name || e.value || e.event || '',
      total: e.total || e.count || e.visitors || 0,
      visitors: e.visitors || e.unique || 0,
    })).filter(e => e.name);

    const result = {
      success: true,
      data: {
        domain,
        period: days,
        visitors: totalVisitors,
        pageviews: totalPageviews,
        visitorsGrowth,
        viewsGrowth,
        avgPerDay: chart.length > 0 ? Math.round(totalVisitors / chart.length) : 0,
        chart,
        pages,
        referrers,
        events,
        devices: {
          mobile: Math.round((mobileCount / deviceTotal) * 100),
          desktop: Math.round((desktopCount / deviceTotal) * 100),
          tablet: Math.round((tabletCount / deviceTotal) * 100),
        },
      }
    };

    if (redis) {
      try { await redis.set(cacheKey, JSON.stringify(result), 'EX', 900); } catch { /* non-critical */ }
    }

    res.json(result);
  } catch (error) {
    logger.error('[AdminPortal] Website analytics error:', error);
    res.status(500).json({ success: false, error: { code: 'SA_ERROR', message: error.message } });
  }
});

// ============================================================
// MODULE 8D-4: SETTINGS
// ============================================================

/**
 * GET /settings
 * System info, destinations, admin info, feature flags.
 */
router.get('/settings', adminAuth('platform_admin'), async (req, res) => {
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
router.get('/settings/audit-log', adminAuth('platform_admin'), async (req, res) => {
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
    // Validate destination exists in DB or hardcoded config
    const [destCheck] = await mysqlSequelize.query(
      'SELECT id FROM destinations WHERE code = :code AND status != :deleted',
      { replacements: { code: dest, deleted: 'deleted' }, type: QueryTypes.SELECT }
    );
    if (!destCheck && !DEFAULT_BRAND_CONFIG[dest]) {
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
 * POST /settings/branding/:destination/:type
 * Upload a brand asset (logo, favicon, navicon) for a destination.
 * Accepts PNG, JPG, SVG, ICO (max 2MB). Type: logo, favicon, navicon.
 * Stores file in public/branding/ and updates MongoDB + MySQL branding JSON.
 */
const STORAGE_ROOT = process.env.STORAGE_ROOT || '/var/www/api.holidaibutler.com/storage';
const BRANDING_DIR = path.join(STORAGE_ROOT, 'branding');

const VALID_BRANDING_TYPES = ['logo', 'favicon', 'navicon'];

const brandingAssetStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(BRANDING_DIR, { recursive: true });
    cb(null, BRANDING_DIR);
  },
  filename: (req, file, cb) => {
    const dest = req.params.destination.toLowerCase();
    const type = VALID_BRANDING_TYPES.includes(req.params.type) ? req.params.type : 'logo';
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `${dest}_${type}${ext}`);
  }
});

const brandingAssetUpload = multer({
  storage: brandingAssetStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, SVG, and ICO files are allowed'));
    }
  }
});

router.post('/settings/branding/:destination/:type', adminAuth('poi_owner'), async (req, res) => {
  const dest = req.params.destination.toLowerCase();
  const type = req.params.type;

  // Validate destination exists in DB (not just hardcoded config)
  const [destRow] = await mysqlSequelize.query(
    'SELECT id, code FROM destinations WHERE code = :code AND status != :deleted',
    { replacements: { code: dest, deleted: 'deleted' }, type: QueryTypes.SELECT }
  );
  if (!destRow && !DEFAULT_BRAND_CONFIG[dest]) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_DESTINATION', message: 'Unknown destination' } });
  }
  if (!VALID_BRANDING_TYPES.includes(type)) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_TYPE', message: `Type must be one of: ${VALID_BRANDING_TYPES.join(', ')}` } });
  }

  brandingAssetUpload.single('logo')(req, res, async (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 2MB)' : err.message;
      return res.status(400).json({ success: false, error: { code: 'UPLOAD_ERROR', message } });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded' } });
    }

    try {
      const assetUrl = `/branding/${req.file.filename}`;

      // Update MySQL destinations.branding JSON (set the specific field)
      try {
        const [dest_row] = await mysqlSequelize.query(
          'SELECT branding FROM destinations WHERE code = :code',
          { replacements: { code: dest }, type: QueryTypes.SELECT }
        );
        if (dest_row) {
          const branding = typeof dest_row.branding === 'string' ? JSON.parse(dest_row.branding) : (dest_row.branding || {});
          branding[type] = assetUrl;
          await mysqlSequelize.query(
            'UPDATE destinations SET branding = :branding, updated_at = NOW() WHERE code = :code',
            { replacements: { branding: JSON.stringify(branding), code: dest }, type: QueryTypes.UPDATE }
          );
        }
      } catch (mysqlErr) {
        logger.warn('[AdminPortal] Branding MySQL sync failed:', mysqlErr.message);
      }

      // Update MongoDB
      if (mongoose.connection.readyState === 1) {
        const db = mongoose.connection.db;
        const mongoUpdate = type === 'logo' ? { logo_url: assetUrl } : { [`${type}_url`]: assetUrl };
        mongoUpdate.updated_at = new Date();
        mongoUpdate.updated_by = req.adminUser.email;
        await db.collection('brand_configurations').updateOne(
          { destination: dest },
          { $set: mongoUpdate },
          { upsert: true }
        );

        // Audit log
        try {
          await db.collection('audit_logs').insertOne({
            action: `branding_${type}_uploaded`,
            destination: dest,
            admin_id: req.adminUser.id || req.adminUser.userId,
            admin_email: req.adminUser.email,
            changes: { [`${type}_url`]: assetUrl, filename: req.file.filename, size: req.file.size },
            timestamp: new Date(),
            actor: { type: 'admin', name: 'admin-portal' }
          });
        } catch { /* non-critical */ }
      }

      res.json({ success: true, data: { logo_url: assetUrl } });
    } catch (error) {
      logger.error('[AdminPortal] Logo upload error:', error);
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'An error occurred' } });
    }
  });
});

// ============================================================
// BLOCK IMAGE UPLOAD (Wave 1 — Enterprise Admin Portal)
// ============================================================

const BLOCK_IMAGES_DIR = path.join(STORAGE_ROOT, 'block-images');

const blockImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(BLOCK_IMAGES_DIR, { recursive: true });
    cb(null, BLOCK_IMAGES_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`);
  }
});

const blockImageUpload = multer({
  storage: blockImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, WebP, and SVG files are allowed'));
    }
  }
});

router.post('/blocks/upload-image', adminAuth('editor'), (req, res) => {
  blockImageUpload.single('image')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 5MB)' : err.message;
      return res.status(400).json({ success: false, error: { code: 'UPLOAD_ERROR', message } });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded' } });
    }
    const url = `/block-images/${req.file.filename}`;
    res.json({ success: true, data: { url } });
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
    const roleLabels = { platform_admin: 'Platform Admin', poi_owner: 'POI Owner', content_manager: 'Content Manager', editor: 'Content Editor', reviewer: 'Content Reviewer' };
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

    // Validate tasks array (max 10, must be array of strings, no placeholders)
    if (req.body.tasks !== undefined) {
      if (!Array.isArray(req.body.tasks)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_TASKS', message: 'tasks must be an array' } });
      }
      if (req.body.tasks.length > 10) {
        return res.status(400).json({ success: false, error: { code: 'TOO_MANY_TASKS', message: 'Maximum 10 tasks allowed' } });
      }
      // Reject placeholder patterns ("Task 1", "Task 2", etc.) and empty strings
      const placeholderPattern = /^Task \d+$/;
      const hasPlaceholders = req.body.tasks.some(t => !t || typeof t !== 'string' || t.trim() === '' || placeholderPattern.test(t.trim()));
      if (hasPlaceholders) {
        console.warn(`[adminPortal] PUT /agents/config/${key}: REJECTED — placeholder tasks detected:`, req.body.tasks);
        return res.status(400).json({ success: false, error: { code: 'PLACEHOLDER_TASKS', message: 'Tasks cannot contain placeholder values (e.g. "Task 1", "Task 2") or empty strings.' } });
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

// ═══════════════════════════════════════════════════════════════
// INTELLIGENCE ENDPOINT — Fase 11B Blok I (Cross-agent correlation)
// ═══════════════════════════════════════════════════════════════

router.get('/intelligence/report', adminAuth('reviewer'), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, data: { correlations: [], insights: [], message: 'MongoDB niet verbonden' } });
    }
    const db = mongoose.connection.db;
    const latest = await db.collection('audit_logs').findOne(
      { 'actor.name': 'correlation-engine', action: 'weekly_correlation_report' },
      { sort: { timestamp: -1 } }
    );
    res.json({
      success: true,
      data: latest?.metadata || { correlations: [], insights: [], message: 'Nog geen rapport beschikbaar' }
    });
  } catch (error) {
    logger.error('[AdminPortal] Intelligence report error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch intelligence report' } });
  }
});

// ═══════════════════════════════════════════════════════════════
// ISSUES ENDPOINTS — Fase 11B (Agent Issues lifecycle management)
// ═══════════════════════════════════════════════════════════════

// GET /issues/stats — Dashboard statistics (MUST be before :issueId)
router.get('/issues/stats', adminAuth('reviewer'), async (req, res) => {
  try {
    const [byStatus, bySeverity, byAgent, avgResTime, slaBreaches] = await Promise.all([
      AgentIssue.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      AgentIssue.aggregate([
        { $match: { status: { $in: ['open', 'acknowledged', 'in_progress'] } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]),
      AgentIssue.aggregate([
        { $match: { status: { $in: ['open', 'acknowledged', 'in_progress'] } } },
        { $group: { _id: '$agentLabel', count: { $sum: 1 } } }
      ]),
      AgentIssue.aggregate([
        { $match: { status: { $in: ['resolved', 'auto_closed'] }, resolvedAt: { $ne: null } } },
        { $project: { resolutionTime: { $subtract: ['$resolvedAt', '$detectedAt'] } } },
        { $group: { _id: null, avg: { $avg: '$resolutionTime' } } }
      ]),
      AgentIssue.countDocuments({
        status: { $in: ['open', 'acknowledged', 'in_progress'] },
        slaTarget: { $lt: new Date(), $ne: null }
      })
    ]);

    res.json({
      success: true,
      data: {
        byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
        bySeverity: Object.fromEntries(bySeverity.map(s => [s._id, s.count])),
        byAgent: Object.fromEntries(byAgent.map(s => [s._id, s.count])),
        avgResolutionTimeHours: avgResTime[0]?.avg ? Math.round(avgResTime[0].avg / (1000 * 60 * 60)) : null,
        slaBreaches,
        totalOpen: bySeverity.reduce((s, i) => s + i.count, 0)
      }
    });
  } catch (error) {
    logger.error('[AdminPortal] Issues stats error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// GET /issues — All issues with filtering + pagination
router.get('/issues', adminAuth('reviewer'), async (req, res) => {
  try {
    const { status, severity, agent, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (agent) query.agentName = agent;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const lim = Math.min(parseInt(limit), 100);
    const [issues, total] = await Promise.all([
      AgentIssue.find(query).sort({ detectedAt: -1 }).skip(skip).limit(lim).lean(),
      AgentIssue.countDocuments(query)
    ]);

    const summary = await AgentIssue.aggregate([
      { $match: { status: { $in: ['open', 'acknowledged', 'in_progress'] } } },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);
    const slaBreaches = await AgentIssue.countDocuments({
      status: { $in: ['open', 'acknowledged', 'in_progress'] },
      slaTarget: { $lt: new Date(), $ne: null }
    });

    res.json({
      success: true,
      data: {
        issues,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / lim),
        summary: Object.fromEntries(summary.map(s => [s._id, s.count])),
        slaBreaches
      }
    });
  } catch (error) {
    logger.error('[AdminPortal] Issues list error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// GET /issues/:issueId — Single issue detail
router.get('/issues/:issueId', adminAuth('reviewer'), async (req, res) => {
  try {
    const issue = await AgentIssue.findOne({ issueId: req.params.issueId }).lean();
    if (!issue) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Issue niet gevonden' } });
    res.json({ success: true, data: issue });
  } catch (error) {
    logger.error('[AdminPortal] Issue detail error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// PUT /issues/:issueId/status — Update issue status
router.put('/issues/:issueId/status', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'editor']), async (req, res) => {
  try {
    const { status, resolution } = req.body;
    const validStatuses = ['acknowledged', 'in_progress', 'resolved', 'wont_fix'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Ongeldige status: ' + status } });
    }

    const update = { status };
    if (status === 'acknowledged') update.acknowledgedAt = new Date();
    if (status === 'resolved' || status === 'wont_fix') {
      update.resolvedAt = new Date();
      update.resolvedBy = req.adminUser.email;
      update.resolution = resolution || '';
    }

    const issue = await AgentIssue.findOneAndUpdate(
      { issueId: req.params.issueId },
      { $set: update },
      { new: true }
    );
    if (!issue) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Issue niet gevonden' } });

    await saveAuditLog({
      action: 'issue_status_changed',
      adminId: req.adminUser.id,
      adminEmail: req.adminUser.email,
      details: `Issue ${req.params.issueId} → ${status}${resolution ? ': ' + resolution : ''}`,
      entityType: 'agent_issue',
      entityId: req.params.issueId
    });

    res.json({ success: true, data: issue });
  } catch (error) {
    logger.error('[AdminPortal] Issue status update error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ============================================================================
// AGENDA MANAGEMENT (Fase II-C.5)
// ============================================================================

/**
 * GET /agenda/events (Fase II-C.5)
 * List agenda events for admin with filtering.
 */
router.get('/agenda/events', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, dateRange, destination } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 200);
    const offset = (pageNum - 1) * limitNum;

    const conditions = ['1=1'];
    const params = [];

    // RBAC destination filter
    if (destination) {
      const destId = resolveDestinationId(destination);
      if (destId) { conditions.push('a.destination_id = ?'); params.push(destId); }
    } else if (req.destScope) {
      conditions.push(`a.destination_id IN (${req.destScope.map(() => '?').join(',')})`);
      params.push(...req.destScope);
    }

    // Date filter
    if (dateRange === 'upcoming') {
      conditions.push('EXISTS (SELECT 1 FROM agenda_dates d WHERE d.provider_event_hash = a.provider_event_hash AND d.event_date >= CURDATE())');
    } else if (dateRange === 'past') {
      conditions.push('NOT EXISTS (SELECT 1 FROM agenda_dates d WHERE d.provider_event_hash = a.provider_event_hash AND d.event_date >= CURDATE())');
    }

    // Search
    if (search) {
      conditions.push('(a.title LIKE ? OR a.title_en LIKE ? OR a.location_name LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const whereClause = conditions.join(' AND ');

    const [countResult] = await mysqlSequelize.query(
      `SELECT COUNT(*) as total FROM agenda a WHERE ${whereClause}`,
      { replacements: params, type: QueryTypes.SELECT }
    );

    const events = await mysqlSequelize.query(`
      SELECT a.*,
        (SELECT COUNT(*) FROM agenda_dates d WHERE d.provider_event_hash = a.provider_event_hash) as date_count,
        (SELECT MIN(d2.event_date) FROM agenda_dates d2 WHERE d2.provider_event_hash = a.provider_event_hash AND d2.event_date >= CURDATE()) as next_date
      FROM agenda a
      WHERE ${whereClause}
      ORDER BY a.updated_at DESC
      LIMIT ? OFFSET ?
    `, { replacements: [...params, limitNum, offset], type: QueryTypes.SELECT });

    res.json({
      success: true,
      data: events.map(e => ({
        id: e.id,
        title: e.title,
        title_en: e.title_en,
        title_es: e.title_es,
        location_name: e.location_name,
        destination_id: e.destination_id,
        image: e.image,
        url: e.url,
        date_count: e.date_count,
        next_date: e.next_date,
        created_at: e.created_at,
        updated_at: e.updated_at
      })),
      pagination: { page: pageNum, limit: limitNum, total: countResult?.total || 0 }
    });
  } catch (error) {
    logger.error('[AdminPortal] Agenda list error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to list events' } });
  }
});

/**
 * GET /agenda/events/:id (Fase II-C.5)
 * Get single event with all dates for admin editing.
 */
router.get('/agenda/events/:id', adminAuth('reviewer'), async (req, res) => {
  try {
    const events = await mysqlSequelize.query(
      'SELECT * FROM agenda WHERE id = ?',
      { replacements: [req.params.id], type: QueryTypes.SELECT }
    );
    if (events.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } });
    }

    const dates = await mysqlSequelize.query(
      'SELECT * FROM agenda_dates WHERE provider_event_hash = ? ORDER BY event_date ASC',
      { replacements: [events[0].provider_event_hash], type: QueryTypes.SELECT }
    );

    res.json({ success: true, data: { ...events[0], dates } });
  } catch (error) {
    logger.error('[AdminPortal] Agenda get error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * PUT /agenda/events/:id (Fase II-C.5)
 * Update event fields (title, description, location, image, url).
 */
router.put('/agenda/events/:id', adminAuth('editor'), destinationScope, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const allowedFields = [
      'title', 'title_en', 'title_es',
      'short_description', 'short_description_en', 'short_description_es',
      'long_description', 'long_description_en', 'long_description_es',
      'location_name', 'location_address', 'location_lat', 'location_lon',
      'image', 'url'
    ];

    const updates = [];
    const params = [];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'No valid fields to update' } });
    }

    // RBAC check
    const [event] = await mysqlSequelize.query(
      'SELECT destination_id FROM agenda WHERE id = ?',
      { replacements: [eventId], type: QueryTypes.SELECT }
    );
    if (!event) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } });
    }
    if (req.destScope && !req.destScope.includes(event.destination_id)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Event not in your destination scope' } });
    }

    params.push(eventId);
    await mysqlSequelize.query(
      `UPDATE agenda SET ${updates.join(', ')} WHERE id = ?`,
      { replacements: params }
    );

    logger.info(`[AdminPortal] Agenda event ${eventId} updated by ${req.adminUser?.email}`);
    res.json({ success: true, data: { id: eventId, updated: updates.length } });
  } catch (error) {
    logger.error('[AdminPortal] Agenda update error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * DELETE /agenda/events/:id (Fase II-C.5)
 * Delete event and its dates.
 */
router.delete('/agenda/events/:id', adminAuth('admin'), destinationScope, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);

    const [event] = await mysqlSequelize.query(
      'SELECT provider_event_hash, destination_id FROM agenda WHERE id = ?',
      { replacements: [eventId], type: QueryTypes.SELECT }
    );
    if (!event) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } });
    }
    if (req.destScope && !req.destScope.includes(event.destination_id)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Event not in your destination scope' } });
    }

    // Delete dates first, then event
    await mysqlSequelize.query(
      'DELETE FROM agenda_dates WHERE provider_event_hash = ?',
      { replacements: [event.provider_event_hash] }
    );
    await mysqlSequelize.query(
      'DELETE FROM agenda WHERE id = ?',
      { replacements: [eventId] }
    );

    logger.info(`[AdminPortal] Agenda event ${eventId} deleted by ${req.adminUser?.email}`);
    res.json({ success: true, data: { id: eventId, deleted: true } });
  } catch (error) {
    logger.error('[AdminPortal] Agenda delete error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * GET /agenda/stats (Fase II-C.5)
 * Agenda statistics for admin dashboard.
 */
router.get('/agenda/stats', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const conditions = ['1=1'];
    const params = [];
    if (req.destScope) {
      conditions.push(`a.destination_id IN (${req.destScope.map(() => '?').join(',')})`);
      params.push(...req.destScope);
    }
    const where = conditions.join(' AND ');

    const [stats] = await mysqlSequelize.query(`
      SELECT
        COUNT(DISTINCT a.id) as total_events,
        SUM(CASE WHEN a.destination_id = 1 THEN 1 ELSE 0 END) as calpe_events,
        SUM(CASE WHEN a.destination_id = 2 THEN 1 ELSE 0 END) as texel_events,
        (SELECT COUNT(DISTINCT a2.id) FROM agenda a2
         INNER JOIN agenda_dates d2 ON a2.provider_event_hash = d2.provider_event_hash
         WHERE d2.event_date >= CURDATE() AND ${where.replace(/a\./g, 'a2.')}) as upcoming,
        SUM(CASE WHEN a.image IS NOT NULL AND a.image != '' THEN 1 ELSE 0 END) as with_images
      FROM agenda a
      WHERE ${where}
    `, { replacements: [...params, ...params], type: QueryTypes.SELECT });

    res.json({ success: true, data: stats || {} });
  } catch (error) {
    logger.error('[AdminPortal] Agenda stats error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ============================================================================
// PAYMENT MANAGEMENT (Fase III — Blok A)
// ============================================================================

import {
  listTransactions,
  getTransactionDetail,
  initiateRefund,
  getPaymentStats,
  getReconciliationReport,
} from '../services/payment/paymentService.js';

/**
 * GET /payments — List payment transactions with filters.
 */
router.get('/payments', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const { status, date_from, date_to, page, limit } = req.query;
    const destinationId = req.destScope?.[0] || null;

    const result = await listTransactions({
      destinationId,
      status: status || null,
      dateFrom: date_from || null,
      dateTo: date_to || null,
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 50, 200),
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[AdminPortal] List payments error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * GET /payments/stats — Payment statistics for dashboard.
 */
router.get('/payments/stats', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const destinationId = req.destScope?.[0] || null;

    const stats = await getPaymentStats(destinationId, date_from, date_to);
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('[AdminPortal] Payment stats error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * GET /payments/reconciliation — Reconciliation report for a specific date.
 */
router.get('/payments/reconciliation', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DATE', message: 'date query parameter required (YYYY-MM-DD)' } });
    }
    const destinationId = req.destScope?.[0] || null;

    const report = await getReconciliationReport(destinationId, date);
    res.json({ success: true, data: report });
  } catch (error) {
    logger.error('[AdminPortal] Reconciliation error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * GET /payments/:id — Get single transaction detail.
 */
router.get('/payments/:id', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || null;
    const transaction = await getTransactionDetail(parseInt(req.params.id), destinationId);

    if (!transaction) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    logger.error('[AdminPortal] Get payment detail error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * POST /payments/:id/refund — Initiate refund for a transaction.
 */
router.post('/payments/:id/refund', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), async (req, res) => {
  try {
    const { amount_cents, reason, reason_note } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_REASON', message: 'reason is required' } });
    }

    const validReasons = ['customer_request', 'duplicate', 'fraud', 'no_show_policy', 'event_cancelled', 'other'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_REASON', message: `reason must be one of: ${validReasons.join(', ')}` } });
    }

    const result = await initiateRefund(
      parseInt(req.params.id),
      parseInt(amount_cents) || 0,
      reason,
      'admin',
      req.user?.id || null,
    );

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[AdminPortal] Refund error:', error);
    const statusCode = error.message.includes('not found') ? 404
      : error.message.includes('Cannot refund') ? 400
      : 500;
    res.status(statusCode).json({ success: false, error: { code: 'REFUND_ERROR', message: error.message } });
  }
});

// =============================================================================
// TICKETING ADMIN ENDPOINTS (Fase III — Blok B)
// =============================================================================

// --- GET /tickets — List ticket definitions ---
router.get('/tickets', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || null;
    const { page = 1, limit = 50, ticketType, isActive, poiId } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = `SELECT t.*, p.name as poi_name FROM tickets t LEFT JOIN POI p ON p.id = t.poi_id WHERE 1=1`;
    let countSql = `SELECT COUNT(*) as total FROM tickets t WHERE 1=1`;
    const replacements = {};

    if (destinationId) {
      sql += ` AND t.destination_id = :destinationId`;
      countSql += ` AND t.destination_id = :destinationId`;
      replacements.destinationId = destinationId;
    }
    if (ticketType) {
      sql += ` AND t.ticket_type = :ticketType`;
      countSql += ` AND t.ticket_type = :ticketType`;
      replacements.ticketType = ticketType;
    }
    if (isActive !== undefined) {
      sql += ` AND t.is_active = :isActive`;
      countSql += ` AND t.is_active = :isActive`;
      replacements.isActive = isActive === 'true' ? 1 : 0;
    }
    if (poiId) {
      sql += ` AND t.poi_id = :poiId`;
      countSql += ` AND t.poi_id = :poiId`;
      replacements.poiId = parseInt(poiId);
    }

    sql += ` ORDER BY t.created_at DESC LIMIT :limit OFFSET :offset`;
    replacements.limit = parseInt(limit);
    replacements.offset = offset;

    const [tickets, [countResult]] = await Promise.all([
      mysqlSequelize.query(sql, { replacements, type: QueryTypes.SELECT }),
      mysqlSequelize.query(countSql, { replacements, type: QueryTypes.SELECT }),
    ]);

    res.json({ success: true, data: tickets, total: countResult.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    logger.error('[AdminPortal] List tickets error:', error);
    res.status(500).json({ success: false, error: { code: 'LIST_TICKETS_ERROR', message: error.message } });
  }
});

// --- POST /tickets — Create ticket definition ---
router.post('/tickets', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.body.destination_id) || null;
    if (!destinationId) return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'Destination required (set destination_id in body or X-Destination-ID header)' } });

    const { name, name_en, name_de, name_es, description, description_en, description_de, description_es,
            ticket_type, base_price_cents, currency, pricing_tiers, dynamic_pricing_enabled, dynamic_pricing_config,
            poi_id, event_id, max_per_order, validity_type, validity_days,
            available_from, available_until, terms_conditions, cancellation_policy } = req.body;

    if (!name || !ticket_type || !base_price_cents) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'name, ticket_type, base_price_cents required' } });
    }

    const [result] = await mysqlSequelize.query(
      `INSERT INTO tickets
       (destination_id, poi_id, event_id, name, name_en, name_de, name_es,
        description, description_en, description_de, description_es,
        ticket_type, base_price_cents, currency, pricing_tiers, dynamic_pricing_enabled, dynamic_pricing_config,
        max_per_order, validity_type, validity_days, available_from, available_until,
        terms_conditions, cancellation_policy, created_at)
       VALUES
       (:destinationId, :poi_id, :event_id, :name, :name_en, :name_de, :name_es,
        :description, :description_en, :description_de, :description_es,
        :ticket_type, :base_price_cents, :currency, :pricing_tiers, :dynamic_pricing_enabled, :dynamic_pricing_config,
        :max_per_order, :validity_type, :validity_days, :available_from, :available_until,
        :terms_conditions, :cancellation_policy, NOW())`,
      {
        replacements: {
          destinationId, poi_id: poi_id || null, event_id: event_id || null,
          name, name_en: name_en || null, name_de: name_de || null, name_es: name_es || null,
          description: description || null, description_en: description_en || null,
          description_de: description_de || null, description_es: description_es || null,
          ticket_type, base_price_cents: parseInt(base_price_cents), currency: currency || 'EUR',
          pricing_tiers: pricing_tiers ? JSON.stringify(pricing_tiers) : null,
          dynamic_pricing_enabled: dynamic_pricing_enabled || false,
          dynamic_pricing_config: dynamic_pricing_config ? JSON.stringify(dynamic_pricing_config) : null,
          max_per_order: max_per_order || 10, validity_type: validity_type || 'fixed_date',
          validity_days: validity_days || null, available_from: available_from || null,
          available_until: available_until || null, terms_conditions: terms_conditions || null,
          cancellation_policy: cancellation_policy || null,
        },
        type: QueryTypes.INSERT,
      }
    );

    res.status(201).json({ success: true, data: { id: result, message: 'Ticket created' } });
  } catch (error) {
    logger.error('[AdminPortal] Create ticket error:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_TICKET_ERROR', message: error.message } });
  }
});

// --- PUT /tickets/:id — Update ticket definition ---
router.put('/tickets/:id', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const destinationId = req.destScope?.[0] || null;

    // Build dynamic SET clause
    const allowedFields = ['name', 'name_en', 'name_de', 'name_es', 'description', 'description_en',
      'description_de', 'description_es', 'ticket_type', 'base_price_cents', 'currency',
      'pricing_tiers', 'dynamic_pricing_enabled', 'dynamic_pricing_config', 'is_active',
      'poi_id', 'event_id', 'max_per_order', 'validity_type', 'validity_days',
      'available_from', 'available_until', 'terms_conditions', 'cancellation_policy'];

    const sets = [];
    const replacements = { ticketId };
    if (destinationId) replacements.destinationId = destinationId;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        const val = req.body[field];
        if (field === 'pricing_tiers' || field === 'dynamic_pricing_config') {
          replacements[field] = val ? JSON.stringify(val) : null;
        } else {
          replacements[field] = val;
        }
        sets.push(`${field} = :${field}`);
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_FIELDS', message: 'No fields to update' } });
    }

    sets.push('updated_at = NOW()');
    let sql = `UPDATE tickets SET ${sets.join(', ')} WHERE id = :ticketId`;
    if (destinationId) sql += ` AND destination_id = :destinationId`;

    const [, affected] = await mysqlSequelize.query(sql, { replacements, type: QueryTypes.UPDATE });

    if (affected === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    res.json({ success: true, data: { message: 'Ticket updated' } });
  } catch (error) {
    logger.error('[AdminPortal] Update ticket error:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_TICKET_ERROR', message: error.message } });
  }
});

// --- DELETE /tickets/:id — Soft delete ticket ---
router.delete('/tickets/:id', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const destinationId = req.destScope?.[0] || null;

    let sql = `UPDATE tickets SET is_active = FALSE, updated_at = NOW() WHERE id = :ticketId`;
    const replacements = { ticketId };
    if (destinationId) { sql += ` AND destination_id = :destinationId`; replacements.destinationId = destinationId; }

    await mysqlSequelize.query(sql, { replacements, type: QueryTypes.UPDATE });
    res.json({ success: true, data: { message: 'Ticket deactivated' } });
  } catch (error) {
    logger.error('[AdminPortal] Delete ticket error:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_TICKET_ERROR', message: error.message } });
  }
});

// --- GET /tickets/:id/inventory — Get inventory for ticket ---
router.get('/tickets/:id/inventory', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const destinationId = req.destScope?.[0] || null;
    const { startDate, endDate } = req.query;

    let sql = `SELECT ti.*, (ti.total_capacity - ti.reserved_count - ti.sold_count) as available
               FROM ticket_inventory ti WHERE ti.ticket_id = :ticketId`;
    const replacements = { ticketId };
    if (destinationId) { sql += ` AND ti.destination_id = :destinationId`; replacements.destinationId = destinationId; }
    if (startDate) { sql += ` AND ti.slot_date >= :startDate`; replacements.startDate = startDate; }
    if (endDate) { sql += ` AND ti.slot_date <= :endDate`; replacements.endDate = endDate; }
    sql += ` ORDER BY ti.slot_date ASC, ti.slot_time_start ASC`;

    const inventory = await mysqlSequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    res.json({ success: true, data: inventory, count: inventory.length });
  } catch (error) {
    logger.error('[AdminPortal] Get inventory error:', error);
    res.status(500).json({ success: false, error: { code: 'GET_INVENTORY_ERROR', message: error.message } });
  }
});

// --- POST /tickets/:id/inventory — Create inventory slots (bulk) ---
router.post('/tickets/:id/inventory', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const destinationId = req.destScope?.[0] || parseInt(req.body.destination_id) || null;
    if (!destinationId) return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'Destination required (set destination_id in body or X-Destination-ID header)' } });

    const { slots } = req.body;
    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_SLOTS', message: 'slots array required' } });
    }

    let created = 0;
    for (const slot of slots) {
      try {
        await mysqlSequelize.query(
          `INSERT INTO ticket_inventory
           (ticket_id, destination_id, slot_date, slot_time_start, slot_time_end, total_capacity, is_available, created_at)
           VALUES (:ticketId, :destinationId, :slotDate, :slotTimeStart, :slotTimeEnd, :totalCapacity, :isAvailable, NOW())
           ON DUPLICATE KEY UPDATE total_capacity = :totalCapacity, is_available = :isAvailable, updated_at = NOW()`,
          {
            replacements: {
              ticketId, destinationId,
              slotDate: slot.slotDate,
              slotTimeStart: slot.slotTimeStart || null,
              slotTimeEnd: slot.slotTimeEnd || null,
              totalCapacity: parseInt(slot.totalCapacity),
              isAvailable: slot.isAvailable !== false ? 1 : 0,
            },
            type: QueryTypes.INSERT,
          }
        );
        created++;
      } catch (err) {
        logger.warn(`[AdminPortal] Inventory slot skip: ${err.message}`);
      }
    }

    res.status(201).json({ success: true, data: { created, total: slots.length } });
  } catch (error) {
    logger.error('[AdminPortal] Create inventory error:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_INVENTORY_ERROR', message: error.message } });
  }
});

// --- PUT /tickets/inventory/:id — Update single inventory slot ---
router.put('/tickets/inventory/:id', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), async (req, res) => {
  try {
    const inventoryId = parseInt(req.params.id);
    const destinationId = req.destScope?.[0] || null;
    const { total_capacity, is_available } = req.body;

    const sets = ['updated_at = NOW()'];
    const replacements = { inventoryId };
    if (destinationId) replacements.destinationId = destinationId;
    if (total_capacity !== undefined) { sets.push('total_capacity = :total_capacity'); replacements.total_capacity = parseInt(total_capacity); }
    if (is_available !== undefined) { sets.push('is_available = :is_available'); replacements.is_available = is_available ? 1 : 0; }

    let sql = `UPDATE ticket_inventory SET ${sets.join(', ')} WHERE id = :inventoryId`;
    if (destinationId) sql += ` AND destination_id = :destinationId`;

    await mysqlSequelize.query(sql, { replacements, type: QueryTypes.UPDATE });
    res.json({ success: true, data: { message: 'Inventory slot updated' } });
  } catch (error) {
    logger.error('[AdminPortal] Update inventory error:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_INVENTORY_ERROR', message: error.message } });
  }
});

// --- GET /tickets/orders — List ticket orders ---
router.get('/tickets/orders', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || null;
    const { page = 1, limit = 50, status, startDate, endDate } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = `SELECT o.*, COUNT(oi.id) as item_count, SUM(oi.quantity) as total_tickets
               FROM ticket_orders o
               LEFT JOIN ticket_order_items oi ON oi.order_id = o.id
               WHERE 1=1`;
    let countSql = `SELECT COUNT(*) as total FROM ticket_orders o WHERE 1=1`;
    const replacements = {};

    if (destinationId) {
      sql += ` AND o.destination_id = :destinationId`;
      countSql += ` AND o.destination_id = :destinationId`;
      replacements.destinationId = destinationId;
    }
    if (status) {
      sql += ` AND o.status = :status`;
      countSql += ` AND o.status = :status`;
      replacements.status = status;
    }
    if (startDate) {
      sql += ` AND o.created_at >= :startDate`;
      countSql += ` AND o.created_at >= :startDate`;
      replacements.startDate = startDate;
    }
    if (endDate) {
      sql += ` AND o.created_at <= :endDate`;
      countSql += ` AND o.created_at <= :endDate`;
      replacements.endDate = endDate;
    }

    sql += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT :limit OFFSET :offset`;
    replacements.limit = parseInt(limit);
    replacements.offset = offset;

    const [orders, [countResult]] = await Promise.all([
      mysqlSequelize.query(sql, { replacements, type: QueryTypes.SELECT }),
      mysqlSequelize.query(countSql, { replacements, type: QueryTypes.SELECT }),
    ]);

    res.json({ success: true, data: orders, total: countResult.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    logger.error('[AdminPortal] List orders error:', error);
    res.status(500).json({ success: false, error: { code: 'LIST_ORDERS_ERROR', message: error.message } });
  }
});

// --- GET /tickets/orders/:id — Order detail ---
router.get('/tickets/orders/:id', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const destinationId = req.destScope?.[0] || null;

    let sql = `SELECT o.* FROM ticket_orders o WHERE o.id = :orderId`;
    const replacements = { orderId };
    if (destinationId) { sql += ` AND o.destination_id = :destinationId`; replacements.destinationId = destinationId; }

    const [order] = await mysqlSequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    if (!order) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });

    // Get items
    const items = await mysqlSequelize.query(
      `SELECT oi.*, t.name as ticket_name, t.ticket_type,
              ti.slot_date, ti.slot_time_start, ti.slot_time_end
       FROM ticket_order_items oi
       JOIN tickets t ON t.id = oi.ticket_id
       JOIN ticket_inventory ti ON ti.id = oi.inventory_id
       WHERE oi.order_id = :orderId`,
      { replacements: { orderId }, type: QueryTypes.SELECT }
    );

    order.items = items;
    res.json({ success: true, data: order });
  } catch (error) {
    logger.error('[AdminPortal] Get order detail error:', error);
    res.status(500).json({ success: false, error: { code: 'GET_ORDER_ERROR', message: error.message } });
  }
});

// --- POST /tickets/orders/:id/cancel — Cancel order (admin) ---
router.post('/tickets/orders/:id/cancel', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { reason } = req.body;

    const { cancelOrder } = await import('../services/ticketing/ticketingService.js');
    const result = await cancelOrder(orderId, reason || 'admin_cancelled');
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[AdminPortal] Cancel order error:', error);
    const statusCode = error.message.includes('NOT_FOUND') ? 404 : error.message.includes('ALREADY_FINAL') ? 400 : 500;
    res.status(statusCode).json({ success: false, error: { code: 'CANCEL_ORDER_ERROR', message: error.message } });
  }
});

// --- POST /tickets/qr/validate — Validate QR code (scanner endpoint) ---
router.post('/tickets/qr/validate', adminAuth('editor'), destinationScope, async (req, res) => {
  try {
    const { qrData, validatedBy } = req.body;
    if (!qrData) return res.status(400).json({ success: false, error: { code: 'MISSING_QR', message: 'qrData required' } });

    const { validateQR } = await import('../services/ticketing/ticketingService.js');
    const result = await validateQR(qrData, validatedBy || req.user?.email || 'admin');
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[AdminPortal] Validate QR error:', error);
    res.status(500).json({ success: false, error: { code: 'VALIDATE_QR_ERROR', message: error.message } });
  }
});

// --- GET /tickets/stats — Ticketing statistics ---
router.get('/tickets/stats', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || null;
    const replacements = {};
    const destFilter = destinationId ? 'AND destination_id = :destinationId' : '';
    if (destinationId) replacements.destinationId = destinationId;

    const [[ticketStats], [orderStats], [revenueStats]] = await Promise.all([
      mysqlSequelize.query(
        `SELECT COUNT(*) as total_tickets,
                SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_tickets
         FROM tickets WHERE 1=1 ${destFilter}`,
        { replacements, type: QueryTypes.SELECT }
      ),
      mysqlSequelize.query(
        `SELECT COUNT(*) as total_orders,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_orders,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
                SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_orders,
                SUM(CASE WHEN qr_code_validated = TRUE THEN 1 ELSE 0 END) as validated_orders
         FROM ticket_orders WHERE 1=1 ${destFilter}`,
        { replacements, type: QueryTypes.SELECT }
      ),
      mysqlSequelize.query(
        `SELECT COALESCE(SUM(total_cents), 0) as total_revenue_cents,
                COALESCE(SUM(discount_cents), 0) as total_discount_cents,
                COALESCE(AVG(total_cents), 0) as avg_order_cents
         FROM ticket_orders WHERE status IN ('confirmed', 'paid') ${destFilter}`,
        { replacements, type: QueryTypes.SELECT }
      ),
    ]);

    res.json({
      success: true,
      data: {
        tickets: ticketStats,
        orders: orderStats,
        revenue: revenueStats,
      },
    });
  } catch (error) {
    logger.error('[AdminPortal] Ticketing stats error:', error);
    res.status(500).json({ success: false, error: { code: 'STATS_ERROR', message: error.message } });
  }
});

// --- POST /vouchers — Create voucher code ---
router.post('/vouchers', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.body.destination_id) || null;
    if (!destinationId) return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'Destination required (set destination_id in body or X-Destination-ID header)' } });

    const { code, discount_type, discount_value, min_order_cents, max_discount_cents,
            max_uses, max_uses_per_user, valid_from, valid_until,
            applicable_ticket_ids, applicable_ticket_types } = req.body;

    if (!code || !discount_type || !discount_value) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'code, discount_type, discount_value required' } });
    }

    const [result] = await mysqlSequelize.query(
      `INSERT INTO voucher_codes
       (destination_id, code, discount_type, discount_value, min_order_cents, max_discount_cents,
        max_uses, max_uses_per_user, valid_from, valid_until,
        applicable_ticket_ids, applicable_ticket_types, created_at)
       VALUES
       (:destinationId, :code, :discount_type, :discount_value, :min_order_cents, :max_discount_cents,
        :max_uses, :max_uses_per_user, :valid_from, :valid_until,
        :applicable_ticket_ids, :applicable_ticket_types, NOW())`,
      {
        replacements: {
          destinationId, code: code.toUpperCase(), discount_type, discount_value: parseInt(discount_value),
          min_order_cents: min_order_cents || 0, max_discount_cents: max_discount_cents || null,
          max_uses: max_uses || null, max_uses_per_user: max_uses_per_user || 1,
          valid_from: valid_from || null, valid_until: valid_until || null,
          applicable_ticket_ids: applicable_ticket_ids ? JSON.stringify(applicable_ticket_ids) : null,
          applicable_ticket_types: applicable_ticket_types ? JSON.stringify(applicable_ticket_types) : null,
        },
        type: QueryTypes.INSERT,
      }
    );

    res.status(201).json({ success: true, data: { id: result, code: code.toUpperCase(), message: 'Voucher created' } });
  } catch (error) {
    if (error.message.includes('Duplicate entry')) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Voucher code already exists' } });
    }
    logger.error('[AdminPortal] Create voucher error:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_VOUCHER_ERROR', message: error.message } });
  }
});

// --- GET /vouchers — List vouchers ---
router.get('/vouchers', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || null;
    let sql = `SELECT * FROM voucher_codes WHERE 1=1`;
    const replacements = {};
    if (destinationId) { sql += ` AND destination_id = :destinationId`; replacements.destinationId = destinationId; }
    sql += ` ORDER BY created_at DESC`;

    const vouchers = await mysqlSequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    res.json({ success: true, data: vouchers, count: vouchers.length });
  } catch (error) {
    logger.error('[AdminPortal] List vouchers error:', error);
    res.status(500).json({ success: false, error: { code: 'LIST_VOUCHERS_ERROR', message: error.message } });
  }
});

// --- PUT /vouchers/:id — Update voucher ---
router.put('/vouchers/:id', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), async (req, res) => {
  try {
    const voucherId = parseInt(req.params.id);
    const destinationId = req.destScope?.[0] || null;

    const allowedFields = ['code', 'discount_type', 'discount_value', 'min_order_cents', 'max_discount_cents',
      'max_uses', 'max_uses_per_user', 'valid_from', 'valid_until', 'is_active',
      'applicable_ticket_ids', 'applicable_ticket_types'];

    const sets = [];
    const replacements = { voucherId };
    if (destinationId) replacements.destinationId = destinationId;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        const val = req.body[field];
        if (field === 'applicable_ticket_ids' || field === 'applicable_ticket_types') {
          replacements[field] = val ? JSON.stringify(val) : null;
        } else if (field === 'code') {
          replacements[field] = val.toUpperCase();
        } else {
          replacements[field] = val;
        }
        sets.push(`${field} = :${field}`);
      }
    }

    if (sets.length === 0) return res.status(400).json({ success: false, error: { code: 'NO_FIELDS', message: 'No fields to update' } });

    sets.push('updated_at = NOW()');
    let sql = `UPDATE voucher_codes SET ${sets.join(', ')} WHERE id = :voucherId`;
    if (destinationId) sql += ` AND destination_id = :destinationId`;

    await mysqlSequelize.query(sql, { replacements, type: QueryTypes.UPDATE });
    res.json({ success: true, data: { message: 'Voucher updated' } });
  } catch (error) {
    logger.error('[AdminPortal] Update voucher error:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_VOUCHER_ERROR', message: error.message } });
  }
});

// =============================================================================
// RESERVATION ENDPOINTS (Fase III-C) — 13 endpoints
// =============================================================================

// Import reservation service functions
const reservationServiceModule = await import('../services/reservation/reservationService.js');

// --- GET /reservations — List reservations (paginated, filtered) ---
router.get('/reservations', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || null;
    const { page = 1, limit = 50, status, poiId, dateFrom, dateTo } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = `SELECT r.*, rs.slot_date, rs.slot_time_start, rs.slot_time_end,
                      p.name as poi_name
               FROM reservations r
               JOIN reservation_slots rs ON rs.id = r.slot_id
               JOIN POI p ON p.id = r.poi_id
               WHERE 1=1`;
    let countSql = `SELECT COUNT(*) as total FROM reservations r
                    JOIN reservation_slots rs ON rs.id = r.slot_id
                    WHERE 1=1`;
    const replacements = {};

    if (destinationId) {
      sql += ` AND r.destination_id = :destinationId`;
      countSql += ` AND r.destination_id = :destinationId`;
      replacements.destinationId = destinationId;
    }
    if (status) {
      sql += ` AND r.status = :status`;
      countSql += ` AND r.status = :status`;
      replacements.status = status;
    }
    if (poiId) {
      sql += ` AND r.poi_id = :poiId`;
      countSql += ` AND r.poi_id = :poiId`;
      replacements.poiId = parseInt(poiId);
    }
    if (dateFrom) {
      sql += ` AND rs.slot_date >= :dateFrom`;
      countSql += ` AND rs.slot_date >= :dateFrom`;
      replacements.dateFrom = dateFrom;
    }
    if (dateTo) {
      sql += ` AND rs.slot_date <= :dateTo`;
      countSql += ` AND rs.slot_date <= :dateTo`;
      replacements.dateTo = dateTo;
    }

    sql += ` ORDER BY rs.slot_date DESC, rs.slot_time_start DESC LIMIT :limit OFFSET :offset`;
    replacements.limit = parseInt(limit);
    replacements.offset = offset;

    const [reservations, [countResult]] = await Promise.all([
      mysqlSequelize.query(sql, { replacements, type: QueryTypes.SELECT }),
      mysqlSequelize.query(countSql, { replacements, type: QueryTypes.SELECT }),
    ]);

    res.json({ success: true, data: reservations, total: countResult.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    logger.error('[AdminPortal] List reservations error:', error);
    res.status(500).json({ success: false, error: { code: 'LIST_RESERVATIONS_ERROR', message: error.message } });
  }
});

// --- GET /reservations/stats — Reservation statistics ---
router.get('/reservations/stats', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || null;
    const { period = 'month' } = req.query;

    let dateFilter = '';
    if (period === 'week') dateFilter = `AND r.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
    else if (period === 'month') dateFilter = `AND r.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
    else if (period === 'year') dateFilter = `AND r.created_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)`;

    const destFilter = destinationId ? `AND r.destination_id = :destinationId` : '';
    const replacements = destinationId ? { destinationId } : {};

    const [stats] = await mysqlSequelize.query(
      `SELECT
         COUNT(*) as total_reservations,
         SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN r.status = 'no_show' THEN 1 ELSE 0 END) as no_shows,
         SUM(CASE WHEN r.status LIKE 'cancelled%' THEN 1 ELSE 0 END) as cancelled,
         SUM(CASE WHEN r.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
         ROUND(AVG(r.party_size), 1) as avg_party_size
       FROM reservations r
       WHERE 1=1 ${destFilter} ${dateFilter}`,
      { replacements, type: QueryTypes.SELECT }
    );

    const topPois = await mysqlSequelize.query(
      `SELECT r.poi_id, p.name as poi_name, COUNT(*) as reservation_count
       FROM reservations r
       JOIN POI p ON p.id = r.poi_id
       WHERE 1=1 ${destFilter} ${dateFilter}
       GROUP BY r.poi_id, p.name
       ORDER BY reservation_count DESC
       LIMIT 10`,
      { replacements, type: QueryTypes.SELECT }
    );

    const [blacklisted] = await mysqlSequelize.query(
      `SELECT COUNT(*) as count FROM guest_profiles WHERE is_blacklisted = TRUE${destinationId ? ' AND destination_id = :destinationId' : ''}`,
      { replacements, type: QueryTypes.SELECT }
    );

    const total = stats.total_reservations || 0;
    const noShowRate = total > 0 ? ((stats.no_shows || 0) / total * 100).toFixed(1) : '0.0';

    res.json({
      success: true,
      data: {
        ...stats,
        no_show_rate: parseFloat(noShowRate),
        top_pois: topPois,
        blacklisted_guests_count: blacklisted.count || 0,
        period,
      },
    });
  } catch (error) {
    logger.error('[AdminPortal] Reservation stats error:', error);
    res.status(500).json({ success: false, error: { code: 'RESERVATION_STATS_ERROR', message: error.message } });
  }
});

// --- GET /reservations/calendar/:poiId — Calendar overview (month view) ---
router.get('/reservations/calendar/:poiId', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const poiId = parseInt(req.params.poiId);
    const { month } = req.query; // format: 2026-03

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_MONTH', message: 'month query required (format: YYYY-MM)' } });
    }

    const slots = await mysqlSequelize.query(
      `SELECT rs.*,
              (rs.total_seats - rs.reserved_seats) as available_seats,
              ROUND(rs.reserved_seats / GREATEST(rs.total_seats, 1) * 100) as occupancy_pct,
              (SELECT COUNT(*) FROM reservations r WHERE r.slot_id = rs.id AND r.status NOT IN ('expired', 'cancelled_by_guest', 'cancelled_by_venue', 'cancelled_by_admin')) as active_reservations
       FROM reservation_slots rs
       WHERE rs.poi_id = :poiId
         AND rs.slot_date >= :monthStart
         AND rs.slot_date < DATE_ADD(:monthStart, INTERVAL 1 MONTH)
       ORDER BY rs.slot_date, rs.slot_time_start`,
      {
        replacements: { poiId, monthStart: `${month}-01` },
        type: QueryTypes.SELECT,
      }
    );

    res.json({ success: true, data: { poiId, month, slots } });
  } catch (error) {
    logger.error('[AdminPortal] Reservation calendar error:', error);
    res.status(500).json({ success: false, error: { code: 'CALENDAR_ERROR', message: error.message } });
  }
});

// --- GET /reservations/slots/:poiId — Slot list with availability ---
router.get('/reservations/slots/:poiId', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const poiId = parseInt(req.params.poiId);
    const { dateFrom, dateTo } = req.query;

    let sql = `SELECT rs.*,
                      (rs.total_seats - rs.reserved_seats) as available_seats
               FROM reservation_slots rs
               WHERE rs.poi_id = :poiId`;
    const replacements = { poiId };

    if (dateFrom) { sql += ` AND rs.slot_date >= :dateFrom`; replacements.dateFrom = dateFrom; }
    if (dateTo) { sql += ` AND rs.slot_date <= :dateTo`; replacements.dateTo = dateTo; }
    sql += ` ORDER BY rs.slot_date, rs.slot_time_start`;

    const slots = await mysqlSequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    res.json({ success: true, data: slots, count: slots.length });
  } catch (error) {
    logger.error('[AdminPortal] List reservation slots error:', error);
    res.status(500).json({ success: false, error: { code: 'LIST_SLOTS_ERROR', message: error.message } });
  }
});

// --- POST /reservations/slots/:poiId — Create reservation slots (bulk) ---
router.post('/reservations/slots/:poiId', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), async (req, res) => {
  try {
    const poiId = parseInt(req.params.poiId);
    const destinationId = req.destScope?.[0] || parseInt(req.body.destination_id) || null;
    if (!destinationId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'Destination required' } });
    }

    const { slots } = req.body;
    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_SLOTS', message: 'slots array required in body' } });
    }

    let created = 0;
    const errors = [];

    for (const slot of slots) {
      const { date, time_start, time_end, total_seats, total_tables } = slot;
      if (!date || !time_start || !time_end || !total_seats) {
        errors.push({ slot, error: 'Missing required fields: date, time_start, time_end, total_seats' });
        continue;
      }

      // Check overlap
      const [existing] = await mysqlSequelize.query(
        `SELECT id FROM reservation_slots
         WHERE poi_id = :poiId AND slot_date = :date
           AND slot_time_start < :timeEnd AND slot_time_end > :timeStart`,
        { replacements: { poiId, date, timeStart: time_start, timeEnd: time_end }, type: QueryTypes.SELECT }
      );

      if (existing) {
        errors.push({ slot, error: 'Overlaps with existing slot' });
        continue;
      }

      await mysqlSequelize.query(
        `INSERT INTO reservation_slots
         (poi_id, destination_id, slot_date, slot_time_start, slot_time_end,
          total_seats, total_tables, is_available, created_at)
         VALUES
         (:poiId, :destinationId, :date, :timeStart, :timeEnd,
          :totalSeats, :totalTables, TRUE, NOW())`,
        {
          replacements: {
            poiId, destinationId, date,
            timeStart: time_start, timeEnd: time_end,
            totalSeats: parseInt(total_seats),
            totalTables: total_tables ? parseInt(total_tables) : null,
          },
          type: QueryTypes.INSERT,
        }
      );
      created++;
    }

    logger.info(`[AdminPortal] Created ${created} reservation slots for POI ${poiId} by ${req.adminUser.email}`);
    res.status(201).json({ success: true, data: { created, errors: errors.length, errorDetails: errors } });
  } catch (error) {
    logger.error('[AdminPortal] Create reservation slots error:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_SLOTS_ERROR', message: error.message } });
  }
});

// --- PUT /reservations/slots/:id — Update reservation slot ---
router.put('/reservations/slots/:id', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), async (req, res) => {
  try {
    const slotId = parseInt(req.params.id);
    const { total_seats, total_tables, is_available } = req.body;

    // Check current state
    const [slot] = await mysqlSequelize.query(
      `SELECT * FROM reservation_slots WHERE id = :slotId`,
      { replacements: { slotId }, type: QueryTypes.SELECT }
    );

    if (!slot) {
      return res.status(404).json({ success: false, error: { code: 'SLOT_NOT_FOUND', message: 'Slot not found' } });
    }

    // Cannot lower seats below reserved
    if (total_seats !== undefined && parseInt(total_seats) < slot.reserved_seats) {
      return res.status(409).json({
        success: false,
        error: { code: 'SEATS_BELOW_RESERVED', message: `Cannot set total_seats (${total_seats}) below reserved_seats (${slot.reserved_seats})` },
      });
    }

    const sets = [];
    const replacements = { slotId };

    if (total_seats !== undefined) { sets.push('total_seats = :totalSeats'); replacements.totalSeats = parseInt(total_seats); }
    if (total_tables !== undefined) { sets.push('total_tables = :totalTables'); replacements.totalTables = parseInt(total_tables); }
    if (is_available !== undefined) { sets.push('is_available = :isAvailable'); replacements.isAvailable = is_available ? 1 : 0; }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_FIELDS', message: 'No fields to update' } });
    }

    sets.push('updated_at = NOW()');
    await mysqlSequelize.query(
      `UPDATE reservation_slots SET ${sets.join(', ')} WHERE id = :slotId`,
      { replacements, type: QueryTypes.UPDATE }
    );

    logger.info(`[AdminPortal] Updated reservation slot ${slotId} by ${req.adminUser.email}`);
    res.json({ success: true, data: { message: 'Slot updated' } });
  } catch (error) {
    logger.error('[AdminPortal] Update reservation slot error:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_SLOT_ERROR', message: error.message } });
  }
});

// --- GET /reservations/:id — Reservation detail ---
router.get('/reservations/:id', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const reservationId = parseInt(req.params.id);
    const destinationId = req.destScope?.[0] || null;

    let sql = `SELECT r.*, rs.slot_date, rs.slot_time_start, rs.slot_time_end,
                      p.name as poi_name, p.address as poi_address,
                      gp.first_name as guest_first_name, gp.last_name as guest_last_name,
                      gp.no_show_count, gp.total_reservations as guest_total_reservations,
                      gp.is_blacklisted
               FROM reservations r
               JOIN reservation_slots rs ON rs.id = r.slot_id
               JOIN POI p ON p.id = r.poi_id
               LEFT JOIN guest_profiles gp ON gp.id = r.guest_profile_id
               WHERE r.id = :reservationId`;
    const replacements = { reservationId };

    if (destinationId) { sql += ` AND r.destination_id = :destinationId`; replacements.destinationId = destinationId; }

    const [reservation] = await mysqlSequelize.query(sql, { replacements, type: QueryTypes.SELECT });

    if (!reservation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reservation not found' } });
    }

    res.json({ success: true, data: reservation });
  } catch (error) {
    logger.error('[AdminPortal] Reservation detail error:', error);
    res.status(500).json({ success: false, error: { code: 'RESERVATION_DETAIL_ERROR', message: error.message } });
  }
});

// --- PUT /reservations/:id/status — Update reservation status ---
router.put('/reservations/:id/status', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), async (req, res) => {
  try {
    const reservationId = parseInt(req.params.id);
    const { status } = req.body;

    const allowedStatuses = ['confirmed', 'cancelled_by_venue'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: `status must be one of: ${allowedStatuses.join(', ')}` },
      });
    }

    if (status === 'confirmed') {
      const result = await reservationServiceModule.confirmReservation(reservationId);
      logger.info(`[AdminPortal] Reservation ${reservationId} confirmed by ${req.adminUser.email}`);
      res.json({ success: true, data: result });
    } else if (status === 'cancelled_by_venue') {
      const result = await reservationServiceModule.cancelReservation(reservationId, 'venue', req.body.reason || null);
      logger.info(`[AdminPortal] Reservation ${reservationId} cancelled (venue) by ${req.adminUser.email}`);
      res.json({ success: true, data: result });
    }
  } catch (error) {
    if (error.message === 'RESERVATION_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reservation not found' } });
    }
    logger.error('[AdminPortal] Update reservation status error:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_STATUS_ERROR', message: error.message } });
  }
});

// --- POST /reservations/:id/no-show — Mark no-show ---
router.post('/reservations/:id/no-show', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), async (req, res) => {
  try {
    const reservationId = parseInt(req.params.id);
    const result = await reservationServiceModule.markNoShow(reservationId);
    logger.info(`[AdminPortal] Reservation ${reservationId} marked no-show by ${req.adminUser.email}, blacklisted=${result.blacklisted}`);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.message === 'RESERVATION_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reservation not found' } });
    }
    logger.error('[AdminPortal] No-show error:', error);
    res.status(500).json({ success: false, error: { code: 'NO_SHOW_ERROR', message: error.message } });
  }
});

// --- POST /reservations/:id/complete — Mark completed ---
router.post('/reservations/:id/complete', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), async (req, res) => {
  try {
    const reservationId = parseInt(req.params.id);
    const result = await reservationServiceModule.markCompleted(reservationId);
    logger.info(`[AdminPortal] Reservation ${reservationId} completed by ${req.adminUser.email}`);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.message === 'RESERVATION_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reservation not found' } });
    }
    logger.error('[AdminPortal] Complete reservation error:', error);
    res.status(500).json({ success: false, error: { code: 'COMPLETE_ERROR', message: error.message } });
  }
});

// --- GET /guests — List guest profiles ---
router.get('/guests', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || null;
    const { page = 1, limit = 50, search, isBlacklisted } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = `SELECT * FROM guest_profiles WHERE 1=1`;
    let countSql = `SELECT COUNT(*) as total FROM guest_profiles WHERE 1=1`;
    const replacements = {};

    if (destinationId) {
      sql += ` AND destination_id = :destinationId`;
      countSql += ` AND destination_id = :destinationId`;
      replacements.destinationId = destinationId;
    }
    if (search) {
      sql += ` AND (email LIKE :search OR first_name LIKE :search OR last_name LIKE :search)`;
      countSql += ` AND (email LIKE :search OR first_name LIKE :search OR last_name LIKE :search)`;
      replacements.search = `%${search}%`;
    }
    if (isBlacklisted !== undefined) {
      sql += ` AND is_blacklisted = :isBlacklisted`;
      countSql += ` AND is_blacklisted = :isBlacklisted`;
      replacements.isBlacklisted = isBlacklisted === 'true' ? 1 : 0;
    }

    sql += ` ORDER BY created_at DESC LIMIT :limit OFFSET :offset`;
    replacements.limit = parseInt(limit);
    replacements.offset = offset;

    const [guests, [countResult]] = await Promise.all([
      mysqlSequelize.query(sql, { replacements, type: QueryTypes.SELECT }),
      mysqlSequelize.query(countSql, { replacements, type: QueryTypes.SELECT }),
    ]);

    res.json({ success: true, data: guests, total: countResult.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    logger.error('[AdminPortal] List guests error:', error);
    res.status(500).json({ success: false, error: { code: 'LIST_GUESTS_ERROR', message: error.message } });
  }
});

// --- GET /guests/:id — Guest profile detail + reservation history ---
router.get('/guests/:id', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const guestId = parseInt(req.params.id);
    const destinationId = req.destScope?.[0] || null;

    let sql = `SELECT * FROM guest_profiles WHERE id = :guestId`;
    const replacements = { guestId };
    if (destinationId) { sql += ` AND destination_id = :destinationId`; replacements.destinationId = destinationId; }

    const [profile] = await mysqlSequelize.query(sql, { replacements, type: QueryTypes.SELECT });

    if (!profile) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Guest profile not found' } });
    }

    // Parse JSON fields
    if (typeof profile.dietary_preferences === 'string') {
      try { profile.dietary_preferences = JSON.parse(profile.dietary_preferences); } catch { /* keep */ }
    }
    if (typeof profile.allergies === 'string') {
      try { profile.allergies = JSON.parse(profile.allergies); } catch { /* keep */ }
    }

    // Get reservation history
    const history = await mysqlSequelize.query(
      `SELECT r.id, r.reservation_number, r.status, r.party_size, r.created_at,
              rs.slot_date, rs.slot_time_start,
              p.name as poi_name
       FROM reservations r
       JOIN reservation_slots rs ON rs.id = r.slot_id
       JOIN POI p ON p.id = r.poi_id
       WHERE r.guest_profile_id = :guestId
       ORDER BY r.created_at DESC
       LIMIT 20`,
      { replacements: { guestId }, type: QueryTypes.SELECT }
    );

    res.json({ success: true, data: { ...profile, reservations: history } });
  } catch (error) {
    logger.error('[AdminPortal] Guest detail error:', error);
    res.status(500).json({ success: false, error: { code: 'GUEST_DETAIL_ERROR', message: error.message } });
  }
});

// --- PUT /guests/:id/blacklist — Manual blacklist toggle ---
router.put('/guests/:id/blacklist', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), async (req, res) => {
  try {
    const guestId = parseInt(req.params.id);
    const { is_blacklisted, reason } = req.body;

    if (is_blacklisted === undefined) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELD', message: 'is_blacklisted required' } });
    }

    const [existing] = await mysqlSequelize.query(
      `SELECT id, email FROM guest_profiles WHERE id = :guestId`,
      { replacements: { guestId }, type: QueryTypes.SELECT }
    );

    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Guest profile not found' } });
    }

    await mysqlSequelize.query(
      `UPDATE guest_profiles
       SET is_blacklisted = :isBlacklisted,
           blacklist_reason = :reason,
           updated_at = NOW()
       WHERE id = :guestId`,
      {
        replacements: {
          guestId,
          isBlacklisted: is_blacklisted ? 1 : 0,
          reason: is_blacklisted ? (reason || `manual by ${req.adminUser.email}`) : null,
        },
        type: QueryTypes.UPDATE,
      }
    );

    logger.info(`[AdminPortal] Guest ${existing.email} blacklist=${is_blacklisted} by ${req.adminUser.email}`);
    res.json({ success: true, data: { message: is_blacklisted ? 'Guest blacklisted' : 'Guest unblacklisted' } });
  } catch (error) {
    logger.error('[AdminPortal] Blacklist toggle error:', error);
    res.status(500).json({ success: false, error: { code: 'BLACKLIST_ERROR', message: error.message } });
  }
});

// ============================================================================
// COMMERCE DASHBOARD ENDPOINTS (Fase III-E) — 10 routes
// RBAC: platform_admin = alle destinations, poi_owner = eigen destination
// content_editor + content_reviewer = GEEN toegang
// ============================================================================

function commerceAuth(req, res, next) {
  const role = req.adminUser?.role;
  if (!role || !['platform_admin', 'poi_owner'].includes(role)) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Commerce access requires platform_admin or poi_owner role' } });
  }
  next();
}

function getCommerceDestinationId(req) {
  const destScope = req.destScope;
  const queryDest = req.query.destinationId || req.query.destination_id;
  if (req.adminUser?.role === 'platform_admin') {
    return queryDest ? Number(queryDest) : null;
  }
  if (destScope && destScope.length > 0) {
    const requested = queryDest ? Number(queryDest) : destScope[0];
    return destScope.includes(requested) ? requested : destScope[0];
  }
  return queryDest ? Number(queryDest) : null;
}

function getDefaultDateRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const to = now.toISOString().split('T')[0];
  return { from, to };
}

// E.1 — Revenue Dashboard
router.get('/commerce/dashboard', adminAuth('reviewer'), destinationScope, commerceAuth, async (req, res) => {
  try {
    const destinationId = getCommerceDestinationId(req);
    if (!destinationId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId is required' } });
    }
    const defaults = getDefaultDateRange();
    const from = req.query.from || defaults.from;
    const to = req.query.to || defaults.to;
    const data = await commerceService.getDashboard(destinationId, from, `${to} 23:59:59`);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('[AdminPortal] Commerce dashboard error:', error);
    res.status(500).json({ success: false, error: { code: 'DASHBOARD_ERROR', message: error.message } });
  }
});

// E.2a — Daily Financial Report
router.get('/commerce/reports/daily', adminAuth('reviewer'), destinationScope, commerceAuth, async (req, res) => {
  try {
    const destinationId = getCommerceDestinationId(req);
    if (!destinationId) return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId is required' } });
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ success: false, error: { code: 'MISSING_DATES', message: 'from and to are required' } });
    const daysDiff = (new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24);
    if (daysDiff > 90) return res.status(400).json({ success: false, error: { code: 'RANGE_TOO_LARGE', message: 'Max range is 90 days' } });
    const data = await commerceService.getDailyReport(destinationId, from, `${to} 23:59:59`);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('[AdminPortal] Commerce daily report error:', error);
    res.status(500).json({ success: false, error: { code: 'REPORT_ERROR', message: error.message } });
  }
});

// E.2b — Weekly Financial Report
router.get('/commerce/reports/weekly', adminAuth('reviewer'), destinationScope, commerceAuth, async (req, res) => {
  try {
    const destinationId = getCommerceDestinationId(req);
    if (!destinationId) return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId is required' } });
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ success: false, error: { code: 'MISSING_DATES', message: 'from and to are required' } });
    const daysDiff = (new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) return res.status(400).json({ success: false, error: { code: 'RANGE_TOO_LARGE', message: 'Max range is 1 year' } });
    const data = await commerceService.getWeeklyReport(destinationId, from, `${to} 23:59:59`);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('[AdminPortal] Commerce weekly report error:', error);
    res.status(500).json({ success: false, error: { code: 'REPORT_ERROR', message: error.message } });
  }
});

// E.2c — Monthly Financial Report
router.get('/commerce/reports/monthly', adminAuth('reviewer'), destinationScope, commerceAuth, async (req, res) => {
  try {
    const destinationId = getCommerceDestinationId(req);
    if (!destinationId) return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId is required' } });
    const year = Number(req.query.year) || new Date().getFullYear();
    if (year < 2020 || year > 2100) return res.status(400).json({ success: false, error: { code: 'INVALID_YEAR', message: 'Year must be between 2020-2100' } });
    const data = await commerceService.getMonthlyReport(destinationId, year);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('[AdminPortal] Commerce monthly report error:', error);
    res.status(500).json({ success: false, error: { code: 'REPORT_ERROR', message: error.message } });
  }
});

// E.3 — Reconciliation Report
router.get('/commerce/reports/reconciliation', adminAuth('reviewer'), destinationScope, commerceAuth, async (req, res) => {
  try {
    const destinationId = getCommerceDestinationId(req);
    if (!destinationId) return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId is required' } });
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, error: { code: 'MISSING_DATE', message: 'date is required' } });
    const data = await commerceService.getReconciliationReport(destinationId, date);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('[AdminPortal] Commerce reconciliation error:', error);
    res.status(500).json({ success: false, error: { code: 'RECONCILIATION_ERROR', message: error.message } });
  }
});

// E.4a — CSV Export Transactions
router.get('/commerce/export/transactions', adminAuth('reviewer'), destinationScope, commerceAuth, async (req, res) => {
  try {
    const destinationId = getCommerceDestinationId(req);
    if (!destinationId) return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId is required' } });
    const defaults = getDefaultDateRange();
    const from = req.query.from || defaults.from;
    const to = req.query.to || defaults.to;
    const { csv, filename, row_count } = await commerceService.exportTransactionsCSV(destinationId, from, `${to} 23:59:59`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Row-Count', row_count);
    res.send(csv);
  } catch (error) {
    logger.error('[AdminPortal] Commerce export transactions error:', error);
    res.status(500).json({ success: false, error: { code: 'EXPORT_ERROR', message: error.message } });
  }
});

// E.4b — CSV Export Reservations
router.get('/commerce/export/reservations', adminAuth('reviewer'), destinationScope, commerceAuth, async (req, res) => {
  try {
    const destinationId = getCommerceDestinationId(req);
    if (!destinationId) return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId is required' } });
    const defaults = getDefaultDateRange();
    const from = req.query.from || defaults.from;
    const to = req.query.to || defaults.to;
    const { csv, filename, row_count } = await commerceService.exportReservationsCSV(destinationId, from, `${to} 23:59:59`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Row-Count', row_count);
    res.send(csv);
  } catch (error) {
    logger.error('[AdminPortal] Commerce export reservations error:', error);
    res.status(500).json({ success: false, error: { code: 'EXPORT_ERROR', message: error.message } });
  }
});

// E.4c — CSV Export Ticket Orders
router.get('/commerce/export/tickets', adminAuth('reviewer'), destinationScope, commerceAuth, async (req, res) => {
  try {
    const destinationId = getCommerceDestinationId(req);
    if (!destinationId) return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId is required' } });
    const defaults = getDefaultDateRange();
    const from = req.query.from || defaults.from;
    const to = req.query.to || defaults.to;
    const { csv, filename, row_count } = await commerceService.exportTicketOrdersCSV(destinationId, from, `${to} 23:59:59`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Row-Count', row_count);
    res.send(csv);
  } catch (error) {
    logger.error('[AdminPortal] Commerce export tickets error:', error);
    res.status(500).json({ success: false, error: { code: 'EXPORT_ERROR', message: error.message } });
  }
});

// E.5 — Fraud / Anomaly Alerts
router.get('/commerce/alerts', adminAuth('reviewer'), destinationScope, commerceAuth, async (req, res) => {
  try {
    const destinationId = getCommerceDestinationId(req);
    if (!destinationId) return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId is required' } });
    const data = await commerceService.getAlerts(destinationId);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('[AdminPortal] Commerce alerts error:', error);
    res.status(500).json({ success: false, error: { code: 'ALERTS_ERROR', message: error.message } });
  }
});

// E.6 — Top Performing POIs
router.get('/commerce/top-pois', adminAuth('reviewer'), destinationScope, commerceAuth, async (req, res) => {
  try {
    const destinationId = getCommerceDestinationId(req);
    if (!destinationId) return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId is required' } });
    const defaults = getDefaultDateRange();
    const from = req.query.from || defaults.from;
    const to = req.query.to || defaults.to;
    const metric = req.query.metric || 'revenue';
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    if (!['revenue', 'tickets_sold', 'reservations', 'occupancy'].includes(metric)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_METRIC', message: 'metric must be revenue, tickets_sold, reservations, or occupancy' } });
    }
    const data = await commerceService.getTopPOIs(destinationId, from, `${to} 23:59:59`, metric, limit);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('[AdminPortal] Commerce top POIs error:', error);
    res.status(500).json({ success: false, error: { code: 'TOP_POIS_ERROR', message: error.message } });
  }
});

// ============================================================
// PARTNER MANAGEMENT ENDPOINTS (Fase IV — Blok A) — 7 routes
// ============================================================

/**
 * GET /partners — List partners with pagination, search, status filter
 */
router.get('/partners', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.headers['x-destination-id']) || parseInt(req.query.destinationId) || null;
    if (!destinationId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId is required' } });
    }
    const result = await partnerService.getPartners(destinationId, {
      status: req.query.status,
      search: req.query.search,
      page: parseInt(req.query.page) || 1,
      limit: Math.min(parseInt(req.query.limit) || 25, 100)
    });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[AdminPortal] Partners list error:', error);
    res.status(500).json({ success: false, error: { code: 'PARTNERS_LIST_ERROR', message: error.message } });
  }
});

/**
 * GET /partners/stats — Partner dashboard KPIs
 */
router.get('/partners/stats', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.headers['x-destination-id']) || parseInt(req.query.destinationId) || null;
    const stats = await partnerService.getPartnerStats(destinationId);
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('[AdminPortal] Partner stats error:', error);
    res.status(500).json({ success: false, error: { code: 'PARTNER_STATS_ERROR', message: error.message } });
  }
});

/**
 * GET /partners/:id — Partner detail with POIs + onboarding
 */
router.get('/partners/:id', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.headers['x-destination-id']) || parseInt(req.query.destinationId) || null;
    if (!destinationId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId is required' } });
    }
    const partner = await partnerService.getPartnerById(parseInt(req.params.id), destinationId);
    if (!partner) {
      return res.status(404).json({ success: false, error: { code: 'PARTNER_NOT_FOUND', message: 'Partner not found' } });
    }
    res.json({ success: true, data: partner });
  } catch (error) {
    logger.error('[AdminPortal] Partner detail error:', error);
    res.status(500).json({ success: false, error: { code: 'PARTNER_DETAIL_ERROR', message: error.message } });
  }
});

/**
 * POST /partners — Create new partner + onboarding steps
 */
router.post('/partners', adminAuth('editor'), destinationScope, writeAccess(['platform_admin']), async (req, res) => {
  try {
    const { destinationId, companyName, contactName, contactEmail, contactPhone,
            iban, kvkNumber, vatNumber, commissionRate, commissionType, poiId, notes } = req.body;

    if (!destinationId || !companyName || !contactName || !contactEmail) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'destinationId, companyName, contactName, contactEmail are required' } });
    }

    const partner = await partnerService.createPartner({
      destinationId, companyName, contactName, contactEmail, contactPhone,
      iban, kvkNumber, vatNumber, commissionRate, commissionType, poiId, notes
    });

    await saveAuditLog({
      action: 'partner_created',
      adminId: req.adminUser?.id,
      adminEmail: req.adminUser?.email,
      details: `Created partner: ${companyName} (destination ${destinationId})`,
      entityType: 'partner',
      entityId: partner.id
    });

    res.status(201).json({ success: true, data: partner });
  } catch (error) {
    logger.error('[AdminPortal] Partner create error:', error);
    const status = error.message.includes('Invalid') ? 400 : 500;
    res.status(status).json({ success: false, error: { code: 'PARTNER_CREATE_ERROR', message: error.message } });
  }
});

/**
 * PUT /partners/:id — Update partner details
 */
router.put('/partners/:id', adminAuth('editor'), destinationScope, writeAccess(['platform_admin']), async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.body.destinationId) || null;
    if (!destinationId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId is required' } });
    }

    const partner = await partnerService.updatePartner(parseInt(req.params.id), destinationId, req.body);
    if (!partner) {
      return res.status(404).json({ success: false, error: { code: 'PARTNER_NOT_FOUND', message: 'Partner not found' } });
    }

    await saveAuditLog({
      action: 'partner_updated',
      adminId: req.adminUser?.id,
      adminEmail: req.adminUser?.email,
      details: `Updated partner: ${partner.company_name} (ID ${req.params.id})`,
      entityType: 'partner',
      entityId: parseInt(req.params.id)
    });

    res.json({ success: true, data: partner });
  } catch (error) {
    logger.error('[AdminPortal] Partner update error:', error);
    const status = error.message.includes('Invalid') || error.message.includes('No fields') ? 400 : 500;
    res.status(status).json({ success: false, error: { code: 'PARTNER_UPDATE_ERROR', message: error.message } });
  }
});

/**
 * PUT /partners/:id/status — Change contract status with transition validation
 */
router.put('/partners/:id/status', adminAuth('editor'), destinationScope, writeAccess(['platform_admin']), async (req, res) => {
  try {
    const { status: newStatus, destinationId: bodyDestId } = req.body;
    const destinationId = req.destScope?.[0] || parseInt(bodyDestId) || null;

    if (!destinationId || !newStatus) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'destinationId and status are required' } });
    }

    const partner = await partnerService.updateContractStatus(
      parseInt(req.params.id),
      destinationId,
      newStatus,
      req.adminUser?.email
    );

    await saveAuditLog({
      action: 'partner_status_changed',
      adminId: req.adminUser?.id,
      adminEmail: req.adminUser?.email,
      details: `Partner ${partner.company_name}: status → ${newStatus}`,
      entityType: 'partner',
      entityId: parseInt(req.params.id),
      metadata: { newStatus }
    });

    res.json({ success: true, data: partner });
  } catch (error) {
    logger.error('[AdminPortal] Partner status change error:', error);
    const status = error.message.includes('Invalid transition') || error.message.includes('not found') ? 400 : 500;
    res.status(status).json({ success: false, error: { code: 'PARTNER_STATUS_ERROR', message: error.message } });
  }
});

/**
 * GET /partners/:id/transactions — Partner transaction history (delegates to intermediaryService)
 */
router.get('/partners/:id/transactions', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.headers['x-destination-id']) || parseInt(req.query.destinationId) || null;
    const result = await intermediaryService.getPartnerTransactions(parseInt(req.params.id), destinationId, {
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      search: req.query.search,
      page: parseInt(req.query.page) || 1,
      limit: Math.min(parseInt(req.query.limit) || 25, 100)
    });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[AdminPortal] Partner transactions error:', error);
    res.status(500).json({ success: false, error: { code: 'PARTNER_TRANSACTIONS_ERROR', message: error.message } });
  }
});

// ============================================================================
// INTERMEDIARY ENDPOINTS (Fase IV Blok B)
// ============================================================================

/**
 * GET /intermediary — List intermediary transactions (paginated, filtered)
 */
router.get('/intermediary', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.headers['x-destination-id']) || parseInt(req.query.destinationId) || null;
    const result = await intermediaryService.getTransactions(destinationId, {
      status: req.query.status,
      partnerId: req.query.partnerId ? parseInt(req.query.partnerId) : undefined,
      poiId: req.query.poiId ? parseInt(req.query.poiId) : undefined,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      search: req.query.search,
      page: parseInt(req.query.page) || 1,
      limit: Math.min(parseInt(req.query.limit) || 25, 100)
    });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[AdminPortal] Intermediary list error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERMEDIARY_LIST_ERROR', message: error.message } });
  }
});

/**
 * GET /intermediary/stats — Intermediary KPI dashboard
 */
router.get('/intermediary/stats', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.headers['x-destination-id']) || parseInt(req.query.destinationId) || null;
    const stats = await intermediaryService.getTransactionStats(
      destinationId, req.query.dateFrom, req.query.dateTo
    );
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('[AdminPortal] Intermediary stats error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERMEDIARY_STATS_ERROR', message: error.message } });
  }
});

/**
 * GET /intermediary/funnel — Conversion funnel data (cumulative stage counts)
 */
router.get('/intermediary/funnel', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.headers['x-destination-id']) || parseInt(req.query.destinationId) || null;
    const stats = await intermediaryService.getTransactionStats(
      destinationId, req.query.dateFrom, req.query.dateTo
    );
    const total = stats.total_transactions || 0;
    const cancelled = (stats.cancelled || 0) + (stats.expired || 0);
    const reviewed = stats.reviewed || 0;
    const reminded = (stats.reminded || 0) + reviewed;
    const shared = (stats.shared || 0) + reminded;
    const confirmed = (stats.confirmed || 0) + shared;
    const consented = (stats.consented || 0) + confirmed;

    const funnel = [
      { stage: 'voorstel', count: total, label: 'Voorstel' },
      { stage: 'toestemming', count: consented, label: 'Toestemming' },
      { stage: 'bevestiging', count: confirmed, label: 'Bevestiging' },
      { stage: 'delen', count: shared, label: 'Gedeeld' },
      { stage: 'review', count: reviewed, label: 'Review' }
    ];
    res.json({ success: true, data: { funnel, conversion_rate: stats.conversion_rate, total, cancelled } });
  } catch (error) {
    logger.error('[AdminPortal] Intermediary funnel error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERMEDIARY_FUNNEL_ERROR', message: error.message } });
  }
});

/**
 * GET /intermediary/export/transactions — CSV export of intermediary transactions
 */
router.get('/intermediary/export/transactions', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.headers['x-destination-id']) || parseInt(req.query.destinationId) || null;
    const result = await intermediaryService.getTransactions(destinationId, {
      status: req.query.status || undefined,
      dateFrom: req.query.dateFrom || undefined,
      dateTo: req.query.dateTo || undefined,
      page: 1,
      limit: 10000
    });
    const headers = ['Transactie #', 'Status', 'Partner', 'POI', 'Diensttype', 'Gastnaam', 'Bedrag', 'Commissie', 'Partner uitbetaling', 'Activiteitdatum', 'Aangemaakt'];
    const rows = (result.items || []).map(t => [
      t.transaction_number || '', t.status || '', t.partner_name || '', t.poi_name || '',
      t.service_type || '', t.guest_name || '',
      ((t.amount_cents || 0) / 100).toFixed(2),
      ((t.commission_cents || 0) / 100).toFixed(2),
      ((t.partner_amount_cents || 0) / 100).toFixed(2),
      t.activity_date || '', t.created_at || ''
    ]);
    const bom = '\uFEFF';
    const csv = bom + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const dateFrom = req.query.dateFrom || 'all';
    const dateTo = req.query.dateTo || 'all';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="intermediary_transactions_${dateFrom}_${dateTo}.csv"`);
    res.setHeader('X-Row-Count', String(rows.length));
    res.send(csv);
  } catch (error) {
    logger.error('[AdminPortal] Intermediary export error:', error);
    res.status(500).json({ success: false, error: { code: 'EXPORT_ERROR', message: error.message } });
  }
});

/**
 * GET /intermediary/:id — Intermediary transaction detail
 */
router.get('/intermediary/:id', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.headers['x-destination-id']) || parseInt(req.query.destinationId) || null;
    const tx = await intermediaryService.getTransactionById(parseInt(req.params.id), destinationId);
    if (!tx) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
    }
    res.json({ success: true, data: tx });
  } catch (error) {
    logger.error('[AdminPortal] Intermediary detail error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERMEDIARY_DETAIL_ERROR', message: error.message } });
  }
});

/**
 * POST /intermediary — Create intermediary transaction (voorstel)
 */
router.post('/intermediary', adminAuth('editor'), destinationScope, writeAccess(['platform_admin']), async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.body.destinationId) || parseInt(req.headers['x-destination-id']) || parseInt(req.query.destinationId) || null;
    if (!destinationId) return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'Destination required (set destinationId in body or X-Destination-ID header)' } });
    const tx = await intermediaryService.createTransaction({ ...req.body, destinationId });
    await saveAuditLog(req, 'intermediary_created', {
      entity_type: 'intermediary_transaction',
      entity_id: tx.id,
      transaction_number: tx.transaction_number,
      partner_id: tx.partner_id,
      amount_cents: tx.amount_cents
    });
    res.json({ success: true, data: tx });
  } catch (error) {
    logger.error('[AdminPortal] Intermediary create error:', error);
    res.status(400).json({ success: false, error: { code: 'INTERMEDIARY_CREATE_ERROR', message: error.message } });
  }
});

/**
 * PUT /intermediary/:id/consent — Record tourist consent (toestemming)
 */
router.put('/intermediary/:id/consent', adminAuth('editor'), destinationScope, writeAccess(['platform_admin']), async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.body.destinationId) || parseInt(req.headers['x-destination-id']) || parseInt(req.query.destinationId) || null;
    const tx = await intermediaryService.giveConsent(parseInt(req.params.id), destinationId);
    await saveAuditLog(req, 'intermediary_consented', {
      entity_type: 'intermediary_transaction',
      entity_id: tx.id,
      transaction_number: tx.transaction_number
    });
    res.json({ success: true, data: tx });
  } catch (error) {
    logger.error('[AdminPortal] Intermediary consent error:', error);
    res.status(400).json({ success: false, error: { code: 'INTERMEDIARY_CONSENT_ERROR', message: error.message } });
  }
});

/**
 * PUT /intermediary/:id/confirm — Confirm transaction + payment (bevestiging)
 */
router.put('/intermediary/:id/confirm', adminAuth('editor'), destinationScope, writeAccess(['platform_admin']), async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.body.destinationId) || parseInt(req.headers['x-destination-id']) || parseInt(req.query.destinationId) || null;
    const tx = await intermediaryService.confirmTransaction(
      parseInt(req.params.id), destinationId, req.body.paymentTransactionId || null
    );
    await saveAuditLog(req, 'intermediary_confirmed', {
      entity_type: 'intermediary_transaction',
      entity_id: tx.id,
      transaction_number: tx.transaction_number,
      payment_transaction_id: req.body.paymentTransactionId
    });
    res.json({ success: true, data: tx });
  } catch (error) {
    logger.error('[AdminPortal] Intermediary confirm error:', error);
    res.status(400).json({ success: false, error: { code: 'INTERMEDIARY_CONFIRM_ERROR', message: error.message } });
  }
});

/**
 * PUT /intermediary/:id/share — Share voucher + generate QR (delen)
 */
router.put('/intermediary/:id/share', adminAuth('editor'), destinationScope, writeAccess(['platform_admin']), async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.body.destinationId) || parseInt(req.headers['x-destination-id']) || parseInt(req.query.destinationId) || null;
    const tx = await intermediaryService.shareVoucher(parseInt(req.params.id), destinationId);
    await saveAuditLog(req, 'intermediary_shared', {
      entity_type: 'intermediary_transaction',
      entity_id: tx.id,
      transaction_number: tx.transaction_number
    });
    res.json({ success: true, data: tx });
  } catch (error) {
    logger.error('[AdminPortal] Intermediary share error:', error);
    res.status(400).json({ success: false, error: { code: 'INTERMEDIARY_SHARE_ERROR', message: error.message } });
  }
});

/**
 * PUT /intermediary/:id/cancel — Cancel transaction
 */
router.put('/intermediary/:id/cancel', adminAuth('editor'), destinationScope, writeAccess(['platform_admin']), async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.body.destinationId) || parseInt(req.headers['x-destination-id']) || parseInt(req.query.destinationId) || null;
    const tx = await intermediaryService.cancelTransaction(
      parseInt(req.params.id), destinationId, req.body.reason
    );
    await saveAuditLog(req, 'intermediary_cancelled', {
      entity_type: 'intermediary_transaction',
      entity_id: tx.id,
      transaction_number: tx.transaction_number,
      reason: req.body.reason
    });
    res.json({ success: true, data: tx });
  } catch (error) {
    logger.error('[AdminPortal] Intermediary cancel error:', error);
    res.status(400).json({ success: false, error: { code: 'INTERMEDIARY_CANCEL_ERROR', message: error.message } });
  }
});

/**
 * GET /intermediary/:id/qr — Get QR code image for transaction
 */
router.get('/intermediary/:id/qr', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.headers['x-destination-id']) || parseInt(req.query.destinationId) || null;
    const tx = await intermediaryService.getTransactionById(parseInt(req.params.id), destinationId);
    if (!tx) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
    }
    if (!tx.qr_code_data) {
      return res.status(400).json({ success: false, error: { code: 'NO_QR', message: 'QR code not yet generated (share voucher first)' } });
    }
    res.json({ success: true, data: { qrCodeData: tx.qr_code_data, qrCodeImage: tx.qr_code_image } });
  } catch (error) {
    logger.error('[AdminPortal] Intermediary QR error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERMEDIARY_QR_ERROR', message: error.message } });
  }
});

// ============================================================================
// FINANCIAL PROCESS ENDPOINTS (Fase IV — Blok C) — 20 routes
// RBAC: platform_admin = alle destinations, poi_owner = eigen destination
// content_editor + content_reviewer = GEEN toegang (commerceAuth)
// ============================================================================

/**
 * GET /financial/dashboard — Financial KPI dashboard
 */
router.get('/financial/dashboard', adminAuth('reviewer'), destinationScope, commerceAuth, async (req, res) => {
  try {
    const destinationId = getCommerceDestinationId(req) || parseInt(req.headers['x-destination-id']) || null;
    const { from, to } = { ...getDefaultDateRange(), ...req.query };
    const data = await financialService.getFinancialDashboard(destinationId, from, to);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('[AdminPortal] Financial dashboard error:', error);
    res.status(500).json({ success: false, error: { code: 'FINANCIAL_DASHBOARD_ERROR', message: error.message } });
  }
});

/**
 * GET /financial/reports/monthly — Monthly financial report
 */
router.get('/financial/reports/monthly', adminAuth('reviewer'), destinationScope, commerceAuth, async (req, res) => {
  try {
    const destinationId = getCommerceDestinationId(req) || parseInt(req.headers['x-destination-id']) || null;
    const year = req.query.year || new Date().getFullYear();
    const data = await financialService.getMonthlyReport(destinationId, year);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('[AdminPortal] Financial monthly report error:', error);
    res.status(500).json({ success: false, error: { code: 'MONTHLY_REPORT_ERROR', message: error.message } });
  }
});

/**
 * GET /financial/settlements — List settlement batches
 */
router.get('/financial/settlements', adminAuth('reviewer'), destinationScope, commerceAuth, async (req, res) => {
  try {
    const destinationId = getCommerceDestinationId(req) || parseInt(req.headers['x-destination-id']) || null;
    const data = await financialService.getSettlementBatches(destinationId, {
      status: req.query.status,
      dateFrom: req.query.from || req.query.dateFrom,
      dateTo: req.query.to || req.query.dateTo,
      page: parseInt(req.query.page) || 1,
      limit: Math.min(parseInt(req.query.limit) || 25, 100)
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error('[AdminPortal] Financial settlements list error:', error);
    res.status(500).json({ success: false, error: { code: 'SETTLEMENTS_LIST_ERROR', message: error.message } });
  }
});

/**
 * GET /financial/settlements/:id — Settlement batch detail
 */
router.get('/financial/settlements/:id', adminAuth('reviewer'), destinationScope, commerceAuth, async (req, res) => {
  try {
    const destinationId = getCommerceDestinationId(req) || parseInt(req.headers['x-destination-id']) || null;
    const batch = await financialService.getSettlementBatchById(parseInt(req.params.id), destinationId);
    if (!batch) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Settlement batch not found' } });
    }
    res.json({ success: true, data: batch });
  } catch (error) {
    logger.error('[AdminPortal] Financial settlement detail error:', error);
    res.status(500).json({ success: false, error: { code: 'SETTLEMENT_DETAIL_ERROR', message: error.message } });
  }
});

/**
 * POST /financial/settlements — Create settlement batch
 */
router.post('/financial/settlements', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), commerceAuth, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.body.destinationId) || parseInt(req.headers['x-destination-id']) || null;
    if (!destinationId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId is required' } });
    }
    const { periodStart, periodEnd } = req.body;
    if (!periodStart || !periodEnd) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_PERIOD', message: 'periodStart and periodEnd are required' } });
    }
    const batch = await financialService.createSettlementBatch(destinationId, periodStart, periodEnd, req.adminUser.email);
    await saveAuditLog(req, 'settlement_created', {
      entity_type: 'settlement_batch',
      entity_id: batch.id,
      batch_number: batch.batch_number,
      period: `${periodStart} — ${periodEnd}`
    });
    res.status(201).json({ success: true, data: batch });
  } catch (error) {
    logger.error('[AdminPortal] Financial create settlement error:', error);
    res.status(400).json({ success: false, error: { code: 'CREATE_SETTLEMENT_ERROR', message: error.message } });
  }
});

/**
 * PUT /financial/settlements/:id/approve — Approve settlement batch
 */
router.put('/financial/settlements/:id/approve', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), commerceAuth, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.headers['x-destination-id']) || null;
    const batch = await financialService.approveSettlementBatch(parseInt(req.params.id), destinationId, req.adminUser.email);
    await saveAuditLog(req, 'settlement_approved', {
      entity_type: 'settlement_batch',
      entity_id: batch.id,
      batch_number: batch.batch_number
    });
    res.json({ success: true, data: batch });
  } catch (error) {
    logger.error('[AdminPortal] Financial approve settlement error:', error);
    res.status(400).json({ success: false, error: { code: 'APPROVE_SETTLEMENT_ERROR', message: error.message } });
  }
});

/**
 * PUT /financial/settlements/:id/process — Start processing settlement
 */
router.put('/financial/settlements/:id/process', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), commerceAuth, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.headers['x-destination-id']) || null;
    const batch = await financialService.startSettlementProcessing(parseInt(req.params.id), destinationId);
    await saveAuditLog(req, 'settlement_processing', {
      entity_type: 'settlement_batch',
      entity_id: batch.id,
      batch_number: batch.batch_number
    });
    res.json({ success: true, data: batch });
  } catch (error) {
    logger.error('[AdminPortal] Financial process settlement error:', error);
    res.status(400).json({ success: false, error: { code: 'PROCESS_SETTLEMENT_ERROR', message: error.message } });
  }
});

/**
 * PUT /financial/settlements/:id/cancel — Cancel settlement batch
 */
router.put('/financial/settlements/:id/cancel', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), commerceAuth, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.headers['x-destination-id']) || null;
    const batch = await financialService.cancelSettlementBatch(parseInt(req.params.id), destinationId, req.body.reason);
    await saveAuditLog(req, 'settlement_cancelled', {
      entity_type: 'settlement_batch',
      entity_id: batch.id,
      batch_number: batch.batch_number,
      reason: req.body.reason
    });
    res.json({ success: true, data: batch });
  } catch (error) {
    logger.error('[AdminPortal] Financial cancel settlement error:', error);
    res.status(400).json({ success: false, error: { code: 'CANCEL_SETTLEMENT_ERROR', message: error.message } });
  }
});

/**
 * GET /financial/payouts — List partner payouts
 */
router.get('/financial/payouts', adminAuth('reviewer'), destinationScope, commerceAuth, async (req, res) => {
  try {
    const destinationId = getCommerceDestinationId(req) || parseInt(req.headers['x-destination-id']) || null;
    const data = await financialService.getPayouts(destinationId, {
      partnerId: req.query.partnerId ? parseInt(req.query.partnerId) : undefined,
      status: req.query.status,
      dateFrom: req.query.from || req.query.dateFrom,
      dateTo: req.query.to || req.query.dateTo,
      page: parseInt(req.query.page) || 1,
      limit: Math.min(parseInt(req.query.limit) || 25, 100)
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error('[AdminPortal] Financial payouts list error:', error);
    res.status(500).json({ success: false, error: { code: 'PAYOUTS_LIST_ERROR', message: error.message } });
  }
});

/**
 * GET /financial/payouts/:id — Payout detail with linked transactions
 */
router.get('/financial/payouts/:id', adminAuth('reviewer'), destinationScope, commerceAuth, async (req, res) => {
  try {
    const destinationId = getCommerceDestinationId(req) || parseInt(req.headers['x-destination-id']) || null;
    const payout = await financialService.getPayoutById(parseInt(req.params.id), destinationId);
    if (!payout) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payout not found' } });
    }
    res.json({ success: true, data: payout });
  } catch (error) {
    logger.error('[AdminPortal] Financial payout detail error:', error);
    res.status(500).json({ success: false, error: { code: 'PAYOUT_DETAIL_ERROR', message: error.message } });
  }
});

/**
 * PUT /financial/payouts/:id/paid — Mark payout as paid
 */
router.put('/financial/payouts/:id/paid', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), commerceAuth, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.headers['x-destination-id']) || null;
    const payout = await financialService.markPayoutPaid(parseInt(req.params.id), destinationId, req.body.paidReference);
    await saveAuditLog(req, 'payout_paid', {
      entity_type: 'partner_payout',
      entity_id: payout.id,
      payout_number: payout.payout_number,
      paid_reference: req.body.paidReference
    });
    res.json({ success: true, data: payout });
  } catch (error) {
    logger.error('[AdminPortal] Financial payout paid error:', error);
    res.status(400).json({ success: false, error: { code: 'PAYOUT_PAID_ERROR', message: error.message } });
  }
});

/**
 * PUT /financial/payouts/:id/failed — Mark payout as failed
 */
router.put('/financial/payouts/:id/failed', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), commerceAuth, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.headers['x-destination-id']) || null;
    const payout = await financialService.markPayoutFailed(parseInt(req.params.id), destinationId, req.body.failureReason);
    await saveAuditLog(req, 'payout_failed', {
      entity_type: 'partner_payout',
      entity_id: payout.id,
      payout_number: payout.payout_number,
      failure_reason: req.body.failureReason
    });
    res.json({ success: true, data: payout });
  } catch (error) {
    logger.error('[AdminPortal] Financial payout failed error:', error);
    res.status(400).json({ success: false, error: { code: 'PAYOUT_FAILED_ERROR', message: error.message } });
  }
});

/**
 * GET /financial/credit-notes — List credit notes
 */
router.get('/financial/credit-notes', adminAuth('reviewer'), destinationScope, commerceAuth, async (req, res) => {
  try {
    const destinationId = getCommerceDestinationId(req) || parseInt(req.headers['x-destination-id']) || null;
    const data = await financialService.getCreditNotes(destinationId, {
      partnerId: req.query.partnerId ? parseInt(req.query.partnerId) : undefined,
      status: req.query.status,
      dateFrom: req.query.from || req.query.dateFrom,
      dateTo: req.query.to || req.query.dateTo,
      page: parseInt(req.query.page) || 1,
      limit: Math.min(parseInt(req.query.limit) || 25, 100)
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error('[AdminPortal] Financial credit notes list error:', error);
    res.status(500).json({ success: false, error: { code: 'CREDIT_NOTES_LIST_ERROR', message: error.message } });
  }
});

/**
 * GET /financial/credit-notes/:id — Credit note detail
 */
router.get('/financial/credit-notes/:id', adminAuth('reviewer'), destinationScope, commerceAuth, async (req, res) => {
  try {
    const destinationId = getCommerceDestinationId(req) || parseInt(req.headers['x-destination-id']) || null;
    const note = await financialService.getCreditNoteById(parseInt(req.params.id), destinationId);
    if (!note) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Credit note not found' } });
    }
    res.json({ success: true, data: note });
  } catch (error) {
    logger.error('[AdminPortal] Financial credit note detail error:', error);
    res.status(500).json({ success: false, error: { code: 'CREDIT_NOTE_DETAIL_ERROR', message: error.message } });
  }
});

/**
 * POST /financial/credit-notes — Create credit note for a payout
 */
router.post('/financial/credit-notes', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), commerceAuth, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.body.destinationId) || parseInt(req.headers['x-destination-id']) || null;
    if (!destinationId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId is required' } });
    }
    const { payoutId, vatRate } = req.body;
    if (!payoutId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_PAYOUT', message: 'payoutId is required' } });
    }
    const note = await financialService.createCreditNote(parseInt(payoutId), destinationId, vatRate ? parseFloat(vatRate) : undefined);
    await saveAuditLog(req, 'credit_note_created', {
      entity_type: 'credit_note',
      entity_id: note.id,
      credit_note_number: note.credit_note_number,
      total_cents: note.total_cents
    });
    res.status(201).json({ success: true, data: note });
  } catch (error) {
    logger.error('[AdminPortal] Financial create credit note error:', error);
    res.status(400).json({ success: false, error: { code: 'CREATE_CREDIT_NOTE_ERROR', message: error.message } });
  }
});

/**
 * PUT /financial/credit-notes/:id/finalize — Finalize credit note (immutable)
 */
router.put('/financial/credit-notes/:id/finalize', adminAuth('editor'), destinationScope, writeAccess(['platform_admin', 'destination_admin', 'poi_owner']), commerceAuth, async (req, res) => {
  try {
    const destinationId = req.destScope?.[0] || parseInt(req.headers['x-destination-id']) || null;
    const note = await financialService.finalizeCreditNote(parseInt(req.params.id), destinationId);
    await saveAuditLog(req, 'credit_note_finalized', {
      entity_type: 'credit_note',
      entity_id: note.id,
      credit_note_number: note.credit_note_number
    });
    res.json({ success: true, data: note });
  } catch (error) {
    logger.error('[AdminPortal] Financial finalize credit note error:', error);
    res.status(400).json({ success: false, error: { code: 'FINALIZE_CREDIT_NOTE_ERROR', message: error.message } });
  }
});

/**
 * GET /financial/export/payouts — CSV export payouts
 */
router.get('/financial/export/payouts', adminAuth('reviewer'), destinationScope, commerceAuth, async (req, res) => {
  try {
    const destinationId = getCommerceDestinationId(req) || parseInt(req.headers['x-destination-id']) || null;
    if (!destinationId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId is required' } });
    }
    const { from, to } = { ...getDefaultDateRange(), ...req.query };
    const result = await financialService.exportPayoutsCSV(destinationId, from, `${to} 23:59:59`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.csv);
  } catch (error) {
    logger.error('[AdminPortal] Financial export payouts error:', error);
    res.status(500).json({ success: false, error: { code: 'EXPORT_PAYOUTS_ERROR', message: error.message } });
  }
});

/**
 * GET /financial/export/credit-notes — CSV export credit notes
 */
router.get('/financial/export/credit-notes', adminAuth('reviewer'), destinationScope, commerceAuth, async (req, res) => {
  try {
    const destinationId = getCommerceDestinationId(req) || parseInt(req.headers['x-destination-id']) || null;
    if (!destinationId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId is required' } });
    }
    const { from, to } = { ...getDefaultDateRange(), ...req.query };
    const result = await financialService.exportCreditNotesCSV(destinationId, from, `${to} 23:59:59`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.csv);
  } catch (error) {
    logger.error('[AdminPortal] Financial export credit notes error:', error);
    res.status(500).json({ success: false, error: { code: 'EXPORT_CREDIT_NOTES_ERROR', message: error.message } });
  }
});

/**
 * GET /financial/export/tax-summary — CSV export per-partner tax summary (yearly)
 */
router.get('/financial/export/tax-summary', adminAuth('reviewer'), destinationScope, commerceAuth, async (req, res) => {
  try {
    const destinationId = getCommerceDestinationId(req) || parseInt(req.headers['x-destination-id']) || null;
    if (!destinationId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId is required' } });
    }
    const year = req.query.year || new Date().getFullYear();
    const result = await financialService.exportTaxSummaryCSV(destinationId, year);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.csv);
  } catch (error) {
    logger.error('[AdminPortal] Financial export tax summary error:', error);
    res.status(500).json({ success: false, error: { code: 'EXPORT_TAX_SUMMARY_ERROR', message: error.message } });
  }
});

/**
 * GET /financial/audit-log — Financial audit log (paginated)
 */
router.get('/financial/audit-log', adminAuth('reviewer'), destinationScope, commerceAuth, async (req, res) => {
  try {
    const destinationId = getCommerceDestinationId(req) || parseInt(req.headers['x-destination-id']) || null;
    const data = await financialService.getAuditLog(destinationId, {
      entityType: req.query.entityType,
      entityId: req.query.entityId ? parseInt(req.query.entityId) : undefined,
      eventType: req.query.eventType,
      page: parseInt(req.query.page) || 1,
      limit: Math.min(parseInt(req.query.limit) || 50, 200)
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error('[AdminPortal] Financial audit log error:', error);
    res.status(500).json({ success: false, error: { code: 'AUDIT_LOG_ERROR', message: error.message } });
  }
});

// ============================================================
// PAGES, BRANDING & NAVIGATION (Fase V.4 + Wave 2/3) — 8 endpoints → 145 totaal (+8 Wave 2/3 = 157)
// ============================================================

/**
 * GET /pages — List pages per destination
 */
router.get('/pages', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const destinationId = resolveDestinationId(req.query.destinationId || req.query.destination || req.headers['x-destination-id']);
    const where = destinationId ? 'WHERE p.destination_id = :destId' : '';
    const replacements = destinationId ? { destId: destinationId } : {};

    const pages = await mysqlSequelize.query(
      `SELECT p.id, p.destination_id, p.slug, p.title_en, p.title_nl, p.status, p.sort_order,
              p.parent_id, p.og_image_path,
              p.created_at, p.updated_at, d.code AS destination_code, d.display_name AS destination_name,
              JSON_LENGTH(JSON_EXTRACT(p.layout, '$.blocks')) AS block_count,
              (SELECT COUNT(*) FROM pages c WHERE c.parent_id = p.id) AS children_count
       FROM pages p
       JOIN destinations d ON d.id = p.destination_id
       ${where}
       ORDER BY p.destination_id, COALESCE(p.parent_id, p.id), p.parent_id IS NOT NULL, p.sort_order`,
      { replacements, type: QueryTypes.SELECT }
    );

    res.json({ success: true, data: { pages } });
  } catch (error) {
    logger.error('[AdminPortal] Pages list error:', error);
    res.status(500).json({ success: false, error: { code: 'PAGES_LIST_ERROR', message: error.message } });
  }
});

/**
 * GET /pages/:id — Page detail with layout JSON
 */
router.get('/pages/:id', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const [page] = await mysqlSequelize.query(
      `SELECT p.*, d.code AS destination_code, d.display_name AS destination_name
       FROM pages p
       JOIN destinations d ON d.id = p.destination_id
       WHERE p.id = :id`,
      { replacements: { id: parseInt(req.params.id) }, type: QueryTypes.SELECT }
    );

    if (!page) {
      return res.status(404).json({ success: false, error: { code: 'PAGE_NOT_FOUND', message: 'Page not found' } });
    }

    let layout = { blocks: [] };
    try { layout = typeof page.layout === 'string' ? JSON.parse(page.layout) : (page.layout || { blocks: [] }); } catch { /* empty */ }

    res.json({
      success: true,
      data: {
        ...page,
        layout,
        destination_code: page.destination_code,
        destination_name: page.destination_name
      }
    });
  } catch (error) {
    logger.error('[AdminPortal] Page detail error:', error);
    res.status(500).json({ success: false, error: { code: 'PAGE_DETAIL_ERROR', message: error.message } });
  }
});

/**
 * POST /pages — Create new page
 */
router.post('/pages', adminAuth('platform_admin'), async (req, res) => {
  try {
    const { destination_id, slug, title_nl, title_en, title_de, title_es, status, layout, parent_id } = req.body;

    if (!destination_id || !slug || !title_en) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'destination_id, slug and title_en are required' } });
    }

    // Check uniqueness
    const [existing] = await mysqlSequelize.query(
      'SELECT id FROM pages WHERE destination_id = :destId AND slug = :slug',
      { replacements: { destId: destination_id, slug }, type: QueryTypes.SELECT }
    );
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE_SLUG', message: 'A page with this slug already exists for this destination' } });
    }

    // Get max sort_order
    const [maxSort] = await mysqlSequelize.query(
      'SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM pages WHERE destination_id = :destId',
      { replacements: { destId: destination_id }, type: QueryTypes.SELECT }
    );

    const layoutJson = layout ? JSON.stringify(layout) : JSON.stringify({ blocks: [] });

    await mysqlSequelize.query(
      `INSERT INTO pages (destination_id, slug, title_nl, title_en, title_de, title_es, status, layout, sort_order, parent_id)
       VALUES (:destId, :slug, :titleNl, :titleEn, :titleDe, :titleEs, :status, :layout, :sortOrder, :parentId)`,
      {
        replacements: {
          destId: destination_id,
          slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
          titleNl: title_nl || null,
          titleEn: title_en,
          titleDe: title_de || null,
          titleEs: title_es || null,
          status: status || 'draft',
          layout: layoutJson,
          sortOrder: (maxSort?.max_sort ?? -1) + 1,
          parentId: parent_id ? parseInt(parent_id) : null
        },
        type: QueryTypes.INSERT
      }
    );

    const [newPage] = await mysqlSequelize.query(
      'SELECT * FROM pages WHERE destination_id = :destId AND slug = :slug',
      { replacements: { destId: destination_id, slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '') }, type: QueryTypes.SELECT }
    );

    // Audit log
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.collection('audit_logs').insertOne({
          action: 'page_created', entity_type: 'page', entity_id: newPage?.id,
          admin_email: req.adminUser.email, changes: { slug, title_en, destination_id },
          timestamp: new Date(), actor: { type: 'admin', name: 'admin-portal' }
        });
      }
    } catch { /* non-critical */ }

    res.status(201).json({ success: true, data: newPage });
  } catch (error) {
    logger.error('[AdminPortal] Page create error:', error);
    res.status(500).json({ success: false, error: { code: 'PAGE_CREATE_ERROR', message: error.message } });
  }
});

/**
 * PUT /pages/:id — Update page (title, SEO, layout, status)
 */
router.put('/pages/:id', adminAuth('platform_admin'), async (req, res) => {
  try {
    const pageId = parseInt(req.params.id);
    const [existing] = await mysqlSequelize.query(
      'SELECT id FROM pages WHERE id = :id',
      { replacements: { id: pageId }, type: QueryTypes.SELECT }
    );
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'PAGE_NOT_FOUND', message: 'Page not found' } });
    }

    const allowedFields = [
      'slug', 'title_nl', 'title_en', 'title_de', 'title_es',
      'seo_title_nl', 'seo_title_en', 'seo_title_de', 'seo_title_es',
      'seo_description_nl', 'seo_description_en', 'seo_description_de', 'seo_description_es',
      'og_image_url', 'og_image_path', 'parent_id', 'status', 'sort_order'
    ];

    const sets = [];
    const replacements = { id: pageId };

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        sets.push(`${field} = :${field}`);
        replacements[field] = req.body[field];
      }
    }

    // Handle layout separately (JSON)
    if (req.body.layout !== undefined) {
      sets.push('layout = :layout');
      replacements.layout = typeof req.body.layout === 'string' ? req.body.layout : JSON.stringify(req.body.layout);
    }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_CHANGES', message: 'No fields to update' } });
    }

    // Auto-snapshot: save current state to page_revisions before updating
    try {
      const [beforeUpdate] = await mysqlSequelize.query('SELECT * FROM pages WHERE id = :id', { replacements: { id: pageId }, type: QueryTypes.SELECT });
      if (beforeUpdate && req.body.layout !== undefined) {
        const snapshotLayout = typeof beforeUpdate.layout === 'string' ? beforeUpdate.layout : JSON.stringify(beforeUpdate.layout || { blocks: [] });
        await mysqlSequelize.query(
          `INSERT INTO page_revisions (page_id, layout, title_nl, changed_by, change_summary)
           VALUES (:pageId, :layout, :titleNl, :changedBy, :summary)`,
          {
            replacements: {
              pageId,
              layout: snapshotLayout,
              titleNl: beforeUpdate.title_nl,
              changedBy: req.adminUser?.id || null,
              summary: 'Auto-snapshot before save'
            },
            type: QueryTypes.INSERT
          }
        );
        // Prune old revisions (keep max 20 per page)
        await mysqlSequelize.query(
          `DELETE FROM page_revisions WHERE page_id = :pageId AND id NOT IN (
             SELECT id FROM (SELECT id FROM page_revisions WHERE page_id = :pageId ORDER BY created_at DESC LIMIT 20) AS keep
           )`,
          { replacements: { pageId }, type: QueryTypes.DELETE }
        );
      }
    } catch (revErr) {
      logger.warn('[AdminPortal] Page revision snapshot failed (non-critical):', revErr.message);
    }

    await mysqlSequelize.query(
      `UPDATE pages SET ${sets.join(', ')}, updated_at = NOW() WHERE id = :id`,
      { replacements, type: QueryTypes.UPDATE }
    );

    const [updated] = await mysqlSequelize.query('SELECT * FROM pages WHERE id = :id', { replacements: { id: pageId }, type: QueryTypes.SELECT });

    // Parse layout for response
    let layout = { blocks: [] };
    try { layout = typeof updated.layout === 'string' ? JSON.parse(updated.layout) : (updated.layout || { blocks: [] }); } catch { /* empty */ }

    // Audit log
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.collection('audit_logs').insertOne({
          action: 'page_updated', entity_type: 'page', entity_id: pageId,
          admin_email: req.adminUser.email, changes: Object.keys(req.body),
          timestamp: new Date(), actor: { type: 'admin', name: 'admin-portal' }
        });
      }
    } catch { /* non-critical */ }

    res.json({ success: true, data: { ...updated, layout } });
  } catch (error) {
    logger.error('[AdminPortal] Page update error:', error);
    res.status(500).json({ success: false, error: { code: 'PAGE_UPDATE_ERROR', message: error.message } });
  }
});

/**
 * DELETE /pages/:id — Hard delete page
 */
router.delete('/pages/:id', adminAuth('platform_admin'), async (req, res) => {
  try {
    const pageId = parseInt(req.params.id);
    const [existing] = await mysqlSequelize.query(
      'SELECT id, slug, destination_id FROM pages WHERE id = :id',
      { replacements: { id: pageId }, type: QueryTypes.SELECT }
    );
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'PAGE_NOT_FOUND', message: 'Page not found' } });
    }

    await mysqlSequelize.query('DELETE FROM pages WHERE id = :id', { replacements: { id: pageId }, type: QueryTypes.DELETE });

    // Audit log
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.collection('audit_logs').insertOne({
          action: 'page_deleted', entity_type: 'page', entity_id: pageId,
          admin_email: req.adminUser.email, changes: { slug: existing.slug, destination_id: existing.destination_id },
          timestamp: new Date(), actor: { type: 'admin', name: 'admin-portal' }
        });
      }
    } catch { /* non-critical */ }

    res.json({ success: true, data: { message: 'Page deleted', id: pageId } });
  } catch (error) {
    logger.error('[AdminPortal] Page delete error:', error);
    res.status(500).json({ success: false, error: { code: 'PAGE_DELETE_ERROR', message: error.message } });
  }
});

/**
 * GET /destinations — List all destinations with branding + feature_flags
 */
router.get('/destinations', adminAuth('reviewer'), async (req, res) => {
  try {
    const destinations = await mysqlSequelize.query(
      `SELECT id, code, name, display_name, domain, country, region, timezone,
              currency, default_language, supported_languages, feature_flags,
              branding, config, is_active, destination_type, status, archived_at,
              created_at, updated_at
       FROM destinations
       WHERE status != 'deleted'
       ORDER BY id`,
      { type: QueryTypes.SELECT }
    );

    const parsed = destinations.map(d => {
      let featureFlags = {};
      let branding = {};
      let config = {};
      let supportedLanguages = [];
      try { featureFlags = typeof d.feature_flags === 'string' ? JSON.parse(d.feature_flags) : (d.feature_flags || {}); } catch { /* empty */ }
      try { branding = typeof d.branding === 'string' ? JSON.parse(d.branding) : (d.branding || {}); } catch { /* empty */ }
      try { config = typeof d.config === 'string' ? JSON.parse(d.config) : (d.config || {}); } catch { /* empty */ }
      try { supportedLanguages = typeof d.supported_languages === 'string' ? JSON.parse(d.supported_languages) : (d.supported_languages || []); } catch { /* empty */ }
      return {
        id: d.id,
        code: d.code,
        name: d.name,
        displayName: d.display_name,
        domain: d.domain,
        country: d.country,
        region: d.region,
        timezone: d.timezone,
        currency: d.currency,
        defaultLanguage: d.default_language,
        supportedLanguages,
        featureFlags,
        branding,
        config,
        isActive: !!d.is_active,
        destinationType: d.destination_type || 'tourism',
        status: d.status || 'active',
        archivedAt: d.archived_at
      };
    });

    // Non-platform_admin users don't see archived destinations
    const user = req.adminUser;
    const filtered = user?.role === 'platform_admin'
      ? parsed
      : parsed.filter(d => d.status === 'active');

    res.json({ success: true, data: { destinations: filtered } });
  } catch (error) {
    logger.error('[AdminPortal] Destinations list error:', error);
    res.status(500).json({ success: false, error: { code: 'DESTINATIONS_LIST_ERROR', message: error.message } });
  }
});

/**
 * PUT /destinations/:id/branding — Update destinations.branding JSON in MySQL (+ MongoDB sync)
 */
router.put('/destinations/:id/branding', adminAuth('destination_admin'), writeAccess(['platform_admin', 'destination_admin']), async (req, res) => {
  try {
    const destId = parseInt(req.params.id);
    const [dest] = await mysqlSequelize.query(
      'SELECT id, code FROM destinations WHERE id = :id',
      { replacements: { id: destId }, type: QueryTypes.SELECT }
    );
    if (!dest) {
      return res.status(404).json({ success: false, error: { code: 'DESTINATION_NOT_FOUND', message: 'Destination not found' } });
    }

    const brandingData = req.body;
    const brandingJson = JSON.stringify(brandingData);

    // Write to MySQL destinations.branding (primary store for Next.js)
    await mysqlSequelize.query(
      'UPDATE destinations SET branding = :branding, updated_at = NOW() WHERE id = :id',
      { replacements: { branding: brandingJson, id: destId }, type: QueryTypes.UPDATE }
    );

    // Sync to MongoDB brand_configurations (backwards compat for admin portal settings)
    try {
      if (mongoose.connection.readyState === 1) {
        const db = mongoose.connection.db;
        await db.collection('brand_configurations').updateOne(
          { destination: dest.code },
          {
            $set: {
              destination: dest.code,
              primary: brandingData.colors?.primary || brandingData.primary,
              secondary: brandingData.colors?.secondary || brandingData.secondary,
              accent: brandingData.colors?.accent || brandingData.accent,
              chatbotName: brandingData.chatbotName,
              brand_name: brandingData.brandName,
              payoff: brandingData.payoff,
              logo: brandingData.logo,
              logo_url: brandingData.logoUrl,
              updated_at: new Date(),
              updated_by: req.adminUser.email
            }
          },
          { upsert: true }
        );
      }
    } catch (mongoErr) {
      logger.warn('[AdminPortal] MongoDB branding sync failed (non-critical):', mongoErr.message);
    }

    // Audit log
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.collection('audit_logs').insertOne({
          action: 'destination_branding_updated', entity_type: 'destination', entity_id: destId,
          admin_email: req.adminUser.email, changes: Object.keys(brandingData),
          timestamp: new Date(), actor: { type: 'admin', name: 'admin-portal' }
        });
      }
    } catch { /* non-critical */ }

    // Clear tone-of-voice cache if toneOfVoice was updated
    if (brandingData.toneOfVoice) {
      try {
        const { clearToneCache } = await import('../services/agents/contentRedacteur/toneOfVoice.js');
        clearToneCache();
      } catch { /* non-critical */ }
    }

    res.json({ success: true, data: { message: `Branding updated for ${dest.code}`, destinationId: destId, branding: brandingData } });
  } catch (error) {
    logger.error('[AdminPortal] Destination branding update error:', error);
    res.status(500).json({ success: false, error: { code: 'BRANDING_UPDATE_ERROR', message: error.message } });
  }
});

/**
 * PUT /destinations/:id/navigation — Update nav_items in destinations.config JSON
 */
router.put('/destinations/:id/navigation', adminAuth('platform_admin'), async (req, res) => {
  try {
    const destId = parseInt(req.params.id);
    const [dest] = await mysqlSequelize.query(
      'SELECT id, code, config FROM destinations WHERE id = :id',
      { replacements: { id: destId }, type: QueryTypes.SELECT }
    );
    if (!dest) {
      return res.status(404).json({ success: false, error: { code: 'DESTINATION_NOT_FOUND', message: 'Destination not found' } });
    }

    const { nav_items } = req.body;
    if (!Array.isArray(nav_items)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_NAV_ITEMS', message: 'nav_items must be an array' } });
    }

    // Merge into existing config
    let config = {};
    try { config = typeof dest.config === 'string' ? JSON.parse(dest.config) : (dest.config || {}); } catch { /* empty */ }
    config.nav_items = nav_items;

    await mysqlSequelize.query(
      'UPDATE destinations SET config = :config, updated_at = NOW() WHERE id = :id',
      { replacements: { config: JSON.stringify(config), id: destId }, type: QueryTypes.UPDATE }
    );

    // Audit log
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.collection('audit_logs').insertOne({
          action: 'destination_navigation_updated', entity_type: 'destination', entity_id: destId,
          admin_email: req.adminUser.email, changes: { nav_items_count: nav_items.length },
          timestamp: new Date(), actor: { type: 'admin', name: 'admin-portal' }
        });
      }
    } catch { /* non-critical */ }

    res.json({ success: true, data: { message: `Navigation updated for ${dest.code}`, destinationId: destId, nav_items } });
  } catch (error) {
    logger.error('[AdminPortal] Navigation update error:', error);
    res.status(500).json({ success: false, error: { code: 'NAVIGATION_UPDATE_ERROR', message: error.message } });
  }
});

// ==========================================
// V.6 — Social Links + Translation Endpoints
// ==========================================

/**
 * GET /admin-portal/destinations/:id/social-links
 * Get social media links for a destination
 */
router.get('/destinations/:id/social-links', adminAuth(), async (req, res) => {
  try {
    const destId = parseInt(req.params.id);
    const [dest] = await mysqlSequelize.query(
      'SELECT id, code, social_links FROM destinations WHERE id = :id',
      { replacements: { id: destId }, type: QueryTypes.SELECT }
    );
    if (!dest) {
      return res.status(404).json({ success: false, error: { code: 'DESTINATION_NOT_FOUND', message: 'Destination not found' } });
    }
    let socialLinks = {};
    try { socialLinks = typeof dest.social_links === 'string' ? JSON.parse(dest.social_links) : (dest.social_links || {}); } catch { /* empty */ }
    res.json({ success: true, data: { destinationId: destId, code: dest.code, socialLinks } });
  } catch (error) {
    logger.error('[AdminPortal] Social links fetch error:', error);
    res.status(500).json({ success: false, error: { code: 'SOCIAL_LINKS_FETCH_ERROR', message: error.message } });
  }
});

/**
 * PUT /admin-portal/destinations/:id/social-links
 * Update social media links for a destination
 */
router.put('/destinations/:id/social-links', adminAuth(), writeAccess(['platform_admin']), async (req, res) => {
  try {
    const destId = parseInt(req.params.id);
    const [dest] = await mysqlSequelize.query(
      'SELECT id, code FROM destinations WHERE id = :id',
      { replacements: { id: destId }, type: QueryTypes.SELECT }
    );
    if (!dest) {
      return res.status(404).json({ success: false, error: { code: 'DESTINATION_NOT_FOUND', message: 'Destination not found' } });
    }
    const { socialLinks } = req.body;
    if (!socialLinks || typeof socialLinks !== 'object') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_SOCIAL_LINKS', message: 'socialLinks must be an object' } });
    }
    await mysqlSequelize.query(
      'UPDATE destinations SET social_links = :socialLinks, updated_at = NOW() WHERE id = :id',
      { replacements: { socialLinks: JSON.stringify(socialLinks), id: destId }, type: QueryTypes.UPDATE }
    );
    // Audit log
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.collection('audit_logs').insertOne({
          action: 'destination_social_links_updated', entity_type: 'destination', entity_id: destId,
          admin_email: req.adminUser.email, changes: { platforms: Object.keys(socialLinks) },
          timestamp: new Date(), actor: { type: 'admin', name: 'admin-portal' }
        });
      }
    } catch { /* non-critical */ }
    res.json({ success: true, data: { message: `Social links updated for ${dest.code}`, destinationId: destId, socialLinks } });
  } catch (error) {
    logger.error('[AdminPortal] Social links update error:', error);
    res.status(500).json({ success: false, error: { code: 'SOCIAL_LINKS_UPDATE_ERROR', message: error.message } });
  }
});

/**
 * PUT /destinations/:id/feature-flags — Update feature_flags JSON for a destination
 */
router.put('/destinations/:id/feature-flags', adminAuth('platform_admin'), async (req, res) => {
  try {
    const destId = parseInt(req.params.id);
    const { featureFlags } = req.body;
    if (!featureFlags || typeof featureFlags !== 'object') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_FLAGS', message: 'featureFlags object is required' } });
    }
    await mysqlSequelize.query(
      'UPDATE destinations SET feature_flags = :ff, updated_at = NOW() WHERE id = :id',
      { replacements: { ff: JSON.stringify(featureFlags), id: destId } }
    );
    logger.info(`[AdminPortal] Feature flags updated for destination ${destId}: ${Object.entries(featureFlags).filter(([,v]) => v === true).map(([k]) => k).join(', ')}`);
    res.json({ success: true, data: { id: destId, featureFlags } });
  } catch (error) {
    logger.error('[AdminPortal] Feature flags update error:', error);
    res.status(500).json({ success: false, error: { code: 'FEATURE_FLAGS_ERROR', message: error.message } });
  }
});

// ============================================================
// DESTINATION LIFECYCLE: Archive / Restore / Hard-Delete (Opdracht 9)
// ============================================================

/**
 * PUT /destinations/:id/archive — Soft-delete (set status=archived)
 * Destination disappears from dropdown for non-platform_admin users.
 */
router.put('/destinations/:id/archive', adminAuth('platform_admin'), async (req, res) => {
  try {
    const destId = parseInt(req.params.id);
    const [[dest]] = await mysqlSequelize.query('SELECT id, name, status FROM destinations WHERE id = :id', { replacements: { id: destId } });
    if (!dest) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Destination not found' } });
    if (dest.status === 'archived') return res.status(400).json({ success: false, error: { code: 'ALREADY_ARCHIVED', message: 'Destination is already archived' } });

    await mysqlSequelize.query(
      'UPDATE destinations SET status = :status, archived_at = NOW(), updated_at = NOW() WHERE id = :id',
      { replacements: { status: 'archived', id: destId } }
    );

    // Count related data for summary
    const counts = {};
    const countTables = ['content_items','content_suggestions','trending_data','social_accounts','media','pages','partners','POI'];
    for (const table of countTables) {
      try {
        const [[row]] = await mysqlSequelize.query(`SELECT COUNT(*) as cnt FROM \`${table}\` WHERE destination_id = :id`, { replacements: { id: destId } });
        counts[table] = row?.cnt || 0;
      } catch { counts[table] = 0; }
    }

    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.collection('audit_logs').insertOne({
          action: 'destination_archived', entity_type: 'destination', entity_id: destId,
          admin_email: req.adminUser.email, changes: { name: dest.name, counts },
          timestamp: new Date(), actor: { type: 'admin', name: 'admin-portal' }
        });
      }
    } catch { /* non-critical */ }

    logger.info(`[AdminPortal] Destination archived: ${dest.name} (ID: ${destId})`);
    res.json({ success: true, data: { id: destId, name: dest.name, status: 'archived', dataCounts: counts } });
  } catch (error) {
    logger.error('[AdminPortal] Archive destination error:', error);
    res.status(500).json({ success: false, error: { code: 'ARCHIVE_ERROR', message: error.message } });
  }
});

/**
 * PUT /destinations/:id/restore — Restore an archived destination
 */
router.put('/destinations/:id/restore', adminAuth('platform_admin'), async (req, res) => {
  try {
    const destId = parseInt(req.params.id);
    const [[dest]] = await mysqlSequelize.query('SELECT id, name, status FROM destinations WHERE id = :id', { replacements: { id: destId } });
    if (!dest) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Destination not found' } });
    if (dest.status !== 'archived') return res.status(400).json({ success: false, error: { code: 'NOT_ARCHIVED', message: 'Destination is not archived' } });

    await mysqlSequelize.query(
      'UPDATE destinations SET status = :status, archived_at = NULL, updated_at = NOW() WHERE id = :id',
      { replacements: { status: 'active', id: destId } }
    );

    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.collection('audit_logs').insertOne({
          action: 'destination_restored', entity_type: 'destination', entity_id: destId,
          admin_email: req.adminUser.email, changes: { name: dest.name },
          timestamp: new Date(), actor: { type: 'admin', name: 'admin-portal' }
        });
      }
    } catch { /* non-critical */ }

    logger.info(`[AdminPortal] Destination restored: ${dest.name} (ID: ${destId})`);
    res.json({ success: true, data: { id: destId, name: dest.name, status: 'active' } });
  } catch (error) {
    logger.error('[AdminPortal] Restore destination error:', error);
    res.status(500).json({ success: false, error: { code: 'RESTORE_ERROR', message: error.message } });
  }
});

/**
 * GET /destinations/:id/delete-preview — Preview what will be deleted (counts per table)
 */
router.get('/destinations/:id/delete-preview', adminAuth('platform_admin'), async (req, res) => {
  try {
    const destId = parseInt(req.params.id);
    const [[dest]] = await mysqlSequelize.query('SELECT id, name, destination_type FROM destinations WHERE id = :id', { replacements: { id: destId } });
    if (!dest) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Destination not found' } });

    const willDelete = {};
    const tables = [
      'content_items','content_suggestions','content_performance','content_pillars',
      'trending_data','seasonal_config','social_accounts','score_calibrations',
      'media','pages','partners','POI','reviews','agenda',
      'tickets','ticket_inventory','ticket_orders','voucher_codes',
      'reservations','reservation_slots','guest_profiles',
      'payment_transactions','payment_refunds',
      'intermediary_transactions','settlement_batches','partner_payouts','credit_notes',
      'holibot_sessions','user_journeys','Users'
    ];

    for (const table of tables) {
      try {
        const [[row]] = await mysqlSequelize.query(`SELECT COUNT(*) as cnt FROM \`${table}\` WHERE destination_id = :id`, { replacements: { id: destId } });
        willDelete[table] = row?.cnt || 0;
      } catch { willDelete[table] = 0; }
    }

    res.json({
      success: true,
      data: {
        destination: dest.name,
        destinationType: dest.destination_type,
        willDelete,
        warning: 'Dit is ONOMKEERBAAR. Alle data wordt permanent verwijderd.'
      }
    });
  } catch (error) {
    logger.error('[AdminPortal] Delete preview error:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_PREVIEW_ERROR', message: error.message } });
  }
});

/**
 * DELETE /destinations/:id — Hard-delete destination + ALL related data
 * Requires: ?confirm=PERMANENT_DELETE_{destination_name}
 * ONLY platform_admin. ONOMKEERBAAR.
 */
router.delete('/destinations/:id', adminAuth('platform_admin'), async (req, res) => {
  try {
    const destId = parseInt(req.params.id);
    const [[dest]] = await mysqlSequelize.query('SELECT id, name, code, destination_type FROM destinations WHERE id = :id', { replacements: { id: destId } });
    if (!dest) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Destination not found' } });

    // Safety: protect core destinations
    if ([1, 2].includes(destId)) {
      return res.status(403).json({ success: false, error: { code: 'PROTECTED', message: 'Cannot delete core destinations (Calpe, Texel)' } });
    }

    // Confirm string check
    const expectedConfirm = `PERMANENT_DELETE_${dest.name}`;
    if (req.query.confirm !== expectedConfirm) {
      return res.status(400).json({
        success: false,
        error: { code: 'CONFIRM_MISMATCH', message: `Confirmation required: ?confirm=${encodeURIComponent(expectedConfirm)}` }
      });
    }

    logger.warn(`[AdminPortal] HARD DELETE initiated for destination: ${dest.name} (ID: ${destId}) by ${req.adminUser.email}`);

    // Cascade delete in correct order (child tables first)
    const deleteLog = {};

    // 1. Content module child tables (via content_items FK)
    for (const childTable of ['content_approval_log', 'content_comments', 'content_item_revisions', 'content_performance', 'score_calibrations']) {
      try {
        const [, meta] = await mysqlSequelize.query(
          `DELETE ct FROM \`${childTable}\` ct INNER JOIN content_items ci ON ct.content_item_id = ci.id WHERE ci.destination_id = :id`,
          { replacements: { id: destId } }
        );
        deleteLog[childTable] = meta?.affectedRows || 0;
      } catch { deleteLog[childTable] = 'skipped'; }
    }

    // 2. Content module main tables
    for (const table of ['content_items', 'content_suggestions', 'content_pillars', 'trending_data', 'seasonal_config', 'social_accounts']) {
      try {
        const [, meta] = await mysqlSequelize.query(`DELETE FROM \`${table}\` WHERE destination_id = :id`, { replacements: { id: destId } });
        deleteLog[table] = meta?.affectedRows || 0;
      } catch { deleteLog[table] = 'skipped'; }
    }

    // 3. Media (+ physical files)
    try {
      const [, meta] = await mysqlSequelize.query('DELETE FROM media WHERE destination_id = :id', { replacements: { id: destId } });
      deleteLog.media = meta?.affectedRows || 0;
    } catch { deleteLog.media = 'skipped'; }

    // 4. Pages + revisions
    try {
      await mysqlSequelize.query(
        'DELETE pr FROM page_revisions pr INNER JOIN pages p ON pr.page_id = p.id WHERE p.destination_id = :id',
        { replacements: { id: destId } }
      );
      const [, meta] = await mysqlSequelize.query('DELETE FROM pages WHERE destination_id = :id', { replacements: { id: destId } });
      deleteLog.pages = meta?.affectedRows || 0;
    } catch { deleteLog.pages = 'skipped'; }

    // 5. Commerce (if tourism)
    if (dest.destination_type === 'tourism') {
      // Financial child tables
      for (const table of ['credit_notes', 'partner_payouts', 'settlement_batches']) {
        try {
          const [, meta] = await mysqlSequelize.query(`DELETE FROM \`${table}\` WHERE destination_id = :id`, { replacements: { id: destId } });
          deleteLog[table] = meta?.affectedRows || 0;
        } catch { deleteLog[table] = 'skipped'; }
      }

      // Intermediary
      try {
        const [, meta] = await mysqlSequelize.query('DELETE FROM intermediary_transactions WHERE destination_id = :id', { replacements: { id: destId } });
        deleteLog.intermediary_transactions = meta?.affectedRows || 0;
      } catch { deleteLog.intermediary_transactions = 'skipped'; }

      // Ticketing chain
      try {
        await mysqlSequelize.query(
          'DELETE toi FROM ticket_order_items toi INNER JOIN ticket_orders tord ON toi.order_id = tord.id WHERE tord.destination_id = :id',
          { replacements: { id: destId } }
        );
        for (const table of ['ticket_orders', 'voucher_codes', 'ticket_inventory', 'tickets']) {
          const [, meta] = await mysqlSequelize.query(`DELETE FROM \`${table}\` WHERE destination_id = :id`, { replacements: { id: destId } });
          deleteLog[table] = meta?.affectedRows || 0;
        }
      } catch { deleteLog.ticketing = 'skipped'; }

      // Reservations
      for (const table of ['reservations', 'reservation_slots', 'guest_profiles']) {
        try {
          const [, meta] = await mysqlSequelize.query(`DELETE FROM \`${table}\` WHERE destination_id = :id`, { replacements: { id: destId } });
          deleteLog[table] = meta?.affectedRows || 0;
        } catch { deleteLog[table] = 'skipped'; }
      }

      // Partners chain
      try {
        await mysqlSequelize.query(
          'DELETE po FROM partner_onboarding po INNER JOIN partners p ON po.partner_id = p.id WHERE p.destination_id = :id',
          { replacements: { id: destId } }
        );
        await mysqlSequelize.query(
          'DELETE pp FROM partner_pois pp INNER JOIN partners p ON pp.partner_id = p.id WHERE p.destination_id = :id',
          { replacements: { id: destId } }
        );
        const [, meta] = await mysqlSequelize.query('DELETE FROM partners WHERE destination_id = :id', { replacements: { id: destId } });
        deleteLog.partners = meta?.affectedRows || 0;
      } catch { deleteLog.partners = 'skipped'; }

      // POI chain
      try {
        await mysqlSequelize.query(
          'DELETE iu FROM imageurls iu INNER JOIN POI p ON iu.poi_id = p.id WHERE p.destination_id = :id',
          { replacements: { id: destId } }
        );
        await mysqlSequelize.query('DELETE FROM reviews WHERE destination_id = :id', { replacements: { id: destId } });
        await mysqlSequelize.query(
          'DELETE par FROM poi_apify_raw par INNER JOIN POI p ON par.poi_id = p.id WHERE p.destination_id = :id',
          { replacements: { id: destId } }
        );
        const [, meta] = await mysqlSequelize.query('DELETE FROM POI WHERE destination_id = :id', { replacements: { id: destId } });
        deleteLog.POI = meta?.affectedRows || 0;
      } catch { deleteLog.POI = 'skipped'; }

      // Chatbot sessions
      try {
        const [, meta] = await mysqlSequelize.query('DELETE FROM holibot_sessions WHERE destination_id = :id', { replacements: { id: destId } });
        deleteLog.holibot_sessions = meta?.affectedRows || 0;
      } catch { deleteLog.holibot_sessions = 'skipped'; }
    }

    // 6. Events
    try {
      const [, meta] = await mysqlSequelize.query('DELETE FROM agenda WHERE destination_id = :id', { replacements: { id: destId } });
      deleteLog.agenda = meta?.affectedRows || 0;
    } catch { deleteLog.agenda = 'skipped'; }

    // 7. Payments
    for (const table of ['payment_refunds', 'payment_transactions']) {
      try {
        const [, meta] = await mysqlSequelize.query(`DELETE FROM \`${table}\` WHERE destination_id = :id`, { replacements: { id: destId } });
        deleteLog[table] = meta?.affectedRows || 0;
      } catch { deleteLog[table] = 'skipped'; }
    }

    // 8. Users & journeys
    for (const table of ['user_journeys', 'Users']) {
      try {
        const [, meta] = await mysqlSequelize.query(`DELETE FROM \`${table}\` WHERE destination_id = :id`, { replacements: { id: destId } });
        deleteLog[table] = meta?.affectedRows || 0;
      } catch { deleteLog[table] = 'skipped'; }
    }

    // 9. Categories
    try {
      await mysqlSequelize.query('DELETE FROM Categories WHERE destination_id = :id', { replacements: { id: destId } });
    } catch { /* may not exist */ }

    // 10. Financial audit log
    try {
      await mysqlSequelize.query('DELETE FROM financial_audit_log WHERE destination_id = :id', { replacements: { id: destId } });
    } catch { /* may not have dest scope */ }

    // FINAL: Delete destination itself
    await mysqlSequelize.query('DELETE FROM destinations WHERE id = :id', { replacements: { id: destId } });

    // Audit log (MongoDB — will persist after MySQL deletion)
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.collection('audit_logs').insertOne({
          action: 'destination_hard_deleted', entity_type: 'destination', entity_id: destId,
          admin_email: req.adminUser.email,
          changes: { name: dest.name, code: dest.code, type: dest.destination_type, deleteLog },
          timestamp: new Date(), actor: { type: 'admin', name: 'admin-portal' }
        });
      }
    } catch { /* non-critical */ }

    logger.warn(`[AdminPortal] HARD DELETE completed: ${dest.name} (ID: ${destId}). Deleted: ${JSON.stringify(deleteLog)}`);
    res.json({ success: true, data: { deleted: true, name: dest.name, id: destId, deleteLog } });
  } catch (error) {
    logger.error('[AdminPortal] Hard delete destination error:', error);
    res.status(500).json({ success: false, error: { code: 'HARD_DELETE_ERROR', message: error.message } });
  }
});

// ============================================================
// PARTNER LIFECYCLE: Archive / Hard-Delete (Opdracht 9)
// ============================================================

/**
 * PUT /partners/:id/archive — Soft-delete partner
 */
router.put('/partners/:id/archive', adminAuth('destination_admin'), async (req, res) => {
  try {
    const partnerId = parseInt(req.params.id);
    const [[partner]] = await mysqlSequelize.query('SELECT id, name, status FROM partners WHERE id = :id', { replacements: { id: partnerId } });
    if (!partner) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Partner not found' } });

    await mysqlSequelize.query(
      "UPDATE partners SET status = 'archived', updated_at = NOW() WHERE id = :id",
      { replacements: { id: partnerId } }
    );

    logger.info(`[AdminPortal] Partner archived: ${partner.name} (ID: ${partnerId})`);
    res.json({ success: true, data: { id: partnerId, name: partner.name, status: 'archived' } });
  } catch (error) {
    logger.error('[AdminPortal] Archive partner error:', error);
    res.status(500).json({ success: false, error: { code: 'ARCHIVE_PARTNER_ERROR', message: error.message } });
  }
});

/**
 * DELETE /partners/:id — Hard-delete partner (only if no unsettled transactions)
 */
router.delete('/partners/:id', adminAuth('platform_admin'), async (req, res) => {
  try {
    const partnerId = parseInt(req.params.id);
    const [[partner]] = await mysqlSequelize.query('SELECT id, name, destination_id FROM partners WHERE id = :id', { replacements: { id: partnerId } });
    if (!partner) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Partner not found' } });

    // Check for unsettled transactions
    const [[unsettled]] = await mysqlSequelize.query(
      "SELECT COUNT(*) as cnt FROM intermediary_transactions WHERE partner_id = :id AND status NOT IN ('settled', 'cancelled', 'reviewed')",
      { replacements: { id: partnerId } }
    );
    if (unsettled?.cnt > 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'UNSETTLED_TRANSACTIONS', message: `Rond eerst ${unsettled.cnt} openstaande transactie(s) af voordat de partner verwijderd kan worden.` }
      });
    }

    // Cascade delete
    await mysqlSequelize.query('DELETE FROM partner_onboarding WHERE partner_id = :id', { replacements: { id: partnerId } });
    await mysqlSequelize.query('DELETE FROM partner_pois WHERE partner_id = :id', { replacements: { id: partnerId } });
    await mysqlSequelize.query('DELETE FROM partner_payouts WHERE partner_id = :id', { replacements: { id: partnerId } });
    await mysqlSequelize.query('DELETE FROM credit_notes WHERE partner_id = :id', { replacements: { id: partnerId } });
    // Set intermediary_transactions partner_id to NULL (historical records)
    await mysqlSequelize.query('UPDATE intermediary_transactions SET partner_id = NULL WHERE partner_id = :id', { replacements: { id: partnerId } });
    await mysqlSequelize.query('DELETE FROM partners WHERE id = :id', { replacements: { id: partnerId } });

    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.collection('audit_logs').insertOne({
          action: 'partner_hard_deleted', entity_type: 'partner', entity_id: partnerId,
          admin_email: req.adminUser.email, changes: { name: partner.name },
          timestamp: new Date(), actor: { type: 'admin', name: 'admin-portal' }
        });
      }
    } catch { /* non-critical */ }

    logger.info(`[AdminPortal] Partner hard-deleted: ${partner.name} (ID: ${partnerId})`);
    res.json({ success: true, data: { deleted: true, name: partner.name, id: partnerId } });
  } catch (error) {
    logger.error('[AdminPortal] Hard delete partner error:', error);
    res.status(500).json({ success: false, error: { code: 'HARD_DELETE_PARTNER_ERROR', message: error.message } });
  }
});

// ============================================================
// MERK PROFIEL / BRAND PROFILE — 14 endpoints
// ============================================================

/**
 * Helper: get destination_id from header or query
 */
function getBrandDestId(req) {
  const fromHeader = req.headers['x-destination-id'];
  const fromQuery = req.query.destination_id;
  if (fromQuery) return Number(fromQuery);
  if (fromHeader) {
    const num = parseInt(fromHeader);
    if (!isNaN(num) && num > 0) return num;
    // string code → lookup
    const codeMap = { calpe: 1, texel: 2, alicante: 3, warrewijzer: 4 };
    return codeMap[fromHeader.toLowerCase()] || 1;
  }
  return req.adminUser?.destination_id || 1;
}

/**
 * GET /brand-profile — Get brand_profile JSON for a destination
 */
router.get('/brand-profile', adminAuth('editor'), async (req, res) => {
  try {
    const destId = getBrandDestId(req);
    const [[dest]] = await mysqlSequelize.query(
      'SELECT id, name, brand_profile, branding FROM destinations WHERE id = :id',
      { replacements: { id: destId } }
    );
    if (!dest) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Destination not found' } });

    let brandProfile = {};
    try { brandProfile = typeof dest.brand_profile === 'string' ? JSON.parse(dest.brand_profile) : (dest.brand_profile || {}); } catch { /* empty */ }

    // Also include toneOfVoice from branding JSON
    let toneOfVoice = {};
    try {
      const branding = typeof dest.branding === 'string' ? JSON.parse(dest.branding) : (dest.branding || {});
      toneOfVoice = branding.toneOfVoice || {};
    } catch { /* empty */ }

    res.json({ success: true, data: { ...brandProfile, toneOfVoice, destinationId: destId, destinationName: dest.name } });
  } catch (error) {
    logger.error('[AdminPortal] Get brand profile error:', error);
    res.status(500).json({ success: false, error: { code: 'BRAND_PROFILE_ERROR', message: error.message } });
  }
});

/**
 * PUT /brand-profile — Update brand_profile JSON
 */
router.put('/brand-profile', adminAuth('destination_admin'), writeAccess(['platform_admin', 'destination_admin']), async (req, res) => {
  try {
    const destId = getBrandDestId(req);
    const { company_description, industry, country, active_markets, mission, vision, core_values, usps, seo_keywords, content_goals, company_name, website_url } = req.body;

    // Merge with existing
    const [[dest]] = await mysqlSequelize.query('SELECT brand_profile FROM destinations WHERE id = :id', { replacements: { id: destId } });
    if (!dest) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Destination not found' } });

    let existing = {};
    try { existing = typeof dest.brand_profile === 'string' ? JSON.parse(dest.brand_profile) : (dest.brand_profile || {}); } catch { /* empty */ }

    const updated = {
      ...existing,
      ...(company_name !== undefined && { company_name }),
      ...(company_description !== undefined && { company_description }),
      ...(industry !== undefined && { industry }),
      ...(website_url !== undefined && { website_url }),
      ...(country !== undefined && { country }),
      ...(active_markets !== undefined && { active_markets }),
      ...(mission !== undefined && { mission }),
      ...(vision !== undefined && { vision }),
      ...(core_values !== undefined && { core_values }),
      ...(usps !== undefined && { usps }),
      ...(seo_keywords !== undefined && { seo_keywords }),
      ...(content_goals !== undefined && { content_goals }),
    };

    await mysqlSequelize.query(
      'UPDATE destinations SET brand_profile = :bp, updated_at = NOW() WHERE id = :id',
      { replacements: { bp: JSON.stringify(updated), id: destId } }
    );

    // Cross-section feed: seed SEO keywords into trending_data for Content Studio
    if (updated.seo_keywords?.length) {
      const now = new Date();
      const week = Math.ceil((Math.floor((now - new Date(now.getFullYear(), 0, 1)) / 86400000) + 1) / 7);
      const year = now.getFullYear();
      for (const kw of updated.seo_keywords.slice(0, 20)) {
        if (!kw || typeof kw !== 'string' || kw.trim().length < 2) continue;
        await mysqlSequelize.query(
          `INSERT INTO trending_data (destination_id, keyword, language, source, search_volume, trend_direction, relevance_score, week_number, year, created_at, updated_at)
           VALUES (:destId, :kw, 'en', 'manual', 0, 'stable', 7.0, :week, :year, NOW(), NOW())
           ON DUPLICATE KEY UPDATE relevance_score = GREATEST(relevance_score, 7.0), updated_at = NOW()`,
          { replacements: { destId, kw: kw.trim().toLowerCase(), week, year } }
        );
      }
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('[AdminPortal] Update brand profile error:', error);
    res.status(500).json({ success: false, error: { code: 'BRAND_PROFILE_UPDATE_ERROR', message: error.message } });
  }
});

// --- AUDIENCE PERSONAS ---

/**
 * GET /brand-profile/personas — List personas for destination
 */
router.get('/brand-profile/personas', adminAuth('editor'), async (req, res) => {
  try {
    const destId = getBrandDestId(req);
    const [personas] = await mysqlSequelize.query(
      'SELECT * FROM audience_personas WHERE destination_id = :destId ORDER BY is_primary DESC, sort_order ASC',
      { replacements: { destId } }
    );
    // Parse JSON fields
    const parsed = personas.map(p => {
      let preferred_channels = [];
      try { preferred_channels = typeof p.preferred_channels === 'string' ? JSON.parse(p.preferred_channels) : (p.preferred_channels || []); } catch { /* empty */ }
      return { ...p, preferred_channels };
    });
    res.json({ success: true, data: parsed });
  } catch (error) {
    logger.error('[AdminPortal] List personas error:', error);
    res.status(500).json({ success: false, error: { code: 'PERSONAS_LIST_ERROR', message: error.message } });
  }
});

/**
 * POST /brand-profile/personas — Create persona
 */
router.post('/brand-profile/personas', adminAuth('destination_admin'), writeAccess(['platform_admin', 'destination_admin']), async (req, res) => {
  try {
    const destId = getBrandDestId(req);
    const { name, age_range, gender, location, language, interests, pain_points, preferred_channels, tone_notes, is_primary } = req.body;
    if (!name) return res.status(400).json({ success: false, error: { code: 'MISSING_NAME', message: 'name is required' } });

    const [result] = await mysqlSequelize.query(
      `INSERT INTO audience_personas (destination_id, name, age_range, gender, location, language, interests, pain_points, preferred_channels, tone_notes, is_primary)
       VALUES (:destId, :name, :ageRange, :gender, :location, :language, :interests, :painPoints, :channels, :toneNotes, :isPrimary)`,
      { replacements: {
        destId, name, ageRange: age_range || null, gender: gender || null,
        location: location || null, language: language || null,
        interests: interests || null, painPoints: pain_points || null,
        channels: JSON.stringify(preferred_channels || []),
        toneNotes: tone_notes || null, isPrimary: is_primary ? 1 : 0
      }, type: QueryTypes.INSERT }
    );

    res.status(201).json({ success: true, data: { id: result, name, destination_id: destId } });
  } catch (error) {
    logger.error('[AdminPortal] Create persona error:', error);
    res.status(500).json({ success: false, error: { code: 'PERSONA_CREATE_ERROR', message: error.message } });
  }
});

/**
 * PUT /brand-profile/personas/:id — Update persona
 */
router.put('/brand-profile/personas/:id', adminAuth('destination_admin'), writeAccess(['platform_admin', 'destination_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const fields = ['name', 'age_range', 'gender', 'location', 'language', 'interests', 'pain_points', 'preferred_channels', 'tone_notes', 'is_primary', 'sort_order'];
    const sets = [];
    const replacements = { id: Number(id) };

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        const col = f;
        if (f === 'preferred_channels') {
          sets.push(`${col} = :${f}`);
          replacements[f] = JSON.stringify(req.body[f]);
        } else if (f === 'is_primary') {
          sets.push(`${col} = :${f}`);
          replacements[f] = req.body[f] ? 1 : 0;
        } else {
          sets.push(`${col} = :${f}`);
          replacements[f] = req.body[f];
        }
      }
    }
    if (sets.length === 0) return res.status(400).json({ success: false, error: { code: 'NO_FIELDS', message: 'No fields to update' } });

    await mysqlSequelize.query(
      `UPDATE audience_personas SET ${sets.join(', ')}, updated_at = NOW() WHERE id = :id`,
      { replacements }
    );
    res.json({ success: true, data: { id: Number(id), updated: true } });
  } catch (error) {
    logger.error('[AdminPortal] Update persona error:', error);
    res.status(500).json({ success: false, error: { code: 'PERSONA_UPDATE_ERROR', message: error.message } });
  }
});

/**
 * DELETE /brand-profile/personas/:id — Delete persona
 */
router.delete('/brand-profile/personas/:id', adminAuth('destination_admin'), writeAccess(['platform_admin', 'destination_admin']), async (req, res) => {
  try {
    await mysqlSequelize.query('DELETE FROM audience_personas WHERE id = :id', { replacements: { id: Number(req.params.id) } });
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error('[AdminPortal] Delete persona error:', error);
    res.status(500).json({ success: false, error: { code: 'PERSONA_DELETE_ERROR', message: error.message } });
  }
});

// --- KNOWLEDGE BASE ---

/**
 * GET /brand-profile/knowledge — List knowledge items
 */
router.get('/brand-profile/knowledge', adminAuth('editor'), async (req, res) => {
  try {
    const destId = getBrandDestId(req);
    const [items] = await mysqlSequelize.query(
      'SELECT id, destination_id, source_type, source_name, source_url, word_count, file_path, last_scanned_at, created_at FROM brand_knowledge WHERE destination_id = :destId ORDER BY created_at DESC',
      { replacements: { destId } }
    );
    // Summary stats
    const totalWords = items.reduce((s, i) => s + (i.word_count || 0), 0);
    res.json({ success: true, data: { items, totalSources: items.length, totalWords } });
  } catch (error) {
    logger.error('[AdminPortal] List knowledge error:', error);
    res.status(500).json({ success: false, error: { code: 'KNOWLEDGE_LIST_ERROR', message: error.message } });
  }
});

/**
 * POST /brand-profile/knowledge — Add knowledge item (text, URL, or document reference)
 */
router.post('/brand-profile/knowledge', adminAuth('destination_admin'), writeAccess(['platform_admin', 'destination_admin']), async (req, res) => {
  try {
    const destId = getBrandDestId(req);
    const { source_type, source_name, source_url, content_text } = req.body;

    if (!source_type || !['document', 'url', 'text'].includes(source_type)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TYPE', message: 'source_type must be document, url, or text' } });
    }

    let text = content_text || '';
    let wordCount = 0;

    // For URL: fetch and extract text
    if (source_type === 'url' && source_url) {
      try {
        const response = await fetch(source_url, { headers: { 'User-Agent': 'HolidaiButler/1.0' }, signal: AbortSignal.timeout(10000) });
        const html = await response.text();
        // Strip HTML tags, scripts, styles
        text = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 50000); // limit to ~50k chars
      } catch (fetchErr) {
        logger.warn('[BrandKnowledge] URL fetch failed:', fetchErr.message);
        text = `[Could not fetch URL: ${fetchErr.message}]`;
      }
    }

    wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

    const [result] = await mysqlSequelize.query(
      `INSERT INTO brand_knowledge (destination_id, source_type, source_name, source_url, content_text, word_count, last_scanned_at)
       VALUES (:destId, :sourceType, :sourceName, :sourceUrl, :contentText, :wordCount, NOW())`,
      { replacements: {
        destId, sourceType: source_type,
        sourceName: source_name || source_url || 'Untitled',
        sourceUrl: source_url || null,
        contentText: text, wordCount
      }, type: QueryTypes.INSERT }
    );

    res.status(201).json({ success: true, data: { id: result, source_type, source_name: source_name || source_url, word_count: wordCount } });
  } catch (error) {
    logger.error('[AdminPortal] Create knowledge error:', error);
    res.status(500).json({ success: false, error: { code: 'KNOWLEDGE_CREATE_ERROR', message: error.message } });
  }
});

/**
 * POST /brand-profile/knowledge/upload — Upload document (PDF, DOCX, TXT) and parse to text
 */
const KNOWLEDGE_DIR = path.join(STORAGE_ROOT, 'knowledge');
const knowledgeStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
    cb(null, KNOWLEDGE_DIR);
  },
  filename: (req, file, cb) => {
    const destId = getBrandDestId(req);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${destId}_${Date.now()}${ext}`);
  }
});
const knowledgeUpload = multer({
  storage: knowledgeStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv', 'application/msword'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(file.mimetype) || ['.pdf', '.docx', '.doc', '.txt', '.csv'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, TXT, and CSV files are allowed'));
    }
  }
});

router.post('/brand-profile/knowledge/upload', adminAuth('destination_admin'), writeAccess(['platform_admin', 'destination_admin']), (req, res) => {
  knowledgeUpload.single('file')(req, res, async (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 40MB)' : err.message;
      return res.status(400).json({ success: false, error: { code: 'UPLOAD_ERROR', message } });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded' } });
    }

    try {
      const destId = getBrandDestId(req);
      const filePath = req.file.path;
      const ext = path.extname(req.file.originalname).toLowerCase();
      let text = '';

      // Parse based on file type
      if (ext === '.pdf') {
        const pdfParse = (await import('pdf-parse')).default;
        const pdfBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(pdfBuffer);
        text = pdfData.text || '';
        logger.info(`[BrandKnowledge] Parsed PDF: ${pdfData.numpages} pages, ${text.length} chars`);
      } else if (ext === '.docx' || ext === '.doc') {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value || '';
        logger.info(`[BrandKnowledge] Parsed DOCX: ${text.length} chars`);
      } else if (ext === '.txt' || ext === '.csv') {
        text = fs.readFileSync(filePath, 'utf-8');
        logger.info(`[BrandKnowledge] Read TXT/CSV: ${text.length} chars`);
      }

      // Trim to reasonable size (50k chars max for DB storage)
      if (text.length > 50000) text = text.substring(0, 50000);
      const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

      const [result] = await mysqlSequelize.query(
        `INSERT INTO brand_knowledge (destination_id, source_type, source_name, content_text, word_count, file_path, last_scanned_at)
         VALUES (:destId, 'document', :sourceName, :contentText, :wordCount, :filePath, NOW())`,
        { replacements: {
          destId,
          sourceName: req.file.originalname,
          contentText: text,
          wordCount,
          filePath: `/knowledge/${req.file.filename}`
        }, type: QueryTypes.INSERT }
      );

      res.status(201).json({
        success: true,
        data: {
          id: result,
          source_type: 'document',
          source_name: req.file.originalname,
          word_count: wordCount,
          file_size: req.file.size,
          pages: ext === '.pdf' ? Math.ceil(text.length / 3000) : null
        }
      });
    } catch (error) {
      logger.error('[AdminPortal] Knowledge upload parse error:', error);
      res.status(500).json({ success: false, error: { code: 'PARSE_ERROR', message: error.message } });
    }
  });
});

/**
 * DELETE /brand-profile/knowledge/:id — Delete knowledge item
 */
router.delete('/brand-profile/knowledge/:id', adminAuth('destination_admin'), writeAccess(['platform_admin', 'destination_admin']), async (req, res) => {
  try {
    await mysqlSequelize.query('DELETE FROM brand_knowledge WHERE id = :id', { replacements: { id: Number(req.params.id) } });
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error('[AdminPortal] Delete knowledge error:', error);
    res.status(500).json({ success: false, error: { code: 'KNOWLEDGE_DELETE_ERROR', message: error.message } });
  }
});

// --- COMPETITORS ---

/**
 * GET /brand-profile/competitors — List competitors
 */
router.get('/brand-profile/competitors', adminAuth('editor'), async (req, res) => {
  try {
    const destId = getBrandDestId(req);
    const [items] = await mysqlSequelize.query(
      'SELECT * FROM brand_competitors WHERE destination_id = :destId ORDER BY created_at DESC',
      { replacements: { destId } }
    );
    res.json({ success: true, data: items });
  } catch (error) {
    logger.error('[AdminPortal] List competitors error:', error);
    res.status(500).json({ success: false, error: { code: 'COMPETITORS_LIST_ERROR', message: error.message } });
  }
});

/**
 * POST /brand-profile/competitors — Add competitor
 */
router.post('/brand-profile/competitors', adminAuth('destination_admin'), writeAccess(['platform_admin', 'destination_admin']), async (req, res) => {
  try {
    const destId = getBrandDestId(req);
    const { name, website_url } = req.body;
    if (!name) return res.status(400).json({ success: false, error: { code: 'MISSING_NAME', message: 'name is required' } });

    const [result] = await mysqlSequelize.query(
      'INSERT INTO brand_competitors (destination_id, name, website_url) VALUES (:destId, :name, :url)',
      { replacements: { destId, name, url: website_url || null }, type: QueryTypes.INSERT }
    );
    res.status(201).json({ success: true, data: { id: result, name, website_url } });
  } catch (error) {
    logger.error('[AdminPortal] Create competitor error:', error);
    res.status(500).json({ success: false, error: { code: 'COMPETITOR_CREATE_ERROR', message: error.message } });
  }
});

/**
 * POST /brand-profile/competitors/:id/analyze — Analyze competitor website
 */
router.post('/brand-profile/competitors/:id/analyze', adminAuth('destination_admin'), writeAccess(['platform_admin', 'destination_admin']), async (req, res) => {
  try {
    const [[competitor]] = await mysqlSequelize.query(
      `SELECT bc.id, bc.name, bc.website_url, bc.destination_id, d.default_language
       FROM brand_competitors bc JOIN destinations d ON bc.destination_id = d.id
       WHERE bc.id = :id`,
      { replacements: { id: Number(req.params.id) } }
    );
    if (!competitor) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Competitor not found' } });
    if (!competitor.website_url) return res.status(400).json({ success: false, error: { code: 'NO_URL', message: 'Competitor has no website URL' } });

    const LANG_NAMES = { nl: 'Dutch', en: 'English', de: 'German', es: 'Spanish', fr: 'French' };
    const langName = LANG_NAMES[competitor.default_language] || 'Dutch';

    // Fetch website
    let pageText = '';
    try {
      const response = await fetch(competitor.website_url, { headers: { 'User-Agent': 'HolidaiButler/1.0' }, signal: AbortSignal.timeout(10000) });
      const html = await response.text();
      pageText = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 5000);
    } catch (fetchErr) {
      return res.status(400).json({ success: false, error: { code: 'FETCH_FAILED', message: `Could not fetch website: ${fetchErr.message}` } });
    }

    // Analyze with Mistral AI
    const embeddingService = (await import('../services/holibot/embeddingService.js')).default;
    if (!embeddingService.isConfigured) embeddingService.initialize();

    const aiResponse = await embeddingService.generateChatCompletion([
      { role: 'system', content: `You are a competitive analysis expert. IMPORTANT: write ALL output in ${langName}. Analyze the website content and return a JSON object with: positioning (string in ${langName}), core_themes (string[] in ${langName}), content_frequency (string in ${langName}), channels (string[]), differentiation_opportunities (string[] in ${langName}).` },
      { role: 'user', content: `Analyze this competitor website for "${competitor.name}":\n\n${pageText}\n\nReturn JSON only, all text in ${langName}.` }
    ], { temperature: 0.3, maxTokens: 1000 });

    let analysis = {};
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) analysis = JSON.parse(jsonMatch[0]);
    } catch { analysis = { raw: aiResponse }; }

    const summary = JSON.stringify(analysis);
    await mysqlSequelize.query(
      'UPDATE brand_competitors SET analysis_summary = :summary, last_analyzed_at = NOW() WHERE id = :id',
      { replacements: { summary, id: competitor.id } }
    );

    res.json({ success: true, data: { id: competitor.id, name: competitor.name, analysis } });
  } catch (error) {
    logger.error('[AdminPortal] Analyze competitor error:', error);
    res.status(500).json({ success: false, error: { code: 'COMPETITOR_ANALYZE_ERROR', message: error.message } });
  }
});

/**
 * DELETE /brand-profile/competitors/:id — Delete competitor
 */
router.delete('/brand-profile/competitors/:id', adminAuth('destination_admin'), writeAccess(['platform_admin', 'destination_admin']), async (req, res) => {
  try {
    await mysqlSequelize.query('DELETE FROM brand_competitors WHERE id = :id', { replacements: { id: Number(req.params.id) } });
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error('[AdminPortal] Delete competitor error:', error);
    res.status(500).json({ success: false, error: { code: 'COMPETITOR_DELETE_ERROR', message: error.message } });
  }
});

// --- WEBSITE ANALYSIS ---

/**
 * POST /brand-profile/analyze-website — Scan URL for tone/style/themes
 */
router.post('/brand-profile/analyze-website', adminAuth('destination_admin'), writeAccess(['platform_admin', 'destination_admin']), async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: { code: 'MISSING_URL', message: 'url is required' } });

    const destId = getBrandDestId(req);

    // Get destination language for output
    let destLang = 'nl';
    try {
      const [[destRow]] = await mysqlSequelize.query('SELECT default_language FROM destinations WHERE id = :id', { replacements: { id: destId } });
      if (destRow?.default_language) destLang = destRow.default_language;
    } catch { /* fallback nl */ }
    const LANG_NAMES = { nl: 'Dutch', en: 'English', de: 'German', es: 'Spanish', fr: 'French' };
    const langName = LANG_NAMES[destLang] || 'Dutch';

    // Fetch
    let pageText = '';
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'HolidaiButler/1.0' }, signal: AbortSignal.timeout(10000) });
      const html = await response.text();
      pageText = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 8000);
    } catch (fetchErr) {
      return res.status(400).json({ success: false, error: { code: 'FETCH_FAILED', message: `Could not fetch website: ${fetchErr.message}` } });
    }

    // Analyze with Mistral AI
    const embeddingService = (await import('../services/holibot/embeddingService.js')).default;
    if (!embeddingService.isConfigured) embeddingService.initialize();

    const aiResponse = await embeddingService.generateChatCompletion([
      { role: 'system', content: `Analyze this website and extract the following. IMPORTANT: write ALL output in ${langName}.

1. Tone of voice (formeel/informeel, speels/zakelijk, etc.)
2. Core themes and topics
3. Target audience indicators
4. Key USPs mentioned
5. Writing style characteristics

Return as JSON with fields: tone (string in ${langName}), themes (string[] in ${langName}), audience_indicators (string[] in ${langName}), usps (string[] in ${langName}), writing_style (string in ${langName})` },
      { role: 'user', content: `Website URL: ${url}\n\nWebsite content:\n${pageText}` }
    ], { temperature: 0.3, maxTokens: 1500 });

    let analysis = {};
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) analysis = JSON.parse(jsonMatch[0]);
    } catch { analysis = { raw: aiResponse }; }

    res.json({ success: true, data: { url, analysis } });
  } catch (error) {
    logger.error('[AdminPortal] Analyze website error:', error);
    res.status(500).json({ success: false, error: { code: 'WEBSITE_ANALYZE_ERROR', message: error.message } });
  }
});

// ============================================================
// MEDIA LIBRARY (Wave 2 — W2.5) — 4 endpoints
// ============================================================

const MEDIA_DIR = path.join(STORAGE_ROOT, 'media');

const mediaStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const destId = req.body.destination_id || req.headers['x-destination-id'] || '0';
    const dir = path.join(MEDIA_DIR, String(destId));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`);
  }
});

const mediaUpload = multer({
  storage: mediaStorage,
  limits: { fileSize: 40 * 1024 * 1024 }, // 40 MB (video support)
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif',
      'video/mp4', 'video/webm',
      'application/pdf', 'application/gpx+xml', 'application/octet-stream'
    ];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.gpx')) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  }
});

/**
 * POST /media/upload — Upload files to media library (multi-file, max 10)
 */
router.post('/media/upload', adminAuth('editor'), (req, res) => {
  mediaUpload.array('files', 50)(req, res, async (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 40MB)' : err.message;
      return res.status(400).json({ success: false, error: { code: 'UPLOAD_ERROR', message } });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILES', message: 'No files uploaded' } });
    }

    try {
      const destinationId = parseInt(req.body.destination_id || req.headers['x-destination-id']);
      const category = req.body.category || 'other';
      const results = [];

      for (const file of req.files) {
        const isImage = file.mimetype.startsWith('image/');
        let width = null, height = null;

        // Try to get image dimensions (basic, no sharp dependency)
        if (isImage && file.mimetype === 'image/png') {
          try {
            const buf = fs.readFileSync(file.path);
            width = buf.readUInt32BE(16);
            height = buf.readUInt32BE(20);
          } catch { /* ignore */ }
        }

        await mysqlSequelize.query(
          `INSERT INTO media (destination_id, filename, original_name, mime_type, size_bytes, width, height, category, uploaded_by)
           VALUES (:destId, :filename, :originalName, :mimeType, :sizeBytes, :width, :height, :category, :uploadedBy)`,
          {
            replacements: {
              destId: destinationId,
              filename: file.filename,
              originalName: file.originalname,
              mimeType: file.mimetype,
              sizeBytes: file.size,
              width,
              height,
              category,
              uploadedBy: req.adminUser?.id || null
            },
            type: QueryTypes.INSERT
          }
        );

        const [mediaItem] = await mysqlSequelize.query(
          'SELECT * FROM media WHERE filename = :filename ORDER BY id DESC LIMIT 1',
          { replacements: { filename: file.filename }, type: QueryTypes.SELECT }
        );

        results.push({
          ...mediaItem,
          url: `/media-files/${destinationId}/${file.filename}`
        });
      }

      res.status(201).json({ success: true, data: { files: results } });
    } catch (error) {
      logger.error('[AdminPortal] Media upload error:', error);
      res.status(500).json({ success: false, error: { code: 'MEDIA_UPLOAD_ERROR', message: error.message } });
    }
  });
});

/**
 * GET /media — List media files per destination (filterable by category)
 */
router.get('/media', adminAuth('reviewer'), destinationScope, async (req, res) => {
  try {
    const destinationId = resolveDestinationId(req.query.destinationId || req.query.destination || req.headers['x-destination-id']);
    const category = req.query.category;
    const search = req.query.search;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;

    let where = 'WHERE m.destination_id = :destId';
    const replacements = { destId: destinationId, limit, offset };

    if (category && category !== 'all') {
      where += ' AND m.category = :category';
      replacements.category = category;
    }
    if (search) {
      where += ' AND (m.original_name LIKE :search OR m.alt_text LIKE :search)';
      replacements.search = `%${search}%`;
    }

    const [countResult] = await mysqlSequelize.query(
      `SELECT COUNT(*) AS total FROM media m ${where}`,
      { replacements, type: QueryTypes.SELECT }
    );

    const items = await mysqlSequelize.query(
      `SELECT m.* FROM media m ${where} ORDER BY m.created_at DESC LIMIT :limit OFFSET :offset`,
      { replacements, type: QueryTypes.SELECT }
    );

    // Add URL to each item
    const filesWithUrl = items.map(item => ({
      ...item,
      url: `/media-files/${item.destination_id}/${item.filename}`
    }));

    res.json({
      success: true,
      data: {
        files: filesWithUrl,
        pagination: { page, limit, total: countResult.total, totalPages: Math.ceil(countResult.total / limit) }
      }
    });
  } catch (error) {
    logger.error('[AdminPortal] Media list error:', error);
    res.status(500).json({ success: false, error: { code: 'MEDIA_LIST_ERROR', message: error.message } });
  }
});

/**
 * PUT /media/:id — Update media metadata (alt_text, category)
 */
router.put('/media/:id', adminAuth('editor'), async (req, res) => {
  try {
    const mediaId = parseInt(req.params.id);
    const [existing] = await mysqlSequelize.query('SELECT * FROM media WHERE id = :id', { replacements: { id: mediaId }, type: QueryTypes.SELECT });
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'MEDIA_NOT_FOUND', message: 'Media item not found' } });
    }

    const sets = [];
    const replacements = { id: mediaId };
    if (req.body.alt_text !== undefined) { sets.push('alt_text = :altText'); replacements.altText = req.body.alt_text; }
    if (req.body.category !== undefined) { sets.push('category = :category'); replacements.category = req.body.category; }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_CHANGES', message: 'No fields to update' } });
    }

    await mysqlSequelize.query(`UPDATE media SET ${sets.join(', ')} WHERE id = :id`, { replacements, type: QueryTypes.UPDATE });
    const [updated] = await mysqlSequelize.query('SELECT * FROM media WHERE id = :id', { replacements: { id: mediaId }, type: QueryTypes.SELECT });
    updated.url = `/media-files/${updated.destination_id}/${updated.filename}`;

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('[AdminPortal] Media update error:', error);
    res.status(500).json({ success: false, error: { code: 'MEDIA_UPDATE_ERROR', message: error.message } });
  }
});

/**
 * DELETE /media/:id — Delete media file + DB record
 */
router.delete('/media/:id', adminAuth('platform_admin'), async (req, res) => {
  try {
    const mediaId = parseInt(req.params.id);
    const [existing] = await mysqlSequelize.query('SELECT * FROM media WHERE id = :id', { replacements: { id: mediaId }, type: QueryTypes.SELECT });
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'MEDIA_NOT_FOUND', message: 'Media item not found' } });
    }

    // Delete physical file
    const filePath = path.join(MEDIA_DIR, String(existing.destination_id), existing.filename);
    try { fs.unlinkSync(filePath); } catch { /* file may already be gone */ }

    await mysqlSequelize.query('DELETE FROM media WHERE id = :id', { replacements: { id: mediaId }, type: QueryTypes.DELETE });

    // Audit log
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.collection('audit_logs').insertOne({
          action: 'media_deleted', entity_type: 'media', entity_id: mediaId,
          admin_email: req.adminUser.email, changes: { filename: existing.original_name, category: existing.category },
          timestamp: new Date(), actor: { type: 'admin', name: 'admin-portal' }
        });
      }
    } catch { /* non-critical */ }

    res.json({ success: true, data: { message: 'Media deleted', id: mediaId } });
  } catch (error) {
    logger.error('[AdminPortal] Media delete error:', error);
    res.status(500).json({ success: false, error: { code: 'MEDIA_DELETE_ERROR', message: error.message } });
  }
});

// ============================================================
// PAGE DUPLICATE (Wave 3 — W3.1) — 1 endpoint
// ============================================================

/**
 * POST /pages/:id/duplicate — Duplicate a page (blocks + data + SEO, slug=slug-kopie, status=draft)
 */
router.post('/pages/:id/duplicate', adminAuth('platform_admin'), async (req, res) => {
  try {
    const pageId = parseInt(req.params.id);
    const [source] = await mysqlSequelize.query('SELECT * FROM pages WHERE id = :id', { replacements: { id: pageId }, type: QueryTypes.SELECT });
    if (!source) {
      return res.status(404).json({ success: false, error: { code: 'PAGE_NOT_FOUND', message: 'Source page not found' } });
    }

    // Generate unique slug
    let newSlug = `${source.slug}-kopie`;
    let slugCounter = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const [dup] = await mysqlSequelize.query(
        'SELECT id FROM pages WHERE destination_id = :destId AND slug = :slug',
        { replacements: { destId: source.destination_id, slug: newSlug }, type: QueryTypes.SELECT }
      );
      if (!dup) break;
      slugCounter++;
      newSlug = `${source.slug}-kopie-${slugCounter}`;
    }

    // Get max sort_order
    const [maxSort] = await mysqlSequelize.query(
      'SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM pages WHERE destination_id = :destId',
      { replacements: { destId: source.destination_id }, type: QueryTypes.SELECT }
    );

    const layoutStr = typeof source.layout === 'string' ? source.layout : JSON.stringify(source.layout || { blocks: [] });

    await mysqlSequelize.query(
      `INSERT INTO pages (destination_id, slug, title_nl, title_en, title_de, title_es,
       seo_title_nl, seo_title_en, seo_title_de, seo_title_es,
       seo_description_nl, seo_description_en, seo_description_de, seo_description_es,
       og_image_url, og_image_path, parent_id, layout, status, sort_order)
       VALUES (:destId, :slug, :titleNl, :titleEn, :titleDe, :titleEs,
       :seoTitleNl, :seoTitleEn, :seoTitleDe, :seoTitleEs,
       :seoDescNl, :seoDescEn, :seoDescDe, :seoDescEs,
       :ogImageUrl, :ogImagePath, :parentId, :layout, 'draft', :sortOrder)`,
      {
        replacements: {
          destId: source.destination_id,
          slug: newSlug,
          titleNl: source.title_nl ? `${source.title_nl} (kopie)` : null,
          titleEn: `${source.title_en} (copy)`,
          titleDe: source.title_de ? `${source.title_de} (Kopie)` : null,
          titleEs: source.title_es ? `${source.title_es} (copia)` : null,
          seoTitleNl: source.seo_title_nl || null,
          seoTitleEn: source.seo_title_en || null,
          seoTitleDe: source.seo_title_de || null,
          seoTitleEs: source.seo_title_es || null,
          seoDescNl: source.seo_description_nl || null,
          seoDescEn: source.seo_description_en || null,
          seoDescDe: source.seo_description_de || null,
          seoDescEs: source.seo_description_es || null,
          ogImageUrl: source.og_image_url || null,
          ogImagePath: source.og_image_path || null,
          parentId: source.parent_id || null,
          layout: layoutStr,
          sortOrder: (maxSort?.max_sort ?? -1) + 1
        },
        type: QueryTypes.INSERT
      }
    );

    const [newPage] = await mysqlSequelize.query(
      'SELECT * FROM pages WHERE destination_id = :destId AND slug = :slug',
      { replacements: { destId: source.destination_id, slug: newSlug }, type: QueryTypes.SELECT }
    );

    // Audit log
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.collection('audit_logs').insertOne({
          action: 'page_duplicated', entity_type: 'page', entity_id: newPage?.id,
          admin_email: req.adminUser.email, changes: { source_id: pageId, source_slug: source.slug, new_slug: newSlug },
          timestamp: new Date(), actor: { type: 'admin', name: 'admin-portal' }
        });
      }
    } catch { /* non-critical */ }

    let layout = { blocks: [] };
    try { layout = typeof newPage.layout === 'string' ? JSON.parse(newPage.layout) : (newPage.layout || { blocks: [] }); } catch { /* empty */ }

    res.status(201).json({ success: true, data: { ...newPage, layout } });
  } catch (error) {
    logger.error('[AdminPortal] Page duplicate error:', error);
    res.status(500).json({ success: false, error: { code: 'PAGE_DUPLICATE_ERROR', message: error.message } });
  }
});

// ============================================================
// PAGE REVISIONS (Wave 3 — W3.2) — 3 endpoints
// ============================================================

/**
 * GET /pages/:id/revisions — List revisions for a page (newest first, max 20)
 */
router.get('/pages/:id/revisions', adminAuth('reviewer'), async (req, res) => {
  try {
    const pageId = parseInt(req.params.id);
    const [page] = await mysqlSequelize.query('SELECT id FROM pages WHERE id = :id', { replacements: { id: pageId }, type: QueryTypes.SELECT });
    if (!page) {
      return res.status(404).json({ success: false, error: { code: 'PAGE_NOT_FOUND', message: 'Page not found' } });
    }

    const revisions = await mysqlSequelize.query(
      `SELECT r.id, r.page_id, r.title_nl, r.changed_by, r.change_summary, r.created_at,
              a.email AS changed_by_email
       FROM page_revisions r
       LEFT JOIN admin_users a ON a.id = r.changed_by
       WHERE r.page_id = :pageId
       ORDER BY r.created_at DESC
       LIMIT 20`,
      { replacements: { pageId }, type: QueryTypes.SELECT }
    );

    res.json({ success: true, data: { revisions } });
  } catch (error) {
    logger.error('[AdminPortal] Page revisions list error:', error);
    res.status(500).json({ success: false, error: { code: 'REVISIONS_LIST_ERROR', message: error.message } });
  }
});

/**
 * GET /pages/:id/revisions/:revId — Get a specific revision with full layout
 */
router.get('/pages/:id/revisions/:revId', adminAuth('reviewer'), async (req, res) => {
  try {
    const [revision] = await mysqlSequelize.query(
      `SELECT r.*, a.email AS changed_by_email
       FROM page_revisions r
       LEFT JOIN admin_users a ON a.id = r.changed_by
       WHERE r.id = :revId AND r.page_id = :pageId`,
      { replacements: { revId: parseInt(req.params.revId), pageId: parseInt(req.params.id) }, type: QueryTypes.SELECT }
    );

    if (!revision) {
      return res.status(404).json({ success: false, error: { code: 'REVISION_NOT_FOUND', message: 'Revision not found' } });
    }

    let layout = { blocks: [] };
    try { layout = typeof revision.layout === 'string' ? JSON.parse(revision.layout) : (revision.layout || { blocks: [] }); } catch { /* empty */ }

    res.json({ success: true, data: { ...revision, layout } });
  } catch (error) {
    logger.error('[AdminPortal] Revision detail error:', error);
    res.status(500).json({ success: false, error: { code: 'REVISION_DETAIL_ERROR', message: error.message } });
  }
});

/**
 * POST /pages/:id/revisions/:revId/restore — Restore a previous revision
 */
router.post('/pages/:id/revisions/:revId/restore', adminAuth('platform_admin'), async (req, res) => {
  try {
    const pageId = parseInt(req.params.id);
    const revId = parseInt(req.params.revId);

    const [revision] = await mysqlSequelize.query(
      'SELECT * FROM page_revisions WHERE id = :revId AND page_id = :pageId',
      { replacements: { revId, pageId }, type: QueryTypes.SELECT }
    );
    if (!revision) {
      return res.status(404).json({ success: false, error: { code: 'REVISION_NOT_FOUND', message: 'Revision not found' } });
    }

    // Snapshot current state before restoring
    const [currentPage] = await mysqlSequelize.query('SELECT * FROM pages WHERE id = :id', { replacements: { id: pageId }, type: QueryTypes.SELECT });
    if (currentPage) {
      const currentLayout = typeof currentPage.layout === 'string' ? currentPage.layout : JSON.stringify(currentPage.layout || { blocks: [] });
      await mysqlSequelize.query(
        `INSERT INTO page_revisions (page_id, layout, title_nl, changed_by, change_summary)
         VALUES (:pageId, :layout, :titleNl, :changedBy, :summary)`,
        {
          replacements: {
            pageId,
            layout: currentLayout,
            titleNl: currentPage.title_nl,
            changedBy: req.adminUser?.id || null,
            summary: `Auto-snapshot before restore from revision #${revId}`
          },
          type: QueryTypes.INSERT
        }
      );

      // Prune old revisions (keep max 20)
      await mysqlSequelize.query(
        `DELETE FROM page_revisions WHERE page_id = :pageId AND id NOT IN (
           SELECT id FROM (SELECT id FROM page_revisions WHERE page_id = :pageId ORDER BY created_at DESC LIMIT 20) AS keep
         )`,
        { replacements: { pageId }, type: QueryTypes.DELETE }
      );
    }

    // Restore the revision to the current page
    const revLayout = typeof revision.layout === 'string' ? revision.layout : JSON.stringify(revision.layout);
    await mysqlSequelize.query(
      `UPDATE pages SET layout = :layout, title_nl = COALESCE(:titleNl, title_nl), updated_at = NOW() WHERE id = :id`,
      { replacements: { layout: revLayout, titleNl: revision.title_nl, id: pageId }, type: QueryTypes.UPDATE }
    );

    const [restored] = await mysqlSequelize.query('SELECT * FROM pages WHERE id = :id', { replacements: { id: pageId }, type: QueryTypes.SELECT });
    let layout = { blocks: [] };
    try { layout = typeof restored.layout === 'string' ? JSON.parse(restored.layout) : (restored.layout || { blocks: [] }); } catch { /* empty */ }

    // Audit log
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.collection('audit_logs').insertOne({
          action: 'page_revision_restored', entity_type: 'page', entity_id: pageId,
          admin_email: req.adminUser.email, changes: { revision_id: revId, change_summary: revision.change_summary },
          timestamp: new Date(), actor: { type: 'admin', name: 'admin-portal' }
        });
      }
    } catch { /* non-critical */ }

    res.json({ success: true, data: { ...restored, layout } });
  } catch (error) {
    logger.error('[AdminPortal] Revision restore error:', error);
    res.status(500).json({ success: false, error: { code: 'REVISION_RESTORE_ERROR', message: error.message } });
  }
});

/**
 * POST /admin-portal/translate
 * Auto-translate texts using Mistral AI
 * Body: { texts: [{key, value}], sourceLang, targetLangs }
 */
router.post('/translate', adminAuth(), writeAccess(['platform_admin']), async (req, res) => {
  try {
    const { texts, sourceLang, targetLangs } = req.body;
    if (!Array.isArray(texts) || !texts.length) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TEXTS', message: 'texts must be a non-empty array of {key, value}' } });
    }
    if (!sourceLang || !Array.isArray(targetLangs) || !targetLangs.length) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_LANGS', message: 'sourceLang and targetLangs are required' } });
    }
    // Dynamic import to avoid loading Mistral SDK at startup
    const { translateTexts } = await import('../services/translationService.js');
    const translations = await translateTexts(texts, sourceLang, targetLangs);
    res.json({ success: true, data: { translations } });
  } catch (error) {
    logger.error('[AdminPortal] Translation error:', error);
    res.status(500).json({ success: false, error: { code: 'TRANSLATION_ERROR', message: error.message } });
  }
});

// ==========================================
// Onboarding — New Destination Wizard (Cmd v12)
// ==========================================

/**
 * POST /admin-portal/onboarding/create
 * Create a new destination with branding, feature flags, pages, and navigation.
 * RBAC: platform_admin only
 * Body: { name, slug, domains, language, timezone, branding, featureFlags, navigation, pages }
 */
router.post('/onboarding/create', adminAuth('platform_admin'), async (req, res) => {
  try {
    const { name, slug, domains, language, timezone, branding, featureFlags, navigation, pages, destinationType, contactPerson, contactEmail, targetLanguages } = req.body;

    // Validation
    if (!name || !slug) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'name and slug are required' } });
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    const destType = destinationType === 'content_only' ? 'content_only' : 'tourism';

    // Check slug uniqueness
    const [existing] = await mysqlSequelize.query(
      'SELECT id FROM destinations WHERE code = :code',
      { replacements: { code: cleanSlug }, type: QueryTypes.SELECT }
    );
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE_SLUG', message: `Destination with code "${cleanSlug}" already exists` } });
    }

    // Build JSON fields — content_only gets default flags
    const effectiveFlags = destType === 'content_only'
      ? { ...CONTENT_ONLY_DEFAULT_FLAGS, ...(featureFlags || {}) }
      : (featureFlags || {});
    const brandingJson = JSON.stringify(branding || {});
    const featureFlagsJson = JSON.stringify(effectiveFlags);
    const supportedLanguages = JSON.stringify([language || 'en']);
    const configJson = JSON.stringify({ nav_items: navigation || [] });

    // 1. INSERT destination
    const [insertResult] = await mysqlSequelize.query(
      `INSERT INTO destinations (code, name, display_name, domain, country, region, timezone, currency, default_language, supported_languages, feature_flags, branding, config, is_active, destination_type)
       VALUES (:code, :name, :displayName, :domain, '', '', :timezone, 'EUR', :language, :supportedLanguages, :featureFlags, :branding, :config, 1, :destType)`,
      {
        replacements: {
          code: cleanSlug,
          name: name,
          displayName: name,
          domain: Array.isArray(domains) && domains.length > 0 ? domains[0] : `${cleanSlug}.holidaibutler.com`,
          timezone: timezone || 'Europe/Amsterdam',
          language: language || 'en',
          supportedLanguages,
          featureFlags: featureFlagsJson,
          branding: brandingJson,
          config: configJson,
          destType
        },
        type: QueryTypes.INSERT
      }
    );

    const destinationId = insertResult;

    // 2. INSERT pages from selected templates
    const pageTemplates = {
      home:        { slug: 'home',        title_en: 'Home',        title_nl: 'Home',         title_de: 'Startseite',   title_es: 'Inicio',       layout: { blocks: [{ type: 'Hero', props: { title: { en: `Welcome to ${name}`, nl: `Welkom bij ${name}`, de: `Willkommen bei ${name}`, es: `Bienvenido a ${name}` }, height: 'default' } }, { type: 'PoiGridFiltered', props: {} }] } },
      explore:     { slug: 'explore',     title_en: 'Explore',     title_nl: 'Ontdekken',    title_de: 'Entdecken',    title_es: 'Explorar',     layout: { blocks: [{ type: 'PoiGridFiltered', props: {} }] } },
      restaurants: { slug: 'restaurants', title_en: 'Restaurants', title_nl: 'Restaurants',  title_de: 'Restaurants',  title_es: 'Restaurantes', layout: { blocks: [{ type: 'PoiGridFiltered', props: { categoryFilter: ['Food & Drinks'] } }] } },
      events:      { slug: 'events',      title_en: 'Events',      title_nl: 'Evenementen',  title_de: 'Veranstaltungen', title_es: 'Eventos',  layout: { blocks: [{ type: 'EventCalendarFiltered', props: {} }] } },
      contact:     { slug: 'contact',     title_en: 'Contact',     title_nl: 'Contact',      title_de: 'Kontakt',     title_es: 'Contacto',     layout: { blocks: [{ type: 'ContactForm', props: {} }] } },
      about:       { slug: 'about',       title_en: 'About Us',    title_nl: 'Over ons',     title_de: 'Über uns',    title_es: 'Sobre nosotros', layout: { blocks: [{ type: 'RichText', props: { content: { en: `About ${name}`, nl: `Over ${name}`, de: `Über ${name}`, es: `Sobre ${name}` } } }] } }
    };

    // Content-only destinations: no tourism pages (no explore, restaurants, events)
    const defaultPages = destType === 'content_only'
      ? [] // content_only gets no website pages (no customer portal)
      : ['home', 'explore', 'restaurants', 'events', 'contact', 'about'];
    const selectedPages = Array.isArray(pages) ? pages : defaultPages;
    let sortOrder = 0;

    for (const pageKey of selectedPages) {
      const tmpl = pageTemplates[pageKey];
      if (!tmpl) continue;

      await mysqlSequelize.query(
        `INSERT INTO pages (destination_id, slug, title_nl, title_en, title_de, title_es, status, layout, sort_order)
         VALUES (:destId, :slug, :titleNl, :titleEn, :titleDe, :titleEs, 'published', :layout, :sortOrder)`,
        {
          replacements: {
            destId: destinationId,
            slug: tmpl.slug,
            titleNl: tmpl.title_nl,
            titleEn: tmpl.title_en,
            titleDe: tmpl.title_de,
            titleEs: tmpl.title_es,
            layout: JSON.stringify(tmpl.layout),
            sortOrder: sortOrder++
          },
          type: QueryTypes.INSERT
        }
      );
    }

    // 3. Seed brand_profile + audience_persona from onboarding data
    try {
      const tonePreset = branding?.toneOfVoice || {};
      const brandProfile = {
        company_name: name,
        industry: '',
        company_description: '',
        contact_person: contactPerson || '',
        contact_email: contactEmail || '',
        target_languages: targetLanguages || [language || 'nl'],
        content_goals: {},
        usps: [],
        core_values: [],
        seo_keywords: [],
      };

      // Save brand_profile JSON
      await mysqlSequelize.query(
        'UPDATE destinations SET brand_profile = :bp WHERE id = :id',
        { replacements: { bp: JSON.stringify(brandProfile), id: destinationId } }
      );

      // Create audience persona from tone preset data
      if (tonePreset.audience) {
        const addressLabel = tonePreset.formalAddress === 'u' ? 'Formeel (u)' : tonePreset.formalAddress === 'mixed' ? 'Gemengd' : 'Informeel (je)';
        await mysqlSequelize.query(
          `INSERT INTO audience_personas (destination_id, name, language, interests, tone_notes, is_primary)
           VALUES (:destId, :name, :lang, :interests, :toneNotes, 1)`,
          { replacements: {
            destId: destinationId,
            name: tonePreset.audience.substring(0, 255) || 'Primaire doelgroep',
            lang: language || 'nl',
            interests: tonePreset.brandValues || '',
            toneNotes: `${tonePreset.personality || ''} — ${addressLabel}`,
          }, type: QueryTypes.INSERT }
        );
        logger.info(`[AdminPortal] Auto-created audience persona for ${name}: "${tonePreset.audience}"`);
      }

      logger.info(`[AdminPortal] Brand profile seeded for ${name}: contact=${contactPerson || 'none'}, langs=${(targetLanguages || []).join(',')}, tone=${tonePreset.personality || 'none'}`);
    } catch (seedErr) {
      logger.warn('[AdminPortal] Brand profile seed failed (non-blocking):', seedErr.message);
    }

    // 4. Audit log
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.collection('audit_logs').insertOne({
          action: 'destination_onboarded', entity_type: 'destination', entity_id: destinationId,
          admin_email: req.adminUser.email,
          changes: { name, slug: cleanSlug, pages: selectedPages, featureFlags, navigation_count: (navigation || []).length },
          timestamp: new Date(), actor: { type: 'admin', name: 'admin-portal' }
        });
      }
    } catch { /* non-critical */ }

    // 4. Build DNS/Apache instructions
    const domain = Array.isArray(domains) && domains.length > 0 ? domains[0] : `${cleanSlug}.holidaibutler.com`;
    const dnsInstructions = [
      `1. DNS: Stel een A-record in voor ${domain} → 91.98.71.87`,
      `2. Apache: Maak VirtualHost voor ${domain} met proxy naar Next.js (port 3002) en X-Destination-ID: ${cleanSlug}`,
      `3. SSL: Voer "certbot --apache -d ${domain}" uit op de server`
    ];

    logger.info(`[AdminPortal] Destination onboarded: ${name} (${cleanSlug}), type=${destType}, id=${destinationId}, pages=${selectedPages.length}`);

    res.status(201).json({
      success: true,
      data: {
        destinationId,
        name,
        code: cleanSlug,
        domain,
        destinationType: destType,
        pagesCreated: selectedPages.length,
        dnsInstructions: destType === 'content_only'
          ? ['Content Studio standalone — geen website/DNS configuratie nodig. Klant kan direct inloggen via admin.holidaibutler.com']
          : dnsInstructions
      }
    });
  } catch (error) {
    logger.error('[AdminPortal] Onboarding error:', error);
    res.status(500).json({ success: false, error: { code: 'ONBOARDING_ERROR', message: error.message } });
  }
});

// ============================================================
// CONTENT STUDIO — Trending Monitor (Fase A Content Module)
// ============================================================

/**
 * GET /content/trending — List trending keywords with filters
 * Query: destination_id (required), period (7d|30d|90d), market, language, limit, offset
 */
router.get('/content/trending', adminAuth('editor'), async (req, res) => {
  try {
    const { destination_id, period, market, language, limit, offset } = req.query;
    if (!destination_id) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destination_id is required' } });
    }

    const trendVisualizer = (await import('../services/agents/trendspotter/trendVisualizer.js')).default;
    const result = await trendVisualizer.getTrends(Number(destination_id), {
      period: period || '30d',
      market: market || undefined,
      language: language || undefined,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[AdminPortal] Content trending error:', error);
    res.status(500).json({ success: false, error: { code: 'TRENDING_ERROR', message: error.message } });
  }
});

/**
 * GET /content/trending/summary — Aggregated trend summary (charts, word cloud)
 * Query: destination_id (required), period (7d|30d|90d)
 */
router.get('/content/trending/summary', adminAuth('editor'), async (req, res) => {
  try {
    const { destination_id, period } = req.query;
    if (!destination_id) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destination_id is required' } });
    }

    const trendVisualizer = (await import('../services/agents/trendspotter/trendVisualizer.js')).default;
    const result = await trendVisualizer.getSummary(Number(destination_id), {
      period: period || '30d',
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[AdminPortal] Content trending summary error:', error);
    res.status(500).json({ success: false, error: { code: 'TRENDING_SUMMARY_ERROR', message: error.message } });
  }
});

/**
 * POST /content/trending/manual — Manually add a trending keyword
 * Body: destination_id, keyword, language, source, search_volume, trend_direction, market
 */
router.post('/content/trending/manual', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { destination_id, keyword, language, source, search_volume, trend_direction, market, source_url } = req.body;
    if (!destination_id || !keyword) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'destination_id and keyword are required' } });
    }

    const trendAggregator = (await import('../services/agents/trendspotter/trendAggregator.js')).default;
    const result = await trendAggregator.aggregate(Number(destination_id), [{
      keyword,
      language: language || 'en',
      source: source_url ? 'external_url' : (source || 'manual'),
      search_volume: search_volume ? Number(search_volume) : null,
      trend_direction: trend_direction || 'stable',
      market: market || null,
      source_url: source_url || null,
    }]);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[AdminPortal] Manual trending add error:', error);
    res.status(500).json({ success: false, error: { code: 'MANUAL_TRENDING_ERROR', message: error.message } });
  }
});

// ============================================================
// CONTENT MODULE: SUGGESTIONS (Fase B — Blok B.2)
// ============================================================

/**
 * DELETE /content/trending/:id — Delete a trending keyword
 */
router.delete('/content/trending/:id', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'editor']), async (req, res) => {
  try {
    await mysqlSequelize.query('DELETE FROM trending_data WHERE id = :id', { replacements: { id: Number(req.params.id) } });
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error('[AdminPortal] Delete trending error:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_TRENDING_ERROR', message: error.message } });
  }
});

/**
 * GET /content/suggestions — List content suggestions
 * Query: destination_id (required), status, limit, offset
 */
router.get('/content/suggestions', adminAuth('editor'), async (req, res) => {
  try {
    const { destination_id, status, limit = 50, offset = 0 } = req.query;
    if (!destination_id) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destination_id is required' } });
    }

    let where = "WHERE cs.destination_id = :destId AND cs.status != 'deleted'";
    const replacements = { destId: Number(destination_id), limit: Number(limit), offset: Number(offset) };
    if (status) {
      where += ' AND cs.status = :status';
      replacements.status = status;
    }

    const [suggestions] = await mysqlSequelize.query(
      `SELECT cs.* FROM content_suggestions cs ${where} ORDER BY cs.engagement_score DESC, cs.created_at DESC LIMIT :limit OFFSET :offset`,
      { replacements }
    );
    const [[{ total }]] = await mysqlSequelize.query(
      `SELECT COUNT(*) as total FROM content_suggestions cs ${where}`,
      { replacements }
    );

    // Parse JSON fields
    for (const s of suggestions) {
      if (typeof s.suggested_channels === 'string') s.suggested_channels = JSON.parse(s.suggested_channels);
      if (typeof s.keyword_cluster === 'string') s.keyword_cluster = JSON.parse(s.keyword_cluster);
      if (typeof s.trending_source_ids === 'string') s.trending_source_ids = JSON.parse(s.trending_source_ids);
    }

    res.json({ success: true, data: { suggestions, total } });
  } catch (error) {
    logger.error('[AdminPortal] Content suggestions list error:', error);
    res.status(500).json({ success: false, error: { code: 'SUGGESTIONS_ERROR', message: error.message } });
  }
});

/**
 * POST /content/suggestions — Create a manual suggestion (e.g. from trending keyword)
 */
router.post('/content/suggestions', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { destination_id, title, summary, content_type = 'social_post', keyword_cluster = [], engagement_score = 5 } = req.body;
    if (!destination_id || !title) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'destination_id and title are required' } });
    }

    const [result] = await mysqlSequelize.query(
      `INSERT INTO content_suggestions (destination_id, title, summary, content_type, suggested_channels, keyword_cluster, engagement_score, status, created_at, updated_at)
       VALUES (:destId, :title, :summary, :contentType, :channels, :keywords, :score, 'pending', NOW(), NOW())`,
      {
        replacements: {
          destId: Number(destination_id),
          title,
          summary: summary || `Content voor "${title}"`,
          contentType: content_type,
          channels: JSON.stringify(['facebook', 'instagram']),
          keywords: JSON.stringify(keyword_cluster),
          score: engagement_score,
        },
      }
    );

    res.json({ success: true, data: { id: result, title, content_type } });
  } catch (error) {
    logger.error('[AdminPortal] Create suggestion error:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_SUGGESTION_ERROR', message: error.message } });
  }
});

/**
 * POST /content/suggestions/generate — AI suggestie-generatie vanuit trending data
 * Body: destination_id (required)
 */
router.post('/content/suggestions/generate', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { destination_id } = req.body;
    if (!destination_id) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destination_id is required' } });
    }

    // Get top trending keywords (last 30d, relevance DESC)
    const [trendingKeywords] = await mysqlSequelize.query(
      `SELECT keyword, relevance_score, trend_direction, search_volume, language
       FROM trending_data
       WHERE destination_id = :destId AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       ORDER BY relevance_score DESC
       LIMIT 10`,
      { replacements: { destId: Number(destination_id) } }
    );

    // Cross-section feed: fetch 5★ reviews as content inspiration
    const [topReviews] = await mysqlSequelize.query(
      `SELECT r.review_text, r.rating, r.user_name, p.name AS poi_name
       FROM reviews r JOIN POI p ON r.poi_id = p.id
       WHERE r.destination_id = :destId AND r.rating >= 5 AND r.review_text IS NOT NULL AND LENGTH(r.review_text) > 30
       ORDER BY r.created_at DESC LIMIT 5`,
      { replacements: { destId: Number(destination_id) } }
    );

    if (trendingKeywords.length === 0 && topReviews.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_TRENDS', message: 'No trending keywords or highlight reviews found for this destination' } });
    }

    // Generate suggestions via De Redacteur
    const redacteur = (await import('../services/agents/contentRedacteur/index.js')).default;
    const suggestions = await redacteur.generateSuggestionsForDestination(Number(destination_id), trendingKeywords);

    // Add review-based suggestions
    for (const rev of topReviews) {
      const quote = rev.review_text.length > 120 ? rev.review_text.substring(0, 120) + '...' : rev.review_text;
      suggestions.push({
        title: `Highlight review: ${rev.poi_name}`,
        summary: `"${quote}" — ${rev.user_name || 'Gast'} (${rev.rating}★). Gebruik deze authentieke ervaring als basis voor social content.`,
        content_type: 'social_post',
        suggested_channels: ['facebook', 'instagram'],
        keyword_cluster: [rev.poi_name?.toLowerCase()].filter(Boolean),
        engagement_score: 7.5,
      });
    }

    // Save to database
    const saved = [];
    for (const s of suggestions) {
      const [result] = await mysqlSequelize.query(
        `INSERT INTO content_suggestions (destination_id, title, summary, content_type, suggested_channels, keyword_cluster, engagement_score, status, created_at, updated_at)
         VALUES (:destId, :title, :summary, :contentType, :channels, :keywords, :score, 'pending', NOW(), NOW())`,
        {
          replacements: {
            destId: Number(destination_id),
            title: s.title,
            summary: s.summary,
            contentType: s.content_type,
            channels: JSON.stringify(s.suggested_channels),
            keywords: JSON.stringify(s.keyword_cluster),
            score: s.engagement_score,
          },
        }
      );
      saved.push({ ...s, id: result });
    }

    res.json({ success: true, data: { generated: saved.length, suggestions: saved } });
  } catch (error) {
    logger.error('[AdminPortal] Suggestion generation error:', error);
    res.status(500).json({ success: false, error: { code: 'SUGGESTION_GENERATION_ERROR', message: error.message } });
  }
});

/**
 * PATCH /content/suggestions/:id — Update suggestion status
 * Body: status ('approved' | 'rejected' | 'pending' | 'deleted')
 */
router.patch('/content/suggestions/:id', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected', 'pending', 'deleted'].includes(status)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'status must be "approved", "rejected", "pending", or "deleted"' } });
    }

    if (status === 'approved') {
      await mysqlSequelize.query(
        `UPDATE content_suggestions SET status = :status, approved_by = :approvedBy, approved_at = NOW(), updated_at = NOW() WHERE id = :id`,
        { replacements: { status, approvedBy: req.adminUser?.id || null, id: Number(id) } }
      );
    } else {
      await mysqlSequelize.query(
        `UPDATE content_suggestions SET status = :status, updated_at = NOW() WHERE id = :id`,
        { replacements: { status, id: Number(id) } }
      );
    }

    res.json({ success: true, data: { id: Number(id), status } });
  } catch (error) {
    logger.error('[AdminPortal] Suggestion status update error:', error);
    res.status(500).json({ success: false, error: { code: 'SUGGESTION_UPDATE_ERROR', message: error.message } });
  }
});

/**
 * POST /content/suggestions/:id/enrich — Verrijk een suggestie met brand context + trending keywords (Opdracht 7-E)
 * Body: (geen)
 * Output: bijgewerkte suggestion (summary, keyword_cluster verrijkt)
 */
router.post('/content/suggestions/:id/enrich', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { id } = req.params;
    const [[suggestion]] = await mysqlSequelize.query(
      'SELECT * FROM content_suggestions WHERE id = :id',
      { replacements: { id: Number(id) } }
    );
    if (!suggestion) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Suggestion not found' } });
    }

    const destinationId = suggestion.destination_id;
    const existingKeywords = (() => {
      try {
        return Array.isArray(suggestion.keyword_cluster) ? suggestion.keyword_cluster :
               typeof suggestion.keyword_cluster === 'string' ? JSON.parse(suggestion.keyword_cluster) : [];
      } catch { return []; }
    })();

    // Brand context (profile, persona, knowledge base)
    const { buildBrandContext } = await import('../services/agents/contentRedacteur/brandContext.js');
    const brandContext = await buildBrandContext(destinationId, null, existingKeywords);

    // Top 5 trending keywords (recent 30d)
    const [trendingRows] = await mysqlSequelize.query(
      `SELECT keyword, relevance_score FROM trending_data
       WHERE destination_id = :destId AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       ORDER BY relevance_score DESC LIMIT 5`,
      { replacements: { destId: destinationId } }
    );
    const trendingList = trendingRows.map(t => `- ${t.keyword} (score ${Number(t.relevance_score).toFixed(1)})`).join('\n');

    const embeddingService = (await import('../services/holibot/embeddingService.js')).default;

    const systemPrompt = `Je bent een ervaren content strateeg voor een toeristische bestemming.
Je verrijkt een bestaande content suggestie zodat deze beter aansluit bij het merk en actuele trends.

Geef je antwoord ALTIJD als JSON met deze structuur (geen markdown, geen extra tekst):
{
  "title": "verbeterde titel (max 80 tekens, prikkelend)",
  "summary": "verbeterde samenvatting van 2-3 zinnen die de hook en het waarom uitlegt",
  "keyword_cluster": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}

Eisen:
- Behoud de originele intentie van de suggestie
- Verwerk merkstem en doelgroep uit de brand context
- Voeg 1-2 relevante trending keywords toe als ze passen bij het onderwerp
- keyword_cluster: 4-6 keywords, een mix van origineel + brand + trending`;

    const userPrompt = `${brandContext ? `BRAND CONTEXT:\n${brandContext}\n\n` : ''}TRENDING KEYWORDS (laatste 30 dagen):
${trendingList || '(geen trending data beschikbaar)'}

ORIGINELE SUGGESTIE:
Titel: ${suggestion.title}
Samenvatting: ${suggestion.summary || '(geen)'}
Huidige keywords: ${existingKeywords.join(', ') || '(geen)'}
Content type: ${suggestion.content_type || 'social_post'}

Verrijk deze suggestie. Geef alleen de JSON terug.`;

    const aiResponse = await embeddingService.generateChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.6, maxTokens: 600 }
    );

    // Parse JSON robustly (strip code fences if present)
    let parsed = null;
    try {
      const cleaned = String(aiResponse).replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      logger.warn('[AdminPortal] Enrich JSON parse failed, using fallback:', parseErr.message);
    }

    if (!parsed || !parsed.summary) {
      return res.status(502).json({ success: false, error: { code: 'AI_PARSE_ERROR', message: 'AI response could not be parsed' } });
    }

    const newTitle = (parsed.title || suggestion.title || '').slice(0, 200);
    const newSummary = parsed.summary || suggestion.summary;
    const newKeywords = Array.isArray(parsed.keyword_cluster) && parsed.keyword_cluster.length > 0
      ? parsed.keyword_cluster.slice(0, 6)
      : existingKeywords;

    await mysqlSequelize.query(
      `UPDATE content_suggestions
       SET title = :title, summary = :summary, keyword_cluster = :kw, updated_at = NOW()
       WHERE id = :id`,
      {
        replacements: {
          title: newTitle,
          summary: newSummary,
          kw: JSON.stringify(newKeywords),
          id: Number(id),
        },
      }
    );

    res.json({
      success: true,
      data: {
        id: Number(id),
        title: newTitle,
        summary: newSummary,
        keyword_cluster: newKeywords,
        enriched: true,
      },
    });
  } catch (error) {
    logger.error('[AdminPortal] Suggestion enrich error:', error);
    res.status(500).json({ success: false, error: { code: 'ENRICH_ERROR', message: error.message } });
  }
});

// ============================================================
// CONTENT MODULE: CONTENT ITEMS (Fase B — Blok B.3)
// ============================================================

/**
 * POST /content/items/generate — Generate content via Mistral AI
 * Body: suggestion_id, content_type, platform, languages[]
 */
router.post('/content/items/generate', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { suggestion_id, content_type, platform = 'website', languages = [], manual, title, body_en, destination_id, persona_id } = req.body;

    // === Manual content creation (TO DO 4g) — no AI generation ===
    if (manual && title) {
      const destId = Number(destination_id) || Number(req.query.destination_id) || 1;
      const [insertResult] = await mysqlSequelize.query(
        `INSERT INTO content_items
         (destination_id, content_type, title, body_en, target_platform, approval_status, ai_model, ai_generated, created_at, updated_at)
         VALUES (:destId, :contentType, :title, :bodyEn, :platform, 'draft', NULL, false, NOW(), NOW())`,
        {
          replacements: {
            destId,
            contentType: content_type || 'blog',
            title: title.trim(),
            bodyEn: body_en || '',
            platform,
          },
        }
      );
      return res.json({ success: true, data: { id: insertResult, title, manual: true } });
    }

    // === AI-generated content from suggestion ===
    if (!suggestion_id) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_SUGGESTION', message: 'suggestion_id is required (or set manual=true with title)' } });
    }

    // Get the suggestion
    const [[suggestion]] = await mysqlSequelize.query(
      'SELECT * FROM content_suggestions WHERE id = :id',
      { replacements: { id: Number(suggestion_id) } }
    );
    if (!suggestion) {
      return res.status(404).json({ success: false, error: { code: 'SUGGESTION_NOT_FOUND', message: 'Suggestion not found' } });
    }

    // Parse JSON fields
    if (typeof suggestion.keyword_cluster === 'string') suggestion.keyword_cluster = JSON.parse(suggestion.keyword_cluster);
    if (typeof suggestion.suggested_channels === 'string') suggestion.suggested_channels = JSON.parse(suggestion.suggested_channels);

    // Generate content
    const redacteur = (await import('../services/agents/contentRedacteur/index.js')).default;
    const generated = await redacteur.generateContentItem(suggestion, {
      destinationId: suggestion.destination_id,
      contentType: content_type || suggestion.content_type,
      platform,
      languages,
      personaId: persona_id ? Number(persona_id) : null,
    });

    // Auto-detect POI from title — match against POI names in this destination
    // SKIP for content_only destinations (no POI module)
    let detectedPoiId = null;
    const destIsContentOnly = await isContentOnly(suggestion.destination_id);
    if (!destIsContentOnly) {
      try {
        const titleWords = generated.title.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3);
        if (titleWords.length > 0) {
          const likePattern = titleWords.slice(0, 5).map((_, i) => `p.name LIKE :tw${i}`).join(' OR ');
          const twReplacements = { destId: suggestion.destination_id };
          titleWords.slice(0, 5).forEach((w, i) => { twReplacements[`tw${i}`] = `%${w}%`; });
          const [[matchedPoi]] = await mysqlSequelize.query(
            `SELECT p.id, p.name FROM POI p WHERE p.destination_id = :destId AND p.is_active = 1 AND (${likePattern}) ORDER BY p.google_rating DESC LIMIT 1`,
            { replacements: twReplacements }
          );
          if (matchedPoi) {
            detectedPoiId = matchedPoi.id;
            logger.info(`[ContentGenerate] Auto-detected POI: "${matchedPoi.name}" (id=${matchedPoi.id}) for title "${generated.title}"`);
          }
        }
      } catch (poiErr) {
        logger.warn('[ContentGenerate] POI auto-detect failed (non-blocking):', poiErr.message);
      }
    }

    // Save to content_items (with seo_score + poi_id + media_ids + social_metadata)
    const [insertResult] = await mysqlSequelize.query(
      `INSERT INTO content_items
       (destination_id, suggestion_id, content_type, title, body_en, body_nl, body_de, body_es, body_fr,
        seo_data, seo_score, target_platform, approval_status, ai_model, ai_generated, poi_id,
        media_ids, social_metadata, created_at, updated_at)
       VALUES (:destId, :sugId, :contentType, :title, :bodyEn, :bodyNl, :bodyDe, :bodyEs, :bodyFr,
        :seoData, :seoScore, :platform, 'draft', :aiModel, true, :poiId,
        :mediaIds, :socialMeta, NOW(), NOW())`,
      {
        replacements: {
          destId: suggestion.destination_id,
          sugId: suggestion.id,
          contentType: generated.content_type,
          title: generated.title,
          bodyEn: generated.body_en || null,
          bodyNl: generated.body_nl || null,
          bodyDe: generated.body_de || null,
          bodyEs: generated.body_es || null,
          bodyFr: generated.body_fr || null,
          seoData: JSON.stringify({ meta_description: generated.meta_description, hashtags: generated.hashtags }),
          seoScore: generated.seo_score || null,
          platform: generated.target_platform,
          aiModel: generated.ai_model,
          poiId: detectedPoiId,
          mediaIds: generated.media_ids ? JSON.stringify(generated.media_ids) : null,
          socialMeta: generated.social_metadata ? JSON.stringify(generated.social_metadata) : null,
        },
      }
    );

    // Update suggestion status to 'generated'
    await mysqlSequelize.query(
      `UPDATE content_suggestions SET status = 'generated', updated_at = NOW() WHERE id = :id`,
      { replacements: { id: suggestion.id } }
    );

    // === AUTO-ATTACH IMAGES based on keywords — with diversity filter ===
    // For content_only destinations: skip POI image search, use media library only
    const contentItemId = insertResult;
    const contentType = content_type || suggestion.content_type;
    const maxImgs = contentType === 'social_post' ? 1 : contentType === 'video_script' ? 1 : 3;
    let attachedImages = [];
    try {
      if (destIsContentOnly) {
        // Content-only: only search media library uploads
        const [mediaImages] = await mysqlSequelize.query(
          `SELECT id FROM media WHERE destination_id = :destId AND mime_type LIKE 'image%' ORDER BY created_at DESC LIMIT :lim`,
          { replacements: { destId: suggestion.destination_id, lim: maxImgs } }
        );
        if (mediaImages.length > 0) {
          const mediaIds = mediaImages.map(m => m.id);
          await mysqlSequelize.query(
            'UPDATE content_items SET media_ids = :mediaIds, updated_at = NOW() WHERE id = :id',
            { replacements: { mediaIds: JSON.stringify(mediaIds), id: contentItemId } }
          );
          attachedImages = mediaIds;
          logger.info(`[ContentGenerate] Content-only: attached ${mediaIds.length} media library images to item ${contentItemId}`);
        }
      } else {
        // Tourism: full POI image search — extract POI names from generated content + keywords
        const kws = generated.keyword_cluster || suggestion.keyword_cluster || [];
        // Split compound keywords into individual words for better matching
        const allWords = kws.flatMap(k => k.split(/\s+/)).filter(w => w.length > 3);
        // Also extract POI names from the generated body (grounded content has real POI names)
        const bodyText = (generated.body_en || generated.title || '').substring(0, 2000);
        // Find POI names that appear in the generated text
        const [poiNameMatches] = await mysqlSequelize.query(
          `SELECT DISTINCT id, name FROM POI WHERE destination_id = :destId AND is_active = 1 AND CHAR_LENGTH(name) > 4
           ORDER BY review_count DESC LIMIT 50`,
          { replacements: { destId: suggestion.destination_id } }
        );
        const matchedPoiIds = poiNameMatches.filter(p => bodyText.toLowerCase().includes(p.name.toLowerCase().replace(/\.$/, ''))).map(p => p.id);

        // Build REGEXP from keywords + category-relevant terms
        const keywordPattern = [...new Set([...allWords, ...kws.map(k => k.replace(/[.*+?^${}()|[\]\\%_]/g, ''))])]
          .filter(k => k.length > 2)
          .join('|');

        if (keywordPattern || matchedPoiIds.length > 0) {
            // Collect already-used image IDs to avoid duplicates across content items
            const [usedRows] = await mysqlSequelize.query(
              `SELECT media_ids FROM content_items WHERE destination_id = :destId AND media_ids IS NOT NULL AND media_ids != '[]' AND media_ids != 'null' AND id != :selfId`,
              { replacements: { destId: suggestion.destination_id, selfId: contentItemId } }
            );
            const usedIds = new Set();
            for (const row of usedRows) {
              const ids = typeof row.media_ids === 'string' ? JSON.parse(row.media_ids) : row.media_ids;
              if (Array.isArray(ids)) ids.forEach(id => usedIds.add(Number(String(id).replace('poi:', ''))));
            }

            // Search POI images — first by direct POI name match in body, then by keyword REGEXP
            let poiImages = [];
            if (matchedPoiIds.length > 0) {
              const [directMatches] = await mysqlSequelize.query(
                `SELECT DISTINCT iu.id FROM imageurls iu
                 WHERE iu.poi_id IN (${matchedPoiIds.join(',')})
                 AND iu.local_path IS NOT NULL
                 ORDER BY iu.display_order ASC
                 LIMIT 10`
              );
              poiImages.push(...directMatches);
            }
            if (poiImages.length < maxImgs && keywordPattern) {
              const [kwMatches] = await mysqlSequelize.query(
                `SELECT DISTINCT iu.id FROM imageurls iu
                 INNER JOIN POI p ON iu.poi_id = p.id
                 WHERE p.destination_id = :destId
                 AND iu.local_path IS NOT NULL
                 AND (p.name REGEXP :pattern OR p.category REGEXP :pattern)
                 ORDER BY p.google_rating DESC, iu.display_order ASC
                 LIMIT 10`,
                { replacements: { destId: suggestion.destination_id, pattern: keywordPattern } }
              );
              const existingIds = new Set(poiImages.map(p => p.id));
              poiImages.push(...kwMatches.filter(m => !existingIds.has(m.id)));
            }

            // Prefer unused images, fall back to used ones if needed
            const unusedPoiIds = poiImages.map(p => p.id).filter(id => !usedIds.has(id));
            const usedPoiIds = poiImages.map(p => p.id).filter(id => usedIds.has(id));
            const allIds = [...unusedPoiIds, ...usedPoiIds].slice(0, maxImgs);

            if (allIds.length > 0) {
              await mysqlSequelize.query(
                'UPDATE content_items SET media_ids = :mediaIds, updated_at = NOW() WHERE id = :id',
                { replacements: { mediaIds: JSON.stringify(allIds), id: contentItemId } }
              );
              attachedImages = allIds;
              logger.info(`[ContentGenerate] Auto-attached ${allIds.length} images (${unusedPoiIds.length} new, ${Math.max(0, allIds.length - unusedPoiIds.length)} reused) to item ${contentItemId}`);
            }
          }
        }
    } catch (imgErr) {
      logger.warn('[ContentGenerate] Auto-attach images failed (non-blocking):', imgErr.message);
    }

    res.json({ success: true, data: { id: contentItemId, ...generated, attached_images: attachedImages } });
  } catch (error) {
    logger.error('[AdminPortal] Content generation error:', error);
    res.status(500).json({ success: false, error: { code: 'CONTENT_GENERATION_ERROR', message: error.message } });
  }
});

/**
 * GET /content/items — List content items
 * Query: destination_id (required), status, limit, offset
 */
router.get('/content/items', adminAuth('editor'), async (req, res) => {
  try {
    const { destination_id, status, limit = 50, offset = 0 } = req.query;
    if (!destination_id) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destination_id is required' } });
    }

    let where = "WHERE ci.destination_id = :destId AND ci.approval_status != 'deleted'";
    const replacements = { destId: Number(destination_id), limit: Number(limit), offset: Number(offset) };
    if (status) {
      where += ' AND ci.approval_status = :status';
      replacements.status = status;
    }

    const [items] = await mysqlSequelize.query(
      `SELECT ci.*, cs.keyword_cluster, cs.engagement_score
       FROM content_items ci
       LEFT JOIN content_suggestions cs ON ci.suggestion_id = cs.id
       ${where} ORDER BY ci.updated_at DESC LIMIT :limit OFFSET :offset`,
      { replacements }
    );
    const [[{ total }]] = await mysqlSequelize.query(
      `SELECT COUNT(*) as total FROM content_items ci ${where}`,
      { replacements }
    );

    // Parse JSON fields + resolve images
    const imageBase = process.env.IMAGE_BASE_URL || 'https://test.holidaibutler.com';
    for (const item of items) {
      if (typeof item.seo_data === 'string') item.seo_data = JSON.parse(item.seo_data);
      if (typeof item.social_metadata === 'string') item.social_metadata = JSON.parse(item.social_metadata);
      if (typeof item.media_ids === 'string') item.media_ids = JSON.parse(item.media_ids);
      if (typeof item.keyword_cluster === 'string') item.keyword_cluster = JSON.parse(item.keyword_cluster);

      // Resolve media_ids to image URLs — strip "poi:" prefix for numeric lookup
      item.resolved_images = [];
      const rawIds = Array.isArray(item.media_ids) ? item.media_ids : [];
      const poiIds = rawIds.filter(id => typeof id === 'string' && id.startsWith('poi:')).map(id => Number(id.replace('poi:', ''))).filter(id => !isNaN(id) && id > 0);
      const mediaIds = rawIds.filter(id => !(typeof id === 'string' && id.startsWith('poi:'))).map(id => Number(id)).filter(id => !isNaN(id) && id > 0);

      // Resolve POI images (from imageurls table)
      if (poiIds.length > 0) {
        const [poiImages] = await mysqlSequelize.query(
          `SELECT id, local_path, image_url FROM imageurls WHERE id IN (:ids)`,
          { replacements: { ids: poiIds } }
        );
        item.resolved_images.push(...poiImages.map(img => {
          const imgPath = img.local_path ? img.local_path.replace(/^\/poi-images\//, '/') : null;
          return {
            id: `poi:${img.id}`,
            url: imgPath ? `${imageBase}/api/v1/img${imgPath}?w=600&f=webp` : img.image_url,
            thumbnail: imgPath ? `${imageBase}/api/v1/img${imgPath}?w=200&f=webp` : img.image_url,
            alt: img.local_path ? img.local_path.split('/').pop().replace(/\.\w+$/, '') : 'POI image',
          };
        }));
      }

      // Resolve Media Library images (from media table)
      if (mediaIds.length > 0) {
        const [mediaImages] = await mysqlSequelize.query(
          `SELECT id, filename, alt_text, destination_id FROM media WHERE id IN (:ids)`,
          { replacements: { ids: mediaIds } }
        );
        item.resolved_images.push(...mediaImages.map(img => ({
          id: img.id,
          url: `${process.env.API_BASE_URL || 'https://api.holidaibutler.com'}/media-files/${img.destination_id}/${img.filename}`,
          thumbnail: `${process.env.API_BASE_URL || 'https://api.holidaibutler.com'}/media-files/${img.destination_id}/${img.filename}`,
          alt: img.alt_text || img.filename.replace(/\.\w+$/, ''),
        })));
      }

      // Backward compat: if resolved is still empty but has numeric ids, try imageurls as fallback
      if (item.resolved_images.length === 0 && rawIds.length > 0) {
        const allIds = rawIds.map(id => Number(String(id).replace('poi:', ''))).filter(id => !isNaN(id) && id > 0);
        if (allIds.length > 0) {
          const [fallbackImages] = await mysqlSequelize.query(
            `SELECT id, local_path, image_url FROM imageurls WHERE id IN (:ids)`,
            { replacements: { ids: allIds } }
          );
          item.resolved_images = fallbackImages.map(img => {
            const imgPath = img.local_path ? img.local_path.replace(/^\/poi-images\//, '/') : null;
            return {
              id: img.id,
              url: imgPath ? `${imageBase}/api/v1/img${imgPath}?w=600&f=webp` : img.image_url,
              thumbnail: imgPath ? `${imageBase}/api/v1/img${imgPath}?w=200&f=webp` : img.image_url,
              alt: 'Content image',
            };
          });
        }
      }
    }

    res.json({ success: true, data: { items, total } });
  } catch (error) {
    logger.error('[AdminPortal] Content items list error:', error);
    res.status(500).json({ success: false, error: { code: 'CONTENT_ITEMS_ERROR', message: error.message } });
  }
});

/**
 * GET /content/items/:id — Content item detail + all language versions
 */
router.get('/content/items/:id', adminAuth('editor'), async (req, res) => {
  try {
    const [[item]] = await mysqlSequelize.query(
      `SELECT ci.*, cs.keyword_cluster, cs.engagement_score, cs.title as suggestion_title
       FROM content_items ci
       LEFT JOIN content_suggestions cs ON ci.suggestion_id = cs.id
       WHERE ci.id = :id`,
      { replacements: { id: Number(req.params.id) } }
    );

    if (!item) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content item not found' } });
    }

    // Parse JSON fields
    if (typeof item.seo_data === 'string') item.seo_data = JSON.parse(item.seo_data);
    if (typeof item.social_metadata === 'string') item.social_metadata = JSON.parse(item.social_metadata);
    if (typeof item.media_ids === 'string') item.media_ids = JSON.parse(item.media_ids);
    if (typeof item.keyword_cluster === 'string') item.keyword_cluster = JSON.parse(item.keyword_cluster);

    // Resolve media_ids to image URLs — support both POI (imageurls) and Media Library (media) tables
    const imageBase = process.env.IMAGE_BASE_URL || 'https://test.holidaibutler.com';
    item.resolved_images = [];
    const rawIds = Array.isArray(item.media_ids) ? item.media_ids : [];
    const poiIds = rawIds.filter(id => typeof id === 'string' && id.startsWith('poi:')).map(id => Number(id.replace('poi:', ''))).filter(id => !isNaN(id) && id > 0);
    const mediaIds = rawIds.filter(id => !(typeof id === 'string' && id.startsWith('poi:'))).map(id => Number(id)).filter(id => !isNaN(id) && id > 0);

    if (poiIds.length > 0) {
      const [poiImages] = await mysqlSequelize.query('SELECT id, local_path, image_url FROM imageurls WHERE id IN (:ids)', { replacements: { ids: poiIds } });
      item.resolved_images.push(...poiImages.map(img => {
        const imgPath = img.local_path ? img.local_path.replace(/^\/poi-images\//, '/') : null;
        return { id: `poi:${img.id}`, url: imgPath ? `${imageBase}/api/v1/img${imgPath}?w=600&f=webp` : img.image_url, thumbnail: imgPath ? `${imageBase}/api/v1/img${imgPath}?w=200&f=webp` : img.image_url, alt: 'POI image' };
      }));
    }
    if (mediaIds.length > 0) {
      try {
        const mediaBase = process.env.API_BASE_URL || 'https://api.holidaibutler.com';
        const [mediaImages] = await mysqlSequelize.query('SELECT id, filename, alt_text, destination_id FROM media WHERE id IN (:ids)', { replacements: { ids: mediaIds } });
        logger.info(`[ContentItem] Media resolve: mediaIds=${JSON.stringify(mediaIds)}, found=${mediaImages.length}`);
        for (const img of mediaImages) {
          item.resolved_images.push({ id: img.id, url: `${mediaBase}/media-files/${img.destination_id}/${img.filename}`, thumbnail: `${mediaBase}/media-files/${img.destination_id}/${img.filename}`, alt: img.alt_text || img.filename });
        }
      } catch (mediaErr) {
        logger.warn('[ContentItem] Media resolve failed:', mediaErr.message);
      }
    }
    // Fallback: if resolved is still empty but has numeric ids, try imageurls (POI images stored without poi: prefix)
    if (item.resolved_images.length === 0 && rawIds.length > 0) {
      const allIds = rawIds.map(id => Number(String(id).replace('poi:', ''))).filter(id => !isNaN(id) && id > 0);
      if (allIds.length > 0) {
        const [fallbackImages] = await mysqlSequelize.query(
          'SELECT id, local_path, image_url FROM imageurls WHERE id IN (:ids)',
          { replacements: { ids: allIds } }
        );
        item.resolved_images = fallbackImages.map(img => {
          const imgPath = img.local_path ? img.local_path.replace(/^\/poi-images\//, '/') : null;
          return {
            id: img.id,
            url: imgPath ? `${imageBase}/api/v1/img${imgPath}?w=600&f=webp` : img.image_url,
            thumbnail: imgPath ? `${imageBase}/api/v1/img${imgPath}?w=200&f=webp` : img.image_url,
            alt: 'Content image',
          };
        });
      }
    }
    logger.info(`[ContentItem] Resolved ${item.resolved_images.length} images for item ${item.id} (poi:${poiIds.length} media:${mediaIds.length})`);

    // Compile language versions
    item.languages = {};
    for (const lang of ['en', 'nl', 'de', 'es', 'fr']) {
      if (item[`body_${lang}`]) {
        item.languages[lang] = item[`body_${lang}`];
      }
    }

    res.json({ success: true, data: item });
  } catch (error) {
    logger.error('[AdminPortal] Content item detail error:', error);
    res.status(500).json({ success: false, error: { code: 'CONTENT_ITEM_ERROR', message: error.message } });
  }
});

/**
 * PATCH /content/items/:id — Update body/approve/reject
 * Body: title, body_en, body_nl, body_de, body_es, body_fr, approval_status, seo_data
 */
router.patch('/content/items/:id', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = ['title', 'body_en', 'body_nl', 'body_de', 'body_es', 'body_fr', 'approval_status', 'seo_data', 'social_metadata', 'target_platform', 'pillar_id', 'media_ids'];

    // Sanitize body fields before saving (safety net — strips markdown artifacts)
    const bodyFields = ['body_en', 'body_nl', 'body_de', 'body_es', 'body_fr'];
    const hasBodyUpdate = bodyFields.some(f => req.body[f] !== undefined);
    if (hasBodyUpdate) {
      const { sanitizeContent } = await import('../services/agents/contentRedacteur/contentSanitizer.js');
      // Get content_type and platform from existing item or request
      const [[item]] = await mysqlSequelize.query('SELECT content_type, target_platform FROM content_items WHERE id = :id', { replacements: { id: Number(id) } });
      const contentType = item?.content_type || 'blog';
      const platform = req.body.target_platform || item?.target_platform || 'website';
      for (const f of bodyFields) {
        if (typeof req.body[f] === 'string' && req.body[f].length > 0) {
          req.body[f] = sanitizeContent(req.body[f], contentType, platform);
        }
      }
    }

    const updates = [];
    const replacements = { id: Number(id) };

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        const val = typeof req.body[field] === 'object' ? JSON.stringify(req.body[field]) : req.body[field];
        updates.push(`${field} = :${field}`);
        replacements[field] = val;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_UPDATES', message: 'No valid fields to update' } });
    }

    // Handle approval status change — log to approval trail
    if (req.body.approval_status) {
      // TO DO 4a: Block approve/schedule for items with SEO < 80
      if (['approved', 'scheduled'].includes(req.body.approval_status)) {
        const [[seoItem]] = await mysqlSequelize.query(
          'SELECT seo_data, body_en, title, content_type FROM content_items WHERE id = :id', { replacements: { id: Number(id) } }
        );
        if (seoItem) {
          let seoScore = 0;
          try {
            const seoData = typeof seoItem.seo_data === 'string' ? JSON.parse(seoItem.seo_data) : seoItem.seo_data;
            seoScore = seoData?.overallScore || 0;
          } catch { /* parse error */ }
          // If we don't have a stored score, compute it live
          if (!seoScore && seoItem.body_en) {
            try {
              const { analyzeContent } = await import('../services/agents/seoMeester/seoAnalyzer.js');
              const seoResult = await analyzeContent(seoItem, Number(req.query.destination_id) || 1);
              seoScore = seoResult.overallScore || 0;
            } catch { /* analysis error */ }
          }
          if (seoScore > 0 && seoScore < 80) {
            return res.status(400).json({
              success: false,
              error: {
                code: 'SEO_SCORE_TOO_LOW',
                message: `SEO-score ${seoScore}/100 is onder het minimum van 80. Verbeter de content met "AI Verbeter" voordat je goedkeurt.`
              }
            });
          }
        }
      }

      const [[currentItem]] = await mysqlSequelize.query(
        'SELECT approval_status FROM content_items WHERE id = :id', { replacements: { id: Number(id) } }
      );
      if (currentItem && currentItem.approval_status !== req.body.approval_status) {
        await mysqlSequelize.query(
          `INSERT INTO content_approval_log (content_item_id, from_status, to_status, changed_by, comment)
           VALUES (:itemId, :fromStatus, :toStatus, :changedBy, :comment)`,
          { replacements: {
            itemId: Number(id),
            fromStatus: currentItem.approval_status,
            toStatus: req.body.approval_status,
            changedBy: req.adminUser?.id || 'system',
            comment: req.body.approval_comment || null,
          }}
        );
      }
      if (req.body.approval_status === 'approved') {
        updates.push('approved_by = :approvedBy');
        replacements.approvedBy = req.adminUser?.id || null;
      }
    }

    // Auto-snapshot revision before save (version control)
    try {
      const [[current]] = await mysqlSequelize.query(
        'SELECT title, body_en, body_nl, body_de, body_es, body_fr FROM content_items WHERE id = :id',
        { replacements: { id: Number(id) } }
      );
      if (current) {
        const [[maxRev]] = await mysqlSequelize.query(
          'SELECT COALESCE(MAX(revision_number), 0) as max_rev FROM content_item_revisions WHERE content_item_id = :id',
          { replacements: { id: Number(id) } }
        );
        await mysqlSequelize.query(
          `INSERT INTO content_item_revisions (content_item_id, revision_number, title, body_en, body_nl, body_de, body_es, body_fr, changed_by, change_summary)
           VALUES (:itemId, :revNum, :title, :bodyEn, :bodyNl, :bodyDe, :bodyEs, :bodyFr, :changedBy, :summary)`,
          { replacements: {
            itemId: Number(id),
            revNum: (maxRev?.max_rev || 0) + 1,
            title: current.title,
            bodyEn: current.body_en, bodyNl: current.body_nl, bodyDe: current.body_de,
            bodyEs: current.body_es, bodyFr: current.body_fr,
            changedBy: req.adminUser?.id || 'system',
            summary: req.body.change_summary || 'Auto-snapshot before update',
          }}
        );
      }
    } catch (revErr) {
      logger.debug('[AdminPortal] Revision snapshot failed (non-blocking):', revErr.message);
    }

    updates.push('updated_at = NOW()');
    await mysqlSequelize.query(
      `UPDATE content_items SET ${updates.join(', ')} WHERE id = :id`,
      { replacements }
    );

    res.json({ success: true, data: { id: Number(id), updated: true } });
  } catch (error) {
    logger.error('[AdminPortal] Content item update error:', error);
    res.status(500).json({ success: false, error: { code: 'CONTENT_UPDATE_ERROR', message: error.message } });
  }
});

/**
 * DELETE /content/items/:id — Soft delete (approval_status → 'rejected')
 */
router.delete('/content/items/:id', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    await mysqlSequelize.query(
      `UPDATE content_items SET approval_status = 'deleted', updated_at = NOW() WHERE id = :id`,
      { replacements: { id: Number(req.params.id) } }
    );
    res.json({ success: true, data: { id: Number(req.params.id), deleted: true } });
  } catch (error) {
    logger.error('[AdminPortal] Content item delete error:', error);
    res.status(500).json({ success: false, error: { code: 'CONTENT_DELETE_ERROR', message: error.message } });
  }
});

// ============================================================
// CONTENT CONCEPTS — Grouped content management
// ============================================================

/**
 * GET /content/concepts — List concepts with platform versions
 */
router.get('/content/concepts', adminAuth('editor'), async (req, res) => {
  try {
    const { destination_id, status, limit = 50, offset = 0 } = req.query;
    const conditions = ["c.approval_status != 'deleted'"];
    const params = [];

    if (destination_id) { conditions.push('c.destination_id = ?'); params.push(Number(destination_id)); }
    if (status && status !== 'all' && status !== 'deleted') { conditions.push('c.approval_status = ?'); params.push(status); }

    const whereClause = conditions.join(' AND ');

    const [[{ total }]] = await mysqlSequelize.query(
      `SELECT COUNT(DISTINCT c.id) as total FROM content_concepts c WHERE ${whereClause}`,
      { replacements: params }
    );

    const [concepts] = await mysqlSequelize.query(
      `SELECT c.*,
        cp.name as pillar_name,
        cp.color as pillar_color,
        (SELECT MAX(ci.seo_score) FROM content_items ci WHERE ci.concept_id = c.id AND ci.approval_status != 'deleted' AND ci.seo_score IS NOT NULL) as avg_seo_score,
        (SELECT GROUP_CONCAT(DISTINCT ci.target_platform) FROM content_items ci WHERE ci.concept_id = c.id AND ci.approval_status != 'deleted') as platforms,
        (SELECT GROUP_CONCAT(CONCAT(ci.id, ':', ci.target_platform, ':', ci.approval_status) SEPARATOR '|') FROM content_items ci WHERE ci.concept_id = c.id AND ci.approval_status != 'deleted') as items_summary
       FROM content_concepts c
       LEFT JOIN content_pillars cp ON cp.id = c.pillar_id
       WHERE ${whereClause}
       ORDER BY c.updated_at DESC
       LIMIT ? OFFSET ?`,
      { replacements: [...params, Number(limit), Number(offset)] }
    );

    // Parse items_summary into structured platform versions
    const data = concepts.map(c => {
      const platformVersions = (c.items_summary || '').split('|').filter(Boolean).map(s => {
        const [id, platform, status] = s.split(':');
        return { id: Number(id), platform, status };
      });
      return {
        ...c,
        items_summary: undefined,
        platform_versions: platformVersions,
        platforms: (c.platforms || '').split(',').filter(Boolean),
      };
    });

    res.json({ success: true, data, meta: { total, limit: Number(limit), offset: Number(offset) } });
  } catch (error) {
    logger.error('[AdminPortal] Content concepts list error:', error);
    res.status(500).json({ success: false, error: { code: 'CONCEPTS_LIST_ERROR', message: error.message } });
  }
});

/**
 * GET /content/concepts/:id — Single concept with all platform items
 */
router.get('/content/concepts/:id', adminAuth('editor'), async (req, res) => {
  try {
    const [[concept]] = await mysqlSequelize.query(
      'SELECT * FROM content_concepts WHERE id = ?',
      { replacements: [Number(req.params.id)] }
    );
    if (!concept) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Concept not found' } });

    const [items] = await mysqlSequelize.query(
      `SELECT * FROM content_items WHERE concept_id = ? AND approval_status != 'deleted' ORDER BY target_platform`,
      { replacements: [concept.id] }
    );

    res.json({ success: true, data: { ...concept, items } });
  } catch (error) {
    logger.error('[AdminPortal] Concept detail error:', error);
    res.status(500).json({ success: false, error: { code: 'CONCEPT_DETAIL_ERROR', message: error.message } });
  }
});

/**
 * POST /content/concepts/generate — Atomic multi-platform content generation
 * Creates 1 concept + N platform items in one call
 * Body: { suggestion_id, destination_id, content_type, platforms[], pillar_id?, persona_id?, template_id? }
 */
router.post('/content/concepts/generate', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { suggestion_id, destination_id, content_type = 'social_post', platforms = ['facebook'], pillar_id, persona_id, template_id } = req.body;
    if (!destination_id || !suggestion_id) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'destination_id and suggestion_id required' } });
    }

    // Get suggestion
    const [[suggestion]] = await mysqlSequelize.query(
      'SELECT * FROM content_suggestions WHERE id = ?', { replacements: [Number(suggestion_id)] }
    );
    if (!suggestion) return res.status(404).json({ success: false, error: { code: 'SUGGESTION_NOT_FOUND' } });

    // Create concept immediately (so frontend can open it)
    const [conceptResult] = await mysqlSequelize.query(
      `INSERT INTO content_concepts (destination_id, suggestion_id, title, content_type, pillar_id, poi_id, approval_status, ai_generated, keyword_cluster)
       VALUES (?, ?, ?, ?, ?, ?, 'generating', 1, ?)`,
      { replacements: [
        Number(destination_id), suggestion.id, suggestion.title, content_type,
        pillar_id || null, suggestion.poi_id || null,
        typeof suggestion.keyword_cluster === 'string' ? suggestion.keyword_cluster : JSON.stringify(suggestion.keyword_cluster || [])
      ]}
    );
    const conceptId = conceptResult;

    // Return immediately — generation happens in background
    res.json({
      success: true,
      data: {
        concept_id: conceptId,
        status: 'generating',
        message: `Content generation started for ${platforms.length} platform(s). Poll GET /content/concepts/${conceptId} for status.`,
      }
    });

    // === ENQUEUE BACKGROUND GENERATION (BullMQ) ===
    // Persisted in Redis, survives PM2 restarts, automatic retries (2 attempts
    // with exponential backoff), dead-letter recovery on final failure.
    try {
      const { contentGenerationQueue } = await import('../services/orchestrator/queues.js');
      await contentGenerationQueue.add('generate-concept', {
        conceptId,
        suggestionId: suggestion.id,
        destinationId: Number(destination_id),
        contentType: content_type,
        platforms,
        pillarId: pillar_id || null,
        personaId: persona_id || null,
      }, { jobId: `concept-${conceptId}` });
      logger.info(`[ConceptGenerate] Enqueued generation job for concept ${conceptId}`);
    } catch (enqErr) {
      logger.error(`[ConceptGenerate] Enqueue failed for concept ${conceptId}: ${enqErr.message}`);
      // Recover concept so frontend stops polling
      await mysqlSequelize.query(
        `UPDATE content_concepts SET approval_status = 'draft' WHERE id = ? AND approval_status = 'generating'`,
        { replacements: [conceptId] }
      ).catch(() => {});
    }
  } catch (error) {
    logger.error('[AdminPortal] Concept generate error:', error);
    res.status(500).json({ success: false, error: { code: 'CONCEPT_GENERATE_ERROR', message: error.message } });
  }
});

/**
 * DELETE /content/concepts/:id — Soft delete concept + all items
 */
router.delete('/content/concepts/:id', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const conceptId = Number(req.params.id);
    await mysqlSequelize.query(
      `UPDATE content_items SET approval_status = 'deleted', updated_at = NOW() WHERE concept_id = ?`,
      { replacements: [conceptId] }
    );
    await mysqlSequelize.query(
      `UPDATE content_concepts SET approval_status = 'deleted', updated_at = NOW() WHERE id = ?`,
      { replacements: [conceptId] }
    );
    res.json({ success: true, data: { concept_id: conceptId, deleted: true } });
  } catch (error) {
    logger.error('[AdminPortal] Concept delete error:', error);
    res.status(500).json({ success: false, error: { code: 'CONCEPT_DELETE_ERROR', message: error.message } });
  }
});

/**
 * POST /content/items/:id/translate — Translate to additional language
 * Body: target_lang (e.g., 'de', 'es', 'fr')
 */
router.post('/content/items/:id/translate', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { target_lang } = req.body;
    if (!target_lang || !['nl', 'de', 'es', 'fr'].includes(target_lang)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_LANG', message: 'target_lang must be nl, de, es, or fr' } });
    }

    const [[item]] = await mysqlSequelize.query(
      'SELECT id, title, body_en FROM content_items WHERE id = :id',
      { replacements: { id: Number(req.params.id) } }
    );
    if (!item || !item.body_en) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content item not found or has no English body' } });
    }

    const { translateTexts } = await import('../services/translationService.js');
    const translations = await translateTexts(
      [{ key: 'body', value: item.body_en }],
      'en',
      [target_lang]
    );

    const translatedBody = translations.body?.[target_lang] || '';
    if (translatedBody) {
      await mysqlSequelize.query(
        `UPDATE content_items SET body_${target_lang} = :body, updated_at = NOW() WHERE id = :id`,
        { replacements: { body: translatedBody, id: item.id } }
      );
    }

    const responseData = { id: item.id, target_lang, translated: !!translatedBody };
    if (translatedBody) responseData[`body_${target_lang}`] = translatedBody;
    res.json({ success: true, data: responseData });
  } catch (error) {
    logger.error('[AdminPortal] Content translation error:', error);
    res.status(500).json({ success: false, error: { code: 'TRANSLATION_ERROR', message: error.message } });
  }
});

/**
 * GET /content/items/:id/seo — Score analysis via De SEO Meester
 * Query: ?platform=instagram (social_post items: platform-specific scoring)
 * Returns: blog → { type:'seo', seoSuggestions }, social → { type:'social', platform }, video → { type:'video' }
 */
router.get('/content/items/:id/seo', adminAuth('editor'), async (req, res) => {
  try {
    const [[item]] = await mysqlSequelize.query(
      `SELECT ci.*, cs.keyword_cluster
       FROM content_items ci
       LEFT JOIN content_suggestions cs ON ci.suggestion_id = cs.id
       WHERE ci.id = :id`,
      { replacements: { id: Number(req.params.id) } }
    );

    if (!item) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content item not found' } });
    }

    if (typeof item.keyword_cluster === 'string') item.keyword_cluster = JSON.parse(item.keyword_cluster);
    if (typeof item.seo_data === 'string') item.seo_data = JSON.parse(item.seo_data);

    const platform = req.query.platform || item.target_platform || null;
    const seoMeester = (await import('../services/agents/seoMeester/index.js')).default;
    const analysis = await seoMeester.analyzeItem(item, item.destination_id, platform);

    // Save updated SEO data + score (consistency met tabel)
    await mysqlSequelize.query(
      `UPDATE content_items SET seo_data = :seoData, seo_score = :seoScore, updated_at = NOW() WHERE id = :id`,
      {
        replacements: {
          seoData: JSON.stringify({ ...analysis, lastAudit: new Date().toISOString() }),
          seoScore: analysis?.overallScore != null ? Math.round(Number(analysis.overallScore)) : null,
          id: item.id,
        },
      }
    );

    res.json({ success: true, data: analysis });
  } catch (error) {
    logger.error('[AdminPortal] SEO analysis error:', error);
    res.status(500).json({ success: false, error: { code: 'SEO_ANALYSIS_ERROR', message: error.message } });
  }
});

/**
 * POST /content/items/:id/improve — Auto-improve content via AI to reach SEO minimum (65/100)
 * Analyzes current SEO score → if below 65, rewrites content via Mistral AI → saves improved version
 */
router.post('/content/items/:id/improve', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const [[item]] = await mysqlSequelize.query(
      `SELECT ci.*, cs.keyword_cluster
       FROM content_items ci
       LEFT JOIN content_suggestions cs ON ci.suggestion_id = cs.id
       WHERE ci.id = :id`,
      { replacements: { id: Number(req.params.id) } }
    );

    if (!item) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content item not found' } });
    }

    if (typeof item.keyword_cluster === 'string') item.keyword_cluster = JSON.parse(item.keyword_cluster);
    if (typeof item.seo_data === 'string') item.seo_data = JSON.parse(item.seo_data);

    // A/B variant mode: generate an alternative version (different angle, no DB write)
    if (req.body?.mode === 'alternative') {
      const { generateAlternative } = await import('../services/agents/contentRedacteur/contentGenerator.js');
      const altResult = await generateAlternative(item);
      return res.json({ success: true, data: { mode: 'alternative', ...altResult } });
    }

    const redacteur = (await import('../services/agents/contentRedacteur/index.js')).default;
    const result = await redacteur.improveContentItem(item);

    if (result.improved) {
      // Save improved content back to DB
      await mysqlSequelize.query(
        `UPDATE content_items
         SET title = :title, body_en = :bodyEn,
             seo_data = :seoData, updated_at = NOW()
         WHERE id = :id`,
        {
          replacements: {
            title: result.title,
            bodyEn: result.body_en,
            seoData: JSON.stringify({
              meta_description: result.meta_description,
              overallScore: result.seo_score,
              grade: result.seo_grade,
              checks: result.seo_checks,
              lastImproved: new Date().toISOString(),
              improvement_details: result.improvement_details,
            }),
            id: item.id,
          },
        }
      );

      // Re-translate improved content
      try {
        const { translateTexts } = await import('../services/translationService.js');
        const bodyLangs = ['nl', 'de', 'es'].filter(l => item[`body_${l}`]);
        if (bodyLangs.length > 0) {
          const texts = [
            { key: 'title', value: result.title },
            { key: 'body', value: result.body_en },
          ];
          const translations = await translateTexts(texts, 'en', bodyLangs);
          const updateParts = [];
          const repl = { id: item.id };
          for (const lang of bodyLangs) {
            if (translations.body?.[lang]) {
              updateParts.push(`body_${lang} = :body_${lang}`);
              repl[`body_${lang}`] = translations.body[lang];
            }
          }
          if (updateParts.length > 0) {
            await mysqlSequelize.query(
              `UPDATE content_items SET ${updateParts.join(', ')}, updated_at = NOW() WHERE id = :id`,
              { replacements: repl }
            );
          }
        }
      } catch (transErr) {
        logger.warn('[AdminPortal] Auto-translate after improve failed:', transErr.message);
      }
    }

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[AdminPortal] Content improvement error:', error);
    res.status(500).json({ success: false, error: { code: 'IMPROVEMENT_ERROR', message: error.message } });
  }
});

// ============================================================================
// WAVE 4: POI-TO-CONTENT, REPURPOSE, MULTI-DESTINATION
// ============================================================================

/**
 * POST /content/generate-from-poi — Generate content directly from a POI (KILLER FEATURE)
 * Body: { poi_id, platforms[] }
 */
router.post('/content/generate-from-poi', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { poi_id, platforms = ['instagram', 'facebook', 'linkedin'] } = req.body;
    if (!poi_id) return res.status(400).json({ success: false, error: { code: 'MISSING_POI', message: 'poi_id is required' } });

    const destId = req.adminUser?.destination_id || req.body.destination_id || 1;

    // Block for content_only destinations (no POI module)
    if (await isContentOnly(destId)) {
      return res.status(400).json({ success: false, error: { code: 'NOT_AVAILABLE', message: 'POI content generation is not available for Content Studio standalone destinations' } });
    }
    const { generateFromPOI } = await import('../services/agents/contentRedacteur/contentGenerator.js');
    const results = await generateFromPOI(Number(poi_id), destId, platforms);

    // Save each result as a content_item (with seo_score + auto-attach images)
    const savedIds = [];
    for (const item of results) {
      const [insertResult] = await mysqlSequelize.query(
        `INSERT INTO content_items
         (destination_id, content_type, title, body_en, body_nl, body_de, body_es, body_fr,
          seo_data, seo_score, target_platform, approval_status, ai_model, ai_generated, poi_id, created_at, updated_at)
         VALUES (:destId, :contentType, :title, :bodyEn, :bodyNl, :bodyDe, :bodyEs, :bodyFr,
          :seoData, :seoScore, :platform, 'draft', :aiModel, true, :poiId, NOW(), NOW())`,
        {
          replacements: {
            destId,
            contentType: item.content_type,
            title: item.title,
            bodyEn: item.body_en || null,
            bodyNl: item.body_nl || null,
            bodyDe: item.body_de || null,
            bodyEs: item.body_es || null,
            bodyFr: item.body_fr || null,
            seoData: JSON.stringify({ meta_description: item.meta_description, hashtags: item.hashtags }),
            seoScore: item.seo_score || null,
            platform: item.target_platform,
            aiModel: item.ai_model,
            poiId: poi_id,
          },
        }
      );
      const contentItemId = insertResult;
      savedIds.push(contentItemId);

      // AUTO-ATTACH IMAGES: POI images first, then keyword match
      try {
        const { selectImages } = await import('../services/agents/contentRedacteur/imageSelector.js');
        const contentObj = { title: item.title, body_en: item.body_en, poi_id: Number(poi_id), destination_id: destId, content_type: item.content_type, target_platform: item.target_platform };
        const images = await selectImages(contentObj, destId);
        if (images.length > 0) {
          const mediaIds = images.slice(0, 3).map(img => img.source === 'poi' ? `poi:${img.id}` : img.id);
          await mysqlSequelize.query(
            'UPDATE content_items SET media_ids = :mediaIds, updated_at = NOW() WHERE id = :id',
            { replacements: { mediaIds: JSON.stringify(mediaIds), id: contentItemId } }
          );
          logger.info(`[POIGenerate] Auto-attached ${mediaIds.length} images to item ${contentItemId}`);
        }
      } catch (imgErr) {
        logger.warn('[POIGenerate] Auto-attach images failed (non-blocking):', imgErr.message);
      }
    }

    res.json({ success: true, data: { generated: results.length, ids: savedIds, items: results } });
  } catch (error) {
    logger.error('[AdminPortal] POI content generation error:', error);
    res.status(500).json({ success: false, error: { code: 'POI_GENERATE_ERROR', message: error.message } });
  }
});

/**
 * POST /content/items/:id/repurpose — Repurpose content for other platforms
 * Body: { target_platforms[] }
 */
router.post('/content/items/:id/repurpose', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { target_platforms = ['instagram', 'facebook', 'linkedin'] } = req.body;

    const [[sourceItem]] = await mysqlSequelize.query(
      'SELECT * FROM content_items WHERE id = :id',
      { replacements: { id: Number(id) } }
    );
    if (!sourceItem) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content item not found' } });

    const { repurposeContent } = await import('../services/agents/contentRedacteur/contentGenerator.js');
    const results = await repurposeContent(sourceItem, target_platforms, sourceItem.destination_id);

    // Save each repurposed item with SEO score — linked to same concept as source
    const conceptId = sourceItem.concept_id || null;
    const savedIds = [];
    for (const item of results) {
      const seoData = {
        meta_description: item.meta_description,
        hashtags: item.hashtags,
        seo_score: item.seo_score,
        char_count: item.char_count,
        char_limit: item.char_limit,
        source_content_id: item.source_content_id,
      };
      const [insertResult] = await mysqlSequelize.query(
        `INSERT INTO content_items
         (concept_id, destination_id, content_type, title, body_en, body_nl, body_de, body_es, body_fr,
          seo_data, seo_score, target_platform, approval_status, ai_model, ai_generated, poi_id, created_at, updated_at)
         VALUES (:conceptId, :destId, :contentType, :title, :bodyEn, :bodyNl, :bodyDe, :bodyEs, :bodyFr,
          :seoData, :seoScore, :platform, 'draft', :aiModel, true, :poiId, NOW(), NOW())`,
        {
          replacements: {
            conceptId,
            destId: sourceItem.destination_id,
            contentType: item.content_type,
            title: item.title,
            bodyEn: item.body_en || null,
            bodyNl: item.body_nl || null,
            bodyDe: item.body_de || null,
            bodyEs: item.body_es || null,
            bodyFr: item.body_fr || null,
            seoData: JSON.stringify(seoData),
            seoScore: item.seo_score || null,
            platform: item.target_platform,
            aiModel: item.ai_model,
            poiId: item.poi_id || null,
          },
        }
      );
      const repurposedItemId = insertResult;
      savedIds.push(repurposedItemId);

      // Copy images from source if available
      if (sourceItem.media_ids && sourceItem.media_ids !== 'null' && sourceItem.media_ids !== '[]') {
        try {
          await mysqlSequelize.query(
            'UPDATE content_items SET media_ids = :mediaIds, updated_at = NOW() WHERE id = :id',
            { replacements: { mediaIds: typeof sourceItem.media_ids === 'string' ? sourceItem.media_ids : JSON.stringify(sourceItem.media_ids), id: repurposedItemId } }
          );
        } catch { /* non-blocking */ }
      }
    }

    res.json({ success: true, data: { repurposed: results.length, source_id: Number(id), ids: savedIds, items: results } });
  } catch (error) {
    logger.error('[AdminPortal] Content repurpose error:', error);
    res.status(500).json({ success: false, error: { code: 'REPURPOSE_ERROR', message: error.message } });
  }
});

/**
 * POST /content/items/:id/share-to-destination — Share content to another destination
 * Body: { destination_id }
 */
router.post('/content/items/:id/share-to-destination', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { destination_id } = req.body;
    if (!destination_id) return res.status(400).json({ success: false, error: { code: 'MISSING_DEST', message: 'destination_id is required' } });

    const [[sourceItem]] = await mysqlSequelize.query(
      'SELECT * FROM content_items WHERE id = :id',
      { replacements: { id: Number(id) } }
    );
    if (!sourceItem) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content item not found' } });

    // Re-generate with new destination's tone
    const { generateContent } = await import('../services/agents/contentRedacteur/contentGenerator.js');
    const suggestion = {
      title: sourceItem.title,
      summary: `Adapt this content for a different destination: ${(sourceItem.body_en || '').substring(0, 500)}`,
      keyword_cluster: typeof sourceItem.keyword_cluster === 'string' ? JSON.parse(sourceItem.keyword_cluster || '[]') : (sourceItem.keyword_cluster || []),
      content_type: sourceItem.content_type,
    };

    const result = await generateContent(suggestion, {
      destinationId: Number(destination_id),
      contentType: sourceItem.content_type,
      platform: sourceItem.target_platform,
      personaId: null, // Uses target destination's brand context + tone automatically
    });

    // Save as new item in target destination
    const [insertResult] = await mysqlSequelize.query(
      `INSERT INTO content_items
       (destination_id, content_type, title, body_en, body_nl, body_de, body_es, body_fr,
        seo_data, target_platform, approval_status, ai_model, ai_generated, created_at, updated_at)
       VALUES (:destId, :contentType, :title, :bodyEn, :bodyNl, :bodyDe, :bodyEs, :bodyFr,
        :seoData, :platform, 'draft', :aiModel, true, NOW(), NOW())`,
      {
        replacements: {
          destId: Number(destination_id),
          contentType: result.content_type,
          title: result.title,
          bodyEn: result.body_en || null,
          bodyNl: result.body_nl || null,
          bodyDe: result.body_de || null,
          bodyEs: result.body_es || null,
          bodyFr: result.body_fr || null,
          seoData: JSON.stringify({ meta_description: result.meta_description, hashtags: result.hashtags }),
          platform: result.target_platform,
          aiModel: result.ai_model,
        },
      }
    );

    // Copy images if source has them — try target destination's images first, fallback to source
    const newItemId = insertResult;
    try {
      const { selectImages } = await import('../services/agents/contentRedacteur/imageSelector.js');
      const contentObj = { title: result.title, body_en: result.body_en, destination_id: Number(destination_id), content_type: sourceItem.content_type, target_platform: sourceItem.target_platform };
      const images = await selectImages(contentObj, Number(destination_id));
      if (images.length > 0) {
        const maxImgs = sourceItem.content_type === 'social_post' ? 1 : 3;
        const mediaIds = images.slice(0, maxImgs).map(img => img.source === 'poi' ? `poi:${img.id}` : img.id);
        await mysqlSequelize.query('UPDATE content_items SET media_ids = :m WHERE id = :id', { replacements: { m: JSON.stringify(mediaIds), id: newItemId } });
      }
    } catch { /* non-blocking */ }

    logger.info(`[AdminPortal] Content shared: item ${id} → destination ${destination_id}, new item ${newItemId}`);
    res.json({ success: true, data: { id: newItemId, source_id: Number(id), destination_id: Number(destination_id), title: result.title } });
  } catch (error) {
    logger.error('[AdminPortal] Content share error:', error);
    res.status(500).json({ success: false, error: { code: 'SHARE_ERROR', message: error.message } });
  }
});

// ============================================================================
// WAVE 2: VISUELE CONTENT — Image Selection, Unsplash Search, Image Format
// ============================================================================

/**
 * GET /content/images/resolve/:id — Resolve a single imageurls ID to its URL
 */
router.get('/content/images/resolve/:id', adminAuth('editor'), async (req, res) => {
  try {
    const imgId = parseInt(req.params.id);
    const imageBaseUrl = process.env.IMAGE_BASE_URL || 'https://api.holidaibutler.com';

    const [[img]] = await mysqlSequelize.query(
      `SELECT i.id, i.poi_id, i.local_path, i.image_url, p.name as poi_name
       FROM imageurls i LEFT JOIN POI p ON i.poi_id = p.id
       WHERE i.id = :id`,
      { replacements: { id: imgId } }
    );

    if (!img) {
      // Try media table
      const [[media]] = await mysqlSequelize.query(
        `SELECT id, filename, destination_id, alt_text FROM media WHERE id = :id`,
        { replacements: { id: imgId } }
      );
      if (media) {
        const apiBase = process.env.API_BASE_URL || 'https://api.holidaibutler.com';
        return res.json({ success: true, data: { id: media.id, url: `${apiBase}/media-files/${media.destination_id}/${media.filename}`, poi_name: media.alt_text } });
      }
      return res.json({ success: true, data: { id: imgId, url: null } });
    }

    const url = img.local_path ? `${imageBaseUrl}${img.local_path}` : img.image_url;
    res.json({ success: true, data: { id: img.id, url, poi_name: img.poi_name, poi_id: img.poi_id } });
  } catch (error) {
    res.json({ success: true, data: { id: parseInt(req.params.id), url: null } });
  }
});

/**
 * POST /content/media/resolve-batch — Resolve mixed media_ids array to absolute URLs.
 * Accepts:
 *   - HTTP URLs (string starting with "http")  → returned as-is
 *   - "/path"  (string starting with "/")      → prefixed with API base
 *   - "poi:N"  (POI image reference)           → looked up in imageurls table
 *   - N (numeric, media library ID)            → looked up in media table
 *
 * Body: { ids: Array<string|number> }
 * Returns: { success: true, data: [{ id, url, alt, source }, ...] } in same order as input.
 *
 * Single source of truth for media resolution — both preview AND publisher MUST use this.
 */
router.post('/content/media/resolve-batch', adminAuth('editor'), async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (ids.length === 0) return res.json({ success: true, data: [] });

    const imageBase = process.env.IMAGE_BASE_URL || 'https://api.holidaibutler.com';
    const apiBase = process.env.API_BASE_URL || 'https://api.holidaibutler.com';

    // Bucket the IDs by type. Bare numbers are LEGACY ambiguous — they could be
    // either imageurls.id (POI image, the historical case) OR media.id (library).
    // We dual-lookup: try imageurls FIRST (more common), fall back to media.
    const poiImageIds = []; // entries from "poi:N"
    const mediaIds = [];    // entries from "media:N"
    const ambiguousIds = []; // bare numbers — try poi first, then media
    const passthrough = new Map(); // index → resolved object (for URLs/paths)

    ids.forEach((raw, idx) => {
      if (raw == null) return;
      if (typeof raw === 'string') {
        if (raw.startsWith('http://') || raw.startsWith('https://')) {
          passthrough.set(idx, { id: raw, url: raw, source: 'url' });
          return;
        }
        if (raw.startsWith('/')) {
          passthrough.set(idx, { id: raw, url: `${apiBase}${raw}`, source: 'path' });
          return;
        }
        if (raw.startsWith('poi:')) {
          const n = Number(raw.slice(4));
          if (!isNaN(n) && n > 0) poiImageIds.push({ idx, id: n, raw });
          return;
        }
        if (raw.startsWith('media:')) {
          const n = Number(raw.slice(6));
          if (!isNaN(n) && n > 0) mediaIds.push({ idx, id: n, raw });
          return;
        }
        // Bare numeric string → ambiguous legacy
        const n = Number(raw);
        if (!isNaN(n) && n > 0) ambiguousIds.push({ idx, id: n, raw });
        return;
      }
      if (typeof raw === 'number' && raw > 0) {
        ambiguousIds.push({ idx, id: raw, raw });
      }
    });

    // Combined POI imageurls lookup (explicit "poi:N" + ambiguous bare numbers)
    const poiResults = new Map();
    const allPoiLookup = [...poiImageIds.map(p => p.id), ...ambiguousIds.map(a => a.id)];
    if (allPoiLookup.length > 0) {
      const [rows] = await mysqlSequelize.query(
        `SELECT i.id, i.local_path, i.image_url, p.name AS poi_name, p.id AS poi_id
         FROM imageurls i LEFT JOIN POI p ON i.poi_id = p.id
         WHERE i.id IN (:ids)`,
        { replacements: { ids: allPoiLookup } }
      );
      rows.forEach(r => poiResults.set(r.id, r));
    }

    // Combined media library lookup (explicit "media:N" + bare numbers that missed imageurls)
    const mediaResults = new Map();
    const ambiguousNotInPoi = ambiguousIds.filter(a => !poiResults.has(a.id));
    const allMediaLookup = [...mediaIds.map(m => m.id), ...ambiguousNotInPoi.map(a => a.id)];
    if (allMediaLookup.length > 0) {
      const [rows] = await mysqlSequelize.query(
        `SELECT id, filename, destination_id, alt_text FROM media WHERE id IN (:ids)`,
        { replacements: { ids: allMediaLookup } }
      );
      rows.forEach(r => mediaResults.set(r.id, r));
    }

    const buildPoiResult = (raw, r) => ({
      id: raw,
      url: r.local_path ? `${imageBase}${r.local_path}` : r.image_url,
      alt: r.poi_name || '',
      poi_id: r.poi_id,
      source: 'poi',
    });
    const buildMediaResult = (raw, r) => ({
      id: raw,
      url: `${apiBase}/media-files/${r.destination_id}/${r.filename}`,
      alt: r.alt_text || '',
      source: 'media',
    });

    // Assemble in original order
    const result = ids.map((raw, idx) => {
      if (passthrough.has(idx)) return passthrough.get(idx);

      const poi = poiImageIds.find(p => p.idx === idx);
      if (poi) {
        const r = poiResults.get(poi.id);
        return r ? buildPoiResult(raw, r) : { id: raw, url: null, source: 'poi', error: 'not_found' };
      }

      const med = mediaIds.find(m => m.idx === idx);
      if (med) {
        const r = mediaResults.get(med.id);
        return r ? buildMediaResult(raw, r) : { id: raw, url: null, source: 'media', error: 'not_found' };
      }

      const amb = ambiguousIds.find(a => a.idx === idx);
      if (amb) {
        // Try POI first (more common case), then media library
        const poiRow = poiResults.get(amb.id);
        if (poiRow) return buildPoiResult(raw, poiRow);
        const medRow = mediaResults.get(amb.id);
        if (medRow) return buildMediaResult(raw, medRow);
        return { id: raw, url: null, source: 'ambiguous', error: 'not_found_in_poi_or_media' };
      }

      return { id: raw, url: null, source: 'unknown' };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[AdminPortal] Media resolve-batch error:', error);
    res.status(500).json({ success: false, error: { code: 'MEDIA_RESOLVE_ERROR', message: error.message } });
  }
});

/**
 * GET /content/images/browse — Browse POI images for content image picker
 * Query: destination_id, search (optional POI name search), limit
 */
router.get('/content/images/browse', adminAuth('editor'), async (req, res) => {
  try {
    const { destination_id = 1, search, limit = 30 } = req.query;
    const destId = Number(destination_id);
    const imageBaseUrl = process.env.IMAGE_BASE_URL || 'https://api.holidaibutler.com';

    let whereClause = 'p.destination_id = ? AND p.is_active = 1';
    const params = [destId];

    // Search across POI name/category AND image keywords (verified + visual)
    let fulltextSearch = false;
    if (search && search.trim().length > 1) {
      const term = search.trim();
      // Try FULLTEXT on image keywords first, fallback to LIKE on POI fields
      whereClause += ` AND (p.name LIKE ? OR p.category LIKE ?
        OR MATCH(i.keywords_verified) AGAINST(? IN BOOLEAN MODE)
        OR MATCH(i.keywords_visual) AGAINST(? IN BOOLEAN MODE))`;
      params.push(`%${term}%`, `%${term}%`, term, term);
      fulltextSearch = true;
    }

    const [images] = await mysqlSequelize.query(`
      SELECT i.id, i.poi_id, i.local_path, i.image_url, i.keywords_verified, i.visual_description,
             p.name as poi_name, p.category as poi_category
      FROM imageurls i
      JOIN POI p ON i.poi_id = p.id
      WHERE ${whereClause}
      AND i.local_path IS NOT NULL AND i.local_path != ''
      GROUP BY i.poi_id
      ORDER BY p.rating DESC, p.review_count DESC
      LIMIT ?
    `, { replacements: [...params, Number(limit)] });

    const data = images.map(img => ({
      id: img.id,
      poi_id: img.poi_id,
      poi_name: img.poi_name,
      poi_category: img.poi_category,
      url: `${imageBaseUrl}${img.local_path}`,
      thumbnail: `${imageBaseUrl}${img.local_path}`,
    }));

    res.json({ success: true, data });
  } catch (error) {
    logger.error('[AdminPortal] Image browse error:', error);
    res.status(500).json({ success: false, error: { code: 'BROWSE_ERROR', message: error.message } });
  }
});

/**
 * POST /content/images/suggest — AI image suggestions for content item
 * Body: content_item_id OR { title, body_en, poi_id, destination_id }
 */
router.post('/content/images/suggest', adminAuth('editor'), async (req, res) => {
  try {
    const { content_item_id, title, body_en, poi_id, exclude_ids } = req.body;
    const destId = req.adminUser?.destination_id || req.body.destination_id || 1;

    let contentItem = { title, body_en, poi_id, destination_id: destId };

    if (content_item_id) {
      const [[item]] = await mysqlSequelize.query(
        'SELECT id, title, body_en, poi_id, destination_id, content_type, target_platform FROM content_items WHERE id = :id',
        { replacements: { id: Number(content_item_id) } }
      );
      if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content item not found' } });
      contentItem = item;
    }

    const excludeIds = Array.isArray(exclude_ids) ? exclude_ids : [];
    const { selectImages } = await import('../services/agents/contentRedacteur/imageSelector.js');
    const images = await selectImages(contentItem, contentItem.destination_id || destId, { forSuggestion: true, excludeIds });

    res.json({ success: true, data: images });
  } catch (error) {
    logger.error('[AdminPortal] Image suggestion error:', error);
    res.status(500).json({ success: false, error: { code: 'IMAGE_SUGGEST_ERROR', message: error.message } });
  }
});

/**
 * POST /content/images/unsplash — Search Unsplash for stock images
 * Body: { query, per_page }
 */
router.post('/content/images/unsplash', adminAuth('editor'), async (req, res) => {
  try {
    const { query, per_page = 6 } = req.body;
    if (!query) return res.status(400).json({ success: false, error: { code: 'MISSING_QUERY', message: 'query is required' } });

    const { searchUnsplash } = await import('../services/agents/contentRedacteur/unsplashClient.js');
    const results = await searchUnsplash(query, Math.min(per_page, 12));

    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('[AdminPortal] Unsplash search error:', error);
    res.status(500).json({ success: false, error: { code: 'UNSPLASH_ERROR', message: error.message } });
  }
});

/**
 * POST /content/images/pexels — Search Pexels for stock images
 * Body: { query, per_page }
 */
router.post('/content/images/pexels', adminAuth('editor'), async (req, res) => {
  try {
    const { query, per_page = 6 } = req.body;
    if (!query) return res.status(400).json({ success: false, error: { code: 'MISSING_QUERY', message: 'query is required' } });

    const { searchPexels } = await import('../services/agents/contentRedacteur/pexelsClient.js');
    const results = await searchPexels(query, Math.min(per_page, 12));

    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('[AdminPortal] Pexels search error:', error);
    res.status(500).json({ success: false, error: { code: 'PEXELS_ERROR', message: error.message } });
  }
});

/**
 * POST /content/images/flickr — Search Flickr for stock images (commercial-use only)
 * Body: { query, per_page }
 */
router.post('/content/images/flickr', adminAuth('editor'), async (req, res) => {
  try {
    const { query, per_page = 6 } = req.body;
    if (!query) return res.status(400).json({ success: false, error: { code: 'MISSING_QUERY', message: 'query is required' } });

    const { searchFlickr } = await import('../services/agents/contentRedacteur/flickrClient.js');
    const results = await searchFlickr(query, Math.min(per_page, 12));

    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('[AdminPortal] Flickr search error:', error);
    res.status(500).json({ success: false, error: { code: 'FLICKR_ERROR', message: error.message } });
  }
});

/**
 * POST /content/images/format — Resize image for platform specs
 * Body: { image_path, platform, format }
 */
router.post('/content/images/format', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { image_path, platform, format = 'post' } = req.body;
    if (!image_path || !platform) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_PARAMS', message: 'image_path and platform are required' } });
    }

    const { formatImage } = await import('../services/agents/contentRedacteur/imageFormatter.js');
    const storageRoot = process.env.STORAGE_ROOT || '/var/www/api.holidaibutler.com/storage';
    const fullPath = image_path.startsWith('/') ? image_path : `${storageRoot}/${image_path}`;

    const result = await formatImage(fullPath, platform, format);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[AdminPortal] Image format error:', error);
    res.status(500).json({ success: false, error: { code: 'IMAGE_FORMAT_ERROR', message: error.message } });
  }
});

/**
 * POST /content/items/:id/images — Attach image(s) to content item
 * Body: { media_ids: [1,2,3] }  — array of media IDs or image URLs to link
 */
router.post('/content/items/:id/images', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { media_ids = [] } = req.body;
    if (!Array.isArray(media_ids) || media_ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_MEDIA', message: 'media_ids array is required' } });
    }

    // Get current media_ids
    const [[item]] = await mysqlSequelize.query(
      'SELECT id, media_ids FROM content_items WHERE id = :id',
      { replacements: { id: Number(id) } }
    );
    if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content item not found' } });

    let current = [];
    try { current = item.media_ids ? (typeof item.media_ids === 'string' ? JSON.parse(item.media_ids) : item.media_ids) : []; } catch { current = []; }

    // Merge new media_ids, deduplicate
    const merged = [...new Set([...current, ...media_ids])];

    await mysqlSequelize.query(
      'UPDATE content_items SET media_ids = :mediaIds, updated_at = NOW() WHERE id = :id',
      { replacements: { mediaIds: JSON.stringify(merged), id: Number(id) } }
    );

    res.json({ success: true, data: { media_ids: merged } });
  } catch (error) {
    logger.error('[AdminPortal] Image attach error:', error);
    res.status(500).json({ success: false, error: { code: 'IMAGE_ATTACH_ERROR', message: error.message } });
  }
});

/**
 * DELETE /content/items/:id/images/:mediaId — Remove image from content item
 */
router.delete('/content/items/:id/images/:mediaId', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { id, mediaId } = req.params;

    const [[item]] = await mysqlSequelize.query(
      'SELECT id, media_ids FROM content_items WHERE id = :id',
      { replacements: { id: Number(id) } }
    );
    if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content item not found' } });

    let current = [];
    try { current = item.media_ids ? (typeof item.media_ids === 'string' ? JSON.parse(item.media_ids) : item.media_ids) : []; } catch { current = []; }

    // Remove the mediaId (can be numeric or string)
    const filtered = current.filter(m => String(m) !== String(mediaId));

    await mysqlSequelize.query(
      'UPDATE content_items SET media_ids = :mediaIds, updated_at = NOW() WHERE id = :id',
      { replacements: { mediaIds: JSON.stringify(filtered), id: Number(id) } }
    );

    res.json({ success: true, data: { media_ids: filtered } });
  } catch (error) {
    logger.error('[AdminPortal] Image detach error:', error);
    res.status(500).json({ success: false, error: { code: 'IMAGE_DETACH_ERROR', message: error.message } });
  }
});

// ============================================================================
// FASE C: PUBLISHING — Calendar, Publish, Schedule, Social Accounts, Seasonal
// ============================================================================

/**
 * GET /content/calendar — Calendar data (month/week view)
 * Returns content items with scheduled_at or published_at for date range
 */
router.get('/content/calendar', adminAuth('editor'), async (req, res) => {
  try {
    const destId = req.adminUser?.destination_id || req.query.destination_id || 1;
    const { start, end, view, month, year: qYear } = req.query;
    // Support both start/end and month/year params (frontend sends month/year)
    let startDate, endDate;
    if (start && end) {
      startDate = start;
      endDate = end;
    } else if (month && qYear) {
      const m = Number(month) - 1; // JS months are 0-based
      const y = Number(qYear);
      startDate = new Date(y, m, 1).toISOString().split('T')[0];
      endDate = new Date(y, m + 1, 0).toISOString().split('T')[0];
    } else {
      startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      endDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
    }

    const [items] = await mysqlSequelize.query(
      `SELECT ci.id, ci.title, ci.content_type, ci.target_platform, ci.approval_status, ci.scheduled_at, ci.published_at, ci.publish_url, ci.created_at,
              ci.seo_score, cc.pillar_id, cp.name AS pillar_name, cp.color AS pillar_color
       FROM content_items ci
       LEFT JOIN content_concepts cc ON cc.id = ci.concept_id
       LEFT JOIN content_pillars cp ON cp.id = cc.pillar_id
       WHERE ci.destination_id = :destId AND ci.approval_status NOT IN ('deleted')
         AND (
           (ci.scheduled_at BETWEEN :start AND :end)
           OR (ci.published_at BETWEEN :start AND :end)
           OR (ci.approval_status IN ('approved', 'draft', 'scheduled', 'publishing') AND ci.created_at BETWEEN :start AND :end)
         )
       ORDER BY COALESCE(ci.scheduled_at, ci.published_at, ci.created_at) ASC`,
      { replacements: { destId: Number(destId), start: startDate, end: endDate + ' 23:59:59' } }
    );

    // Also fetch seasonal periods for overlay (table uses start_month/start_day, not start_date)
    const queryYear = qYear ? Number(qYear) : new Date().getFullYear();
    const queryMonth = month ? Number(month) : (new Date().getMonth() + 1);
    const [seasons] = await mysqlSequelize.query(
      `SELECT id, season_name, start_month, start_day, end_month, end_day, is_active, hero_image_path
       FROM seasonal_config
       WHERE destination_id = :destId AND is_active = 1
         AND ((start_month <= :qMonth AND end_month >= :qMonth)
           OR (start_month > end_month AND (start_month <= :qMonth OR end_month >= :qMonth)))`,
      { replacements: { destId: Number(destId), qMonth: queryMonth } }
    );
    // Convert month/day to ISO date strings for frontend compatibility
    const seasonsFormatted = (seasons || []).map(s => ({
      ...s,
      start_date: `${queryYear}-${String(s.start_month).padStart(2, '0')}-${String(s.start_day).padStart(2, '0')}`,
      end_date: `${queryYear}-${String(s.end_month).padStart(2, '0')}-${String(s.end_day).padStart(2, '0')}`,
    }));

    res.json({ success: true, data: { items: items || [], seasons: seasonsFormatted, view: view || 'month' } });
  } catch (error) {
    logger.error('[AdminPortal] Calendar error:', error);
    res.status(500).json({ success: false, error: { code: 'CALENDAR_ERROR', message: error.message } });
  }
});

/**
 * POST /content/auto-schedule — Auto-schedule approved items across optimal times
 * Distributes approved (unscheduled) items across the coming week at best times per platform.
 */
router.post('/content/auto-schedule', adminAuth('destination_admin'), writeAccess(['platform_admin', 'destination_admin']), async (req, res) => {
  try {
    const destId = Number(req.body.destination_id) || Number(req.query.destination_id) || 1;

    // Get approved, unscheduled items
    const [approved] = await mysqlSequelize.query(
      `SELECT id, target_platform, content_type FROM content_items
       WHERE destination_id = :destId AND approval_status = 'approved' AND scheduled_at IS NULL
       ORDER BY created_at ASC`,
      { replacements: { destId } }
    );

    if (approved.length === 0) {
      return res.json({ success: true, data: { scheduled: 0, message: 'Geen goedgekeurde items om in te plannen' } });
    }

    // Best times per platform (based on general social media research)
    const BEST_TIMES = {
      instagram: ['10:00', '13:00', '17:00'],
      facebook: ['09:00', '12:00', '15:00'],
      linkedin: ['08:00', '10:00', '12:00'],
      x: ['08:00', '12:00', '17:00'],
      pinterest: ['14:00', '20:00'],
      youtube: ['15:00', '18:00'],
      website: ['09:00'],
    };

    // Distribute across coming 7 days
    const now = new Date();
    const scheduled = [];
    let dayOffset = 1; // Start tomorrow
    let timeIndex = 0;

    for (const item of approved) {
      const times = BEST_TIMES[item.target_platform] || BEST_TIMES.instagram;
      const time = times[timeIndex % times.length];
      const [hours, minutes] = time.split(':');

      const scheduleDate = new Date(now);
      scheduleDate.setDate(scheduleDate.getDate() + dayOffset);
      scheduleDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await mysqlSequelize.query(
        `UPDATE content_items SET scheduled_at = :scheduledAt, approval_status = 'scheduled', updated_at = NOW() WHERE id = :id`,
        { replacements: { scheduledAt: scheduleDate.toISOString().slice(0, 19).replace('T', ' '), id: item.id } }
      );

      // Log approval
      await mysqlSequelize.query(
        `INSERT INTO content_approval_log (content_item_id, from_status, to_status, changed_by, comment)
         VALUES (:itemId, 'approved', 'scheduled', :userId, :comment)`,
        { replacements: { itemId: item.id, userId: req.adminUser?.id || 'system', comment: `Auto-scheduled for ${scheduleDate.toISOString().split('T')[0]} ${time}` } }
      );

      scheduled.push({ id: item.id, platform: item.target_platform, scheduled_at: scheduleDate.toISOString() });

      timeIndex++;
      if (timeIndex >= times.length) { timeIndex = 0; dayOffset++; }
      if (dayOffset > 7) dayOffset = 1; // Wrap around
    }

    logger.info(`[AdminPortal] Auto-scheduled ${scheduled.length} items for destination ${destId}`);
    res.json({ success: true, data: { scheduled: scheduled.length, items: scheduled } });
  } catch (error) {
    logger.error('[AdminPortal] Auto-schedule error:', error);
    res.status(500).json({ success: false, error: { code: 'AUTO_SCHEDULE_ERROR', message: error.message } });
  }
});

/**
 * POST /content/campaigns/generate — One-Click Campaign: generate blog + 5 social posts + video script
 * Body: { topic, persona_id, language, destination_id }
 */
router.post('/content/campaigns/generate', adminAuth('destination_admin'), writeAccess(['platform_admin', 'destination_admin']), async (req, res) => {
  try {
    const { topic, persona_id } = req.body;
    const destId = Number(req.body.destination_id) || Number(req.query.destination_id) || 1;
    if (!topic) return res.status(400).json({ success: false, error: { code: 'MISSING_TOPIC', message: 'topic is required' } });

    // Use the SAME pipeline as individual content generation: sanitize, format, translate, images, SEO
    const redacteur = (await import('../services/agents/contentRedacteur/index.js')).default;
    const { sanitizeContent } = await import('../services/agents/contentRedacteur/contentSanitizer.js');
    const { formatForPlatform } = await import('../services/agents/contentRedacteur/contentFormatter.js');
    const { selectImages } = await import('../services/agents/contentRedacteur/imageSelector.js');
    const { analyzeContent } = await import('../services/agents/seoMeester/seoAnalyzer.js');

    // Campaign = 1 item per ACTIVE platform only (from feature_flags.social_platforms)
    const [[destRow]] = await mysqlSequelize.query('SELECT feature_flags, brand_profile FROM destinations WHERE id = :destId', { replacements: { destId } });
    let ff = {};
    try { ff = typeof destRow?.feature_flags === 'string' ? JSON.parse(destRow.feature_flags) : (destRow?.feature_flags || {}); } catch { /* empty */ }
    const sp = ff.social_platforms || {};
    const activeChannels = Object.entries(sp).filter(([, v]) => v === true).map(([k]) => k);

    let bp = {};
    try { bp = typeof destRow?.brand_profile === 'string' ? JSON.parse(destRow.brand_profile) : (destRow?.brand_profile || {}); } catch { /* empty */ }
    const goals = bp.content_goals || {};

    const CAMPAIGN_PLATFORMS = [];
    // Blog only if blogs_per_month > 0
    if (goals.blogs_per_month > 0) CAMPAIGN_PLATFORMS.push({ content_type: 'blog', platform: 'website' });
    // Social posts only for active channels
    for (const ch of activeChannels) {
      if (ch === 'youtube') CAMPAIGN_PLATFORMS.push({ content_type: 'video_script', platform: 'youtube' });
      else CAMPAIGN_PLATFORMS.push({ content_type: 'social_post', platform: ch });
    }
    // Fallback if nothing active
    if (CAMPAIGN_PLATFORMS.length === 0) CAMPAIGN_PLATFORMS.push({ content_type: 'social_post', platform: 'instagram' }, { content_type: 'social_post', platform: 'facebook' });

    // Create a pseudo-suggestion for each platform
    const saved = [];
    for (const camp of CAMPAIGN_PLATFORMS) {
      try {
        const suggestion = {
          id: null,
          destination_id: destId,
          title: topic,
          summary: `Campaign item for ${camp.platform}: ${topic}`,
          content_type: camp.content_type,
          keyword_cluster: topic.split(/\s+/).filter(w => w.length > 2),
        };

        // Generate via De Redacteur (full pipeline: brand context, tone, sanitize, format, translate, SEO)
        const generated = await redacteur.generateContentItem(suggestion, {
          destinationId: destId,
          contentType: camp.content_type,
          platform: camp.platform,
          languages: [],
          personaId: persona_id ? Number(persona_id) : null,
        });

        // Save to content_items
        const [insertResult] = await mysqlSequelize.query(
          `INSERT INTO content_items
           (destination_id, content_type, title, body_en, body_nl, body_de, body_es, body_fr,
            seo_data, seo_score, target_platform, approval_status, ai_model, ai_generated, created_at, updated_at)
           VALUES (:destId, :contentType, :title, :bodyEn, :bodyNl, :bodyDe, :bodyEs, :bodyFr,
            :seoData, :seoScore, :platform, 'draft', :aiModel, true, NOW(), NOW())`,
          { replacements: {
            destId,
            contentType: generated.content_type,
            title: generated.title,
            bodyEn: generated.body_en || null,
            bodyNl: generated.body_nl || null,
            bodyDe: generated.body_de || null,
            bodyEs: generated.body_es || null,
            bodyFr: generated.body_fr || null,
            seoData: JSON.stringify({ meta_description: generated.meta_description, hashtags: generated.hashtags, campaign: topic }),
            seoScore: generated.seo_score || null,
            platform: generated.target_platform,
            aiModel: generated.ai_model,
          } }
        );

        const contentItemId = insertResult;

        // Auto-attach images (same as regular generate)
        try {
          const contentObj = { title: generated.title, body_en: generated.body_en, destination_id: destId, content_type: camp.content_type, target_platform: camp.platform };
          const images = await selectImages(contentObj, destId);
          if (images.length > 0) {
            const maxImgs = camp.content_type === 'social_post' ? 1 : camp.content_type === 'video_script' ? 1 : 3;
            const mediaIds = images.slice(0, maxImgs).map(img => img.source === 'poi' ? `poi:${img.id}` : img.id);
            await mysqlSequelize.query(
              'UPDATE content_items SET media_ids = :mediaIds, updated_at = NOW() WHERE id = :id',
              { replacements: { mediaIds: JSON.stringify(mediaIds), id: contentItemId } }
            );
          }
        } catch { /* non-blocking */ }

        saved.push({ id: contentItemId, content_type: camp.content_type, target_platform: camp.platform, title: generated.title, seo_score: generated.seo_score });
      } catch (itemErr) {
        logger.warn(`[Campaign] Item ${camp.platform} failed:`, itemErr.message);
      }
    }

    logger.info(`[AdminPortal] Campaign generated: "${topic}" → ${saved.length} items for destination ${destId}`);
    res.json({ success: true, data: { topic, items: saved, total: saved.length } });
  } catch (error) {
    logger.error('[AdminPortal] Campaign generate error:', error);
    res.status(500).json({ success: false, error: { code: 'CAMPAIGN_ERROR', message: error.message } });
  }
});

/**
 * POST /content/calendar/auto-fill — AI generates content plan for a month
 * Body: { month, year, destination_id }
 */
router.post('/content/calendar/auto-fill', adminAuth('destination_admin'), writeAccess(['platform_admin', 'destination_admin']), async (req, res) => {
  try {
    const { month, year } = req.body;
    const destId = Number(req.body.destination_id) || Number(req.query.destination_id) || 1;
    if (!month || !year) return res.status(400).json({ success: false, error: { code: 'MISSING_PARAMS', message: 'month and year are required' } });

    // Gather context
    const [pillars] = await mysqlSequelize.query(
      'SELECT name, target_percentage FROM content_pillars WHERE destination_id = :destId AND is_active = 1', { replacements: { destId } }
    );
    const [personas] = await mysqlSequelize.query(
      'SELECT name, interests, language FROM audience_personas WHERE destination_id = :destId ORDER BY is_primary DESC', { replacements: { destId } }
    );
    const [trending] = await mysqlSequelize.query(
      'SELECT keyword, relevance_score FROM trending_data WHERE destination_id = :destId ORDER BY relevance_score DESC LIMIT 15', { replacements: { destId } }
    );
    const [[dest]] = await mysqlSequelize.query(
      'SELECT name, brand_profile, default_language FROM destinations WHERE id = :destId', { replacements: { destId } }
    );
    let profile = {};
    try { profile = typeof dest?.brand_profile === 'string' ? JSON.parse(dest.brand_profile) : (dest?.brand_profile || {}); } catch { /* empty */ }
    const goals = profile.content_goals || { posts_per_week: 3, blogs_per_month: 0 };
    const totalPosts = (goals.posts_per_week || 3) * 4 + (goals.blogs_per_month || 0);
    const destLang = dest?.default_language || 'nl';
    const LANG_NAMES = { nl: 'Dutch', en: 'English', de: 'German', es: 'Spanish', fr: 'French' };

    // Get active social platforms from feature_flags
    let activeChannels = ['instagram', 'facebook'];
    try {
      const [[ffRow]] = await mysqlSequelize.query('SELECT feature_flags FROM destinations WHERE id = :destId', { replacements: { destId } });
      const ff = typeof ffRow?.feature_flags === 'string' ? JSON.parse(ffRow.feature_flags) : (ffRow?.feature_flags || {});
      const sp = ff.social_platforms || {};
      activeChannels = Object.entries(sp).filter(([, v]) => v === true).map(([k]) => k);
      if (activeChannels.length === 0) activeChannels = ['instagram', 'facebook'];
    } catch { /* fallback */ }

    const prompt = `You are a content strategist. Create a content calendar.

BRAND: ${profile.company_name || dest?.name || 'Unknown'}
DESCRIPTION: ${profile.company_description || ''}
USPs: ${(profile.usps || []).join(', ')}
PILLARS: ${pillars.length > 0 ? pillars.map(p => `${p.name} (${p.target_percentage}%)`).join(', ') : 'No pillars defined — distribute evenly across topics'}
AUDIENCES: ${personas.length > 0 ? personas.map(p => p.name).join(', ') : 'General audience'}
TRENDING: ${trending.length > 0 ? trending.map(t => t.keyword).join(', ') : 'No specific trends'}
GOAL: ${goals.posts_per_week || 3} social posts/week + ${goals.blogs_per_month || 0} blogs/month = ~${totalPosts} items total

Today is ${new Date().toISOString().split('T')[0]}. Generate exactly ${totalPosts} content items for the NEXT 4 WEEKS starting from today.
IMPORTANT: All dates MUST be today or in the future. Never use past dates.
ACTIVE CHANNELS: ${activeChannels.join(', ')} — ONLY use these platforms as target_platform.
${goals.blogs_per_month === 0 ? 'NO blogs — only social_post items.' : `${goals.blogs_per_month} blog(s) for website, rest as social_post.`}
Write ALL titles and descriptions in ${LANG_NAMES[destLang] || 'Dutch'}.
Per item: date (YYYY-MM-DD), title, content_type (blog or social_post), target_platform (one of: ${activeChannels.join(', ')}${goals.blogs_per_month > 0 ? ', website' : ''}), pillar, target_persona, brief (1-2 sentences).
Distribute posts evenly across ${activeChannels.length} active channels.

Return as JSON array only.`;

    const embeddingService = (await import('../services/holibot/embeddingService.js')).default;
    if (!embeddingService.isConfigured) embeddingService.initialize();

    const aiResponse = await embeddingService.generateChatCompletion([
      { role: 'user', content: prompt }
    ], { temperature: 0.8, maxTokens: 4000 });

    let suggestions = [];
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) suggestions = JSON.parse(jsonMatch[0]);
    } catch { suggestions = []; }

    // Save as content_items with scheduled_at date, status 'draft' — directly visible in calendar
    const bodyField = `body_${destLang}`;
    const saved = [];
    for (const s of suggestions) {
      try {
        // Parse date or default to spread across upcoming days
        let schedDate = s.date || `${year}-${String(month).padStart(2, '0')}-${String(Math.min(28, saved.length + 1)).padStart(2, '0')}`;
        // Best time per platform (research-based optimal posting times)
        const BEST_TIMES = {
          instagram: ['10:00', '13:00', '17:00'],
          facebook: ['09:00', '12:00', '15:00'],
          linkedin: ['08:00', '10:00', '12:00'],
          x: ['08:00', '12:00', '17:00'],
          pinterest: ['14:00', '20:00'],
          youtube: ['15:00', '18:00'],
          website: ['09:00'],
        };
        const platformTimes = BEST_TIMES[s.target_platform] || BEST_TIMES.instagram;
        const bestTime = platformTimes[saved.length % platformTimes.length];
        const scheduledAt = `${schedDate} ${bestTime}:00`;

        const [result] = await mysqlSequelize.query(
          `INSERT INTO content_items (destination_id, content_type, title, ${bodyField}, target_platform, approval_status, scheduled_at, ai_generated, ai_model, seo_data, created_at, updated_at)
           VALUES (:destId, :contentType, :title, :body, :platform, 'draft', :scheduledAt, true, 'calendar-autofill', :seoData, NOW(), NOW())`,
          { replacements: {
            destId, contentType: s.content_type === 'blog' ? 'blog' : 'social_post',
            title: s.title || 'Untitled',
            body: s.brief || s.description || s.summary || '',
            platform: s.target_platform || 'instagram',
            scheduledAt,
            seoData: JSON.stringify({ pillar: s.pillar || '', persona: s.target_persona || '', source: 'calendar-autofill' }),
          }, type: QueryTypes.INSERT }
        );
        saved.push({ id: result, date: schedDate, title: s.title, content_type: s.content_type, target_platform: s.target_platform, pillar: s.pillar, persona: s.target_persona });
      } catch (saveErr) {
        logger.warn('[AutoFill] Save item failed:', saveErr.message);
      }
    }

    logger.info(`[AdminPortal] Calendar auto-fill: ${saved.length} items for ${month}/${year}, destination ${destId}`);
    res.json({ success: true, data: { generated: saved.length, month, year, suggestions: saved } });
  } catch (error) {
    logger.error('[AdminPortal] Calendar auto-fill error:', error);
    res.status(500).json({ success: false, error: { code: 'AUTO_FILL_ERROR', message: error.message } });
  }
});

/**
 * POST /content/items/:id/schedule — Schedule content for publishing
 */
router.post('/content/items/:id/schedule', adminAuth('editor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduled_at, platforms } = req.body;

    if (!scheduled_at) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELD', message: 'scheduled_at is required' } });
    }

    await mysqlSequelize.query(
      `UPDATE content_items SET approval_status = 'scheduled', scheduled_at = :scheduledAt, updated_at = NOW() WHERE id = :id`,
      { replacements: { scheduledAt: scheduled_at, id: Number(id) } }
    );

    res.json({ success: true, data: { id: Number(id), approval_status: 'scheduled', scheduled_at } });
  } catch (error) {
    logger.error('[AdminPortal] Schedule error:', error);
    res.status(500).json({ success: false, error: { code: 'SCHEDULE_ERROR', message: error.message } });
  }
});

/**
 * POST /content/items/:id/publish-now — Immediately publish content
 */
router.post('/content/items/:id/publish-now', adminAuth('editor'), async (req, res) => {
  try {
    const { id } = req.params;
    const publisher = (await import('../services/agents/publisher/index.js')).default;
    const result = await publisher.publishItem(Number(id));
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[AdminPortal] Publish-now error:', error);
    res.status(500).json({ success: false, error: { code: 'PUBLISH_ERROR', message: error.message } });
  }
});

/**
 * DELETE /content/items/:id/schedule — Cancel scheduled publish
 */
router.delete('/content/items/:id/schedule', adminAuth('editor'), async (req, res) => {
  try {
    const { id } = req.params;
    await mysqlSequelize.query(
      `UPDATE content_items SET approval_status = 'approved', scheduled_at = NULL, updated_at = NOW() WHERE id = :id AND approval_status = 'scheduled'`,
      { replacements: { id: Number(id) } }
    );
    res.json({ success: true, data: { id: Number(id), approval_status: 'approved' } });
  } catch (error) {
    logger.error('[AdminPortal] Cancel schedule error:', error);
    res.status(500).json({ success: false, error: { code: 'CANCEL_SCHEDULE_ERROR', message: error.message } });
  }
});

/**
 * PATCH /content/items/:id/reschedule — Move scheduled post to new datetime
 */
router.patch('/content/items/:id/reschedule', adminAuth('editor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduled_at } = req.body;
    if (!scheduled_at) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELD', message: 'scheduled_at is required' } });
    }
    // MySQL DATETIME accepteert geen ISO 8601 met 'Z' suffix in strict mode —
    // converteer naar 'YYYY-MM-DD HH:MM:SS' (UTC).
    const parsed = new Date(scheduled_at);
    if (isNaN(parsed.getTime())) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_DATE', message: 'scheduled_at is geen geldige datum' } });
    }
    const mysqlDatetime = parsed.toISOString().slice(0, 19).replace('T', ' ');
    const [, meta] = await mysqlSequelize.query(
      `UPDATE content_items SET scheduled_at = :scheduledAt, updated_at = NOW()
       WHERE id = :id AND approval_status NOT IN ('published','rejected','failed')`,
      { replacements: { scheduledAt: mysqlDatetime, id: Number(id) } }
    );
    const affected = meta?.affectedRows ?? 0;
    if (affected === 0) {
      return res.status(409).json({ success: false, error: { code: 'NOT_RESCHEDULABLE', message: 'Item kan niet verplaatst worden (gepubliceerd, afgewezen of niet gevonden)' } });
    }
    res.json({ success: true, data: { id: Number(id), scheduled_at, affected } });
  } catch (error) {
    logger.error('[AdminPortal] Reschedule error:', error);
    res.status(500).json({ success: false, error: { code: 'RESCHEDULE_ERROR', message: error.message } });
  }
});

/**
 * GET /content/performance/summary — Aggregate performance metrics
 */
router.get('/content/performance/summary', adminAuth('editor'), async (req, res) => {
  try {
    const destId = req.adminUser?.destination_id || req.query.destination_id || 1;
    const [summary] = await mysqlSequelize.query(
      `SELECT platform, SUM(views) as total_views, SUM(clicks) as total_clicks,
              SUM(engagement) as total_engagement, SUM(reach) as total_reach,
              COUNT(DISTINCT content_item_id) as items_tracked
       FROM content_performance WHERE destination_id = :destId
       GROUP BY platform`,
      { replacements: { destId: Number(destId) } }
    );
    res.json({ success: true, data: summary || [] });
  } catch (error) {
    logger.error('[AdminPortal] Performance summary error:', error);
    res.status(500).json({ success: false, error: { code: 'PERFORMANCE_ERROR', message: error.message } });
  }
});

/**
 * GET /content/performance/:id — Detailed performance for a content item
 */
router.get('/content/performance/:id', adminAuth('editor'), async (req, res) => {
  try {
    const [metrics] = await mysqlSequelize.query(
      `SELECT * FROM content_performance WHERE content_item_id = :id ORDER BY measured_at DESC LIMIT 30`,
      { replacements: { id: Number(req.params.id) } }
    );
    res.json({ success: true, data: metrics || [] });
  } catch (error) {
    logger.error('[AdminPortal] Performance detail error:', error);
    res.status(500).json({ success: false, error: { code: 'PERFORMANCE_ERROR', message: error.message } });
  }
});

// --- Content Analytics (Fase D) ---

/**
 * GET /content/analytics/overview — Dashboard aggregations: KPIs, growth, time-series, content type breakdown
 */
router.get('/content/analytics/overview', adminAuth('editor'), async (req, res) => {
  try {
    const destId = req.adminUser?.destination_id || req.query.destination_id || 1;
    const days = Math.min(Number(req.query.days) || 30, 365);
    const dId = Number(destId);

    // KPI totals + growth comparison
    const [totals] = await mysqlSequelize.query(
      `SELECT SUM(views) as total_views, SUM(clicks) as total_clicks,
              SUM(engagement) as total_engagement, SUM(reach) as total_reach,
              COUNT(DISTINCT content_item_id) as items_tracked
       FROM content_performance
       WHERE destination_id = :destId AND measured_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY)`,
      { replacements: { destId: dId, days } }
    );

    const [prevTotals] = await mysqlSequelize.query(
      `SELECT SUM(views) as total_views, SUM(clicks) as total_clicks,
              SUM(engagement) as total_engagement, SUM(reach) as total_reach
       FROM content_performance
       WHERE destination_id = :destId AND measured_at >= DATE_SUB(CURDATE(), INTERVAL :days2 DAY) AND measured_at < DATE_SUB(CURDATE(), INTERVAL :days DAY)`,
      { replacements: { destId: dId, days, days2: days * 2 } }
    );

    // Growth percentages
    const cur = totals[0] || {};
    const prev = prevTotals[0] || {};
    const growth = (curVal, prevVal) => {
      const c = Number(curVal) || 0;
      const p = Number(prevVal) || 0;
      if (p === 0) return c > 0 ? 100 : 0;
      return Math.round(((c - p) / p) * 100);
    };

    // Time-series (daily aggregates)
    const [timeSeries] = await mysqlSequelize.query(
      `SELECT measured_at as date, SUM(views) as views, SUM(clicks) as clicks,
              SUM(engagement) as engagement, SUM(reach) as reach
       FROM content_performance
       WHERE destination_id = :destId AND measured_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
       GROUP BY measured_at ORDER BY measured_at ASC`,
      { replacements: { destId: dId, days } }
    );

    // By platform
    const [byPlatform] = await mysqlSequelize.query(
      `SELECT platform, SUM(views) as total_views, SUM(clicks) as total_clicks,
              SUM(engagement) as total_engagement, SUM(reach) as total_reach,
              COUNT(DISTINCT content_item_id) as items_tracked
       FROM content_performance
       WHERE destination_id = :destId AND measured_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
       GROUP BY platform`,
      { replacements: { destId: dId, days } }
    );

    // By content type
    const [byType] = await mysqlSequelize.query(
      `SELECT ci.content_type, SUM(cp.views) as total_views, SUM(cp.clicks) as total_clicks,
              SUM(cp.engagement) as total_engagement, SUM(cp.reach) as total_reach,
              COUNT(DISTINCT cp.content_item_id) as items_count
       FROM content_performance cp
       JOIN content_items ci ON ci.id = cp.content_item_id
       WHERE cp.destination_id = :destId AND cp.measured_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
       GROUP BY ci.content_type`,
      { replacements: { destId: dId, days } }
    );

    // Top performing (top 10 by engagement)
    const [topContent] = await mysqlSequelize.query(
      `SELECT ci.id, ci.title, ci.content_type, cp.platform,
              SUM(cp.views) as views, SUM(cp.clicks) as clicks,
              SUM(cp.engagement) as engagement, SUM(cp.reach) as reach
       FROM content_performance cp
       JOIN content_items ci ON ci.id = cp.content_item_id
       WHERE cp.destination_id = :destId AND cp.measured_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
       GROUP BY ci.id, ci.title, ci.content_type, cp.platform
       ORDER BY engagement DESC LIMIT 10`,
      { replacements: { destId: dId, days } }
    );

    // Opdracht 8-A2: Top performer van deze week (laatste 7 dagen)
    const [topThisWeekRows] = await mysqlSequelize.query(
      `SELECT ci.id, ci.title, ci.content_type, cp.platform,
              SUM(cp.views) as views, SUM(cp.clicks) as clicks,
              SUM(cp.engagement) as engagement, SUM(cp.reach) as reach
       FROM content_performance cp
       JOIN content_items ci ON ci.id = cp.content_item_id
       WHERE cp.destination_id = :destId AND cp.measured_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY ci.id, ci.title, ci.content_type, cp.platform
       ORDER BY engagement DESC LIMIT 1`,
      { replacements: { destId: dId } }
    );
    const topThisWeek = topThisWeekRows[0] || null;

    // Opdracht 8-A3: Engagement verdeling per content pillar
    const [byPillar] = await mysqlSequelize.query(
      `SELECT cp2.id as pillar_id, cp2.name as pillar_name, cp2.color as pillar_color,
              SUM(cperf.views) as total_views,
              SUM(cperf.engagement) as total_engagement,
              SUM(cperf.reach) as total_reach,
              COUNT(DISTINCT cperf.content_item_id) as items_count
       FROM content_performance cperf
       JOIN content_items ci ON ci.id = cperf.content_item_id
       JOIN content_concepts cc ON cc.id = ci.concept_id
       JOIN content_pillars cp2 ON cp2.id = cc.pillar_id
       WHERE cperf.destination_id = :destId AND cperf.measured_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
       GROUP BY cp2.id, cp2.name, cp2.color
       ORDER BY total_engagement DESC`,
      { replacements: { destId: dId, days } }
    );

    // Opdracht 8-A4: SEO score ↔ engagement correlatie (high vs low bucket)
    const [scoreBuckets] = await mysqlSequelize.query(
      `SELECT
         CASE WHEN ci.seo_score >= 70 THEN 'high' ELSE 'low' END as bucket,
         AVG(cperf.engagement) as avg_engagement,
         AVG(cperf.views) as avg_views,
         COUNT(DISTINCT cperf.content_item_id) as items_count
       FROM content_performance cperf
       JOIN content_items ci ON ci.id = cperf.content_item_id
       WHERE cperf.destination_id = :destId
         AND cperf.measured_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
         AND ci.seo_score IS NOT NULL
       GROUP BY bucket`,
      { replacements: { destId: dId, days } }
    );
    const highBucket = scoreBuckets.find(b => b.bucket === 'high') || {};
    const lowBucket = scoreBuckets.find(b => b.bucket === 'low') || {};
    const scoreCorrelation = {
      high_avg_engagement: Number(highBucket.avg_engagement) || 0,
      low_avg_engagement: Number(lowBucket.avg_engagement) || 0,
      high_items: Number(highBucket.items_count) || 0,
      low_items: Number(lowBucket.items_count) || 0,
      // Positieve lift = high-bucket doet het beter dan low-bucket
      lift_pct: (() => {
        const h = Number(highBucket.avg_engagement) || 0;
        const l = Number(lowBucket.avg_engagement) || 0;
        if (l === 0) return h > 0 ? 100 : 0;
        return Math.round(((h - l) / l) * 100);
      })(),
    };

    // Opdracht 8-A1: CTR + growth
    const curViews = Number(cur.total_views) || 0;
    const curClicks = Number(cur.total_clicks) || 0;
    const prevViews = Number(prev.total_views) || 0;
    const prevClicks = Number(prev.total_clicks) || 0;
    const ctrCur = curViews > 0 ? Math.round((curClicks / curViews) * 10000) / 100 : 0; // %, 2 decimalen
    const ctrPrev = prevViews > 0 ? Math.round((prevClicks / prevViews) * 10000) / 100 : 0;
    const ctrGrowth = ctrPrev === 0 ? (ctrCur > 0 ? 100 : 0) : Math.round(((ctrCur - ctrPrev) / ctrPrev) * 100);

    res.json({
      success: true,
      data: {
        summary: {
          total_views: Number(cur.total_views) || 0,
          total_clicks: Number(cur.total_clicks) || 0,
          total_engagement: Number(cur.total_engagement) || 0,
          total_reach: Number(cur.total_reach) || 0,
          items_tracked: Number(cur.items_tracked) || 0,
          ctr: ctrCur,
          growth_views: growth(cur.total_views, prev.total_views),
          growth_clicks: growth(cur.total_clicks, prev.total_clicks),
          growth_engagement: growth(cur.total_engagement, prev.total_engagement),
          growth_reach: growth(cur.total_reach, prev.total_reach),
          growth_ctr: ctrGrowth,
        },
        time_series: timeSeries || [],
        by_platform: byPlatform || [],
        by_type: byType || [],
        by_pillar: byPillar || [],
        top_content: topContent || [],
        top_this_week: topThisWeek,
        score_correlation: scoreCorrelation,
      },
    });
  } catch (error) {
    logger.error('[AdminPortal] Analytics overview error:', error);
    res.status(500).json({ success: false, error: { code: 'ANALYTICS_ERROR', message: error.message } });
  }
});

/**
 * GET /content/analytics/items — Per-item performance with sort, filter, pagination
 */
router.get('/content/analytics/items', adminAuth('editor'), async (req, res) => {
  try {
    const destId = req.adminUser?.destination_id || req.query.destination_id || 1;
    const days = Math.min(Number(req.query.days) || 30, 365);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const sortBy = ['views', 'clicks', 'engagement', 'reach'].includes(req.query.sort_by) ? req.query.sort_by : 'engagement';
    const contentType = req.query.content_type || null;
    const dId = Number(destId);

    let typeFilter = '';
    const replacements = { destId: dId, days, limit, offset };
    if (contentType) {
      typeFilter = 'AND ci.content_type = :contentType';
      replacements.contentType = contentType;
    }

    const [items] = await mysqlSequelize.query(
      `SELECT ci.id, ci.title, ci.content_type, ci.approval_status,
              ci.created_at as item_created,
              SUM(cp.views) as views, SUM(cp.clicks) as clicks,
              SUM(cp.engagement) as engagement, SUM(cp.reach) as reach,
              GROUP_CONCAT(DISTINCT cp.platform) as platforms,
              COUNT(DISTINCT cp.measured_at) as days_tracked
       FROM content_items ci
       LEFT JOIN content_performance cp ON cp.content_item_id = ci.id
         AND cp.measured_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
       WHERE ci.destination_id = :destId AND ci.approval_status != 'deleted' ${typeFilter}
       GROUP BY ci.id, ci.title, ci.content_type, ci.approval_status, ci.created_at
       ORDER BY ${sortBy} DESC
       LIMIT :limit OFFSET :offset`,
      { replacements }
    );

    const [countResult] = await mysqlSequelize.query(
      `SELECT COUNT(*) as total FROM content_items WHERE destination_id = :destId ${contentType ? 'AND content_type = :contentType' : ''}`,
      { replacements: { destId: dId, ...(contentType ? { contentType } : {}) } }
    );

    res.json({
      success: true,
      data: {
        items: (items || []).map(it => ({
          ...it,
          views: Number(it.views) || 0,
          clicks: Number(it.clicks) || 0,
          engagement: Number(it.engagement) || 0,
          reach: Number(it.reach) || 0,
          platforms: it.platforms ? it.platforms.split(',') : [],
        })),
        total: countResult[0]?.total || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('[AdminPortal] Analytics items error:', error);
    res.status(500).json({ success: false, error: { code: 'ANALYTICS_ERROR', message: error.message } });
  }
});

/**
 * GET /content/analytics/platforms — Platform comparison with engagement rates
 */
router.get('/content/analytics/platforms', adminAuth('editor'), async (req, res) => {
  try {
    const destId = req.adminUser?.destination_id || req.query.destination_id || 1;
    const days = Math.min(Number(req.query.days) || 30, 365);
    const dId = Number(destId);

    const [platforms] = await mysqlSequelize.query(
      `SELECT cp.platform,
              SUM(cp.views) as total_views,
              SUM(cp.clicks) as total_clicks,
              SUM(cp.engagement) as total_engagement,
              SUM(cp.reach) as total_reach,
              COUNT(DISTINCT cp.content_item_id) as items_count,
              COUNT(DISTINCT cp.measured_at) as active_days,
              ROUND(CASE WHEN SUM(cp.views) > 0 THEN SUM(cp.clicks) / SUM(cp.views) * 100 ELSE 0 END, 2) as ctr,
              ROUND(CASE WHEN SUM(cp.reach) > 0 THEN SUM(cp.engagement) / SUM(cp.reach) * 100 ELSE 0 END, 2) as engagement_rate
       FROM content_performance cp
       WHERE cp.destination_id = :destId AND cp.measured_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
       GROUP BY cp.platform
       ORDER BY total_engagement DESC`,
      { replacements: { destId: dId, days } }
    );

    // Per-platform time-series for comparison chart
    const [platformTimeSeries] = await mysqlSequelize.query(
      `SELECT platform, measured_at as date, SUM(views) as views, SUM(engagement) as engagement
       FROM content_performance
       WHERE destination_id = :destId AND measured_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
       GROUP BY platform, measured_at ORDER BY measured_at ASC`,
      { replacements: { destId: dId, days } }
    );

    res.json({
      success: true,
      data: {
        platforms: (platforms || []).map(p => ({
          ...p,
          total_views: Number(p.total_views) || 0,
          total_clicks: Number(p.total_clicks) || 0,
          total_engagement: Number(p.total_engagement) || 0,
          total_reach: Number(p.total_reach) || 0,
          ctr: Number(p.ctr) || 0,
          engagement_rate: Number(p.engagement_rate) || 0,
        })),
        time_series: platformTimeSeries || [],
      },
    });
  } catch (error) {
    logger.error('[AdminPortal] Analytics platforms error:', error);
    res.status(500).json({ success: false, error: { code: 'ANALYTICS_ERROR', message: error.message } });
  }
});

// --- Social Accounts ---

/**
 * GET /content/social-accounts — List connected accounts per destination
 */
router.get('/content/social-accounts', adminAuth('editor'), async (req, res) => {
  try {
    const destId = req.adminUser?.destination_id || req.query.destination_id || 1;
    const [accounts] = await mysqlSequelize.query(
      `SELECT id, destination_id, platform, account_name, account_id, status, token_expires_at, last_sync_at, metadata, target_language, created_at
       FROM social_accounts WHERE destination_id = :destId ORDER BY platform`,
      { replacements: { destId: Number(destId) } }
    );
    res.json({ success: true, data: accounts || [] });
  } catch (error) {
    logger.error('[AdminPortal] Social accounts error:', error);
    res.status(500).json({ success: false, error: { code: 'SOCIAL_ACCOUNTS_ERROR', message: error.message } });
  }
});

/**
 * POST /content/social-accounts/connect/linkedin — Start LinkedIn OAuth flow
 */
/**
 * POST /content/social-accounts/connect/meta — Connect Facebook/Instagram via Page Access Token
 * Body: { destination_id, platform ('facebook'|'instagram'), access_token, page_id? }
 * Validates token via Graph API, stores encrypted in social_accounts.
 */
router.post('/content/social-accounts/connect/meta', adminAuth('destination_admin'), async (req, res) => {
  try {
    const { destination_id, platform, access_token, page_id } = req.body;
    const destId = Number(destination_id);
    if (!destId || destId <= 0) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destination_id is required' } });
    }

    if (!access_token) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_TOKEN', message: 'access_token is required' } });
    }
    if (!['facebook', 'instagram'].includes(platform)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PLATFORM', message: 'platform must be facebook or instagram' } });
    }

    // Validate token via Meta Graph API + get actual Page info
    let accountName = '';
    let accountId = page_id || '';
    let pageUrl = '';
    let igAccountId = '';
    try {
      // First: get pages managed by this token
      const pagesUrl = `https://graph.facebook.com/v25.0/me/accounts?access_token=${encodeURIComponent(access_token)}&fields=id,name,link,instagram_business_account`;
      const pagesRes = await fetch(pagesUrl, { signal: AbortSignal.timeout(10000) });
      const pagesData = await pagesRes.json();

      if (pagesData.error) {
        // Fallback: try /me endpoint (System User without page permissions)
        const meUrl = `https://graph.facebook.com/v25.0/me?access_token=${encodeURIComponent(access_token)}&fields=id,name`;
        const meRes = await fetch(meUrl, { signal: AbortSignal.timeout(10000) });
        const meData = await meRes.json();
        if (meData.error) {
          return res.status(400).json({ success: false, error: { code: 'INVALID_TOKEN', message: `Meta API: ${meData.error.message}` } });
        }
        accountName = meData.name || '';
        accountId = accountId || meData.id || '';
      } else if (pagesData.data && pagesData.data.length > 0) {
        // Use the first page (or match page_id if provided)
        const page = page_id
          ? pagesData.data.find(p => p.id === page_id) || pagesData.data[0]
          : pagesData.data[0];
        accountName = page.name || '';
        accountId = page.id || '';
        pageUrl = page.link || `https://www.facebook.com/${page.id}`;
        if (page.instagram_business_account?.id) {
          igAccountId = page.instagram_business_account.id;
        }
      } else {
        // No pages found, use /me
        const meUrl = `https://graph.facebook.com/v25.0/me?access_token=${encodeURIComponent(access_token)}&fields=id,name`;
        const meRes = await fetch(meUrl, { signal: AbortSignal.timeout(10000) });
        const meData = await meRes.json();
        accountName = meData.name || '';
        accountId = accountId || meData.id || '';
      }

      // For Instagram: get the IG username
      if (platform === 'instagram' && igAccountId) {
        try {
          const igUrl = `https://graph.facebook.com/v25.0/${igAccountId}?access_token=${encodeURIComponent(access_token)}&fields=username,name`;
          const igRes = await fetch(igUrl, { signal: AbortSignal.timeout(10000) });
          const igData = await igRes.json();
          if (igData.username) {
            accountName = igData.name || igData.username;
            accountId = igData.username;
            pageUrl = `https://www.instagram.com/${igData.username}`;
          }
        } catch { /* use page info as fallback */ }
      } else if (platform === 'facebook' && pageUrl) {
        // pageUrl already set from /me/accounts
      }
    } catch (fetchErr) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_FAILED', message: `Could not validate token: ${fetchErr.message}` } });
    }

    // Encrypt token
    const encryptionKey = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key';
    const encCrypto = await import('crypto');
    const cipher = encCrypto.createCipheriv('aes-256-cbc',
      encCrypto.createHash('sha256').update(encryptionKey).digest(),
      Buffer.alloc(16, 0)
    );
    const encryptedToken = cipher.update(access_token, 'utf8', 'hex') + cipher.final('hex');

    // Upsert: update existing or insert new
    const [[existing]] = await mysqlSequelize.query(
      'SELECT id FROM social_accounts WHERE destination_id = :destId AND platform = :platform',
      { replacements: { destId, platform } }
    );

    const metadataJson = JSON.stringify({ pageUrl, igAccountId: igAccountId || null });

    if (existing) {
      await mysqlSequelize.query(
        `UPDATE social_accounts SET access_token_encrypted = :token, account_id = :accountId, account_name = :accountName, metadata = :metadata, status = 'active', updated_at = NOW() WHERE id = :id`,
        { replacements: { token: encryptedToken, accountId, accountName, metadata: metadataJson, id: existing.id } }
      );
    } else {
      await mysqlSequelize.query(
        `INSERT INTO social_accounts (destination_id, platform, account_id, account_name, access_token_encrypted, metadata, status, created_at, updated_at)
         VALUES (:destId, :platform, :accountId, :accountName, :token, :metadata, 'active', NOW(), NOW())`,
        { replacements: { destId, platform, accountId, accountName, token: encryptedToken, metadata: metadataJson }, type: QueryTypes.INSERT }
      );
    }

    logger.info(`[AdminPortal] Meta ${platform} account connected for destination ${destId}: ${accountName} (${accountId}) url=${pageUrl}`);
    res.json({ success: true, data: { platform, accountName, accountId, pageUrl, status: 'active' } });
  } catch (error) {
    logger.error('[AdminPortal] Meta connect error:', error);
    res.status(500).json({ success: false, error: { code: 'META_CONNECT_ERROR', message: error.message } });
  }
});

router.post('/content/social-accounts/connect/linkedin', adminAuth('destination_admin'), async (req, res) => {
  try {
    const LinkedInClient = (await import('../services/agents/publisher/clients/linkedinClient.js')).default;
    const oauthBase = process.env.OAUTH_BASE_URL || 'https://api.holidaibutler.com';
    const redirectUri = `${oauthBase}/api/v1/oauth/linkedin/callback`;
    const destId = req.body.destination_id || req.adminUser?.destination_id || 1;
    const state = `${crypto.randomBytes(16).toString('hex')}_${destId}`;
    const authUrl = LinkedInClient.getAuthorizationUrl(redirectUri, state);
    res.json({ success: true, data: { authorizationUrl: authUrl, state } });
  } catch (error) {
    logger.error('[AdminPortal] LinkedIn connect error:', error);
    res.status(500).json({ success: false, error: { code: 'LINKEDIN_CONNECT_ERROR', message: error.message } });
  }
});

/**
 * POST /content/social-accounts/connect/pinterest — Start Pinterest OAuth flow
 */
router.post('/content/social-accounts/connect/pinterest', adminAuth('destination_admin'), async (req, res) => {
  try {
    const clientId = process.env.PINTEREST_APP_ID;
    if (!clientId) {
      return res.status(400).json({ success: false, error: { code: 'NOT_CONFIGURED', message: 'Pinterest API credentials not configured. Set PINTEREST_APP_ID and PINTEREST_APP_SECRET in .env' } });
    }
    const oauthBase = process.env.OAUTH_BASE_URL || 'https://api.holidaibutler.com';
    const redirectUri = `${oauthBase}/api/v1/oauth/pinterest/callback`;
    const destId = req.body.destination_id || req.adminUser?.destination_id || 1;
    const state = `${crypto.randomBytes(16).toString('hex')}_${destId}`;
    const scope = 'boards:read,pins:read,pins:write,boards:write';
    const authUrl = `https://www.pinterest.com/oauth/?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`;
    res.json({ success: true, data: { authorizationUrl: authUrl, state } });
  } catch (error) {
    logger.error('[AdminPortal] Pinterest connect error:', error);
    res.status(500).json({ success: false, error: { code: 'PINTEREST_CONNECT_ERROR', message: error.message } });
  }
});

/**
 * POST /content/social-accounts/connect/youtube — Start YouTube/Google OAuth flow
 */
router.post('/content/social-accounts/connect/youtube', adminAuth('destination_admin'), async (req, res) => {
  try {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    if (!clientId) {
      return res.status(400).json({ success: false, error: { code: 'NOT_CONFIGURED', message: 'YouTube/Google API credentials not configured. Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env' } });
    }
    const oauthBase = process.env.OAUTH_BASE_URL || 'https://api.holidaibutler.com';
    const redirectUri = `${oauthBase}/api/v1/oauth/youtube/callback`;
    const destId = req.body.destination_id || req.adminUser?.destination_id || 1;
    const state = `${crypto.randomBytes(16).toString('hex')}_${destId}`;
    const scope = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}&access_type=offline&prompt=consent`;
    res.json({ success: true, data: { authorizationUrl: authUrl, state } });
  } catch (error) {
    logger.error('[AdminPortal] YouTube connect error:', error);
    res.status(500).json({ success: false, error: { code: 'YOUTUBE_CONNECT_ERROR', message: error.message } });
  }
});

/**
 * DELETE /content/social-accounts/:id — Disconnect account
 */
router.delete('/content/social-accounts/:id', adminAuth('destination_admin'), async (req, res) => {
  try {
    await mysqlSequelize.query(
      `UPDATE social_accounts SET status = 'disconnected', access_token_encrypted = NULL, refresh_token_encrypted = NULL, updated_at = NOW() WHERE id = :id`,
      { replacements: { id: Number(req.params.id) } }
    );
    res.json({ success: true });
  } catch (error) {
    logger.error('[AdminPortal] Disconnect account error:', error);
    res.status(500).json({ success: false, error: { code: 'DISCONNECT_ERROR', message: error.message } });
  }
});

/**
 * POST /content/social-accounts/:id/refresh — Refresh token
 */
router.post('/content/social-accounts/:id/refresh', adminAuth('destination_admin'), async (req, res) => {
  try {
    const [[account]] = await mysqlSequelize.query(
      `SELECT * FROM social_accounts WHERE id = :id`, { replacements: { id: Number(req.params.id) } }
    );
    if (!account) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });

    if (account.platform === 'linkedin' && account.refresh_token_encrypted) {
      const SocialAccount = (await import('../models/SocialAccount.js')).default;
      const LinkedInClient = (await import('../services/agents/publisher/clients/linkedinClient.js')).default;
      const refreshToken = SocialAccount.decryptToken(account.refresh_token_encrypted);
      const newTokens = await LinkedInClient.refreshAccessToken(refreshToken);

      await mysqlSequelize.query(
        `UPDATE social_accounts SET access_token_encrypted = :token, token_expires_at = DATE_ADD(NOW(), INTERVAL :expires SECOND), status = 'active', updated_at = NOW() WHERE id = :id`,
        { replacements: { token: SocialAccount.encryptToken(newTokens.access_token), expires: newTokens.expires_in || 5184000, id: account.id } }
      );
      return res.json({ success: true, data: { status: 'active', expires_in: newTokens.expires_in } });
    }

    res.json({ success: true, data: { status: account.status, message: 'Meta tokens are long-lived and do not need refresh' } });
  } catch (error) {
    logger.error('[AdminPortal] Token refresh error:', error);
    res.status(500).json({ success: false, error: { code: 'REFRESH_ERROR', message: error.message } });
  }
});

/**
 * PATCH /content/social-accounts/:id — Update account settings (target_language)
 */
router.patch('/content/social-accounts/:id', adminAuth('destination_admin'), async (req, res) => {
  try {
    const { target_language } = req.body;
    const validLangs = ['nl', 'en', 'de', 'es', 'fr'];
    if (target_language && !validLangs.includes(target_language)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_LANGUAGE', message: `target_language must be one of: ${validLangs.join(', ')}` } });
    }
    await mysqlSequelize.query(
      `UPDATE social_accounts SET target_language = :lang, updated_at = NOW() WHERE id = :id`,
      { replacements: { lang: target_language || 'en', id: Number(req.params.id) } }
    );
    res.json({ success: true });
  } catch (error) {
    logger.error('[AdminPortal] Update social account error:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ACCOUNT_ERROR', message: error.message } });
  }
});

/**
 * GET /content/social-platforms — Get enabled social platforms for destination (from feature_flags)
 */
router.get('/content/social-platforms', adminAuth('editor'), async (req, res) => {
  try {
    const destId = req.adminUser?.destination_id || req.query.destination_id || 1;
    const [[dest]] = await mysqlSequelize.query(
      `SELECT feature_flags FROM destinations WHERE id = :destId`,
      { replacements: { destId: Number(destId) } }
    );
    let flags = dest?.feature_flags;
    if (typeof flags === 'string') { try { flags = JSON.parse(flags); } catch { flags = {}; } }
    const socialPlatforms = flags?.social_platforms || {};
    res.json({ success: true, data: socialPlatforms });
  } catch (error) {
    logger.error('[AdminPortal] Social platforms error:', error);
    res.status(500).json({ success: false, error: { code: 'SOCIAL_PLATFORMS_ERROR', message: error.message } });
  }
});

// --- Seasonal Config ---

/**
 * GET /content/seasons — List all seasonal configurations per destination
 */
router.get('/content/seasons', adminAuth('editor'), async (req, res) => {
  try {
    const destId = req.adminUser?.destination_id || req.query.destination_id || 1;
    const [seasons] = await mysqlSequelize.query(
      `SELECT * FROM seasonal_config WHERE destination_id = :destId ORDER BY start_date ASC`,
      { replacements: { destId: Number(destId) } }
    );
    res.json({ success: true, data: seasons || [] });
  } catch (error) {
    logger.error('[AdminPortal] Seasons list error:', error);
    res.status(500).json({ success: false, error: { code: 'SEASONS_ERROR', message: error.message } });
  }
});

/**
 * POST /content/seasons — Create a season
 */
router.post('/content/seasons', adminAuth('editor'), async (req, res) => {
  try {
    const destId = req.adminUser?.destination_id || req.body.destination_id || 1;
    const { season_name, start_date, end_date, hero_image_path, featured_poi_ids, strategic_themes, cta_config, homepage_blocks } = req.body;

    if (!season_name || !start_date || !end_date) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'season_name, start_date, end_date required' } });
    }

    const [result] = await mysqlSequelize.query(
      `INSERT INTO seasonal_config (destination_id, season_name, start_date, end_date, hero_image_path, featured_poi_ids, strategic_themes, cta_config, homepage_blocks, is_active, created_at, updated_at)
       VALUES (:destId, :name, :start, :end, :hero, :pois, :themes, :cta, :blocks, 0, NOW(), NOW())`,
      {
        replacements: {
          destId: Number(destId), name: season_name, start: start_date, end: end_date,
          hero: hero_image_path || null, pois: JSON.stringify(featured_poi_ids || []),
          themes: JSON.stringify(strategic_themes || []), cta: JSON.stringify(cta_config || {}),
          blocks: JSON.stringify(homepage_blocks || null),
        },
      }
    );

    res.json({ success: true, data: { id: result, season_name, start_date, end_date } });
  } catch (error) {
    logger.error('[AdminPortal] Create season error:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_SEASON_ERROR', message: error.message } });
  }
});

/**
 * PATCH /content/seasons/:id — Update a season
 */
router.patch('/content/seasons/:id', adminAuth('editor'), async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    const updates = [];
    const replacements = { id: Number(id) };

    for (const [key, value] of Object.entries(fields)) {
      if (['season_name', 'start_date', 'end_date', 'hero_image_path'].includes(key)) {
        updates.push(`${key} = :${key}`);
        replacements[key] = value;
      } else if (['featured_poi_ids', 'strategic_themes', 'cta_config', 'homepage_blocks'].includes(key)) {
        updates.push(`${key} = :${key}`);
        replacements[key] = JSON.stringify(value);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_FIELDS', message: 'No valid fields to update' } });
    }

    updates.push('updated_at = NOW()');
    await mysqlSequelize.query(`UPDATE seasonal_config SET ${updates.join(', ')} WHERE id = :id`, { replacements });
    res.json({ success: true, data: { id: Number(id), updated: Object.keys(fields) } });
  } catch (error) {
    logger.error('[AdminPortal] Update season error:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_SEASON_ERROR', message: error.message } });
  }
});

/**
 * DELETE /content/seasons/:id — Delete a season
 */
router.delete('/content/seasons/:id', adminAuth('editor'), async (req, res) => {
  try {
    await mysqlSequelize.query(`DELETE FROM seasonal_config WHERE id = :id`, { replacements: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    logger.error('[AdminPortal] Delete season error:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_SEASON_ERROR', message: error.message } });
  }
});

/**
 * POST /content/seasons/:id/activate — Force-activate a season
 */
router.post('/content/seasons/:id/activate', adminAuth('destination_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const [[season]] = await mysqlSequelize.query(`SELECT * FROM seasonal_config WHERE id = :id`, { replacements: { id: Number(id) } });
    if (!season) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });

    // Deactivate all other seasons for this destination
    await mysqlSequelize.query(
      `UPDATE seasonal_config SET is_active = 0, updated_at = NOW() WHERE destination_id = :destId`,
      { replacements: { destId: season.destination_id } }
    );
    // Activate this one
    await mysqlSequelize.query(
      `UPDATE seasonal_config SET is_active = 1, updated_at = NOW() WHERE id = :id`,
      { replacements: { id: Number(id) } }
    );

    res.json({ success: true, data: { id: Number(id), season_name: season.season_name, is_active: true } });
  } catch (error) {
    logger.error('[AdminPortal] Activate season error:', error);
    res.status(500).json({ success: false, error: { code: 'ACTIVATE_SEASON_ERROR', message: error.message } });
  }
});

/**
 * GET /content/seasons/current — Get current active season for destination
 */
router.get('/content/seasons/current', adminAuth('editor'), async (req, res) => {
  try {
    const destId = req.adminUser?.destination_id || req.query.destination_id || 1;
    const { getCurrentSeason } = await import('../services/content/seasonalEngine.js');
    const season = await getCurrentSeason(Number(destId));
    res.json({ success: true, data: season });
  } catch (error) {
    logger.error('[AdminPortal] Current season error:', error);
    res.status(500).json({ success: false, error: { code: 'CURRENT_SEASON_ERROR', message: error.message } });
  }
});

// === Wave 5: Enterprise Workflow & Intelligence ===

/**
 * GET /content/items/:id/comments — List comments for a content item
 */
router.get('/content/items/:id/comments', adminAuth('editor'), async (req, res) => {
  try {
    const [comments] = await mysqlSequelize.query(
      `SELECT c.*, au.email as user_email, au.first_name, au.last_name
       FROM content_comments c
       LEFT JOIN admin_users au ON au.id = c.user_id
       WHERE c.content_item_id = :itemId
       ORDER BY c.created_at ASC`,
      { replacements: { itemId: Number(req.params.id) } }
    );
    res.json({ success: true, data: comments || [] });
  } catch (error) {
    logger.error('[AdminPortal] Comments list error:', error);
    res.status(500).json({ success: false, error: { code: 'COMMENTS_ERROR', message: error.message } });
  }
});

/**
 * POST /content/items/:id/comments — Add a comment to a content item
 * Body: { comment }
 */
router.post('/content/items/:id/comments', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_COMMENT', message: 'comment is required' } });
    }
    const userId = req.adminUser?.id;
    const userName = req.adminUser?.name || req.adminUser?.email || 'System';
    const [result] = await mysqlSequelize.query(
      `INSERT INTO content_comments (content_item_id, user_id, comment) VALUES (:itemId, :userId, :comment)`,
      { replacements: { itemId: Number(req.params.id), userId, comment: comment.trim() } }
    );
    res.json({ success: true, data: { id: result, content_item_id: Number(req.params.id), comment: comment.trim(), first_name: req.adminUser?.firstName, user_email: req.adminUser?.email } });
  } catch (error) {
    logger.error('[AdminPortal] Comment add error:', error);
    res.status(500).json({ success: false, error: { code: 'COMMENT_ADD_ERROR', message: error.message } });
  }
});

/**
 * GET /content/items/:id/revisions — List revision history for a content item
 */
router.get('/content/items/:id/revisions', adminAuth('editor'), async (req, res) => {
  try {
    const [revisions] = await mysqlSequelize.query(
      `SELECT r.*, au.email as changed_by_email, au.first_name, au.last_name
       FROM content_item_revisions r
       LEFT JOIN admin_users au ON au.id = r.changed_by
       WHERE r.content_item_id = :itemId
       ORDER BY r.revision_number DESC
       LIMIT 20`,
      { replacements: { itemId: Number(req.params.id) } }
    );
    res.json({ success: true, data: revisions || [] });
  } catch (error) {
    logger.error('[AdminPortal] Revisions list error:', error);
    res.status(500).json({ success: false, error: { code: 'REVISIONS_ERROR', message: error.message } });
  }
});

/**
 * POST /content/items/:id/revisions/:revisionId/restore — Restore a previous revision
 */
router.post('/content/items/:id/revisions/:revisionId/restore', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { id, revisionId } = req.params;
    const [[revision]] = await mysqlSequelize.query(
      'SELECT * FROM content_item_revisions WHERE id = :revId AND content_item_id = :itemId',
      { replacements: { revId: Number(revisionId), itemId: Number(id) } }
    );
    if (!revision) {
      return res.status(404).json({ success: false, error: { code: 'REVISION_NOT_FOUND', message: 'Revision not found' } });
    }
    // Snapshot current state before restore
    const [[current]] = await mysqlSequelize.query(
      'SELECT title, body_en, body_nl, body_de, body_es, body_fr FROM content_items WHERE id = :id',
      { replacements: { id: Number(id) } }
    );
    const [[maxRev]] = await mysqlSequelize.query(
      'SELECT COALESCE(MAX(revision_number), 0) as max_rev FROM content_item_revisions WHERE content_item_id = :id',
      { replacements: { id: Number(id) } }
    );
    await mysqlSequelize.query(
      `INSERT INTO content_item_revisions (content_item_id, revision_number, title, body_en, body_nl, body_de, body_es, body_fr, changed_by, change_summary)
       VALUES (:itemId, :revNum, :title, :bodyEn, :bodyNl, :bodyDe, :bodyEs, :bodyFr, :changedBy, :summary)`,
      { replacements: {
        itemId: Number(id), revNum: (maxRev?.max_rev || 0) + 1,
        title: current?.title, bodyEn: current?.body_en, bodyNl: current?.body_nl,
        bodyDe: current?.body_de, bodyEs: current?.body_es, bodyFr: current?.body_fr,
        changedBy: req.adminUser?.id || 'system', summary: `Snapshot before restore to revision #${revision.revision_number}`,
      }}
    );
    // Restore
    await mysqlSequelize.query(
      `UPDATE content_items SET title = :title, body_en = :bodyEn, body_nl = :bodyNl, body_de = :bodyDe,
       body_es = :bodyEs, body_fr = :bodyFr, updated_at = NOW() WHERE id = :id`,
      { replacements: {
        id: Number(id), title: revision.title, bodyEn: revision.body_en, bodyNl: revision.body_nl,
        bodyDe: revision.body_de, bodyEs: revision.body_es, bodyFr: revision.body_fr,
      }}
    );
    res.json({ success: true, data: { id: Number(id), restoredToRevision: revision.revision_number } });
  } catch (error) {
    logger.error('[AdminPortal] Revision restore error:', error);
    res.status(500).json({ success: false, error: { code: 'REVISION_RESTORE_ERROR', message: error.message } });
  }
});

/**
 * GET /content/items/:id/approval-log — Approval trail for a content item
 */
router.get('/content/items/:id/approval-log', adminAuth('editor'), async (req, res) => {
  try {
    const [logs] = await mysqlSequelize.query(
      `SELECT l.*, au.email as changed_by_email, au.first_name, au.last_name
       FROM content_approval_log l
       LEFT JOIN admin_users au ON au.id = l.changed_by
       WHERE l.content_item_id = :itemId
       ORDER BY l.created_at DESC`,
      { replacements: { itemId: Number(req.params.id) } }
    );
    res.json({ success: true, data: logs || [] });
  } catch (error) {
    logger.error('[AdminPortal] Approval log error:', error);
    res.status(500).json({ success: false, error: { code: 'APPROVAL_LOG_ERROR', message: error.message } });
  }
});

// --- Content Pillars CRUD ---

/**
 * GET /content/pillars — List content pillars for a destination
 */
router.get('/content/pillars', adminAuth('editor'), async (req, res) => {
  try {
    const destId = req.adminUser?.destination_id || req.query.destination_id || 1;
    const [pillars] = await mysqlSequelize.query(
      `SELECT p.*, (SELECT COUNT(*) FROM content_items ci WHERE ci.pillar_id = p.id) as item_count
       FROM content_pillars p
       WHERE p.destination_id = :destId AND p.is_active = TRUE
       ORDER BY p.name ASC`,
      { replacements: { destId: Number(destId) } }
    );
    res.json({ success: true, data: pillars || [] });
  } catch (error) {
    logger.error('[AdminPortal] Pillars list error:', error);
    res.status(500).json({ success: false, error: { code: 'PILLARS_ERROR', message: error.message } });
  }
});

/**
 * POST /content/pillars — Create a content pillar
 * Body: { name, target_percentage, color }
 */
router.post('/content/pillars', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const destId = req.adminUser?.destination_id || req.body.destination_id || 1;
    const { name, target_percentage = 25, color = '#7FA594' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_NAME', message: 'name is required' } });
    }
    const [result] = await mysqlSequelize.query(
      `INSERT INTO content_pillars (destination_id, name, target_percentage, color) VALUES (:destId, :name, :pct, :color)`,
      { replacements: { destId: Number(destId), name: name.trim(), pct: Number(target_percentage), color } }
    );
    res.json({ success: true, data: { id: result, name: name.trim(), target_percentage: Number(target_percentage), color } });
  } catch (error) {
    logger.error('[AdminPortal] Pillar create error:', error);
    res.status(500).json({ success: false, error: { code: 'PILLAR_CREATE_ERROR', message: error.message } });
  }
});

/**
 * PATCH /content/pillars/:id — Update a content pillar
 * Body: { name, target_percentage, color, is_active }
 */
router.patch('/content/pillars/:id', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = ['name', 'target_percentage', 'color', 'is_active'];
    const updates = [];
    const replacements = { id: Number(id) };
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = :${field}`);
        replacements[field] = req.body[field];
      }
    }
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_UPDATES', message: 'No valid fields to update' } });
    }
    await mysqlSequelize.query(`UPDATE content_pillars SET ${updates.join(', ')} WHERE id = :id`, { replacements });
    res.json({ success: true, data: { id: Number(id), updated: true } });
  } catch (error) {
    logger.error('[AdminPortal] Pillar update error:', error);
    res.status(500).json({ success: false, error: { code: 'PILLAR_UPDATE_ERROR', message: error.message } });
  }
});

/**
 * DELETE /content/pillars/:id — Soft-delete a content pillar (deactivate)
 */
router.delete('/content/pillars/:id', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    await mysqlSequelize.query('UPDATE content_pillars SET is_active = FALSE WHERE id = :id', { replacements: { id: Number(req.params.id) } });
    // Unlink content items from this pillar
    await mysqlSequelize.query('UPDATE content_items SET pillar_id = NULL WHERE pillar_id = :id', { replacements: { id: Number(req.params.id) } });
    res.json({ success: true, data: { id: Number(req.params.id), deactivated: true } });
  } catch (error) {
    logger.error('[AdminPortal] Pillar delete error:', error);
    res.status(500).json({ success: false, error: { code: 'PILLAR_DELETE_ERROR', message: error.message } });
  }
});

/**
 * GET /content/pillars/balance — Pillar balance visualization data (actual vs target)
 */
router.get('/content/pillars/balance', adminAuth('editor'), async (req, res) => {
  try {
    const destId = req.adminUser?.destination_id || req.query.destination_id || 1;
    const [pillars] = await mysqlSequelize.query(
      `SELECT p.id, p.name, p.target_percentage, p.color,
              COUNT(ci.id) as actual_count
       FROM content_pillars p
       LEFT JOIN content_items ci ON ci.pillar_id = p.id AND ci.approval_status NOT IN ('deleted', 'rejected')
       WHERE p.destination_id = :destId AND p.is_active = TRUE
       GROUP BY p.id, p.name, p.target_percentage, p.color`,
      { replacements: { destId: Number(destId) } }
    );
    const totalItems = pillars.reduce((sum, p) => sum + Number(p.actual_count), 0);
    const balance = pillars.map(p => ({
      ...p,
      actual_percentage: totalItems > 0 ? Math.round((Number(p.actual_count) / totalItems) * 100) : 0,
      target_percentage: Number(p.target_percentage),
    }));
    // Count unassigned items
    const [[unassigned]] = await mysqlSequelize.query(
      `SELECT COUNT(*) as cnt FROM content_items WHERE destination_id = :destId AND pillar_id IS NULL AND approval_status NOT IN ('deleted', 'rejected')`,
      { replacements: { destId: Number(destId) } }
    );
    res.json({ success: true, data: { pillars: balance, totalItems, unassignedCount: Number(unassigned?.cnt || 0) } });
  } catch (error) {
    logger.error('[AdminPortal] Pillar balance error:', error);
    res.status(500).json({ success: false, error: { code: 'PILLAR_BALANCE_ERROR', message: error.message } });
  }
});

/**
 * GET /content/best-times — Get recommended posting times for a platform
 * Query: platform, market (optional)
 */
router.get('/content/best-times', adminAuth('editor'), async (req, res) => {
  try {
    const destId = req.adminUser?.destination_id || req.query.destination_id || 1;
    const { platform = 'instagram', market } = req.query;
    const { getBestTimes } = await import('../services/agents/publisher/bestTimeCalculator.js');
    const result = await getBestTimes({ destinationId: Number(destId), platform, market });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[AdminPortal] Best times error:', error);
    res.status(500).json({ success: false, error: { code: 'BEST_TIMES_ERROR', message: error.message } });
  }
});

/**
 * POST /content/items/:id/hashtags — Generate hashtags for a content item
 */
router.post('/content/items/:id/hashtags', adminAuth('editor'), async (req, res) => {
  try {
    const [[item]] = await mysqlSequelize.query(
      'SELECT content_type, target_platform, destination_id, title, body_en FROM content_items WHERE id = :id',
      { replacements: { id: Number(req.params.id) } }
    );
    if (!item) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content item not found' } });
    }
    const { generateHashtags } = await import('../services/agents/contentRedacteur/hashtagEngine.js');
    // Extract keywords from title + body
    const text = `${item.title || ''} ${item.body_en || ''}`;
    const keywords = text.split(/\s+/).filter(w => w.length > 3).slice(0, 10);
    const result = await generateHashtags({
      destinationId: item.destination_id,
      category: req.body.category,
      keywords,
      platform: item.target_platform || 'instagram',
    });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[AdminPortal] Hashtag generation error:', error);
    res.status(500).json({ success: false, error: { code: 'HASHTAG_ERROR', message: error.message } });
  }
});

/**
 * POST /content/bulk/approve — Bulk approve content items
 * Body: { ids: [1, 2, 3] }
 */
router.post('/content/bulk/approve', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_IDS', message: 'ids array is required' } });
    }
    const numericIds = ids.map(Number).filter(n => !isNaN(n));
    // Log approval trail for each
    for (const itemId of numericIds) {
      await mysqlSequelize.query(
        `INSERT INTO content_approval_log (content_item_id, from_status, to_status, changed_by, comment)
         SELECT id, approval_status, 'approved', :userId, 'Bulk approval'
         FROM content_items WHERE id = :itemId AND approval_status != 'approved'`,
        { replacements: { itemId, userId: req.adminUser?.id || 'system' } }
      );
    }
    await mysqlSequelize.query(
      `UPDATE content_items SET approval_status = 'approved', approved_by = :userId, updated_at = NOW()
       WHERE id IN (:ids) AND approval_status NOT IN ('published', 'deleted')`,
      { replacements: { ids: numericIds, userId: req.adminUser?.id || null } }
    );
    res.json({ success: true, data: { approved: numericIds.length } });
  } catch (error) {
    logger.error('[AdminPortal] Bulk approve error:', error);
    res.status(500).json({ success: false, error: { code: 'BULK_APPROVE_ERROR', message: error.message } });
  }
});

/**
 * POST /content/bulk/reject — Bulk reject content items
 * Body: { ids: [1, 2, 3], reason }
 */
router.post('/content/bulk/reject', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { ids, reason } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_IDS', message: 'ids array is required' } });
    }
    const numericIds = ids.map(Number).filter(n => !isNaN(n));
    for (const itemId of numericIds) {
      await mysqlSequelize.query(
        `INSERT INTO content_approval_log (content_item_id, from_status, to_status, changed_by, comment)
         SELECT id, approval_status, 'rejected', :userId, :reason
         FROM content_items WHERE id = :itemId AND approval_status != 'rejected'`,
        { replacements: { itemId, userId: req.adminUser?.id || 'system', reason: reason || 'Bulk rejection' } }
      );
    }
    await mysqlSequelize.query(
      `UPDATE content_items SET approval_status = 'rejected', updated_at = NOW()
       WHERE id IN (:ids) AND approval_status NOT IN ('published', 'deleted')`,
      { replacements: { ids: numericIds } }
    );
    res.json({ success: true, data: { rejected: numericIds.length } });
  } catch (error) {
    logger.error('[AdminPortal] Bulk reject error:', error);
    res.status(500).json({ success: false, error: { code: 'BULK_REJECT_ERROR', message: error.message } });
  }
});

/**
 * POST /content/bulk/schedule — Bulk schedule content items
 * Body: { ids: [1, 2, 3], scheduled_at }
 */
router.post('/content/bulk/schedule', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { ids, scheduled_at } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !scheduled_at) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'ids and scheduled_at are required' } });
    }
    const numericIds = ids.map(Number).filter(n => !isNaN(n));
    for (const itemId of numericIds) {
      await mysqlSequelize.query(
        `INSERT INTO content_approval_log (content_item_id, from_status, to_status, changed_by, comment)
         SELECT id, approval_status, 'scheduled', :userId, :comment
         FROM content_items WHERE id = :itemId`,
        { replacements: { itemId, userId: req.adminUser?.id || 'system', comment: `Bulk scheduled for ${scheduled_at}` } }
      );
    }
    await mysqlSequelize.query(
      `UPDATE content_items SET approval_status = 'scheduled', scheduled_at = :scheduledAt, updated_at = NOW()
       WHERE id IN (:ids) AND approval_status IN ('approved', 'draft', 'pending_review')`,
      { replacements: { ids: numericIds, scheduledAt: scheduled_at } }
    );
    res.json({ success: true, data: { scheduled: numericIds.length, scheduled_at } });
  } catch (error) {
    logger.error('[AdminPortal] Bulk schedule error:', error);
    res.status(500).json({ success: false, error: { code: 'BULK_SCHEDULE_ERROR', message: error.message } });
  }
});

/**
 * POST /content/bulk/delete — Bulk soft-delete content items
 * Body: { ids: [1, 2, 3] }
 */
router.post('/content/bulk/delete', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_IDS', message: 'ids array is required' } });
    }
    const numericIds = ids.map(Number).filter(n => !isNaN(n));
    await mysqlSequelize.query(
      `UPDATE content_items SET approval_status = 'deleted', updated_at = NOW()
       WHERE id IN (:ids) AND approval_status != 'published'`,
      { replacements: { ids: numericIds } }
    );
    res.json({ success: true, data: { deleted: numericIds.length } });
  } catch (error) {
    logger.error('[AdminPortal] Bulk delete error:', error);
    res.status(500).json({ success: false, error: { code: 'BULK_DELETE_ERROR', message: error.message } });
  }
});

// === Wave 6: Social Media Platform Completion & Polish ===

/**
 * GET /content/templates — Get content templates for a destination
 * Query: destination_id
 */
router.get('/content/templates', adminAuth('editor'), async (req, res) => {
  try {
    const destId = req.adminUser?.destination_id || req.query.destination_id || 1;
    const { getTemplates } = await import('../services/agents/contentRedacteur/contentTemplates.js');
    const templates = await getTemplates(Number(destId));
    res.json({ success: true, data: templates });
  } catch (error) {
    logger.error('[AdminPortal] Templates error:', error);
    res.status(500).json({ success: false, error: { code: 'TEMPLATES_ERROR', message: error.message } });
  }
});

/**
 * GET /content/tone-presets — Get tone of voice presets
 * Query: destination_id (determines which presets are shown)
 * Tourism: tourism presets + generic presets
 * Content-only: only generic presets
 */
router.get('/content/tone-presets', adminAuth('editor'), async (req, res) => {
  try {
    const destId = Number(req.query.destination_id) || 1;
    const { TONE_PRESETS } = await import('../services/agents/contentRedacteur/toneOfVoice.js');
    const destIsContentOnly = await isContentOnly(destId);

    const presets = Object.values(TONE_PRESETS).filter(p => {
      if (destIsContentOnly) return p.category === 'generic';
      return true; // tourism sees all presets
    });

    res.json({ success: true, data: presets });
  } catch (error) {
    logger.error('[AdminPortal] Tone presets error:', error);
    res.status(500).json({ success: false, error: { code: 'TONE_PRESETS_ERROR', message: error.message } });
  }
});

/**
 * POST /content/items/:id/retry-publish — Retry a failed publish
 */
router.post('/content/items/:id/retry-publish', adminAuth('editor'), writeAccess(['platform_admin', 'destination_admin', 'poi_owner', 'content_manager', 'editor']), async (req, res) => {
  try {
    const { id } = req.params;
    const [[item]] = await mysqlSequelize.query(
      'SELECT id, approval_status, publish_error, target_platform, destination_id FROM content_items WHERE id = :id',
      { replacements: { id: Number(id) } }
    );
    if (!item) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content item not found' } });
    }
    if (item.approval_status !== 'failed') {
      return res.status(400).json({ success: false, error: { code: 'NOT_FAILED', message: 'Item is not in failed state' } });
    }
    // Reset to scheduled for re-publish
    await mysqlSequelize.query(
      `UPDATE content_items SET approval_status = 'scheduled', publish_error = NULL, scheduled_at = NOW(), updated_at = NOW() WHERE id = :id`,
      { replacements: { id: Number(id) } }
    );
    // Log the retry
    await mysqlSequelize.query(
      `INSERT INTO content_approval_log (content_item_id, from_status, to_status, changed_by, comment)
       VALUES (:itemId, 'failed', 'scheduled', :userId, :comment)`,
      { replacements: { itemId: Number(id), userId: req.adminUser?.id || 'system', comment: `Manual retry. Previous error: ${item.publish_error || 'unknown'}` } }
    );
    res.json({ success: true, data: { id: Number(id), retried: true, previousError: item.publish_error } });
  } catch (error) {
    logger.error('[AdminPortal] Retry publish error:', error);
    res.status(500).json({ success: false, error: { code: 'RETRY_ERROR', message: error.message } });
  }
});

/**
 * GET /content/items/:id/brand-score — Check brand voice consistency
 */
router.get('/content/items/:id/brand-score', adminAuth('editor'), async (req, res) => {
  try {
    const [[item]] = await mysqlSequelize.query(
      'SELECT body_en, body_nl, destination_id, content_type FROM content_items WHERE id = :id',
      { replacements: { id: Number(req.params.id) } }
    );
    if (!item) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content item not found' } });
    }
    const body = item.body_en || item.body_nl || '';
    if (!body) {
      return res.json({ success: true, data: { score: 0, grade: 'N/A', feedback: 'No content to analyze' } });
    }
    // Use toneOfVoice to check brand alignment
    const { getTone } = await import('../services/agents/contentRedacteur/toneOfVoice.js');
    const tone = await getTone(item.destination_id);

    let score = 70; // Base score
    const feedback = [];

    // Check for personality keywords
    if (tone.personality) {
      const personalityWords = tone.personality.toLowerCase().split(/[,;\s]+/).filter(w => w.length > 3);
      const bodyLower = body.toLowerCase();
      const matchCount = personalityWords.filter(w => bodyLower.includes(w)).length;
      const matchPct = personalityWords.length > 0 ? matchCount / personalityWords.length : 0;
      score += Math.round(matchPct * 10);
      if (matchPct < 0.3) feedback.push('Content wijkt af van brand personality — voeg meer merkkarakteristieke woorden toe');
    }

    // Check for core keywords
    if (tone.coreKeywords) {
      const keywords = (Array.isArray(tone.coreKeywords) ? tone.coreKeywords : tone.coreKeywords.split(/[,;]+/)).map(k => k.trim().toLowerCase());
      const bodyLower = body.toLowerCase();
      const found = keywords.filter(k => bodyLower.includes(k));
      score += Math.min(10, found.length * 3);
      if (found.length === 0 && keywords.length > 0) feedback.push('Geen core brand keywords gevonden in content');
    }

    // Check for avoid words
    if (tone.avoidWords) {
      const avoidList = (Array.isArray(tone.avoidWords) ? tone.avoidWords : tone.avoidWords.split(/[,;]+/)).map(w => w.trim().toLowerCase());
      const bodyLower = body.toLowerCase();
      const violations = avoidList.filter(w => bodyLower.includes(w));
      score -= violations.length * 5;
      if (violations.length > 0) feedback.push(`Vermijd woorden gevonden: ${violations.join(', ')}`);
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));
    const grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Goed' : score >= 40 ? 'Matig' : 'Zwak';

    res.json({ success: true, data: { score, grade, feedback, personality: tone.personality || '', brandValues: tone.brandValues || '' } });
  } catch (error) {
    logger.error('[AdminPortal] Brand score error:', error);
    res.status(500).json({ success: false, error: { code: 'BRAND_SCORE_ERROR', message: error.message } });
  }
});

/**
 * POST /auth/onboarding-complete — Mark admin user's onboarding as completed
 */
router.post('/auth/onboarding-complete', adminAuth('reviewer'), async (req, res) => {
  try {
    await mysqlSequelize.query(
      'UPDATE admin_users SET onboarding_completed = TRUE WHERE id = :id',
      { replacements: { id: req.adminUser.id } }
    );
    res.json({ success: true });
  } catch (error) {
    logger.error('[AdminPortal] Onboarding complete error:', error);
    res.status(500).json({ success: false, error: { code: 'ONBOARDING_ERROR', message: error.message } });
  }
});

/**
 * POST /content/brand-check — Real-time brand voice consistency check
 * Body: { text, destination_id }
 * Returns score 0-100 + feedback without needing a saved content item
 */
router.post('/content/brand-check', adminAuth('editor'), async (req, res) => {
  try {
    const { text, destination_id } = req.body;
    if (!text || !destination_id) return res.status(400).json({ success: false, error: { code: 'MISSING_PARAMS', message: 'text and destination_id required' } });

    const { getTone } = await import('../services/agents/contentRedacteur/toneOfVoice.js');
    const tone = await getTone(Number(destination_id));
    const bodyLower = text.toLowerCase();

    let score = 70;
    const feedback = [];

    // Personality match
    if (tone.personality) {
      const words = tone.personality.toLowerCase().split(/[,;\s]+/).filter(w => w.length > 3);
      const matched = words.filter(w => bodyLower.includes(w)).length;
      const pct = words.length > 0 ? matched / words.length : 0;
      score += Math.round(pct * 10);
      if (pct < 0.3 && words.length > 0) feedback.push('Voeg meer woorden toe die passen bij de merkpersoonlijkheid');
    }

    // Core keywords
    if (tone.coreKeywords) {
      const kws = (Array.isArray(tone.coreKeywords) ? tone.coreKeywords : tone.coreKeywords.split(/[,;]+/)).map(k => k.trim().toLowerCase()).filter(Boolean);
      const found = kws.filter(k => bodyLower.includes(k));
      score += Math.min(10, found.length * 3);
      if (found.length === 0 && kws.length > 0) feedback.push('Geen kernwoorden van het merk gevonden');
    }

    // Brand values
    if (tone.brandValues) {
      const vals = (Array.isArray(tone.brandValues) ? tone.brandValues : tone.brandValues.split(/[,;]+/)).map(v => v.trim().toLowerCase()).filter(Boolean);
      const found = vals.filter(v => bodyLower.includes(v));
      score += Math.min(5, found.length * 2);
    }

    // Adjectives
    if (tone.adjectives) {
      const adjs = (Array.isArray(tone.adjectives) ? tone.adjectives : tone.adjectives.split(/[,;]+/)).map(a => a.trim().toLowerCase()).filter(Boolean);
      const found = adjs.filter(a => bodyLower.includes(a));
      score += Math.min(5, found.length * 2);
      if (found.length > 0) feedback.push(`Merkadjectieven gevonden: ${found.join(', ')}`);
    }

    // Avoid words (penalty)
    if (tone.avoidWords) {
      const avoids = (Array.isArray(tone.avoidWords) ? tone.avoidWords : tone.avoidWords.split(/[,;]+/)).map(w => w.trim().toLowerCase()).filter(Boolean);
      const violations = avoids.filter(w => bodyLower.includes(w));
      score -= violations.length * 5;
      if (violations.length > 0) feedback.push(`Vermijd: ${violations.join(', ')}`);
    }

    // Formal address check
    if (tone.formalAddress === 'u' && bodyLower.match(/\bje\b|\bjij\b|\bjouw\b/)) {
      score -= 5;
      feedback.push('Formele aanspreekstijl (u) ingesteld, maar informele vormen (je/jij) gevonden');
    } else if (tone.formalAddress === 'je' && bodyLower.match(/\bu\b|\buw\b/) && !bodyLower.match(/\buw\s/)) {
      score -= 3;
      feedback.push('Informele aanspreekstijl (je) ingesteld, maar formele vormen (u) gevonden');
    }

    score = Math.max(0, Math.min(100, score));
    const grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Goed' : score >= 40 ? 'Matig' : 'Zwak';

    if (score >= 80 && feedback.length === 0) feedback.push('Content is consistent met de merkstem');

    res.json({ success: true, data: { brand_score: score, grade, feedback } });
  } catch (error) {
    logger.error('[AdminPortal] Brand check error:', error);
    res.status(500).json({ success: false, error: { code: 'BRAND_CHECK_ERROR', message: error.message } });
  }
});

export default router;
