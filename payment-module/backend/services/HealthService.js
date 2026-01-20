const logger = require('../utils/logger');

/**
 * Health Check Service
 * Comprehensive health monitoring for all payment module dependencies
 */

class HealthService {
  constructor() {
    this.checks = {};
    this.lastCheck = null;
    this.cacheMs = 5000; // Cache health results for 5 seconds
  }

  /**
   * Run all health checks
   * @returns {Promise<Object>} Health status
   */
  async checkAll() {
    // Return cached result if recent
    if (this.lastCheck && (Date.now() - this.lastCheck.timestamp) < this.cacheMs) {
      return this.lastCheck.result;
    }

    const startTime = Date.now();

    const [database, redis, adyen] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkAdyen(),
    ]);

    const allHealthy = database.healthy && redis.healthy && adyen.healthy;

    const result = {
      success: allHealthy,
      service: 'payment-engine',
      version: require('../package.json').version,
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database,
        redis,
        adyen,
      },
      responseTimeMs: Date.now() - startTime,
    };

    // Cache result
    this.lastCheck = {
      timestamp: Date.now(),
      result,
    };

    return result;
  }

  /**
   * Check database connectivity
   */
  async checkDatabase() {
    try {
      const { sequelize } = require('../models');
      const startTime = Date.now();

      await sequelize.authenticate();

      // Run a simple query to verify actual connectivity
      await sequelize.query('SELECT 1 as result');

      return {
        healthy: true,
        status: 'connected',
        latencyMs: Date.now() - startTime,
        type: 'mysql',
        host: process.env.DATABASE_HOST || 'localhost',
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        healthy: false,
        status: 'disconnected',
        error: error.message,
        type: 'mysql',
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  async checkRedis() {
    try {
      const CacheService = require('./CacheService');
      const startTime = Date.now();

      const healthResult = await CacheService.healthCheck();

      return {
        healthy: healthResult.connected,
        status: healthResult.connected ? 'connected' : 'disconnected',
        latencyMs: healthResult.latencyMs,
        error: healthResult.error,
        type: 'redis',
        host: process.env.REDIS_HOST || 'localhost',
      };
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return {
        healthy: false,
        status: 'disconnected',
        error: error.message,
        type: 'redis',
      };
    }
  }

  /**
   * Check Adyen connectivity
   */
  async checkAdyen() {
    try {
      const AdyenService = require('./AdyenService');
      const startTime = Date.now();

      const isConnected = await AdyenService.testConnection();

      return {
        healthy: isConnected,
        status: isConnected ? 'connected' : 'disconnected',
        latencyMs: Date.now() - startTime,
        environment: process.env.ADYEN_ENVIRONMENT || 'test',
      };
    } catch (error) {
      logger.error('Adyen health check failed:', error);
      return {
        healthy: false,
        status: 'disconnected',
        error: error.message,
        environment: process.env.ADYEN_ENVIRONMENT || 'test',
      };
    }
  }

  /**
   * Get queue health
   */
  async checkQueues() {
    try {
      const PaymentQueue = require('../queues/PaymentQueue');
      const statuses = await PaymentQueue.getAllQueueStatuses();

      const healthy = Object.values(statuses).every(
        q => q.active >= 0 && !q.isPaused
      );

      return {
        healthy,
        status: healthy ? 'operational' : 'degraded',
        queues: statuses,
      };
    } catch (error) {
      logger.error('Queue health check failed:', error);
      return {
        healthy: false,
        status: 'unavailable',
        error: error.message,
      };
    }
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    try {
      const { getAllCircuitStatuses } = require('../utils/circuitBreaker');
      return getAllCircuitStatuses();
    } catch (error) {
      logger.error('Circuit breaker status check failed:', error);
      return {};
    }
  }

  /**
   * Get system metrics
   */
  getSystemMetrics() {
    const memUsage = process.memoryUsage();

    return {
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
        rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
        external: Math.round(memUsage.external / 1024 / 1024) + ' MB',
      },
      cpu: process.cpuUsage(),
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
    };
  }

  /**
   * Get detailed health report (admin)
   */
  async getDetailedReport() {
    const [basic, queues] = await Promise.all([
      this.checkAll(),
      this.checkQueues(),
    ]);

    return {
      ...basic,
      queues,
      circuitBreakers: this.getCircuitBreakerStatus(),
      system: this.getSystemMetrics(),
    };
  }

  /**
   * Liveness probe (for k8s)
   */
  async livenessProbe() {
    // Just check if the process is running
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe (for k8s)
   */
  async readinessProbe() {
    const health = await this.checkAll();

    // Only require database to be ready
    const ready = health.checks.database.healthy;

    return {
      ready,
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: health.checks.database.healthy,
        redis: health.checks.redis.healthy,
        adyen: health.checks.adyen.healthy,
      },
    };
  }
}

module.exports = new HealthService();
