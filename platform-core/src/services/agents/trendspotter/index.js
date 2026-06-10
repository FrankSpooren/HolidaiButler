/**
 * Trendspotter Agent (A.17) — De Trendspotter
 * Collects and analyzes trending keywords per destination.
 * Sources: SimpleAnalytics (own-site traffic), Google Trends (via Apify), manual input.
 *
 * Schedule: Weekly Sunday 03:45 (via Temporal `trendspotterWeeklySchedule`)
 *
 * v1.1.0 (activation cycle 2026-06-10):
 *   - Wired SimpleAnalytics own-site collector alongside Google Trends
 *   - Per-step error isolation (one source failure does not block other)
 *   - Cost-log + EU AI Act provenance handled inside collectors
 *   - Activatable via Temporal worker on hb-agents task-queue
 *
 * @version 1.1.0 — Trendspotter activation
 */

import BaseAgent from '../base/BaseAgent.js';
import googleTrendsCollector from './googleTrendsCollector.js';
import websiteTrafficCollector from './websiteTrafficCollector.js';
import trendAggregator from './trendAggregator.js';
import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';

class TrendspotterAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Trendspotter',
      version: '1.1.0',
      category: 'content',
      destinationAware: true,
    });
  }

  async runForDestination(destinationId) {
    const results = {
      sources: { simpleanalytics: 0, google_trends: 0 },
      aggregated: 0,
      errors: [],
    };

    // Step 1: Collect SimpleAnalytics own-site signals (own DB-write — provenance + costlog inside collector)
    try {
      const saTrends = await websiteTrafficCollector.collect(destinationId);
      results.sources.simpleanalytics = saTrends.length;
    } catch (saError) {
      // Per-source isolation: SA-failure must not block Google Trends path
      results.errors.push(`simpleanalytics: ${saError.message}`);
      await logError('trendspotter', saError, { action: 'sa-collect', destination_id: destinationId });
    }

    // Step 2: Collect Google Trends data via Apify, then aggregate
    try {
      const trendsData = await googleTrendsCollector.collect(destinationId);
      results.sources.google_trends = trendsData.length;

      const scored = await trendAggregator.aggregate(destinationId, trendsData);
      results.aggregated = scored.saved;
    } catch (gtError) {
      results.errors.push(`google_trends: ${gtError.message}`);
      await logError('trendspotter', gtError, { action: 'gt-collect-aggregate', destination_id: destinationId });
    }

    // Single audit-trail entry summarizing all sources
    try {
      await logAgent('trendspotter', destinationId, 'trending-scan', {
        sa_keywords: results.sources.simpleanalytics,
        gt_keywords: results.sources.google_trends,
        aggregated: results.aggregated,
        errors_count: results.errors.length,
      });
    } catch (auditErr) {
      // Audit-failure must not propagate (graceful degradation)
      results.errors.push(`audit: ${auditErr.message}`);
    }

    return results;
  }
}

const trendspotterAgent = new TrendspotterAgent();
export default trendspotterAgent;
