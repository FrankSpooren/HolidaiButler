/**
 * Image Discovery Cron Scheduler
 *
 * Sets up automated cron jobs for POI image discovery
 */

import cron from 'node-cron';
import POIImageDiscoveryJob from './poiImageDiscovery.js';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/image-discovery-cron.log' })
  ]
});

class ImageDiscoveryCronScheduler {
  constructor() {
    this.job = new POIImageDiscoveryJob();
    this.tasks = [];
  }

  /**
   * Initialize all cron jobs
   */
  start() {
    logger.info('Starting Image Discovery Cron Scheduler');

    // Daily job: Tier 1 & 2 POIs at 2:00 AM
    const dailyTask = cron.schedule('0 2 * * *', async () => {
      logger.info('Triggered: Daily Image Discovery');
      try {
        await this.job.runDailyJob();
      } catch (error) {
        logger.error('Daily job failed', { error: error.message });
      }
    });

    this.tasks.push({ name: 'daily', task: dailyTask });

    // Weekly job: Tier 3 POIs every Monday at 3:00 AM
    const weeklyTask = cron.schedule('0 3 * * 1', async () => {
      logger.info('Triggered: Weekly Image Discovery');
      try {
        await this.job.runWeeklyJob();
      } catch (error) {
        logger.error('Weekly job failed', { error: error.message });
      }
    });

    this.tasks.push({ name: 'weekly', task: weeklyTask });

    // Monthly job: Tier 4 POIs on 1st of month at 4:00 AM
    const monthlyTask = cron.schedule('0 4 1 * *', async () => {
      logger.info('Triggered: Monthly Image Discovery');
      try {
        await this.job.runMonthlyJob();
      } catch (error) {
        logger.error('Monthly job failed', { error: error.message });
      }
    });

    this.tasks.push({ name: 'monthly', task: monthlyTask });

    // Queue processor: Every 5 minutes
    const queueTask = cron.schedule('*/5 * * * *', async () => {
      logger.debug('Triggered: Queue Processor');
      try {
        await this.job.processQueue({
          batchSize: 10,
          maxProcessingTime: 240000 // 4 minutes
        });
      } catch (error) {
        logger.error('Queue processor failed', { error: error.message });
      }
    });

    this.tasks.push({ name: 'queue_processor', task: queueTask });

    // Cleanup: Every Sunday at 5:00 AM
    const cleanupTask = cron.schedule('0 5 * * 0', async () => {
      logger.info('Triggered: Queue Cleanup');
      try {
        await this.job.cleanupQueue(30);
      } catch (error) {
        logger.error('Cleanup job failed', { error: error.message });
      }
    });

    this.tasks.push({ name: 'cleanup', task: cleanupTask });

    logger.info('Image Discovery Cron Scheduler started', {
      tasks: this.tasks.map(t => t.name)
    });
  }

  /**
   * Stop all cron jobs
   */
  stop() {
    logger.info('Stopping Image Discovery Cron Scheduler');

    this.tasks.forEach(({ name, task }) => {
      task.stop();
      logger.info(`Stopped cron task: ${name}`);
    });

    this.tasks = [];
  }

  /**
   * Get status of all cron jobs
   */
  getStatus() {
    return this.tasks.map(({ name, task }) => ({
      name,
      running: task.status !== 'destroyed'
    }));
  }
}

// Singleton instance
const scheduler = new ImageDiscoveryCronScheduler();

export default scheduler;

// Auto-start if NODE_ENV is production or if explicitly enabled
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_IMAGE_CRON === 'true') {
  scheduler.start();
  logger.info('Auto-started Image Discovery Cron Scheduler');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, stopping cron scheduler');
  scheduler.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, stopping cron scheduler');
  scheduler.stop();
  process.exit(0);
});
