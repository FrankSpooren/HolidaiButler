/**
 * Trendspotter Agent (A.17) — De Trendspotter
 * Collects and analyzes trending keywords per destination.
 * Sources: Google Trends (via Apify), website analytics, manual input.
 *
 * Schedule: Weekly Sunday 03:00 — content-trending-scan
 * @version 1.0.0
 */

import BaseAgent from '../base/BaseAgent.js';
import googleTrendsCollector from './googleTrendsCollector.js';
import trendAggregator from './trendAggregator.js';
import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';

class TrendspotterAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Trendspotter',
      version: '1.0.0',
      category: 'content',
      destinationAware: true,
    });
  }

  async runForDestination(destinationId) {
    const results = { collected: 0, aggregated: 0, errors: [] };

    try {
      // Step 1: Collect Google Trends data via Apify
      const trendsData = await googleTrendsCollector.collect(destinationId);
      results.collected += trendsData.length;

      // Step 2: Aggregate and score trends
      const scored = await trendAggregator.aggregate(destinationId, trendsData);
      results.aggregated = scored.saved;

      await logAgent('trendspotter', destinationId, 'trending-scan', {
        collected: results.collected,
        aggregated: results.aggregated,
      });
    } catch (error) {
      results.errors.push(error.message);
      await logError('trendspotter', error, { action: 'trending-scan', destination_id: destinationId });
    }

    return results;
  }
}

const trendspotterAgent = new TrendspotterAgent();
export default trendspotterAgent;
