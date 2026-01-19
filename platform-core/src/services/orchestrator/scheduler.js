import { scheduledQueue } from './queues.js';

export async function initializeScheduler() {
  console.log('[Orchestrator] Setting up scheduled jobs...');
  
  // Cleanup existing repeatable jobs first
  const existingJobs = await scheduledQueue.getRepeatableJobs();
  for (const job of existingJobs) {
    await scheduledQueue.removeRepeatableByKey(job.key);
  }
  console.log('[Orchestrator] Cleaned up existing repeatable jobs');

  // Daily Briefing - 08:00 Amsterdam time
  await scheduledQueue.add('daily-briefing', { type: 'owner-briefing' }, {
    repeat: { cron: '0 8 * * *', tz: 'Europe/Amsterdam' },
    jobId: 'daily-briefing-recurring'
  });
  console.log('[Orchestrator] Scheduled: daily-briefing (08:00 Amsterdam)');

  // Cost Check - every 6 hours
  await scheduledQueue.add('cost-check', { type: 'budget-monitor' }, {
    repeat: { cron: '0 */6 * * *', tz: 'Europe/Amsterdam' },
    jobId: 'cost-check-recurring'
  });
  console.log('[Orchestrator] Scheduled: cost-check (every 6 hours)');

  // Health Check - hourly
  await scheduledQueue.add('health-check', { type: 'system-health' }, {
    repeat: { cron: '0 * * * *', tz: 'Europe/Amsterdam' },
    jobId: 'health-check-recurring'
  });
  console.log('[Orchestrator] Scheduled: health-check (hourly)');

  // Weekly Cost Report - Monday 09:00
  await scheduledQueue.add('weekly-cost-report', { type: 'cost-report' }, {
    repeat: { cron: '0 9 * * 1', tz: 'Europe/Amsterdam' },
    jobId: 'weekly-cost-report-recurring'
  });
  console.log('[Orchestrator] Scheduled: weekly-cost-report (Monday 09:00)');

  // === GDPR Agent Jobs ===

  // GDPR Overdue Check - every 4 hours (check for 72h deadline violations)
  await scheduledQueue.add('gdpr-overdue-check', { type: 'gdpr-compliance' }, {
    repeat: { cron: '0 */4 * * *', tz: 'Europe/Amsterdam' },
    jobId: 'gdpr-overdue-check-recurring'
  });
  console.log('[Orchestrator] Scheduled: gdpr-overdue-check (every 4 hours)');

  // GDPR Export Cleanup - daily at 03:00 (cleanup old export files)
  await scheduledQueue.add('gdpr-export-cleanup', { type: 'gdpr-compliance' }, {
    repeat: { cron: '0 3 * * *', tz: 'Europe/Amsterdam' },
    jobId: 'gdpr-export-cleanup-recurring'
  });
  console.log('[Orchestrator] Scheduled: gdpr-export-cleanup (daily 03:00)');

  // GDPR Retention Check - monthly on 1st at 02:00
  await scheduledQueue.add('gdpr-retention-check', { type: 'gdpr-compliance' }, {
    repeat: { cron: '0 2 1 * *', tz: 'Europe/Amsterdam' },
    jobId: 'gdpr-retention-check-recurring'
  });
  console.log('[Orchestrator] Scheduled: gdpr-retention-check (monthly 1st 02:00)');

  // GDPR Consent Audit - weekly Sunday at 04:00
  await scheduledQueue.add('gdpr-consent-audit', { type: 'gdpr-compliance' }, {
    repeat: { cron: '0 4 * * 0', tz: 'Europe/Amsterdam' },
    jobId: 'gdpr-consent-audit-recurring'
  });
  console.log('[Orchestrator] Scheduled: gdpr-consent-audit (Sunday 04:00)');

  // === Development Layer Agent Jobs ===

  // Security Scan - daily at 02:00
  await scheduledQueue.add('dev-security-scan', { type: 'dev-layer' }, {
    repeat: { cron: '0 2 * * *', tz: 'Europe/Amsterdam' },
    jobId: 'dev-security-scan-recurring'
  });
  console.log('[Orchestrator] Scheduled: dev-security-scan (daily 02:00)');

  // Dependency Audit - weekly Sunday at 03:00
  await scheduledQueue.add('dev-dependency-audit', { type: 'dev-layer' }, {
    repeat: { cron: '0 3 * * 0', tz: 'Europe/Amsterdam' },
    jobId: 'dev-dependency-audit-recurring'
  });
  console.log('[Orchestrator] Scheduled: dev-dependency-audit (Sunday 03:00)');

  // Quality Report - weekly Monday at 06:00
  await scheduledQueue.add('dev-quality-report', { type: 'dev-layer' }, {
    repeat: { cron: '0 6 * * 1', tz: 'Europe/Amsterdam' },
    jobId: 'dev-quality-report-recurring'
  });
  console.log('[Orchestrator] Scheduled: dev-quality-report (Monday 06:00)');

  // Verify all jobs are scheduled
  const jobs = await scheduledQueue.getRepeatableJobs();
  console.log('[Orchestrator] Total scheduled jobs:', jobs.length);
}
