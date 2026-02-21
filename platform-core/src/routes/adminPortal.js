/**
 * Admin Portal Routes — Fase 8C-0 + 8C-1 + 8D
 * ==============================================
 * Unified admin API endpoints in platform-core (port 3001).
 * Path prefix: /api/v1/admin-portal
 *
 * Endpoints:
 *   POST /auth/login           — Admin login (rate limited)
 *   POST /auth/refresh         — Refresh access token
 *   POST /auth/logout          — Admin logout
 *   GET  /auth/me              — Current admin user info
 *   GET  /dashboard            — KPI data (Redis cached 120s)
 *   GET  /health               — System health checks
 *   GET  /agents/status        — Agent status dashboard (Redis cached 60s)
 *   GET  /pois                 — POI list with pagination, search, filters
 *   GET  /pois/stats           — POI statistics per destination (Redis cached 5min)
 *   GET  /pois/:id             — POI detail with content, images, reviews
 *   PUT  /pois/:id             — Update POI content (audit logged)
 *   GET  /reviews              — Review list with pagination, filters, summary
 *   GET  /reviews/:id          — Single review detail
 *   PUT  /reviews/:id          — Archive/unarchive review (audit logged)
 *   GET  /analytics            — Analytics overview (Redis cached 10min)
 *   GET  /analytics/export     — CSV export (pois/reviews/summary)
 *   GET  /settings             — System info, destinations, features
 *   GET  /settings/audit-log   — Admin audit log (paginated)
 *   POST /settings/cache/clear — Redis cache invalidation
 *
 * @module routes/adminPortal
 * @version 2.1.0
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import { mysqlSequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';
import {
  verifyAdminToken,
  generateAdminToken,
  authRateLimiter
} from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = Router();

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

// ============================================================
// AUTH ENDPOINTS
// ============================================================

/**
 * POST /auth/login
 * Admin login with email/password. Rate limited: 5 per 15 min.
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

    // Find user with role
    const users = await mysqlSequelize.query(
      `SELECT u.id, u.uuid, u.email, u.name, u.password_hash, u.role_id, r.name as role
       FROM Users u
       LEFT JOIN Roles r ON u.role_id = r.id
       WHERE u.email = ?`,
      { replacements: [email], type: QueryTypes.SELECT }
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    const user = users[0];

    // Verify admin role
    const adminRoles = ['admin', 'owner', 'super_admin'];
    if (!user.role || !adminRoles.includes(user.role)) {
      logger.warn(`[AdminPortal] Non-admin login attempt: ${email} (role: ${user.role || 'none'})`);
      return res.status(403).json({
        success: false,
        error: { code: 'ADMIN_REQUIRED', message: 'Admin access required' }
      });
    }

    // Verify password
    if (!user.password_hash) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    // Generate tokens
    const tokenPayload = { userId: user.id, uuid: user.uuid, email: user.email, role: user.role };
    const accessToken = generateAdminToken(tokenPayload, '8h');

    const refreshToken = jwt.sign(
      { userId: user.id, uuid: user.uuid, type: 'admin_refresh' },
      process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Store refresh token in Sessions table
    await mysqlSequelize.query(
      `INSERT INTO Sessions (user_id, refresh_token, expires_at, created_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())`,
      { replacements: [user.id, refreshToken] }
    );

    // Update last login
    await mysqlSequelize.query(
      `UPDATE Users SET last_login = NOW() WHERE id = ?`,
      { replacements: [user.id] }
    ).catch(() => {}); // Non-critical

    logger.info(`[AdminPortal] Admin login: ${email}`);

    res.json({
      success: true,
      data: {
        user: { id: user.id, uuid: user.uuid, email: user.email, name: user.name, role: user.role },
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

    // Get user with role for new token
    const users = await mysqlSequelize.query(
      `SELECT u.id, u.uuid, u.email, u.name, r.name as role
       FROM Users u LEFT JOIN Roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      { replacements: [decoded.userId], type: QueryTypes.SELECT }
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User no longer exists' }
      });
    }

    const user = users[0];
    const accessToken = generateAdminToken(
      { userId: user.id, uuid: user.uuid, email: user.email, role: user.role },
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
router.post('/auth/logout', verifyAdminToken, async (req, res) => {
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
 * Get current admin user info.
 */
