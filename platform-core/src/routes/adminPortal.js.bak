/**
 * Admin Portal Routes — Fase 8C-0 + 8C-1
 * ========================================
 * Unified admin API endpoints in platform-core (port 3001).
 * Path prefix: /api/v1/admin-portal
 *
 * Endpoints:
 *   POST /auth/login      — Admin login (rate limited)
 *   POST /auth/refresh    — Refresh access token
 *   POST /auth/logout     — Admin logout
 *   GET  /auth/me         — Current admin user info
 *   GET  /dashboard       — KPI data (Redis cached 120s)
 *   GET  /health          — System health checks
 *   GET  /agents/status   — Agent status dashboard (Redis cached 60s) [Fase 8C-1]
 *
 * @module routes/adminPortal
 * @version 1.1.0
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

export default router;
