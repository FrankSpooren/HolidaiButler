const Bull = require('bull');
const logger = require('../utils/logger');

/**
 * Payment Queue Service
 * Handles asynchronous payment processing with Bull
 * Provides reliable job processing with retries, delays, and monitoring
 */

class PaymentQueue {
  constructor() {
    this.queues = {};
    this.isInitialized = false;

    // Queue configuration
    this.redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB) || 2,
    };

    // Queue names
    this.QUEUES = {
      PAYMENT_PROCESSING: 'payment-processing',
      REFUND_PROCESSING: 'refund-processing',
      WEBHOOK_PROCESSING: 'webhook-processing',
      NOTIFICATIONS: 'payment-notifications',
      RECONCILIATION: 'payment-reconciliation',
    };

    // Default job options
    this.defaultJobOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 500, // Keep last 500 failed jobs
    };
  }

  /**
   * Initialize all queues
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create queues
      for (const [name, queueName] of Object.entries(this.QUEUES)) {
        this.queues[name] = new Bull(queueName, {
          redis: this.redisConfig,
          defaultJobOptions: this.defaultJobOptions,
          settings: {
            stalledInterval: 30000, // Check for stalled jobs every 30s
            maxStalledCount: 3, // Retry stalled jobs 3 times
            lockDuration: 30000, // Lock jobs for 30s
          },
        });

        // Add event handlers
        this._setupQueueEvents(this.queues[name], queueName);
      }

      // Setup job processors
      await this._setupProcessors();

      this.isInitialized = true;
      logger.info('Payment queues initialized');
    } catch (error) {
      logger.error('Failed to initialize payment queues:', error);
      throw error;
    }
  }

  /**
   * Setup event handlers for a queue
   * @private
   */
  _setupQueueEvents(queue, name) {
    queue.on('error', (error) => {
      logger.error(`Queue ${name} error:`, error);
    });

    queue.on('active', (job) => {
      logger.debug(`Job ${job.id} started in ${name}`);
    });

    queue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed in ${name}`, {
        jobId: job.id,
        result: typeof result === 'object' ? 'object' : result,
      });
    });

    queue.on('failed', (job, error) => {
      logger.error(`Job ${job.id} failed in ${name}:`, {
        jobId: job.id,
        error: error.message,
        attemptsMade: job.attemptsMade,
      });
    });

    queue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} stalled in ${name}`);
    });
  }

  /**
   * Setup job processors
   * @private
   */
  async _setupProcessors() {
    const concurrency = parseInt(process.env.QUEUE_CONCURRENCY) || 5;

    // Payment processing queue
    this.queues.PAYMENT_PROCESSING.process(concurrency, async (job) => {
      return this._processPaymentJob(job);
    });

    // Refund processing queue
    this.queues.REFUND_PROCESSING.process(concurrency, async (job) => {
      return this._processRefundJob(job);
    });

    // Webhook processing queue
    this.queues.WEBHOOK_PROCESSING.process(concurrency * 2, async (job) => {
      return this._processWebhookJob(job);
    });

    // Notification queue
    this.queues.NOTIFICATIONS.process(concurrency, async (job) => {
      return this._processNotificationJob(job);
    });

    // Reconciliation queue (lower concurrency)
    this.queues.RECONCILIATION.process(2, async (job) => {
      return this._processReconciliationJob(job);
    });
  }

  // ========== JOB PROCESSORS ==========

  async _processPaymentJob(job) {
    const { type, data } = job.data;
    logger.info(`Processing payment job: ${type}`, { jobId: job.id });

    switch (type) {
      case 'capture':
        return this._handleCaptureJob(data);
      case 'cancel':
        return this._handleCancelJob(data);
      case 'status_check':
        return this._handleStatusCheckJob(data);
      default:
        throw new Error(`Unknown payment job type: ${type}`);
    }
  }

  async _processRefundJob(job) {
    const { data } = job.data;
    logger.info('Processing refund job', { jobId: job.id, refundId: data.refundId });

    try {
      const PaymentService = require('../services/PaymentService');
      // Process refund through payment service
      // This is a placeholder - actual implementation depends on business logic
      return { success: true, refundId: data.refundId };
    } catch (error) {
      logger.error('Refund job failed:', error);
      throw error;
    }
  }

  async _processWebhookJob(job) {
    const { notification } = job.data;
    logger.info('Processing webhook job', {
      jobId: job.id,
      eventCode: notification.eventCode,
    });

    try {
      const PaymentService = require('../services/PaymentService');
      await PaymentService.processWebhook(notification);
      return { success: true, eventCode: notification.eventCode };
    } catch (error) {
      logger.error('Webhook job failed:', error);
      throw error;
    }
  }

  async _processNotificationJob(job) {
    const { type, recipient, data } = job.data;
    logger.info('Processing notification job', { jobId: job.id, type, recipient });

    // Placeholder for notification sending logic
    // Would integrate with email service, push notifications, etc.
    return { success: true, type, recipient };
  }

  async _processReconciliationJob(job) {
    const { date, options } = job.data;
    logger.info('Processing reconciliation job', { jobId: job.id, date });

    // Placeholder for reconciliation logic
    // Would compare Adyen records with database
    return { success: true, date };
  }

  async _handleCaptureJob(data) {
    const PaymentService = require('../services/PaymentService');
    return PaymentService.capturePayment(data.transactionId, data.amount);
  }

  async _handleCancelJob(data) {
    const PaymentService = require('../services/PaymentService');
    return PaymentService.cancelPayment(data.transactionId);
  }

  async _handleStatusCheckJob(data) {
    const PaymentService = require('../services/PaymentService');
    return PaymentService.getPaymentStatus(data.transactionId);
  }

  // ========== JOB SCHEDULING ==========

  /**
   * Add payment processing job
   * @param {string} type - Job type (capture, cancel, status_check)
   * @param {Object} data - Job data
   * @param {Object} options - Bull job options
   * @returns {Promise<Object>} - Bull job
   */
  async addPaymentJob(type, data, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const job = await this.queues.PAYMENT_PROCESSING.add(
      { type, data },
      {
        ...this.defaultJobOptions,
        ...options,
      }
    );

    logger.info(`Payment job queued: ${type}`, { jobId: job.id });
    return job;
  }

  /**
   * Add refund processing job
   * @param {Object} data - Refund data
   * @param {Object} options - Bull job options
   * @returns {Promise<Object>} - Bull job
   */
  async addRefundJob(data, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const job = await this.queues.REFUND_PROCESSING.add(
      { data },
      {
        ...this.defaultJobOptions,
        ...options,
      }
    );

    logger.info('Refund job queued', { jobId: job.id, refundId: data.refundId });
    return job;
  }

  /**
   * Add webhook processing job
   * @param {Object} notification - Adyen notification
   * @param {Object} options - Bull job options
   * @returns {Promise<Object>} - Bull job
   */
  async addWebhookJob(notification, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const job = await this.queues.WEBHOOK_PROCESSING.add(
      { notification },
      {
        ...this.defaultJobOptions,
        priority: 1, // High priority for webhooks
        ...options,
      }
    );

    logger.info('Webhook job queued', {
      jobId: job.id,
      eventCode: notification.eventCode,
    });
    return job;
  }

  /**
   * Add notification job
   * @param {string} type - Notification type
   * @param {string} recipient - Recipient (email, user ID, etc.)
   * @param {Object} data - Notification data
   * @param {Object} options - Bull job options
   * @returns {Promise<Object>} - Bull job
   */
  async addNotificationJob(type, recipient, data, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const job = await this.queues.NOTIFICATIONS.add(
      { type, recipient, data },
      {
        ...this.defaultJobOptions,
        ...options,
      }
    );

    logger.info('Notification job queued', { jobId: job.id, type, recipient });
    return job;
  }

  /**
   * Schedule daily reconciliation
   * @param {string} cron - Cron expression (default: midnight)
   */
  async scheduleReconciliation(cron = '0 0 * * *') {
    if (!this.isInitialized) {
      await this.initialize();
    }

    await this.queues.RECONCILIATION.add(
      { date: new Date().toISOString().split('T')[0] },
      {
        repeat: { cron },
        removeOnComplete: 50,
      }
    );

    logger.info('Reconciliation scheduled', { cron });
  }

  // ========== QUEUE MANAGEMENT ==========

  /**
   * Get queue status
   * @param {string} queueName - Queue name
   * @returns {Promise<Object>} - Queue status
   */
  async getQueueStatus(queueName) {
    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      name: queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      isPaused: await queue.isPaused(),
    };
  }

  /**
   * Get all queue statuses
   * @returns {Promise<Object>} - All queue statuses
   */
  async getAllQueueStatuses() {
    const statuses = {};

    for (const name of Object.keys(this.queues)) {
      statuses[name] = await this.getQueueStatus(name);
    }

    return statuses;
  }

  /**
   * Pause a queue
   * @param {string} queueName - Queue name
   */
  async pauseQueue(queueName) {
    const queue = this.queues[queueName];
    if (queue) {
      await queue.pause();
      logger.info(`Queue paused: ${queueName}`);
    }
  }

  /**
   * Resume a queue
   * @param {string} queueName - Queue name
   */
  async resumeQueue(queueName) {
    const queue = this.queues[queueName];
    if (queue) {
      await queue.resume();
      logger.info(`Queue resumed: ${queueName}`);
    }
  }

  /**
   * Clean old jobs from queues
   * @param {number} gracePeriod - Grace period in ms (default: 24 hours)
   */
  async cleanQueues(gracePeriod = 86400000) {
    for (const [name, queue] of Object.entries(this.queues)) {
      try {
        await queue.clean(gracePeriod, 'completed');
        await queue.clean(gracePeriod * 7, 'failed'); // Keep failed jobs longer
        logger.info(`Queue cleaned: ${name}`);
      } catch (error) {
        logger.error(`Failed to clean queue ${name}:`, error);
      }
    }
  }

  /**
   * Close all queues
   */
  async close() {
    for (const [name, queue] of Object.entries(this.queues)) {
      try {
        await queue.close();
        logger.info(`Queue closed: ${name}`);
      } catch (error) {
        logger.error(`Failed to close queue ${name}:`, error);
      }
    }

    this.queues = {};
    this.isInitialized = false;
    logger.info('All payment queues closed');
  }
}

// Export singleton instance
module.exports = new PaymentQueue();
