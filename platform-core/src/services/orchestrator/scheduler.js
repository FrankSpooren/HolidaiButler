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

  // Verify all jobs are scheduled
  const jobs = await scheduledQueue.getRepeatableJobs();
  console.log('[Orchestrator] Total scheduled jobs:', jobs.length);
}
