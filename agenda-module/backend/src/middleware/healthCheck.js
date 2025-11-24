const mongoose = require('mongoose');
const logger = require('../config/logger');
const cacheService = require('../config/cache');

/**
 * Health Check Endpoints
 * For load balancers and monitoring systems
 */

class HealthCheckService {
  constructor() {
    this.startTime = Date.now();
    this.checks = {
      database: this.checkDatabase.bind(this),
      cache: this.checkCache.bind(this),
      memory: this.checkMemory.bind(this),
      disk: this.checkDisk.bind(this),
    };
  }

  /**
   * Basic health check - responds quickly for load balancers
   */
  async basicHealthCheck(req, res) {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
    });
  }

  /**
   * Detailed health check - includes all dependencies
   */
  async detailedHealthCheck(req, res) {
    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {},
    };

    // Run all health checks
    for (const [name, checkFn] of Object.entries(this.checks)) {
      try {
        results.checks[name] = await checkFn();
      } catch (error) {
        results.checks[name] = {
          status: 'unhealthy',
          error: error.message,
        };
        results.status = 'degraded';
      }
    }

    // Determine overall status
    const unhealthyChecks = Object.values(results.checks).filter(
      c => c.status === 'unhealthy'
    );

    if (unhealthyChecks.length > 0) {
      results.status = 'unhealthy';
      logger.warn('Health check failed:', { unhealthyChecks });
    }

    const statusCode = results.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(results);
  }

  /**
   * Readiness check - indicates if service is ready to receive traffic
   */
  async readinessCheck(req, res) {
    try {
      // Check critical dependencies
      const dbCheck = await this.checkDatabase();

      if (dbCheck.status === 'healthy') {
        res.status(200).json({
          status: 'ready',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(503).json({
          status: 'not ready',
          reason: 'Database not available',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      res.status(503).json({
        status: 'not ready',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Liveness check - indicates if service is alive
   */
  async livenessCheck(req, res) {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
    });
  }

  /**
   * Check database connection
   */
  async checkDatabase() {
    const startTime = Date.now();

    try {
      const state = mongoose.connection.readyState;
      const stateMap = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
      };

      const isHealthy = state === 1;
      const responseTime = Date.now() - startTime;

      // Test actual query
      if (isHealthy) {
        await mongoose.connection.db.admin().ping();
      }

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        state: stateMap[state],
        responseTime: `${responseTime}ms`,
        details: {
          host: mongoose.connection.host,
          name: mongoose.connection.name,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: `${Date.now() - startTime}ms`,
      };
    }
  }

  /**
   * Check cache (Redis) connection
   */
  async checkCache() {
    const startTime = Date.now();

    try {
      const isConnected = cacheService.isConnected;

      if (isConnected) {
        // Test actual operation
        const testKey = '_health_check_test';
        await cacheService.set(testKey, { test: true }, 5);
        await cacheService.get(testKey);
        await cacheService.del(testKey);
      }

      const responseTime = Date.now() - startTime;

      return {
        status: isConnected ? 'healthy' : 'degraded',
        connected: isConnected,
        responseTime: `${responseTime}ms`,
        message: isConnected ? 'Cache operational' : 'Cache not available (degraded mode)',
      };
    } catch (error) {
      return {
        status: 'degraded',
        connected: false,
        error: error.message,
        responseTime: `${Date.now() - startTime}ms`,
      };
    }
  }

  /**
   * Check memory usage
   */
  async checkMemory() {
    const usage = process.memoryUsage();
    const totalMemoryMB = Math.round(usage.heapTotal / 1024 / 1024);
    const usedMemoryMB = Math.round(usage.heapUsed / 1024 / 1024);
    const usagePercent = ((usage.heapUsed / usage.heapTotal) * 100).toFixed(2);

    const isHealthy = usagePercent < 90; // Alert if >90% memory usage

    return {
      status: isHealthy ? 'healthy' : 'warning',
      totalMB: totalMemoryMB,
      usedMB: usedMemoryMB,
      usagePercent: `${usagePercent}%`,
      rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
    };
  }

  /**
   * Check disk usage (if applicable)
   */
  async checkDisk() {
    try {
      const os = require('os');
      const freeMem = os.freemem();
      const totalMem = os.totalmem();
      const usagePercent = (((totalMem - freeMem) / totalMem) * 100).toFixed(2);

      return {
        status: 'healthy',
        freeMemoryGB: (freeMem / 1024 / 1024 / 1024).toFixed(2),
        totalMemoryGB: (totalMem / 1024 / 1024 / 1024).toFixed(2),
        usagePercent: `${usagePercent}%`,
      };
    } catch (error) {
      return {
        status: 'unknown',
        error: error.message,
      };
    }
  }

  /**
   * Get system uptime
   */
  getUptime() {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    return {
      seconds: uptimeSeconds,
      formatted: `${hours}h ${minutes}m ${seconds}s`,
    };
  }

  /**
   * Get system metrics
   */
  async getMetrics(req, res) {
    const os = require('os');

    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        loadAverage: os.loadavg(),
        totalMemory: Math.round(os.totalmem() / 1024 / 1024) + 'MB',
        freeMemory: Math.round(os.freemem() / 1024 / 1024) + 'MB',
      },
      process: {
        nodeVersion: process.version,
        pid: process.pid,
        memory: {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        },
        cpu: process.cpuUsage(),
      },
    };

    // Get cache stats if available
    if (cacheService.isConnected) {
      metrics.cache = await cacheService.getStats();
    }

    // Get database stats
    if (mongoose.connection.readyState === 1) {
      const dbStats = await mongoose.connection.db.stats();
      metrics.database = {
        collections: dbStats.collections,
        dataSize: Math.round(dbStats.dataSize / 1024 / 1024) + 'MB',
        indexSize: Math.round(dbStats.indexSize / 1024 / 1024) + 'MB',
      };
    }

    res.json(metrics);
  }
}

const healthCheckService = new HealthCheckService();

module.exports = {
  basicHealthCheck: healthCheckService.basicHealthCheck.bind(healthCheckService),
  detailedHealthCheck: healthCheckService.detailedHealthCheck.bind(healthCheckService),
  readinessCheck: healthCheckService.readinessCheck.bind(healthCheckService),
  livenessCheck: healthCheckService.livenessCheck.bind(healthCheckService),
  getMetrics: healthCheckService.getMetrics.bind(healthCheckService),
};
