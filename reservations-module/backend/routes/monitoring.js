/**
 * Monitoring Routes
 * Health checks, metrics, and system monitoring endpoints
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const cacheService = require('../services/cache');
const PaymentService = require('../services/PaymentService');
const NotificationService = require('../services/NotificationService');
const IntegrationService = require('../services/IntegrationService');
const { getAllCircuitBreakers, resetAllCircuitBreakers } = require('../utils/circuitBreaker');
const { authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * GET /api/v1/monitoring/health
 * Comprehensive health check
 */
router.get('/health', async (req, res) => {
  const checks = {
    service: 'reservations-module',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // Database check
  try {
    await sequelize.authenticate();
    checks.checks.database = { status: 'healthy', latency: null };
  } catch (error) {
    checks.checks.database = { status: 'unhealthy', error: error.message };
    checks.status = 'unhealthy';
  }

  // Redis check
  try {
    const cacheHealth = await cacheService.healthCheck();
    checks.checks.cache = cacheHealth;
    if (!cacheHealth.healthy) {
      checks.status = 'degraded';
    }
  } catch (error) {
    checks.checks.cache = { status: 'unhealthy', error: error.message };
    checks.status = 'degraded';
  }

  const statusCode = checks.status === 'healthy' ? 200 : checks.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(checks);
});

/**
 * GET /api/v1/monitoring/ready
 * Kubernetes readiness probe
 */
router.get('/ready', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message });
  }
});

/**
 * GET /api/v1/monitoring/live
 * Kubernetes liveness probe
 */
router.get('/live', (req, res) => {
  res.json({ alive: true, uptime: process.uptime() });
});

/**
 * GET /api/v1/monitoring/metrics
 * Application metrics
 */
router.get('/metrics', authenticate, async (req, res, next) => {
  try {
    const { Reservation, Guest, Restaurant, Waitlist } = require('../models');
    const { fn, col } = require('sequelize');

    // Get counts
    const [
      totalReservations,
      todayReservations,
      activeGuests,
      activeRestaurants,
      waitlistEntries,
    ] = await Promise.all([
      Reservation.count(),
      Reservation.count({
        where: {
          reservation_date: new Date().toISOString().split('T')[0],
        },
      }),
      Guest.count({ where: { is_blacklisted: false } }),
      Restaurant.count({ where: { is_active: true } }),
      Waitlist.count({ where: { status: 'waiting' } }),
    ]);

    // Get reservation status breakdown
    const statusBreakdown = await Reservation.findAll({
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    // Get cache stats
    const cacheStats = await cacheService.getStatistics();

    // Get circuit breaker status
    const circuitBreakers = getAllCircuitBreakers();

    res.json({
      success: true,
      data: {
        reservations: {
          total: totalReservations,
          today: todayReservations,
          byStatus: statusBreakdown.reduce((acc, s) => {
            acc[s.status] = parseInt(s.count);
            return acc;
          }, {}),
        },
        guests: {
          active: activeGuests,
        },
        restaurants: {
          active: activeRestaurants,
        },
        waitlist: {
          waiting: waitlistEntries,
        },
        cache: cacheStats,
        circuitBreakers,
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/monitoring/metrics/prometheus
 * Prometheus-compatible metrics
 */
router.get('/metrics/prometheus', async (req, res) => {
  try {
    const { Reservation, Guest, Restaurant } = require('../models');

    const [reservationCount, guestCount, restaurantCount] = await Promise.all([
      Reservation.count(),
      Guest.count(),
      Restaurant.count({ where: { is_active: true } }),
    ]);

    const metrics = `
# HELP reservations_total Total number of reservations
# TYPE reservations_total counter
reservations_total ${reservationCount}

# HELP guests_total Total number of guests
# TYPE guests_total counter
guests_total ${guestCount}

# HELP restaurants_active Number of active restaurants
# TYPE restaurants_active gauge
restaurants_active ${restaurantCount}

# HELP nodejs_uptime_seconds Node.js process uptime
# TYPE nodejs_uptime_seconds gauge
nodejs_uptime_seconds ${process.uptime()}

# HELP nodejs_memory_heap_used_bytes Node.js heap memory used
# TYPE nodejs_memory_heap_used_bytes gauge
nodejs_memory_heap_used_bytes ${process.memoryUsage().heapUsed}

# HELP nodejs_memory_heap_total_bytes Node.js heap memory total
# TYPE nodejs_memory_heap_total_bytes gauge
nodejs_memory_heap_total_bytes ${process.memoryUsage().heapTotal}
`.trim();

    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    res.status(500).send('# Error collecting metrics');
  }
});

/**
 * GET /api/v1/monitoring/circuit-breakers
 * Circuit breaker status
 */
router.get('/circuit-breakers', authenticate, (req, res) => {
  const circuitBreakers = getAllCircuitBreakers();

  res.json({
    success: true,
    data: circuitBreakers,
  });
});

/**
 * POST /api/v1/monitoring/circuit-breakers/reset
 * Reset all circuit breakers (admin only)
 */
router.post(
  '/circuit-breakers/reset',
  authenticate,
  requireAdmin,
  (req, res) => {
    resetAllCircuitBreakers();

    logger.warn(`Circuit breakers reset by ${req.user.id}`);

    res.json({
      success: true,
      message: 'All circuit breakers reset',
    });
  }
);

/**
 * GET /api/v1/monitoring/integrations
 * External integration status
 */
router.get('/integrations', authenticate, async (req, res, next) => {
  try {
    const [integrationStatus, paymentHealth, notificationHealth] = await Promise.all([
      IntegrationService.getIntegrationStatus(),
      PaymentService.healthCheck(),
      NotificationService.healthCheck(),
    ]);

    res.json({
      success: true,
      data: {
        integrations: integrationStatus,
        payment: paymentHealth,
        notifications: notificationHealth,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/monitoring/cache/flush
 * Flush cache (admin only)
 */
router.post(
  '/cache/flush',
  authenticate,
  requireAdmin,
  async (req, res) => {
    const result = await cacheService.flushAll();

    logger.warn(`Cache flushed by ${req.user.id}`);

    res.json({
      success: result,
      message: result ? 'Cache flushed' : 'Cache flush failed',
    });
  }
);

/**
 * GET /api/v1/monitoring/logs
 * Recent logs (admin only, limited)
 */
router.get('/logs', authenticate, requireAdmin, (req, res) => {
  // This would typically connect to a log aggregation service
  // For now, return a message
  res.json({
    success: true,
    message: 'Logs available via Winston files or external log service',
    logFiles: [
      'logs/combined.log',
      'logs/error.log',
    ],
  });
});

/**
 * GET /api/v1/monitoring/database
 * Database connection info (admin only)
 */
router.get('/database', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const [results] = await sequelize.query('SELECT VERSION() as version');
    const [processlist] = await sequelize.query('SHOW PROCESSLIST');

    res.json({
      success: true,
      data: {
        version: results[0]?.version,
        connections: processlist.length,
        pool: {
          size: sequelize.connectionManager.pool?.size,
          available: sequelize.connectionManager.pool?.available,
          pending: sequelize.connectionManager.pool?.pending,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
