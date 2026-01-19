/**
 * Sync Scheduler for Communication Flow Agent
 * Manages scheduled communication jobs
 */

import { scheduledQueue } from '../../orchestrator/queues.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';

const COMM_JOBS = {
  'comm-journey-processor': {
    cron: '*/15 * * * *',  // Every 15 minutes
    description: 'Process pending journey emails'
  },
  'comm-user-sync': {
    cron: '0 3 * * *',     // Daily at 03:00
    description: 'Sync users to MailerLite'
  },
  'comm-cleanup': {
    cron: '0 4 * * 0',     // Weekly Sunday 04:00
    description: 'Cleanup completed journeys'
  }
};

class CommSyncScheduler {
  async initializeScheduledJobs() {
    console.log('[CommSyncScheduler] Initializing communication jobs...');

    try {
      // Clean up existing comm jobs
      const repeatableJobs = await scheduledQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        if (job.name.startsWith('comm-')) {
          await scheduledQueue.removeRepeatableByKey(job.key);
        }
      }
    } catch (error) {
      console.log('[CommSyncScheduler] No existing jobs to clean');
    }

    // Schedule new jobs
    for (const [name, config] of Object.entries(COMM_JOBS)) {
      await scheduledQueue.add(
        name,
        { type: 'communication-flow', description: config.description },
        {
          repeat: { cron: config.cron, tz: 'Europe/Amsterdam' },
          jobId: `${name}-recurring`
        }
      );
      console.log(`[CommSyncScheduler] Scheduled: ${name} (${config.cron})`);
    }

    await logAgent('communication-flow', 'scheduler_initialized', {
      description: `Initialized ${Object.keys(COMM_JOBS).length} communication jobs`,
      metadata: { jobs: Object.keys(COMM_JOBS) }
    });

    return { jobsScheduled: Object.keys(COMM_JOBS).length, jobs: Object.keys(COMM_JOBS) };
  }

  getJobs() {
    return COMM_JOBS;
  }
}

export default new CommSyncScheduler();
