import { scheduledQueue } from '../../orchestrator/queues.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';

/**
 * Strategy Layer Sync Scheduler
 * Schedules automated strategy analysis and optimization jobs
 */

const STRATEGY_JOBS = {
  'strategy-assessment': {
    cron: '0 6 * * 1',      // Weekly Monday at 06:00
    description: 'Generate weekly architecture assessment'
  },
  'strategy-learning': {
    cron: '0 3 * * *',      // Daily at 03:00
    description: 'Run learning cycle and generate optimizations'
  },
  'strategy-prediction': {
    cron: '0 */6 * * *',    // Every 6 hours
    description: 'Run predictive analysis for proactive alerts'
  },
  'strategy-config-eval': {
    cron: '*/30 * * * *',   // Every 30 minutes
    description: 'Evaluate system metrics and adapt configuration'
  }
};

class StrategyScheduler {
  async initializeScheduledJobs() {
    console.log('[StrategyScheduler] Initializing strategy layer jobs...');

    try {
      // Clean up existing strategy jobs
      const repeatableJobs = await scheduledQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        if (job.name.startsWith('strategy-')) {
          await scheduledQueue.removeRepeatableByKey(job.key);
        }
      }
    } catch (error) {
      console.log('[StrategyScheduler] No existing jobs to clean');
    }

    // Schedule new jobs
    for (const [name, config] of Object.entries(STRATEGY_JOBS)) {
      await scheduledQueue.add(
        name,
        { type: 'strategy-layer', description: config.description },
        {
          repeat: { cron: config.cron, tz: 'Europe/Amsterdam' },
          jobId: `${name}-recurring`
        }
      );
      console.log(`[StrategyScheduler] Scheduled: ${name} (${config.cron})`);
    }

    await logAgent('strategy-layer', 'scheduler_initialized', {
      description: `Initialized ${Object.keys(STRATEGY_JOBS).length} strategy layer jobs`,
      metadata: { jobs: Object.keys(STRATEGY_JOBS) }
    });

    return { jobsScheduled: Object.keys(STRATEGY_JOBS).length, jobs: Object.keys(STRATEGY_JOBS) };
  }

  getJobs() {
    return STRATEGY_JOBS;
  }
}

export { STRATEGY_JOBS };
export default new StrategyScheduler();
