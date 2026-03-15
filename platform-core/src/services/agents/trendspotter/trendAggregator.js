/**
 * Trend Aggregator
 * Combines trend sources, calculates relevance_score, saves to DB.
 */

import { mysqlSequelize } from '../../../config/database.js';
import TrendingData from '../../../models/TrendingData.js';

// Current ISO week number
function getWeekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Season relevance boost per month per destination
const SEASON_BOOST = {
  1: { // Calpe — summer/beach peaks June-Sept
    6: 1.5, 7: 2.0, 8: 2.0, 9: 1.5, 3: 1.2, 4: 1.3, 5: 1.3, 10: 1.2,
  },
  2: { // Texel — spring/summer peaks April-Sept
    4: 1.3, 5: 1.5, 6: 1.8, 7: 2.0, 8: 2.0, 9: 1.5,
  },
};

class TrendAggregator {
  /**
   * Aggregate collected trends: score, deduplicate, save to DB
   * @param {number} destinationId
   * @param {Array} rawTrends - collected trend data
   * @returns {Object} { saved: number }
   */
  async aggregate(destinationId, rawTrends) {
    const now = new Date();
    const weekNumber = getWeekNumber(now);
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Deduplicate by keyword (case-insensitive)
    const seen = new Map();
    for (const trend of rawTrends) {
      const key = trend.keyword.toLowerCase();
      if (!seen.has(key) || (trend.search_volume || 0) > (seen.get(key).search_volume || 0)) {
        seen.set(key, trend);
      }
    }

    const deduped = Array.from(seen.values());
    let saved = 0;

    for (const trend of deduped) {
      try {
        const relevanceScore = this.calculateRelevance(trend, destinationId, month);

        await TrendingData.upsert({
          destination_id: destinationId,
          keyword: trend.keyword.substring(0, 255),
          language: trend.language || 'en',
          source: trend.source || 'google_trends',
          search_volume: trend.search_volume || null,
          trend_direction: ['rising', 'stable', 'declining', 'breakout'].includes(trend.trend_direction) ? trend.trend_direction : 'stable',
          relevance_score: relevanceScore,
          week_number: weekNumber,
          year,
          market: trend.market || null,
          raw_data: trend.raw_data || null,
        }, {
          // Upsert key: destination_id + keyword + week_number + year
          conflictFields: ['destination_id', 'keyword', 'week_number', 'year'],
        });
        saved++;
      } catch (err) {
        console.warn(`[TrendAggregator] Failed to save trend "${trend.keyword}":`, err.message);
      }
    }

    console.log(`[TrendAggregator] Saved ${saved}/${deduped.length} trends for destination ${destinationId}, week ${weekNumber}`);
    return { saved, total: deduped.length };
  }

  /**
   * Calculate relevance score (0.0 - 10.0)
   * Based on: volume (40%), trend direction (30%), season relevance (30%)
   */
  calculateRelevance(trend, destinationId, month) {
    // Volume score (0-10): log scale, cap at 10
    const volume = trend.search_volume || 0;
    const volumeScore = volume > 0 ? Math.min(10, Math.log10(volume + 1) * 2.5) : 2;

    // Direction score (0-10)
    const dirScores = { breakout: 10, rising: 7, stable: 4, declining: 1 };
    const directionScore = dirScores[trend.trend_direction] || 4;

    // Season boost (multiplier 1.0-2.0)
    const boost = SEASON_BOOST[destinationId]?.[month] || 1.0;

    const raw = (volumeScore * 0.4) + (directionScore * 0.3) + ((5 * boost) * 0.3);
    return Math.round(Math.min(10, Math.max(0, raw)) * 10) / 10;
  }
}

const trendAggregator = new TrendAggregator();
export default trendAggregator;
