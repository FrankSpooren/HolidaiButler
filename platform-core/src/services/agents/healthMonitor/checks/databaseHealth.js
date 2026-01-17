/**
 * Database Health Check
 * Monitors MySQL, MongoDB, and Redis connections
 *
 * @module healthMonitor/checks/databaseHealth
 */

import mongoose from 'mongoose';
import Redis from 'ioredis';

class DatabaseHealthCheck {
  /**
   * Check MySQL database connection
   * @returns {Promise<Object>} MySQL health result
   */
  async checkMySQL() {
    try {
      // Dynamic import - database.js exports { mysql: sequelize instance }
      // Path: checks -> healthMonitor -> agents -> services -> src -> config
      const dbConfig = await import('../../../../config/database.js');
      const sequelize = dbConfig.default?.mysql || dbConfig.mysql;

      if (!sequelize) {
        throw new Error('MySQL sequelize instance not found in database config');
      }

      await sequelize.authenticate();

      return {
        check: 'mysql',
        status: 'healthy',
        database: process.env.DB_NAME || 'attexel',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        check: 'mysql',
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check MongoDB connection status
   * @returns {Promise<Object>} MongoDB health result
   */
  async checkMongoDB() {
    try {
      const state = mongoose.connection.readyState;
      const stateMap = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };

      // If disconnected, try to connect using MONGODB_URI from env
      if (state === 0 && process.env.MONGODB_URI) {
        try {
          await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
          });
          return {
            check: 'mongodb',
            status: 'healthy',
            state: 'connected',
            note: 'Connected during health check',
            timestamp: new Date().toISOString()
          };
        } catch (connectError) {
          return {
            check: 'mongodb',
            status: 'unhealthy',
            state: 'disconnected',
            error: connectError.message,
            timestamp: new Date().toISOString()
          };
        }
      }

      return {
        check: 'mongodb',
        status: state === 1 ? 'healthy' : 'unhealthy',
        state: stateMap[state] || 'unknown',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        check: 'mongodb',
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check Redis connection
   * @returns {Promise<Object>} Redis health result
   */
  async checkRedis() {
    let redis;
    try {
      redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        connectTimeout: 5000,
        maxRetriesPerRequest: 1
      });

      const pong = await redis.ping();
      await redis.quit();

      return {
        check: 'redis',
        status: pong === 'PONG' ? 'healthy' : 'unhealthy',
        response: pong,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (redis) {
        try {
          await redis.quit();
        } catch {
          // Ignore quit errors
        }
      }

      return {
        check: 'redis',
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Run all database health checks
   * @returns {Promise<Array>} All check results
   */
  async runAllChecks() {
    const [mysql, mongodb, redis] = await Promise.all([
      this.checkMySQL(),
      this.checkMongoDB(),
      this.checkRedis()
    ]);

    return [mysql, mongodb, redis];
  }
}

export default new DatabaseHealthCheck();
