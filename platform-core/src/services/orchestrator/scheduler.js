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

  // === Fase 8A+ Monitoring Jobs ===

  // Content Quality Audit - weekly Monday at 05:00 (before daily briefing)
  await scheduledQueue.add('content-quality-audit', { type: 'content-quality' }, {
    repeat: { cron: '0 5 * * 1', tz: 'Europe/Amsterdam' },
    jobId: 'content-quality-audit-recurring'
  });
  console.log('[Orchestrator] Scheduled: content-quality-audit (Monday 05:00)');

  // Content Freshness Check - weekly Wednesday at 05:30 (Fase II Blok B)
  await scheduledQueue.add('content-freshness-check', { type: 'content-freshness' }, {
    repeat: { cron: '30 5 * * 3', tz: 'Europe/Amsterdam' },
    jobId: 'content-freshness-check-recurring'
  });
  console.log('[Orchestrator] Scheduled: content-freshness-check (Wednesday 05:30)');

  // Backup Recency Check - daily at 07:30 (before daily briefing)
  await scheduledQueue.add('backup-recency-check', { type: 'backup-health' }, {
    repeat: { cron: '30 7 * * *', tz: 'Europe/Amsterdam' },
    jobId: 'backup-recency-check-recurring'
  });
  console.log('[Orchestrator] Scheduled: backup-recency-check (daily 07:30)');

  // Smoke Test - daily at 07:45 (after backup check, before briefing)
  await scheduledQueue.add('smoke-test', { type: 'smoke-test' }, {
    repeat: { cron: '45 7 * * *', tz: 'Europe/Amsterdam' },
    jobId: 'smoke-test-recurring'
  });
  console.log('[Orchestrator] Scheduled: smoke-test (daily 07:45)');

  // ChromaDB State Snapshot - weekly Sunday at 03:00
  await scheduledQueue.add('chromadb-state-snapshot', { type: 'chromadb-snapshot' }, {
    repeat: { cron: '0 3 * * 0', tz: 'Europe/Amsterdam' },
    jobId: 'chromadb-state-snapshot-recurring'
  });
  console.log('[Orchestrator] Scheduled: chromadb-state-snapshot (Sunday 03:00)');

  // Agent Success Rate - weekly Monday at 05:30 (after content audit, before briefing)
  await scheduledQueue.add('agent-success-rate', { type: 'agent-metrics' }, {
    repeat: { cron: '30 5 * * 1', tz: 'Europe/Amsterdam' },
    jobId: 'agent-success-rate-recurring'
  });
  console.log('[Orchestrator] Scheduled: agent-success-rate (Monday 05:30)');

  // Verify all jobs are scheduled
  const jobs = await scheduledQueue.getRepeatableJobs();
  console.log('[Orchestrator] Total scheduled jobs:', jobs.length);
}
