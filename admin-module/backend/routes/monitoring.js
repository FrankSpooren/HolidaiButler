/**
 * Monitoring and Observability Routes for Admin Module
 * Enterprise-grade monitoring endpoints
 */

import express from 'express';
import mongoose from 'mongoose';
import metricsService from '../services/metrics.js';
import cacheService from '../services/cache.js';
import circuitBreakerManager from '../utils/circuitBreaker.js';
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
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      checks: {}
    };

    // Database check
    try {
      if (mongoose.connection.readyState === 1) {
        health.checks.database = {
          status: 'healthy',
          type: 'mongodb',
          connections: mongoose.connection.readyState
        };
      } else {
        health.checks.database = {
          status: 'unhealthy',
          error: 'Database not connected'
        };
        health.status = 'degraded';
      }
    } catch (error) {
      health.checks.database = {
        status: 'unhealthy',
        error: error.message
      };
      health.status = 'degraded';
    }

    // Cache check
    if (cacheService.isConnected) {
      health.checks.cache = {
        status: 'healthy',
        type: 'redis'
      };
    } else {
      health.checks.cache = {
        status: 'unhealthy',
        warning: 'Cache not connected (degraded performance)'
      };
      // Cache failure is not critical
      if (health.status === 'healthy') {
        health.status = 'degraded';
      }
    }

    // Circuit breakers check
    const breakerStatuses = circuitBreakerManager.getAllStatuses();
    const openBreakers = Object.entries(breakerStatuses).filter(
      ([_, status]) => status.state === 'OPEN'
    );

    health.checks.circuitBreakers = {
      status: openBreakers.length === 0 ? 'healthy' : 'degraded',
      total: Object.keys(breakerStatuses).length,
      open: openBreakers.length,
      openBreakers: openBreakers.map(([name]) => name)
    };

    if (openBreakers.length > 0 && health.status === 'healthy') {
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
    if (mongoose.connection.readyState === 1) {
      res.status(200).json({
        ready: true,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        ready: false,
        reason: 'Database not connected'
      });
    }
  } catch (error) {
    res.status(503).json({
      ready: false,
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
    const metrics = metricsService.getAllMetrics();
    res.json(metrics);
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
    const prometheusMetrics = metricsService.getPrometheusMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(prometheusMetrics);
  } catch (error) {
    logger.error('Error generating Prometheus metrics:', error);
    res.status(500).send('# Error generating metrics\n');
  }
});

/**
 * GET /api/admin/monitoring/circuit-breakers
 * Get all circuit breaker statuses
 */
router.get('/circuit-breakers', (req, res) => {
  try {
    const statuses = circuitBreakerManager.getAllStatuses();
    res.json({
      timestamp: new Date().toISOString(),
      circuitBreakers: statuses
    });
  } catch (error) {
    logger.error('Error retrieving circuit breaker statuses:', error);
    res.status(500).json({
      error: 'Failed to retrieve circuit breaker statuses',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/monitoring/circuit-breakers/:name/reset
 * Reset specific circuit breaker
 */
router.post('/circuit-breakers/:name/reset', (req, res) => {
  try {
    const { name } = req.params;
    circuitBreakerManager.reset(name);

    logger.info(`Circuit breaker ${name} reset via API`);

    res.json({
      success: true,
      message: `Circuit breaker ${name} reset successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error resetting circuit breaker:', error);
    res.status(500).json({
      error: 'Failed to reset circuit breaker',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/monitoring/circuit-breakers/reset-all
 * Reset all circuit breakers
 */
router.post('/circuit-breakers/reset-all', (req, res) => {
  try {
    circuitBreakerManager.resetAll();

    logger.info('All circuit breakers reset via API');

    res.json({
      success: true,
      message: 'All circuit breakers reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error resetting all circuit breakers:', error);
    res.status(500).json({
      error: 'Failed to reset circuit breakers',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/monitoring/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await cacheService.getStatistics();
    res.json({
      timestamp: new Date().toISOString(),
      cache: stats
    });
  } catch (error) {
    logger.error('Error retrieving cache stats:', error);
    res.status(500).json({
      error: 'Failed to retrieve cache statistics',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/monitoring/cache/flush
 * Flush entire cache (use with caution)
 */
router.post('/cache/flush', async (req, res) => {
  try {
    const success = await cacheService.flushAll();

    if (success) {
      logger.warn('Cache flushed via API');
      res.json({
        success: true,
        message: 'Cache flushed successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to flush cache'
      });
    }
  } catch (error) {
    logger.error('Error flushing cache:', error);
    res.status(500).json({
      error: 'Failed to flush cache',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/monitoring/metrics/reset
 * Reset all metrics (use with caution)
 */
router.post('/metrics/reset', (req, res) => {
  try {
    metricsService.reset();

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
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
