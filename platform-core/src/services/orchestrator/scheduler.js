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

  // Content Recycle Suggestions - weekly Tuesday 07:00 (Opdracht 4 — HB Polish)
  await scheduledQueue.add('content-recycle-suggestions', { type: 'content-recycle' }, {
    repeat: { cron: '0 7 * * 2', tz: 'Europe/Amsterdam' },
    jobId: 'content-recycle-suggestions-recurring'
  });
  console.log('[Orchestrator] Scheduled: content-recycle-suggestions (Tuesday 07:00)');

// Media Consent Expiry Check - daily at 07:00 (ML-4.1)  await scheduledQueue.add("media-consent-expiry-check", { type: "consent-expiry" }, {    repeat: { pattern: "0 7 * * *", tz: "Europe/Amsterdam" },    jobId: "media-consent-expiry-check-recurring"  });  console.log("[Orchestrator] Scheduled: media-consent-expiry-check (Daily 07:00)");
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

  // === Fase III-B Ticketing Jobs ===

  // Release Expired Ticket Reservations - every minute
  await scheduledQueue.add('release-expired-ticket-reservations', { type: 'ticketing-cleanup' }, {
    repeat: { cron: '* * * * *', tz: 'Europe/Amsterdam' },
    jobId: 'release-expired-ticket-reservations-recurring'
  });
  console.log('[Orchestrator] Scheduled: release-expired-ticket-reservations (every minute)');

  // === Fase III-C Reservation Jobs ===

  // Release Expired Deposit Reservations - every 5 minutes
  await scheduledQueue.add('reservation-expired-cleanup', { type: 'reservation-cleanup' }, {
    repeat: { cron: '*/5 * * * *', tz: 'Europe/Amsterdam' },
    jobId: 'reservation-expired-cleanup-recurring'
  });
  console.log('[Orchestrator] Scheduled: reservation-expired-cleanup (every 5 min)');

  // Reservation Reminder 24h - every hour
  await scheduledQueue.add('reservation-reminder-24h', { type: 'reservation-reminder' }, {
    repeat: { cron: '0 * * * *', tz: 'Europe/Amsterdam' },
    jobId: 'reservation-reminder-24h-recurring'
  });
  console.log('[Orchestrator] Scheduled: reservation-reminder-24h (hourly)');

  // Reservation Reminder 1h - every 15 minutes
  await scheduledQueue.add('reservation-reminder-1h', { type: 'reservation-reminder' }, {
    repeat: { cron: '*/15 * * * *', tz: 'Europe/Amsterdam' },
    jobId: 'reservation-reminder-1h-recurring'
  });
  console.log('[Orchestrator] Scheduled: reservation-reminder-1h (every 15 min)');

  // Guest Data Retention Cleanup (GDPR) - Sunday 03:00
  await scheduledQueue.add('guest-data-retention-cleanup', { type: 'reservation-gdpr' }, {
    repeat: { cron: '0 3 * * 0', tz: 'Europe/Amsterdam' },
    jobId: 'guest-data-retention-cleanup-recurring'
  });
  console.log('[Orchestrator] Scheduled: guest-data-retention-cleanup (Sunday 03:00)');

  // === Fase IV-B Intermediary Jobs ===

  // Intermediary Reminder - hourly (send 24h before activity_date)
  await scheduledQueue.add('intermediary-reminder', { type: 'intermediary-reminder' }, {
    repeat: { cron: '0 * * * *', tz: 'Europe/Amsterdam' },
    jobId: 'intermediary-reminder-recurring'
  });
  console.log('[Orchestrator] Scheduled: intermediary-reminder (hourly)');

  // Intermediary Review Request - every 6 hours (send 24h after activity_date)
  await scheduledQueue.add('intermediary-review-request', { type: 'intermediary-review' }, {
    repeat: { cron: '0 */6 * * *', tz: 'Europe/Amsterdam' },
    jobId: 'intermediary-review-request-recurring'
  });
  console.log('[Orchestrator] Scheduled: intermediary-review-request (every 6 hours)');

  // Financial Auto-Settlement - 1st of month at 04:00 (auto-create batch for previous month)
  await scheduledQueue.add('financial-auto-settlement', { type: 'financial-auto-settlement' }, {
    repeat: { cron: '0 4 1 * *', tz: 'Europe/Amsterdam' },
    jobId: 'financial-auto-settlement-recurring'
  });
  console.log('[Orchestrator] Scheduled: financial-auto-settlement (1st of month 04:00)');

  // Financial Unsettled Alert - Monday 08:30 (warn about >30d unsettled transactions)
  await scheduledQueue.add('financial-unsettled-alert', { type: 'financial-unsettled-alert' }, {
    repeat: { cron: '30 8 * * 1', tz: 'Europe/Amsterdam' },
    jobId: 'financial-unsettled-alert-recurring'
  });
  console.log('[Orchestrator] Scheduled: financial-unsettled-alert (Monday 08:30)');

  // === Fase IV-D: Commerce Monitoring Agent Jobs ===

  // Intermediary Monitor (De Makelaar) - every 15 minutes
  await scheduledQueue.add('intermediary-monitor', { type: 'intermediary-monitor' }, {
    repeat: { cron: '*/15 * * * *', tz: 'Europe/Amsterdam' },
    jobId: 'intermediary-monitor-recurring'
  });
  console.log('[Orchestrator] Scheduled: intermediary-monitor (every 15 min)');

  // Financial Monitor (De Kassier) - daily at 06:30
  await scheduledQueue.add('financial-monitor', { type: 'financial-monitor' }, {
    repeat: { cron: '30 6 * * *', tz: 'Europe/Amsterdam' },
    jobId: 'financial-monitor-recurring'
  });
  console.log('[Orchestrator] Scheduled: financial-monitor (daily 06:30)');

  // Inventory Sync (De Magazijnier) - every 30 minutes
  await scheduledQueue.add('inventory-sync', { type: 'inventory-sync' }, {
    repeat: { cron: '*/30 * * * *', tz: 'Europe/Amsterdam' },
    jobId: 'inventory-sync-recurring'
  });
  console.log('[Orchestrator] Scheduled: inventory-sync (every 30 min)');

  // === Fase IV-F: GDPR Guest Anonymization ===

  // Intermediary Guest Anonymize - 1st of month at 03:30 (anonymize guest PII >24 months)
  await scheduledQueue.add('intermediary-guest-anonymize', { type: 'intermediary-guest-anonymize' }, {
    repeat: { cron: '30 3 1 * *', tz: 'Europe/Amsterdam' },
    jobId: 'intermediary-guest-anonymize-recurring'
  });
  console.log('[Orchestrator] Scheduled: intermediary-guest-anonymize (1st of month 03:30)');

  // === Content Module: Trendspotter Agent ===

  // Content Trending Scan (De Trendspotter) - weekly Sunday at 03:30
  await scheduledQueue.add('content-trending-scan', { type: 'content-trending' }, {
    repeat: { cron: '30 3 * * 0', tz: 'Europe/Amsterdam' },
    jobId: 'content-trending-scan-recurring'
  });
  console.log('[Orchestrator] Scheduled: content-trending-scan (Sunday 03:30)');

  // Website Traffic Analysis (De Trendspotter) - weekly Sunday at 03:45
  await scheduledQueue.add('content-website-traffic', { type: 'content-website-traffic' }, {
    repeat: { cron: '45 3 * * 0', tz: 'Europe/Amsterdam' },
    jobId: 'content-website-traffic-recurring'
  });
  console.log('[Orchestrator] Scheduled: content-website-traffic (Sunday 03:45)');

  // Content Feedback Loop (De Trendspotter) - weekly Sunday at 04:00 (after trending scan)
  await scheduledQueue.add('content-feedback-loop', { type: 'content-feedback' }, {
    repeat: { cron: '0 4 * * 0', tz: 'Europe/Amsterdam' },
    jobId: 'content-feedback-loop-recurring'
  });
  console.log('[Orchestrator] Scheduled: content-feedback-loop (Sunday 04:00)');

  // Score Calibration (De SEO Meester) - weekly Sunday at 05:00 (after feedback loop)
  await scheduledQueue.add('content-score-calibration', { type: 'content-score-calibration' }, {
    repeat: { cron: '0 5 * * 0', tz: 'Europe/Amsterdam' },
    jobId: 'content-score-calibration-recurring'
  });
  console.log('[Orchestrator] Scheduled: content-score-calibration (Sunday 05:00)');

  // Content SEO Audit (De SEO Meester) - weekly Monday at 04:00
  await scheduledQueue.add('content-seo-audit', { type: 'content-seo-audit' }, {
    repeat: { cron: '0 4 * * 1', tz: 'Europe/Amsterdam' },
    jobId: 'content-seo-audit-recurring'
  });
  console.log('[Orchestrator] Scheduled: content-seo-audit (Monday 04:00)');

  // === Content Module: Publisher Agent ===

  // Content Scheduled Publish (De Uitgever) - every 15 minutes: process scheduled posts
  await scheduledQueue.add('content-publish-scheduled', { type: 'content-publish-scheduled' }, {
    repeat: { cron: '*/15 * * * *', tz: 'Europe/Amsterdam' },
    jobId: 'content-publish-scheduled-recurring'
  });
  console.log('[Orchestrator] Scheduled: content-publish-scheduled (every 15 min)');

  // Content Analytics Collection (De Uitgever) - daily at 09:00
  await scheduledQueue.add('content-analytics-collect', { type: 'content-analytics-collect' }, {
    repeat: { cron: '0 9 * * *', tz: 'Europe/Amsterdam' },
    jobId: 'content-analytics-collect-recurring'
  });
  console.log('[Orchestrator] Scheduled: content-analytics-collect (daily 09:00)');

  // Seasonal Check - daily at 00:15
  await scheduledQueue.add('seasonal-check', { type: 'seasonal-check' }, {
    repeat: { cron: '15 0 * * *', tz: 'Europe/Amsterdam' },
    jobId: 'seasonal-check-recurring'
  });
  console.log('[Orchestrator] Scheduled: seasonal-check (daily 00:15)');

  // Content Publish Retry (De Uitgever) - every 15 minutes: retry failed publications (max 3 attempts)
  await scheduledQueue.add('content-publish-retry', { type: 'content-publish-retry' }, {
    repeat: { cron: '7,22,37,52 * * * *', tz: 'Europe/Amsterdam' },
    jobId: 'content-publish-retry-recurring'
  });
  console.log('[Orchestrator] Scheduled: content-publish-retry (every 15 min, offset)');

  // Content Weekly Report (De Bode) - Monday at 08:00 (sends performance summary via MailerLite)
  await scheduledQueue.add('content-weekly-report', { type: 'content-weekly-report' }, {
    repeat: { cron: '0 8 * * 1', tz: 'Europe/Amsterdam' },
    jobId: 'content-weekly-report-recurring'
  });
  console.log('[Orchestrator] Scheduled: content-weekly-report (Monday 08:00)');


  // HoliBot Insights Analysis - Sunday 06:00 (clusters chatbot questions per destination)
  await scheduledQueue.add('content-holibot-insights', { type: 'content-holibot-insights' }, {
    repeat: { cron: '0 6 * * 0', tz: 'Europe/Amsterdam' },
    jobId: 'content-holibot-insights-recurring'
  });
  console.log('[Orchestrator] Scheduled: content-holibot-insights (Sunday 06:00)');

  // GSC Query Sync - Monday 05:00 (syncs Google Search Console top queries)
  await scheduledQueue.add('gsc-query-sync', { type: 'gsc-query-sync' }, {
    repeat: { cron: '0 5 * * 1', tz: 'Europe/Amsterdam' },
    jobId: 'gsc-query-sync-recurring'
  });
  console.log('[Orchestrator] Scheduled: gsc-query-sync (Monday 05:00)');

  // === Visual Discovery & Analysis Pipeline (Opdracht 12) ===

  // Visual Discovery - daily 05:00 (YouTube + Instagram + Facebook + Pexels)
  await scheduledQueue.add('trending-visual-discovery', { type: 'trending-visual-discovery' }, {
    repeat: { cron: '0 5 * * *', tz: 'Europe/Amsterdam' },
    jobId: 'trending-visual-discovery-recurring'
  });
  console.log('[Orchestrator] Scheduled: trending-visual-discovery (daily 05:00)');

  // Visual Analysis - daily 06:00 (Mistral Vision AI on discovered visuals)
  await scheduledQueue.add('trending-visual-analysis', { type: 'trending-visual-analysis' }, {
    repeat: { cron: '0 6 * * *', tz: 'Europe/Amsterdam' },
    jobId: 'trending-visual-analysis-recurring'
  });
  console.log('[Orchestrator] Scheduled: trending-visual-analysis (daily 06:00)');

  // Visual Cleanup - weekly Sunday 03:00 (remove dismissed/old visuals)
  await scheduledQueue.add('trending-visual-cleanup', { type: 'trending-visual-cleanup' }, {
    repeat: { cron: '0 3 * * 0', tz: 'Europe/Amsterdam' },
    jobId: 'trending-visual-cleanup-recurring'
  });
  console.log('[Orchestrator] Scheduled: trending-visual-cleanup (Sunday 03:00)');

  // Reddit Discovery - Mon/Wed/Fri 05:00
  await scheduledQueue.add('reddit-trend-discovery', { type: 'reddit-trend-discovery' }, {
    repeat: { cron: '0 5 * * 1,3,5', tz: 'Europe/Amsterdam' },
    jobId: 'reddit-trend-discovery-recurring'
  });
  console.log('[Orchestrator] Scheduled: reddit-trend-discovery (Mon/Wed/Fri 05:00)');

  // Google Images Discovery - weekly Tuesday 05:00
  await scheduledQueue.add('google-images-discovery', { type: 'google-images-discovery' }, {
    repeat: { cron: '0 5 * * 2', tz: 'Europe/Amsterdam' },
    jobId: 'google-images-discovery-recurring'
  });
  console.log('[Orchestrator] Scheduled: google-images-discovery (Tuesday 05:00)');


  // Content Top 25 Refresh — daily 07:00 (regenerates cached overview)
  await scheduledQueue.add('content-top25-refresh', { type: 'content-top25-refresh' }, {
    repeat: { cron: '0 7 * * *', tz: 'Europe/Amsterdam' },
    jobId: 'content-top25-refresh-recurring'
  });
  console.log('[Orchestrator] Scheduled: content-top25-refresh (daily 07:00)');

  // Content Sources Health Check — monthly 1st 06:00
  await scheduledQueue.add('content-sources-health-check', { type: 'content-sources-health-check' }, {
    repeat: { cron: '0 6 1 * *', tz: 'Europe/Amsterdam' },
    jobId: 'content-sources-health-check-recurring'
  });
  console.log('[Orchestrator] Scheduled: content-sources-health-check (monthly 1st 06:00)');

  // Verify all jobs are scheduled
  const jobs = await scheduledQueue.getRepeatableJobs();
  console.log('[Orchestrator] Total scheduled jobs:', jobs.length);
}
