/**
 * Google Trends Collector
 * Fetches trending keywords via Apify Google Trends Scraper actor.
 * Rate limited: max 1 call per destination per run.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Destination-specific seed keywords for trend collection
const DESTINATION_SEEDS = {
  1: { // Calpe
    keywords: ['calpe', 'calpe spain', 'costa blanca', 'penon de ifach', 'calpe beach'],
    geo: 'ES',
    markets: ['DE', 'NL', 'UK', 'ES'],
  },
  2: { // Texel
    keywords: ['texel', 'texel island', 'texel beach', 'texel nature', 'wadden sea'],
    geo: 'NL',
    markets: ['NL', 'DE', 'BE'],
  },
  4: { // WarreWijzer
    keywords: ['maaseik', 'warredal', 'limburg belgium', 'maasland'],
    geo: 'BE',
    markets: ['BE', 'NL', 'DE'],
  },
};

class GoogleTrendsCollector {
  constructor() {
    this.apifyToken = process.env.APIFY_API_TOKEN;
    this.actorId = 'emastra~google-trends-scraper'; // Popular Apify actor for Google Trends
  }

  /**
   * Collect trending data for a destination
   * @param {number} destinationId
   * @returns {Array} Raw trend data
   */
  async collect(destinationId) {
    const config = DESTINATION_SEEDS[destinationId];
    if (!config) {
      console.log(`[GoogleTrendsCollector] No seed config for destination ${destinationId}, skipping`);
      return [];
    }

    if (!this.apifyToken) {
      console.warn('[GoogleTrendsCollector] APIFY_API_TOKEN not set, returning empty');
      return [];
    }

    try {
      const results = [];

      // Call Apify actor for each keyword group
      for (const keyword of config.keywords) {
        try {
          const data = await this.fetchTrend(keyword, config.geo);
          if (data && data.length > 0) {
            results.push(...data.map(item => ({
              keyword: item.query || keyword,
              search_volume: item.value || 0,
              trend_direction: this.classifyDirection(item),
              source: 'google_trends',
              market: config.geo,
              raw_data: item,
            })));
          }
        } catch (err) {
          console.warn(`[GoogleTrendsCollector] Failed for keyword "${keyword}":`, err.message);
        }
      }

      console.log(`[GoogleTrendsCollector] Collected ${results.length} trends for destination ${destinationId}`);
      return results;
    } catch (error) {
      console.error(`[GoogleTrendsCollector] Error for destination ${destinationId}:`, error.message);
      return [];
    }
  }

  async fetchTrend(keyword, geo) {
    const url = `https://api.apify.com/v2/acts/${this.actorId}/run-sync-get-dataset-items`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apifyToken}`,
      },
      body: JSON.stringify({
        searchTerms: [keyword],
        geo,
        timeRange: 'now 7-d',
        maxItems: 10,
      }),
      signal: AbortSignal.timeout(60000), // 60s timeout
    });

    if (!response.ok) {
      throw new Error(`Apify HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  classifyDirection(item) {
    // Simple heuristic based on available data
    if (item.isRising || item.growth === 'Breakout') return 'breakout';
    if (item.growth > 50) return 'rising';
    if (item.growth < -20) return 'declining';
    return 'stable';
  }
}

const googleTrendsCollector = new GoogleTrendsCollector();
export default googleTrendsCollector;
