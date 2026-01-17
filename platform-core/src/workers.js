/**
 * BullMQ Workers
 * Handles scheduled jobs and background tasks for HolidaiButler
 *
 * @module workers
 */

import { Worker, Queue } from 'bullmq';
import Redis from 'ioredis';

// Import agents
import healthMonitor from './services/agents/healthMonitor/index.js';
import ownerInterfaceAgent from './services/agents/ownerInterfaceAgent/index.js';

// Redis connection for BullMQ
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
});

/**
 * Main job processor
 * Routes jobs to appropriate handlers based on job name
 * @param {Object} job - BullMQ job
 * @returns {Promise<Object>} Job result
 */
async function processJob(job) {
  console.log(`[Workers] Processing job: ${job.name} (ID: ${job.id})`);
  const startTime = Date.now();

  try {
    let result;

    switch (job.name) {
      // Health Check Jobs
      case 'health-check':
      case 'health-check-full':
        result = await healthMonitor.handleJob({
          ...job,
          data: { ...job.data, checkType: 'full' }
        });
        break;

      case 'health-check-quick':
        result = await healthMonitor.handleJob({
          ...job,
          data: { ...job.data, checkType: 'quick' }
        });
        break;

      // Daily Briefing
      case 'daily-briefing':
        result = await processDailyBriefing(job);
        break;

      // Data Sync Jobs
      case 'data-sync':
      case 'poi-sync':
        result = await processDataSync(job);
        break;

      // Email Jobs
      case 'send-email':
      case 'email-notification':
        result = await processEmailJob(job);
        break;

      default:
        console.warn(`[Workers] Unknown job type: ${job.name}`);
        result = { success: false, error: `Unknown job type: ${job.name}` };
    }

    const duration = Date.now() - startTime;
    console.log(`[Workers] Job ${job.name} completed in ${duration}ms`);

    return {
      ...result,
      jobId: job.id,
      jobName: job.name,
      duration,
      completedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`[Workers] Job ${job.name} failed:`, error.message);
    throw error;
  }
}

/**
 * Process daily briefing job
 * @param {Object} job - BullMQ job
 * @returns {Promise<Object>} Job result
 */
async function processDailyBriefing(job) {
  console.log('[Workers] Processing daily briefing...');

  // Run full health check
  const healthReport = await healthMonitor.runFullHealthCheck({ sendAlerts: false });

  // Send briefing via Owner Interface Agent
  await ownerInterfaceAgent.sendNotification({
    subject: 'Daily Platform Briefing',
    message: healthReport.summary,
    urgency: 2, // Low priority
    category: 'daily_briefing'
  });

  return {
    success: true,
    type: 'daily_briefing',
    healthStatus: healthReport.report.overallStatus
  };
}

/**
 * Process data sync job (placeholder)
 * @param {Object} job - BullMQ job
 * @returns {Promise<Object>} Job result
 */
async function processDataSync(job) {
  console.log('[Workers] Processing data sync...', job.data);

  // TODO: Implement data sync logic
  return {
    success: true,
    type: 'data_sync',
    message: 'Data sync not yet implemented'
  };
}

/**
 * Process email notification job
 * @param {Object} job - BullMQ job
 * @returns {Promise<Object>} Job result
 */
async function processEmailJob(job) {
  const { subject, message, urgency = 2 } = job.data;

  const result = await ownerInterfaceAgent.sendNotification({
    subject,
    message,
    urgency,
    category: 'email_job'
  });

  return {
    success: result.success,
    type: 'email',
    channels: result.channels
  };
}

/**
 * Initialize and start workers
 */
function startWorkers() {
  console.log('[Workers] Starting BullMQ workers...');

  // Main worker for health checks
  const healthCheckWorker = new Worker(
    'health-check',
    processJob,
    {
      connection: redisConnection,
      concurrency: 1
    }
  );

  // Worker for daily briefing
  const dailyBriefingWorker = new Worker(
    'daily-briefing',
    processJob,
    {
      connection: redisConnection,
      concurrency: 1
    }
  );

  // Worker for email notifications
  const emailWorker = new Worker(
    'email-notifications',
    processJob,
    {
      connection: redisConnection,
      concurrency: 5
    }
  );

  // Worker for data sync
  const dataSyncWorker = new Worker(
    'data-sync',
    processJob,
    {
      connection: redisConnection,
      concurrency: 2
    }
  );

  // Error handling for workers
  const workers = [healthCheckWorker, dailyBriefingWorker, emailWorker, dataSyncWorker];

  workers.forEach(worker => {
    worker.on('completed', (job, result) => {
      console.log(`[Workers] Job ${job.name} (${job.id}) completed`);
    });

    worker.on('failed', (job, error) => {
      console.error(`[Workers] Job ${job?.name} (${job?.id}) failed:`, error.message);
    });

    worker.on('error', (error) => {
      console.error('[Workers] Worker error:', error.message);
    });
  });

  console.log('[Workers] All workers started successfully');

  return workers;
}

/**
 * Schedule recurring jobs
 */
async function scheduleRecurringJobs() {
  console.log('[Workers] Scheduling recurring jobs...');

  // Health check queue
  const healthCheckQueue = new Queue('health-check', {
    connection: redisConnection
  });

  // Daily briefing queue
  const dailyBriefingQueue = new Queue('daily-briefing', {
    connection: redisConnection
  });

  // Schedule quick health check every 5 minutes
  await healthCheckQueue.upsertJobScheduler(
    'quick-health-check-scheduler',
    { pattern: '*/5 * * * *' }, // Every 5 minutes
    {
      name: 'health-check-quick',
      data: { checkType: 'quick' }
    }
  );

  // Schedule full health check every hour
  await healthCheckQueue.upsertJobScheduler(
    'full-health-check-scheduler',
    { pattern: '0 * * * *' }, // Every hour
    {
      name: 'health-check-full',
      data: { checkType: 'full' }
    }
  );

  // Schedule daily briefing at 8:00 AM
  await dailyBriefingQueue.upsertJobScheduler(
    'daily-briefing-scheduler',
    { pattern: '0 8 * * *' }, // Every day at 8:00
    {
      name: 'daily-briefing',
      data: {}
    }
  );

  console.log('[Workers] Recurring jobs scheduled');
}

// Export for use in main application
export { startWorkers, scheduleRecurringJobs, redisConnection };

// Start workers if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startWorkers();
  scheduleRecurringJobs().catch(console.error);
}
