/**
 * Temporal Workflow: Trendspotter Weekly Cycle
 *
 * Triggered weekly (Sunday 03:45 UTC) via Temporal Schedule `trendspotterWeeklySchedule`.
 * Iterates over active SA-mapped destinations and runs the Trendspotter agent
 * per-destination with isolated retry semantics.
 *
 * Multi-tenant: per-destination isolation — one destination failure does not
 * block other destinations. Aggregated summary returned to scheduler.
 *
 * @module temporal/workflows/trendspotterWeeklyWorkflow
 * @version 1.0.0 — Trendspotter+Reisleider activation cycle (2026-06-10)
 */

import { proxyActivities, sleep } from '@temporalio/workflow';

const {
  runTrendspotterForDestination,
  getActiveDestinationIdsForSA,
  sendAlert,
  pushDashboardEvent,
} = proxyActivities({
  startToCloseTimeout: '10 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '30s',
    backoffCoefficient: 2.0,
  },
});

export async function trendspotterWeeklyWorkflow(input = {}) {
  const startedAt = new Date().toISOString();
  const triggeredBy = input.triggeredBy || 'temporal-schedule';

  try { await pushDashboardEvent('trendspotter', 'weekly-cycle-started', 'info', { startedAt, triggeredBy }); } catch { /* non-blocking */ }

  const destinations = await getActiveDestinationIdsForSA();
  const results = [];

  for (const destId of destinations) {
    try {
      const result = await runTrendspotterForDestination(destId);
      results.push(result);
      // Brief inter-destination delay to spread SA API load + avoid rate-limit
      await sleep('5 seconds');
    } catch (err) {
      // Per-destination isolation: log + continue to next destination
      results.push({ destinationId: destId, success: false, fatal: true, error: err.message });
      try { await sendAlert('warning', `Trendspotter weekly cycle: destination ${destId} failed`, { destId, error: err.message }); } catch { /* non-blocking */ }
    }
  }

  const summary = {
    startedAt,
    completedAt: new Date().toISOString(),
    triggeredBy,
    total_destinations: destinations.length,
    succeeded: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    total_keywords_collected: results.reduce((acc, r) => acc + (r.sources?.simpleanalytics || 0) + (r.sources?.google_trends || 0), 0),
    results,
  };

  try { await pushDashboardEvent('trendspotter', 'weekly-cycle-completed', summary.failed > 0 ? 'warning' : 'info', summary); } catch { /* non-blocking */ }

  return summary;
}
