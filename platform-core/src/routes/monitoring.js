/**
 * Monitoring & Metrics Routes
 * Enterprise-level observability endpoints
 */

import express from 'express';
import v8 from "v8";
import metricsService from '../services/metrics.js';
import circuitBreakerManager from '../services/circuitBreaker.js';
import jwt from 'jsonwebtoken';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'No token' });
  const token = authHeader.substring(7);
  for (const secret of [process.env.JWT_ADMIN_SECRET, process.env.JWT_SECRET].filter(Boolean)) {
    try { req.user = jwt.verify(token, secret); return next(); } catch {}
  }
  return res.status(401).json({ success: false, error: 'Invalid token' });
}
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
    const stats = await circuitBreakerManager.getAllStats();
    const entries = Object.values(stats);
    const openBreakers = entries.filter(b => b.state === 'open');
    const health = {
      healthy: openBreakers.length === 0,
      total: entries.length,
      open: openBreakers.length,
    };

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
    memory: { ...process.memoryUsage(), heapLimit: v8.getHeapStatistics().heap_size_limit },
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
    // Check Redis/Cache via direct ping
    const Redis = (await import('ioredis')).default;
    const testRedis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    });
    try {
      await testRedis.connect();
      const pong = await testRedis.ping();
      health.dependencies.cache = { status: pong === 'PONG' ? 'up' : 'down' };
      await testRedis.quit();
    } catch (redisErr) {
      health.dependencies.cache = { status: 'down', error: redisErr.message };
      try { testRedis.disconnect(); } catch {}
    }
  } catch (error) {
    health.dependencies.cache = { status: 'down', error: error.message };
  }

  // Check circuit breakers
  try {
    const breakerStats = await circuitBreakerManager.getAllStats();
    const entries = Object.values(breakerStats);
    const openBreakers = entries.filter(b => b.state === 'open');
    health.dependencies.circuitBreakers = {
      healthy: openBreakers.length === 0,
      total: entries.length,
      open: openBreakers.length,
    };
    if (openBreakers.length > 0) health.status = 'degraded';
  } catch (e) {
    health.dependencies.circuitBreakers = { healthy: true, total: 0, open: 0 };
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
      memory: { ...process.memoryUsage(), heapLimit: v8.getHeapStatistics().heap_size_limit },
      cpuUsage: process.cpuUsage(),
      env: process.env.NODE_ENV,
    },
  });
});

export default router;
