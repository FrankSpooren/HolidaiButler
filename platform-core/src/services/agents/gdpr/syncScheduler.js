/**
 * GDPR Sync Scheduler
 * Schedules and manages GDPR compliance jobs
 *
 * Jobs:
 * - gdpr-overdue-check: Every 4 hours - Check for overdue deletion requests
 * - gdpr-export-cleanup: Daily at 03:00 - Cleanup old exports
 * - gdpr-retention-check: Monthly on 1st at 02:00 - Check data retention
 * - gdpr-consent-audit: Weekly Sunday at 04:00 - Generate consent audit
 */

import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';

// GDPR Job Definitions
const GDPR_JOBS = {
  'gdpr-overdue-check': {
    name: 'GDPR Overdue Check',
    description: 'Check for overdue deletion requests (72h deadline)',
    cron: '0 */4 * * *', // Every 4 hours
    handler: 'checkOverdueRequests'
  },
  'gdpr-export-cleanup': {
    name: 'GDPR Export Cleanup',
    description: 'Cleanup old export files (7+ days)',
    cron: '0 3 * * *', // Daily at 03:00
    handler: 'cleanupOldExports'
  },
  'gdpr-retention-check': {
    name: 'GDPR Retention Check',
    description: 'Check data retention compliance',
    cron: '0 2 1 * *', // Monthly on 1st at 02:00
    handler: 'checkDataRetention'
  },
  'gdpr-consent-audit': {
    name: 'GDPR Consent Audit',
    description: 'Generate consent statistics report',
    cron: '0 4 * * 0', // Weekly Sunday at 04:00
    handler: 'generateConsentAudit'
  }
};

class SyncScheduler {
  constructor() {
    this.scheduler = null;
  }

  setScheduler(scheduler) {
    this.scheduler = scheduler;
  }

  /**
   * Get all GDPR job definitions for registration
   */
  getJobDefinitions() {
    return GDPR_JOBS;
  }

  /**
   * Register all GDPR jobs with the orchestrator scheduler
   */
  async registerJobs() {
    if (!this.scheduler) {
      console.log('[GDPR SyncScheduler] Scheduler not set, skipping job registration');
      return;
    }

    console.log('[GDPR SyncScheduler] Registering GDPR compliance jobs...');

    for (const [jobId, jobConfig] of Object.entries(GDPR_JOBS)) {
      try {
        await this.scheduler.upsertJobSchedules([{
          name: jobId,
          data: { handler: jobConfig.handler },
          opts: {
            repeat: { cron: jobConfig.cron },
            removeOnComplete: true,
            removeOnFail: false
          }
        }]);

        console.log(`[GDPR SyncScheduler] Registered job: ${jobId} (${jobConfig.cron})`);
      } catch (error) {
        console.error(`[GDPR SyncScheduler] Failed to register job ${jobId}:`, error.message);
      }
    }

    await logAgent('gdpr', 'jobs_registered', {
      description: `Registered ${Object.keys(GDPR_JOBS).length} GDPR compliance jobs`,
      metadata: { jobs: Object.keys(GDPR_JOBS) }
    });
  }

  /**
   * Get job status
   */
  getJobStatus(jobId) {
    return GDPR_JOBS[jobId] || null;
  }

  /**
   * Get all job IDs
   */
  getJobIds() {
    return Object.keys(GDPR_JOBS);
  }
}

export { GDPR_JOBS };
export default new SyncScheduler();
