/**
 * Sync Scheduler for HoliBot Sync Agent
 * Manages scheduled ChromaDB synchronization jobs
 */

import { scheduledQueue } from '../../orchestrator/queues.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';

const SYNC_JOBS = {
  'holibot-poi-sync': {
    cron: '30 6 * * *',  // Daily at 06:30 (after Data Sync at 06:00)
    description: 'Daily POI sync to ChromaDB'
  },
  'holibot-qa-sync': {
    cron: '0 7 * * *',   // Daily at 07:00
    description: 'Daily Q&A sync to ChromaDB'
  },
  'holibot-full-reindex': {
    cron: '0 4 * * 0',   // Weekly Sunday 04:00
    description: 'Full ChromaDB reindex'
  },
  'holibot-cleanup': {
    cron: '0 5 * * *',   // Daily at 05:00
    description: 'Remove deactivated/rejected items from ChromaDB'
  }
};

class SyncScheduler {

  async initializeScheduledJobs() {
    console.log('[HolibotSyncScheduler] Initializing sync jobs...');

    try {
      // Clean up existing holibot jobs
      const repeatableJobs = await scheduledQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        if (job.name.startsWith('holibot-')) {
          await scheduledQueue.removeRepeatableByKey(job.key);
        }
      }
    } catch (error) {
      console.log('[HolibotSyncScheduler] No existing jobs to clean');
    }

    // Schedule new jobs
    for (const [name, config] of Object.entries(SYNC_JOBS)) {
      await scheduledQueue.add(
        name,
        { type: 'holibot-sync', description: config.description },
        {
          repeat: { cron: config.cron, tz: 'Europe/Amsterdam' },
          jobId: `${name}-recurring`
        }
      );
      console.log(`[HolibotSyncScheduler] Scheduled: ${name} (${config.cron})`);
    }

    await logAgent('holibot-sync', 'scheduler_initialized', {
      description: `Initialized ${Object.keys(SYNC_JOBS).length} HoliBot sync jobs`,
      metadata: { jobs: Object.keys(SYNC_JOBS) }
    });

    return { jobsScheduled: Object.keys(SYNC_JOBS).length, jobs: Object.keys(SYNC_JOBS) };
  }

  async triggerManualSync(type = 'full') {
    console.log(`[HolibotSyncScheduler] Triggering manual ${type} sync`);

    await scheduledQueue.add(
      `holibot-manual-${type}`,
      { type: 'holibot-sync', syncType: type, manual: true },
      { priority: 1 }
    );

    return { triggered: true, type };
  }

  getJobs() {
    return SYNC_JOBS;
  }
}

export default new SyncScheduler();
