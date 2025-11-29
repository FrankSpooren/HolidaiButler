/**
 * Monitoring and Observability Routes for Admin Module
 * Enterprise-grade monitoring endpoints
 */

import express from 'express';
import { sequelize } from '../models/index.js';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

const router = express.Router();

// Simple in-memory metrics (can be replaced with proper metrics service)
const metrics = {
  requests: 0,
  errors: 0,
  startTime: new Date()
};

/**
 * GET /api/admin/monitoring/health
 * Comprehensive health check
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'admin-module',
      version: process.env.npm_package_version || '2.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      checks: {}
    };

    // Database check (Sequelize/MySQL)
    try {
      await sequelize.authenticate();
      health.checks.database = {
        status: 'healthy',
        type: 'mysql',
        dialect: sequelize.getDialect()
      };
    } catch (error) {
      health.checks.database = {
        status: 'unhealthy',
        error: error.message
      };
      health.status = 'degraded';
    }

    // Memory check
    const memUsage = process.memoryUsage();
    health.checks.memory = {
      status: 'healthy',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
      external: Math.round(memUsage.external / 1024 / 1024) + ' MB',
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB'
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * GET /api/admin/monitoring/ready
 * Kubernetes readiness probe
 */
router.get('/ready', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({
      ready: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      reason: 'Database not connected',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/monitoring/live
 * Kubernetes liveness probe
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/admin/monitoring/metrics
 * Get all metrics
 */
router.get('/metrics', (req, res) => {
  try {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();

    res.json({
      timestamp: new Date().toISOString(),
      uptime: uptime,
      requests: metrics.requests,
      errors: metrics.errors,
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss
      },
      startTime: metrics.startTime.toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving metrics:', error);
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/monitoring/metrics/prometheus
 * Get metrics in Prometheus format
 */
router.get('/metrics/prometheus', (req, res) => {
  try {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();

    const prometheusMetrics = `
# HELP admin_uptime_seconds Total uptime in seconds
# TYPE admin_uptime_seconds gauge
admin_uptime_seconds ${uptime}

# HELP admin_requests_total Total number of requests
# TYPE admin_requests_total counter
admin_requests_total ${metrics.requests}

# HELP admin_errors_total Total number of errors
# TYPE admin_errors_total counter
admin_errors_total ${metrics.errors}

# HELP admin_heap_used_bytes Heap memory used
# TYPE admin_heap_used_bytes gauge
admin_heap_used_bytes ${memUsage.heapUsed}

# HELP admin_heap_total_bytes Total heap memory
# TYPE admin_heap_total_bytes gauge
admin_heap_total_bytes ${memUsage.heapTotal}

# HELP admin_rss_bytes Resident Set Size
# TYPE admin_rss_bytes gauge
admin_rss_bytes ${memUsage.rss}
`.trim();

    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(prometheusMetrics);
  } catch (error) {
    logger.error('Error generating Prometheus metrics:', error);
    res.status(500).send('# Error generating metrics\n');
  }
});

/**
 * POST /api/admin/monitoring/metrics/reset
 * Reset all metrics
 */
router.post('/metrics/reset', (req, res) => {
  try {
    metrics.requests = 0;
    metrics.errors = 0;
    metrics.startTime = new Date();

    logger.warn('Metrics reset via API');

    res.json({
      success: true,
      message: 'Metrics reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error resetting metrics:', error);
    res.status(500).json({
      error: 'Failed to reset metrics',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/monitoring/info
 * Get service information
 */
router.get('/info', (req, res) => {
  res.json({
    service: 'HolidaiButler Admin Module',
    version: process.env.npm_package_version || '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    database: 'MySQL (Sequelize)',
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/admin/monitoring/database
 * Get database connection info
 */
router.get('/database', async (req, res) => {
  try {
    await sequelize.authenticate();

    res.json({
      status: 'connected',
      dialect: sequelize.getDialect(),
      database: sequelize.config.database,
      host: sequelize.config.host,
      port: sequelize.config.port,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
