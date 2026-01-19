import { scheduledQueue } from '../../orchestrator/queues.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';

/**
 * Development Layer Sync Scheduler
 * Schedules automated quality checks and security scans
 */

const DEV_LAYER_JOBS = {
  'dev-security-scan': {
    cron: '0 2 * * *',      // Daily at 02:00
    description: 'Full security scan of all projects'
  },
  'dev-dependency-audit': {
    cron: '0 3 * * 0',      // Weekly Sunday at 03:00
    description: 'Dependency vulnerability audit'
  },
  'dev-quality-report': {
    cron: '0 6 * * 1',      // Weekly Monday at 06:00
    description: 'Weekly quality report generation'
  }
};

class DevLayerScheduler {
  async initializeScheduledJobs() {
    console.log('[DevLayerScheduler] Initializing development layer jobs...');

    try {
      // Clean up existing dev-layer jobs
      const repeatableJobs = await scheduledQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        if (job.name.startsWith('dev-')) {
          await scheduledQueue.removeRepeatableByKey(job.key);
        }
      }
    } catch (error) {
      console.log('[DevLayerScheduler] No existing jobs to clean');
    }

    // Schedule new jobs
    for (const [name, config] of Object.entries(DEV_LAYER_JOBS)) {
      await scheduledQueue.add(
        name,
        { type: 'dev-layer', description: config.description },
        {
          repeat: { cron: config.cron, tz: 'Europe/Amsterdam' },
          jobId: `${name}-recurring`
        }
      );
      console.log(`[DevLayerScheduler] Scheduled: ${name} (${config.cron})`);
    }

    await logAgent('dev-layer', 'scheduler_initialized', {
      description: `Initialized ${Object.keys(DEV_LAYER_JOBS).length} development layer jobs`,
      metadata: { jobs: Object.keys(DEV_LAYER_JOBS) }
    });

    return { jobsScheduled: Object.keys(DEV_LAYER_JOBS).length, jobs: Object.keys(DEV_LAYER_JOBS) };
  }

  getJobs() {
    return DEV_LAYER_JOBS;
  }
}

export { DEV_LAYER_JOBS };
export default new DevLayerScheduler();
