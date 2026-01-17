/**
 * Queue Health Check
 * Monitors BullMQ queues and worker status
 *
 * @module healthMonitor/checks/queueHealth
 */

import { Queue } from 'bullmq';
import Redis from 'ioredis';

class QueueHealthCheck {
  constructor() {
    this.redisConnection = null;

    // Queue names to monitor
    this.queueNames = [
      'daily-briefing',
      'health-check',
      'data-sync',
      'email-notifications',
      'poi-updates'
    ];
  }

  /**
   * Get or create Redis connection
   * @returns {Redis} Redis connection instance
   */
  getRedisConnection() {
    if (!this.redisConnection) {
      this.redisConnection = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        maxRetriesPerRequest: null
      });
    }
    return this.redisConnection;
  }

  /**
   * Check a specific queue's health
   * @param {string} queueName - Name of the queue to check
   * @returns {Promise<Object>} Queue health result
   */
  async checkQueue(queueName) {
    try {
      const queue = new Queue(queueName, {
        connection: this.getRedisConnection()
      });

      // Get queue metrics
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount()
      ]);

      await queue.close();

      // Determine status based on metrics
      let status = 'healthy';
      if (failed > 10) {
        status = 'warning';
      }
      if (failed > 50 || waiting > 1000) {
        status = 'unhealthy';
      }

      return {
        queue: queueName,
        status,
        metrics: {
          waiting,
          active,
          completed,
          failed,
          delayed
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        queue: queueName,
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check all configured queues
   * @returns {Promise<Object>} All queues health result
   */
  async checkAllQueues() {
    const results = await Promise.all(
      this.queueNames.map(name => this.checkQueue(name))
    );

    // Determine overall queue status
    let overallStatus = 'healthy';
    for (const result of results) {
      if (result.status === 'unhealthy' || result.status === 'error') {
        overallStatus = 'unhealthy';
        break;
      }
      if (result.status === 'warning') {
        overallStatus = 'warning';
      }
    }

    return {
      check: 'queues',
      status: overallStatus,
      queues: results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if workers are running by checking active jobs
   * @returns {Promise<Object>} Workers health result
   */
  async checkWorkers() {
    try {
      let totalActive = 0;
      let totalWaiting = 0;
      const workerStatuses = [];

      for (const queueName of this.queueNames) {
        try {
          const queue = new Queue(queueName, {
            connection: this.getRedisConnection()
          });

          const [active, waiting] = await Promise.all([
            queue.getActiveCount(),
            queue.getWaitingCount()
          ]);

          totalActive += active;
          totalWaiting += waiting;

          workerStatuses.push({
            queue: queueName,
            active,
            waiting,
            processing: active > 0
          });

          await queue.close();
        } catch (error) {
          workerStatuses.push({
            queue: queueName,
            error: error.message
          });
        }
      }

      // Workers are considered healthy if they're processing or there's nothing to process
      let status = 'healthy';
      if (totalWaiting > 100 && totalActive === 0) {
        status = 'warning'; // Jobs waiting but no workers processing
      }
      if (totalWaiting > 500 && totalActive === 0) {
        status = 'unhealthy'; // Too many jobs waiting, workers may be down
      }

      return {
        check: 'workers',
        status,
        metrics: {
          totalActive,
          totalWaiting,
          queuesMonitored: this.queueNames.length
        },
        details: workerStatuses,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        check: 'workers',
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Run all queue health checks
   * @returns {Promise<Array>} All check results
   */
  async runAllChecks() {
    const [queues, workers] = await Promise.all([
      this.checkAllQueues(),
      this.checkWorkers()
    ]);

    return [queues, workers];
  }

  /**
   * Clean up Redis connection
   */
  async cleanup() {
    if (this.redisConnection) {
      await this.redisConnection.quit();
      this.redisConnection = null;
    }
  }
}

export default new QueueHealthCheck();
