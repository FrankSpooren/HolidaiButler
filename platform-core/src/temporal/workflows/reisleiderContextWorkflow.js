/**
 * Temporal Workflow: Reisleider Context Aggregation
 *
 * On-demand triggered (per destination) by other workflows (e.g., content-redacteur
 * needing journey-context, or daily briefing aggregator). Returns journey-stats +
 * chatbot-stats + pageview-funnel + SA-traffic-summary for a single destination.
 *
 * @module temporal/workflows/reisleiderContextWorkflow
 * @version 1.0.0 — Trendspotter+Reisleider activation cycle (2026-06-10)
 */

import { proxyActivities } from '@temporalio/workflow';

const {
  runReisleiderForDestination,
  sendAlert,
} = proxyActivities({
  startToCloseTimeout: '5 minutes',
  retry: {
    maximumAttempts: 2,
    initialInterval: '15s',
    backoffCoefficient: 2.0,
  },
});

export async function reisleiderContextWorkflow(input) {
  const { destinationId, triggeredBy = 'temporal-on-demand' } = input;
  if (!destinationId) throw new Error('reisleiderContextWorkflow: destinationId required');

  try {
    const result = await runReisleiderForDestination(destinationId);
    return { ...result, triggeredBy };
  } catch (err) {
    try { await sendAlert('warning', `Reisleider context aggregation failed for destination ${destinationId}`, { destinationId, error: err.message, triggeredBy }); } catch { /* non-blocking */ }
    throw err;
  }
}
