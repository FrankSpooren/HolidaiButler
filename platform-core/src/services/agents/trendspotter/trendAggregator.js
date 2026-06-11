/**
 * Trend Aggregator
 * Combines trend sources, calculates relevance_score, saves to DB.
 */

import { mysqlSequelize } from '../../../config/database.js';
import TrendingData from '../../../models/TrendingData.js';
import { buildBrandContextStructured } from '../contentRedacteur/brandContext.js';

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

    // T2 (2026-06-11): brand-knowledge filter — drop off-brand trends when brand context is available.
    // Soft-fail: no brand context => return all trends unchanged (no-op fallback).
    const filtered = await this.applyBrandKnowledgeFilter(destinationId, deduped);
    let saved = 0;

    for (const trend of filtered) {
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
          source_url: trend.source_url || null,
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

    console.log(`[TrendAggregator] Saved ${saved}/${filtered.length} trends for destination ${destinationId}, week ${weekNumber} (post-brand-filter)`);
    return { saved, total: filtered.length, prefilter_total: deduped.length };
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

  /**
   * Soft-filter trends using brand-knowledge token overlap.
   * No-op fallback when brand context is unavailable.
   * @param {number} destinationId
   * @param {Array} trends
   * @returns {Promise<Array>} filtered trends
   */
  async applyBrandKnowledgeFilter(destinationId, trends) {
    try {
      const bc = await buildBrandContextStructured(destinationId, { maxKbChunks: 10, maxCharsPerChunk: 800 });
      if (!bc?.hasInternalSources || !bc?.contextString) {
        return trends;
      }
      const tokens = this._extractBrandTokens(bc.contextString);
      if (tokens.size === 0) {
        return trends;
      }
      // T2 observability-mode default: log brand-mismatch candidates but pass them through.
      // Enable active drop via env TRENDSPOTTER_BRAND_FILTER_ACTIVE=true after precision-validation.
      const filterActive = process.env.TRENDSPOTTER_BRAND_FILTER_ACTIVE === 'true';
      const kept = [];
      const observedOffBrand = [];
      for (const t of trends) {
        const keyword = (t.keyword || '').toLowerCase();
        const words = keyword.split(/[^a-z0-9]+/).filter(w => w.length >= 3);
        const overlap = words.some(w => tokens.has(w));
        if (overlap) {
          kept.push(t);
          continue;
        }
        observedOffBrand.push(t.keyword);
        if (!filterActive) {
          kept.push(t);
        }
      }
      const dropped = trends.length - kept.length;
      const sampleOffBrand = observedOffBrand.slice(0, 5).join(', ');
      console.log(`[TrendAggregator] brand-filter dest=${destinationId} mode=${filterActive ? 'active' : 'observability'} kept=${kept.length} dropped=${dropped} off_brand_candidates=${observedOffBrand.length} tokens=${tokens.size}${sampleOffBrand ? ` sample=[${sampleOffBrand}]` : ''}`);
      return kept;
    } catch (err) {
      console.warn(`[TrendAggregator] brand-filter failed (no-op fallback): ${err.message}`);
      return trends;
    }
  }

  /**
   * Extract lowercased word-tokens from brand contextString.
   * Filters stopwords + words shorter than 4 chars.
   */
  _extractBrandTokens(contextString) {
    const STOPWORDS = new Set([
      'the', 'and', 'for', 'with', 'this', 'that', 'from', 'are', 'was', 'were', 'have', 'has', 'will', 'would', 'should', 'could', 'about', 'than', 'then', 'they', 'their', 'them', 'your', 'you', 'our', 'over', 'into', 'onto', 'because',
      'het', 'een', 'van', 'voor', 'aan', 'naar', 'met', 'maar', 'als', 'door', 'omdat', 'dat', 'dit', 'die', 'deze', 'haar', 'zijn', 'wordt', 'worden', 'kunt', 'kunnen', 'zoals', 'over', 'tussen', 'meer', 'minder', 'andere', 'alle',
    ]);
    const tokens = new Set();
    const words = contextString.toLowerCase().split(/[^a-z0-9]+/);
    for (const w of words) {
      if (w.length < 4) continue;
      if (STOPWORDS.has(w)) continue;
      tokens.add(w);
    }
    return tokens;
  }
}

const trendAggregator = new TrendAggregator();
export default trendAggregator;