router.get('/auth/me', verifyAdminToken, async (req, res) => {
  try {
    const userId = req.adminUser.id || req.adminUser.userId;

    const users = await mysqlSequelize.query(
      `SELECT u.id, u.uuid, u.email, u.name, r.name as role
       FROM Users u LEFT JOIN Roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      { replacements: [userId], type: QueryTypes.SELECT }
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    res.json({ success: true, data: users[0] });
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
router.get('/dashboard', verifyAdminToken, async (req, res) => {
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

    // 3. User count
    try {
      const userCount = await mysqlSequelize.query(
        `SELECT COUNT(*) as total FROM Users`,
        { type: QueryTypes.SELECT }
      );
      result.data.platform.totalUsers = parseInt(userCount[0]?.total || 0);
    } catch {
      result.data.platform.totalUsers = 0;
    }

    // 4. Chatbot sessions (last 7 days)
    try {
      const chatSessions = await mysqlSequelize.query(
        `SELECT COUNT(*) as total FROM holibot_sessions
         WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`,
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
router.get('/health', verifyAdminToken, async (req, res) => {
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
  { id: 'maestro',        name: 'De Maestro',              englishName: 'Orchestrator',             category: 'core',        type: 'A', description: 'Orkestreert alle agents en scheduled jobs',   schedule: null,           actorNames: ['orchestrator'] },
  { id: 'bode',           name: 'De Bode',                 englishName: 'Owner Interface Agent',    category: 'core',        type: 'A', description: 'Daily briefing en owner communicatie',        schedule: '0 8 * * *',   actorNames: ['orchestrator'] },
  { id: 'dokter',         name: 'De Dokter',               englishName: 'Health Monitor Agent',     category: 'operations',  type: 'A', description: 'Systeem monitoring en health checks',         schedule: '0 * * * *',   actorNames: ['health-monitor'] },
  { id: 'koerier',        name: 'De Koerier',              englishName: 'Data Sync Agent',          category: 'operations',  type: 'A', description: 'POI en review data synchronisatie',           schedule: '0 6 * * *',   actorNames: ['data-sync', 'reviews-manager'] },
  { id: 'geheugen',       name: 'Het Geheugen',            englishName: 'HoliBot Sync Agent',       category: 'operations',  type: 'A', description: 'ChromaDB vectorisatie en QnA sync',           schedule: '0 4 * * *',   actorNames: ['holibot-sync'] },
  { id: 'gastheer',       name: 'De Gastheer',             englishName: 'Communication Flow Agent', category: 'operations',  type: 'A', description: 'Gebruikerscommunicatie en journey processing', schedule: '0 */4 * * *', actorNames: ['communication-flow'] },
  { id: 'poortwachter',   name: 'De Poortwachter',         englishName: 'GDPR Agent',               category: 'operations',  type: 'A', description: 'GDPR compliance en data bescherming',         schedule: '0 */4 * * *', actorNames: ['gdpr'] },
  { id: 'stylist',        name: 'De Stylist',              englishName: 'UX/UI Agent',              category: 'development', type: 'B', description: 'UX/UI review en brand consistency',           schedule: '0 6 * * 1',   actorNames: ['dev-layer'] },
  { id: 'corrector',      name: 'De Corrector',            englishName: 'Code Agent',               category: 'development', type: 'B', description: 'Code quality en best practices',              schedule: '0 6 * * 1',   actorNames: ['dev-layer'] },
  { id: 'bewaker',        name: 'De Bewaker',              englishName: 'Security Agent',           category: 'development', type: 'B', description: 'Security scanning en vulnerability checks',    schedule: '0 2 * * *',   actorNames: ['dev-layer'] },
  { id: 'inspecteur',     name: 'De Inspecteur',           englishName: 'Quality Agent',            category: 'development', type: 'A', description: 'Kwaliteitscontrole en rapportage',            schedule: '0 6 * * 1',   actorNames: ['dev-layer'] },
  { id: 'architect',      name: 'De Architect',            englishName: 'Architecture Agent',       category: 'strategy',    type: 'B', description: 'Architectuur assessment en aanbevelingen',     schedule: '0 3 * * 0',   actorNames: ['strategy-layer'] },
  { id: 'leermeester',    name: 'De Leermeester',          englishName: 'Learning Agent',           category: 'strategy',    type: 'A', description: 'Pattern learning en optimalisatie',            schedule: '30 5 * * 1',  actorNames: ['strategy-layer'] },
  { id: 'thermostaat',    name: 'De Thermostaat',          englishName: 'Adaptive Config Agent',    category: 'strategy',    type: 'A', description: 'Configuratie evaluatie en alerting',           schedule: '0 */6 * * *', actorNames: ['strategy-layer'] },
  { id: 'weermeester',    name: 'De Weermeester',          englishName: 'Prediction Agent',         category: 'strategy',    type: 'A', description: 'Voorspellingen en trend analyse',              schedule: '0 3 * * 0',   actorNames: ['strategy-layer'] },
  { id: 'contentQuality', name: 'Content Quality Checker', englishName: 'Content Quality Checker',  category: 'monitoring',  type: 'A', description: 'POI content completeness en consistency',      schedule: '0 5 * * 1',   actorNames: ['data-sync'] },
  { id: 'smokeTest',      name: 'Smoke Test Runner',       englishName: 'Smoke Test Runner',        category: 'monitoring',  type: 'A', description: 'E2E smoke tests per destination',              schedule: '45 7 * * *',  actorNames: ['health-monitor'] },
  { id: 'backupHealth',   name: 'Backup Health Checker',   englishName: 'Backup Health Checker',    category: 'monitoring',  type: 'B', description: 'Backup recency en disk space monitoring',      schedule: '30 7 * * *',  actorNames: ['health-monitor'] }
];

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

  if (!schedule) return lastRun.status === 'completed' ? 'healthy' : 'warning';

  // Parse schedule to get interval in ms
  const parts = schedule.split(' ');
  const [min, hour] = parts;
  let intervalMs;
  if (min.startsWith('*/') && hour === '*') {
    intervalMs = parseInt(min.slice(2)) * 60 * 1000;
  } else if (min === '0' && hour.startsWith('*/')) {
    intervalMs = parseInt(hour.slice(2)) * 3600 * 1000;
  } else if (hour === '*') {
    intervalMs = 60 * 60 * 1000; // hourly
  } else {
    intervalMs = 24 * 3600 * 1000; // daily default
  }

  const elapsed = Date.now() - new Date(lastRun.timestamp).getTime();
  if (elapsed < intervalMs * 2) return 'healthy';
  if (elapsed < 24 * 3600 * 1000) return 'warning';
  return 'warning';
}

/**
 * GET /agents/status
 * Agent dashboard data. Redis cached for 60 seconds.
 * Sources: static metadata + MongoDB audit_logs + Redis state + monitoring collections
 */
router.get('/agents/status', verifyAdminToken, async (req, res) => {
  try {
    const { category, destination, refresh } = req.query;
    const cacheKey = 'admin:agents:status';
    const redis = getRedis();

    // Check cache (unless force refresh)
    if (redis && refresh !== 'true') {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return res.json(JSON.parse(cached));
      } catch { /* cache miss */ }
    }

    // Build agent list from static metadata
    const agents = AGENT_METADATA.map(meta => ({
      id: meta.id,
      name: meta.name,
      englishName: meta.englishName,
      category: meta.category,
      type: meta.type,
      description: meta.description,
      schedule: meta.schedule,
      scheduleHuman: cronToHuman(meta.schedule),
      destinationAware: meta.type === 'A',
      status: 'unknown',
      lastRun: null,
      destinations: meta.type === 'A' ? { calpe: { lastRun: null, status: 'unknown' }, texel: { lastRun: null, status: 'unknown' } } : null
    }));

    let partial = false;
    const recentActivity = [];

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

    // Build summary
    const summary = {
      total: agents.length,
      healthy: agents.filter(a => a.status === 'healthy').length,
      warning: agents.filter(a => a.status === 'warning').length,
      error: agents.filter(a => a.status === 'error').length,
      unknown: agents.filter(a => a.status === 'unknown').length
    };

    // Apply server-side filters (client can also filter)
    let filteredAgents = agents;
    if (category && category !== 'all') {
      filteredAgents = agents.filter(a => a.category === category);
    }

    const result = {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        partial,
        summary,
        destinations: {
          calpe: { id: 1, activeAgents: agents.filter(a => a.type === 'A').length },
          texel: { id: 2, activeAgents: agents.filter(a => a.type === 'A').length }
        },
        agents: filteredAgents,
        recentActivity
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
router.get('/pois', verifyAdminToken, async (req, res) => {
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
router.get('/pois/stats', verifyAdminToken, async (req, res) => {
  try {
    const { destination } = req.query;
    const cacheKey = destination ? `admin:pois:stats:${destination}` : 'admin:pois:stats';
    const redis = getRedis();

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return res.json(JSON.parse(cached));
      } catch { /* cache miss */ }
    }

    const destId = resolveDestinationId(destination);
    const destFilter = destId ? 'WHERE p.destination_id = ?' : '';
    const destParams = destId ? [destId] : [];

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

    // By destination
    const byDest = await mysqlSequelize.query(
      `SELECT destination_id, COUNT(*) as total,
              SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
       FROM POI GROUP BY destination_id`,
      { type: QueryTypes.SELECT }
    );

    const byDestMap = {};
    for (const d of byDest) {
      const key = d.destination_id === 1 ? 'calpe' : d.destination_id === 2 ? 'texel' : `dest_${d.destination_id}`;
      byDestMap[key] = { total: parseInt(d.total), active: parseInt(d.active) };
    }

    // By category
    const byCat = await mysqlSequelize.query(
      `SELECT category, COUNT(*) as cnt FROM POI p
       WHERE is_active = 1 ${destId ? 'AND destination_id = ?' : ''}
       GROUP BY category ORDER BY cnt DESC`,
      { replacements: destId ? [destId] : [], type: QueryTypes.SELECT }
    );

    const totalActive = parseInt(counts[0]?.active || 0);
    const byCategory = byCat.map(c => ({
      category: c.category,
      count: parseInt(c.cnt),
      pct: totalActive > 0 ? parseFloat(((parseInt(c.cnt) / totalActive) * 100).toFixed(1)) : 0
    }));

    // Image stats
    const imgStats = await mysqlSequelize.query(
      `SELECT COUNT(*) as totalImages,
              COUNT(DISTINCT i.poi_id) as poisWithImages
       FROM imageurls i
       ${destId ? 'INNER JOIN POI p ON i.poi_id = p.id WHERE p.destination_id = ?' : ''}`,
      { replacements: destId ? [destId] : [], type: QueryTypes.SELECT }
    );

    // Review stats
    const revStats = await mysqlSequelize.query(
      `SELECT COUNT(*) as totalReviews,
              COUNT(DISTINCT poi_id) as poisWithReviews,
              ROUND(AVG(rating), 1) as avgRating
       FROM reviews ${destId ? 'WHERE destination_id = ?' : ''}`,
      { replacements: destId ? [destId] : [], type: QueryTypes.SELECT }
    );

    // Per-destination content coverage
    const destContentCoverage = await mysqlSequelize.query(
      `SELECT destination_id,
              COUNT(*) as total,
              SUM(CASE WHEN enriched_detail_description IS NOT NULL AND enriched_detail_description != '' THEN 1 ELSE 0 END) as withContent
       FROM POI GROUP BY destination_id`,
      { type: QueryTypes.SELECT }
    );
    const destCoverageMap = {};
    for (const dc of destContentCoverage) {
      const total = parseInt(dc.total) || 1;
      destCoverageMap[dc.destination_id] = parseFloat(((parseInt(dc.withContent) || 0) / total * 100).toFixed(1));
    }

    // Per-destination avg rating from reviews
    const destAvgRating = await mysqlSequelize.query(
      `SELECT destination_id, ROUND(AVG(rating), 1) as avgRating FROM reviews GROUP BY destination_id`,
      { type: QueryTypes.SELECT }
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
 * GET /pois/:id
 * POI detail with content, images, and reviews summary.
 */
router.get('/pois/:id', verifyAdminToken, async (req, res) => {
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

    // Images
    const images = await mysqlSequelize.query(
      `SELECT id, image_url, local_path, source FROM imageurls WHERE poi_id = ? ORDER BY id LIMIT 20`,
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
router.put('/pois/:id', verifyAdminToken, async (req, res) => {
  try {
    const poiId = parseInt(req.params.id);
    if (!poiId || isNaN(poiId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid POI ID' } });
    }

    const { content, descriptions, is_active } = req.body;
    if (!content && !descriptions && is_active === undefined) {
      return res.status(400).json({ success: false, error: { code: 'NO_CHANGES', message: 'No fields to update' } });
    }

    // Verify POI exists
    const existing = await mysqlSequelize.query(
      `SELECT id, destination_id, name, enriched_detail_description,
              enriched_detail_description_nl, enriched_detail_description_de,
              enriched_detail_description_es, is_active FROM POI WHERE id = ?`,
      { replacements: [poiId], type: QueryTypes.SELECT }
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'POI not found' } });
    }

    const old = existing[0];
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

    if (sets.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_CHANGES', message: 'No valid fields to update' } });
    }

    // Update
    await mysqlSequelize.query(
      `UPDATE POI SET ${sets.join(', ')} WHERE id = ?`,
      { replacements: [...vals, poiId] }
    );

    // Audit log to MongoDB
    try {
      if (mongoose.connection.readyState === 1) {
        const db = mongoose.connection.db;
        await db.collection('audit_logs').insertOne({
          action: 'poi_content_updated',
          poi_id: poiId,
          poi_name: old.name,
          destination_id: old.destination_id,
          admin_id: req.adminUser.id || req.adminUser.userId,
          admin_email: req.adminUser.email,
          changes,
          timestamp: new Date(),
          actor: { type: 'admin', name: 'admin-portal' }
        });
      }
    } catch (auditErr) {
      logger.warn('[AdminPortal] Audit log write failed:', auditErr.message);
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

// ============================================================
// MODULE 8D-2: REVIEWS MODERATION
// ============================================================

/**
 * GET /reviews
 * Review list with pagination, filters, and summary stats.
 */
router.get('/reviews', verifyAdminToken, async (req, res) => {
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

    // Summary (always unfiltered for overview)
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
       FROM reviews`,
      { type: QueryTypes.SELECT }
    );

    const s = summaryResult[0] || {};

    // Per destination
    const destSummary = await mysqlSequelize.query(
      `SELECT destination_id, COUNT(*) as total, ROUND(AVG(rating), 1) as avgRating
       FROM reviews GROUP BY destination_id`,
      { type: QueryTypes.SELECT }
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
router.get('/reviews/:id', verifyAdminToken, async (req, res) => {
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
router.put('/reviews/:id', verifyAdminToken, async (req, res) => {
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
    const archivedVal = is_archived ? 1 : 0;
    const archivedAt = is_archived ? 'NOW()' : 'NULL';

    await mysqlSequelize.query(
      `UPDATE reviews SET is_archived = ?, archived_at = ${archivedAt} WHERE id = ?`,
      { replacements: [archivedVal, reviewId] }
    );

    // Audit log
    try {
      if (mongoose.connection.readyState === 1) {
        const db = mongoose.connection.db;
        await db.collection('audit_logs').insertOne({
          action: is_archived ? 'review_archived' : 'review_unarchived',
          review_id: reviewId,
          poi_id: old.poi_id,
          poi_name: old.poiName,
          destination_id: old.destination_id,
          admin_id: req.adminUser.id || req.adminUser.userId,
          admin_email: req.adminUser.email,
          changes: { is_archived: `${old.is_archived} → ${archivedVal}` },
          timestamp: new Date(),
          actor: { type: 'admin', name: 'admin-portal' }
        });
      }
    } catch (auditErr) {
      logger.warn('[AdminPortal] Audit log write failed:', auditErr.message);
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
router.get('/analytics', verifyAdminToken, async (req, res) => {
  try {
    const { destination } = req.query;
    const cacheKey = destination ? `admin:analytics:${destination}` : 'admin:analytics';
    const redis = getRedis();

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return res.json(JSON.parse(cached));
      } catch { /* cache miss */ }
    }

    const destFilter = destination ? 'WHERE destination_id = ?' : '';
    const destFilterAnd = destination ? 'AND destination_id = ?' : '';
    const destParams = destination ? [parseInt(destination)] : [];

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
          totalPOIs: parseInt(poiOverview[0]?.total || 0),
          activePOIs: totalActive,
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
        topPOIs: topPOIs.map(p => ({
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
router.get('/analytics/export', verifyAdminToken, async (req, res) => {
  try {
    const { type = 'summary', destination, format = 'csv' } = req.query;

    if (format !== 'csv') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_FORMAT', message: 'Only CSV format is supported' } });
    }

    const destFilter = destination ? 'WHERE destination_id = ?' : '';
    const destParams = destination ? [parseInt(destination)] : [];
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
      // Summary export
      const stats = await mysqlSequelize.query(
        `SELECT destination_id, COUNT(*) as pois, SUM(is_active) as active
         FROM POI GROUP BY destination_id`, { type: QueryTypes.SELECT });
      const revStats = await mysqlSequelize.query(
        `SELECT destination_id, COUNT(*) as reviews, ROUND(AVG(rating),1) as avg_rating
         FROM reviews GROUP BY destination_id`, { type: QueryTypes.SELECT });

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
// MODULE 8D-4: SETTINGS
// ============================================================

/**
 * GET /settings
 * System info, destinations, admin info, feature flags.
 */
router.get('/settings', verifyAdminToken, async (req, res) => {
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
router.get('/settings/audit-log', verifyAdminToken, async (req, res) => {
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

    const filter = { 'actor.type': 'admin' };
    if (action) filter.action = action;

    const total = await collection.countDocuments(filter);
    const entries = await collection.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray();

    const entryList = entries.map(e => ({
      _id: e._id,
      timestamp: e.timestamp,
      action: e.action,
      actor: { email: e.admin_email || e.actor?.name || 'system', type: 'admin' },
      detail: buildAuditDetail(e),
      destination: e.destination_id === 1 ? 'calpe' : e.destination_id === 2 ? 'texel' : null,
      changes: e.changes || null
    }));

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
  if (entry.action === 'poi_content_updated') {
    const langs = entry.changes ? Object.keys(entry.changes).join(', ') : '';
    return `POI #${entry.poi_id} (${entry.poi_name || 'unknown'}): ${langs} updated`;
  }
  if (entry.action === 'review_archived' || entry.action === 'review_unarchived') {
    return `Review #${entry.review_id} (${entry.poi_name || 'POI #' + entry.poi_id}): ${entry.action.replace('review_', '')}`;
  }
  return entry.description || entry.action || 'unknown action';
}

/**
 * POST /settings/cache/clear
 * Clear Redis cache keys.
 */
router.post('/settings/cache/clear', verifyAdminToken, async (req, res) => {
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

export default router;
