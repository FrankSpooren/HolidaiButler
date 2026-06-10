/**
 * Temporal Activities — Agent Invocation Layer
 *
 * Wraps platform-core agents in Temporal activity-functions so workflows can
 * orchestrate them with retry/timeout/observability semantics.
 *
 * @module temporal/activities/agentActivities
 * @version 1.0.0 — Trendspotter+Reisleider activation cycle (2026-06-10)
 */

import logger from '../../utils/logger.js';

/**
 * Run Trendspotter agent for a single destination.
 * Wraps trendspotterAgent.runForDestination() — collects SimpleAnalytics own-site
 * trends + Google Trends data, aggregates, stores in trending_data with provenance.
 *
 * @param {number} destinationId
 * @returns {Promise<{destinationId, success, sources, aggregated, errors, durationMs}>}
 */
export async function runTrendspotterForDestination(destinationId) {
  const startTime = Date.now();
  try {
    // Lazy import to keep Temporal worker-bundle small + avoid circular dep
    const trendspotterAgent = (await import('../../services/agents/trendspotter/index.js')).default;
    const result = await trendspotterAgent.runForDestination(destinationId);
    const durationMs = Date.now() - startTime;
    logger.info(`[temporal-activity] trendspotter dest=${destinationId} dur=${durationMs}ms sa=${result.sources?.simpleanalytics} gt=${result.sources?.google_trends} errors=${result.errors?.length}`);
    return {
      destinationId,
      success: result.errors?.length === 0,
      sources: result.sources,
      aggregated: result.aggregated,
      errors: result.errors,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error(`[temporal-activity] trendspotter dest=${destinationId} FATAL: ${error.message}`);
    // Throw so Temporal retry-policy applies (workflow handles ApplicationFailure)
    throw new Error(`trendspotter-${destinationId}-fatal: ${error.message}`);
  }
}

/**
 * Run Reisleider context-aggregation for a single destination.
 *
 * @param {number} destinationId
 * @returns {Promise<{destinationId, success, durationMs, journeyStats, saData}>}
 */
export async function runReisleiderForDestination(destinationId) {
  const startTime = Date.now();
  try {
    const reisleider = (await import('../../services/agents/reisleider/index.js')).default;
    const result = await reisleider.runForDestination(destinationId);
    const durationMs = Date.now() - startTime;
    logger.info(`[temporal-activity] reisleider dest=${destinationId} dur=${durationMs}ms`);
    return {
      destinationId,
      success: true,
      durationMs,
      ...result,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error(`[temporal-activity] reisleider dest=${destinationId} FATAL: ${error.message}`);
    throw new Error(`reisleider-${destinationId}-fatal: ${error.message}`);
  }
}

/**
 * Get list of active destination IDs (used by workflow to iterate over tenants).
 * Multi-tenant: respects DEST_DOMAINS mapping in websiteTrafficCollector — only
 * destinations with mapped domain participate in SA-data collection cycle.
 *
 * @returns {Promise<number[]>}
 */
export async function getActiveDestinationIdsForSA() {
  // Hard-coded to match DEST_DOMAINS in websiteTrafficCollector + reisleider.
  // Future: read from a config table when WarreWijzer/Alicante/BUTE get domains.
  return [1, 2]; // Calpe (calpetrip.com), Texel (texelmaps.nl)
}
