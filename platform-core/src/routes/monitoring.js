/**
 * Monitoring & Metrics Routes
 * Enterprise-level observability endpoints
 */

import express from 'express';
import metricsService from '../services/metrics.js';
import circuitBreakerManager from '../utils/circuitBreaker.js';
import cacheService from '../services/cache.js';
import { authenticate } from '../middleware/auth.js';
import { mysqlSequelize } from '../config/database.js';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * Get all metrics
 */
router.get('/metrics', authenticate, async (req, res) => {
  try {
    const metrics = metricsService.getMetrics();

    // Add circuit breaker stats
    const circuitBreakers = circuitBreakerManager.getAllStats();
    metricsService.updateCircuitBreakerMetrics(circuitBreakers);

    res.json({
      success: true,
      metrics,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get metrics',
      message: error.message,
    });
  }
});

/**
 * Get Prometheus-formatted metrics
 */
router.get('/metrics/prometheus', async (req, res) => {
  try {
    const metrics = metricsService.getPrometheusMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    res.status(500).send('# Error generating metrics');
  }
});

/**
 * Get circuit breaker status
 */
router.get('/circuit-breakers', authenticate, async (req, res) => {
  try {
    const stats = circuitBreakerManager.getAllStats();
    const health = circuitBreakerManager.healthCheck();

    res.json({
      success: true,
      health,
      breakers: stats,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get circuit breaker status',
      message: error.message,
    });
  }
});

/**
 * Reset circuit breaker
 */
router.post('/circuit-breakers/:name/reset', authenticate, async (req, res) => {
  try {
    const { name } = req.params;
    const breaker = circuitBreakerManager.getBreaker(name);

    if (!breaker) {
      return res.status(404).json({
        error: 'Circuit breaker not found',
      });
    }

    breaker.reset();

    res.json({
      success: true,
      message: `Circuit breaker ${name} reset`,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to reset circuit breaker',
      message: error.message,
    });
  }
});

/**
 * Get cache statistics
 */
router.get('/cache/stats', authenticate, async (req, res) => {
  try {
    const stats = await cacheService.getStats();

    res.json({
      success: true,
      cache: stats,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get cache stats',
      message: error.message,
    });
  }
});

/**
 * Flush cache
 */
router.post('/cache/flush', authenticate, async (req, res) => {
  try {
    await cacheService.flush();

    res.json({
      success: true,
      message: 'Cache flushed',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to flush cache',
      message: error.message,
    });
  }
});

/**
 * Comprehensive health check
 */
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    dependencies: {},
  };

  try {
    // Check MySQL
    await mysqlSequelize.authenticate();
    health.dependencies.mysql = { status: 'up', responseTime: '< 10ms' };
  } catch (error) {
    health.dependencies.mysql = { status: 'down', error: error.message };
    health.status = 'unhealthy';
  }

  try {
    // Check MongoDB
    if (mongoose.connection.readyState === 1) {
      health.dependencies.mongodb = { status: 'up' };
    } else {
      health.dependencies.mongodb = { status: 'down' };
      health.status = 'degraded';
    }
  } catch (error) {
    health.dependencies.mongodb = { status: 'down', error: error.message };
  }

  try {
    // Check Redis/Cache
    const cacheConnected = await cacheService.isConnected;
    health.dependencies.cache = cacheConnected ? { status: 'up' } : { status: 'down' };
  } catch (error) {
    health.dependencies.cache = { status: 'down', error: error.message };
  }

  // Check circuit breakers
  const breakerHealth = circuitBreakerManager.healthCheck();
  health.dependencies.circuitBreakers = breakerHealth;

  if (!breakerHealth.healthy) {
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(health);
});

/**
 * Readiness probe (Kubernetes)
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if critical dependencies are ready
    await mysqlSequelize.authenticate();

    res.json({
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error.message,
    });
  }
});

/**
 * Liveness probe (Kubernetes)
 */
router.get('/live', (req, res) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get system information
 */
router.get('/system', authenticate, (req, res) => {
  res.json({
    success: true,
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      env: process.env.NODE_ENV,
    },
  });
});

export default router;
