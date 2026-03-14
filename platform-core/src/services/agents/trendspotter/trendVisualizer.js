/**
 * Trend Visualizer
 * Formats trending data for Admin Portal API responses.
 */

import TrendingData from '../../../models/TrendingData.js';
import { mysqlSequelize } from '../../../config/database.js';
import { Op } from 'sequelize';

class TrendVisualizer {
  /**
   * Get trending data with filters
   */
  async getTrends(destinationId, { period = '30d', market, language, limit = 50, offset = 0 } = {}) {
    const where = { destination_id: destinationId };

    // Period filter
    const now = new Date();
    if (period === '7d') {
      where.created_at = { [Op.gte]: new Date(now - 7 * 86400000) };
    } else if (period === '30d') {
      where.created_at = { [Op.gte]: new Date(now - 30 * 86400000) };
    } else if (period === '90d') {
      where.created_at = { [Op.gte]: new Date(now - 90 * 86400000) };
    }

    if (market) where.market = market;
    if (language) where.language = language;

    const { rows, count } = await TrendingData.findAndCountAll({
      where,
      order: [['relevance_score', 'DESC'], ['search_volume', 'DESC']],
      limit: Math.min(limit, 200),
      offset,
    });

    return { trends: rows, total: count };
  }

  /**
   * Get aggregated summary (word cloud data, top keywords)
   */
  async getSummary(destinationId, { period = '30d' } = {}) {
    const now = new Date();
    let dateFilter = '';
    const replacements = [destinationId];

    if (period === '7d') {
      dateFilter = 'AND created_at >= ?';
      replacements.push(new Date(now - 7 * 86400000));
    } else if (period === '30d') {
      dateFilter = 'AND created_at >= ?';
      replacements.push(new Date(now - 30 * 86400000));
    } else if (period === '90d') {
      dateFilter = 'AND created_at >= ?';
      replacements.push(new Date(now - 90 * 86400000));
    }

    // Top keywords by average relevance
    const [topKeywords] = await mysqlSequelize.query(`
      SELECT keyword,
             AVG(relevance_score) as avg_score,
             MAX(search_volume) as max_volume,
             MAX(trend_direction) as direction,
             COUNT(*) as occurrences
      FROM trending_data
      WHERE destination_id = ? ${dateFilter}
      GROUP BY keyword
      ORDER BY avg_score DESC
      LIMIT 20
    `, { replacements });

    // Direction distribution
    const [directionDist] = await mysqlSequelize.query(`
      SELECT trend_direction, COUNT(*) as count
      FROM trending_data
      WHERE destination_id = ? ${dateFilter}
      GROUP BY trend_direction
    `, { replacements: [destinationId, ...(dateFilter ? [replacements[1]] : [])] });

    // Weekly trend (for charts)
    const [weeklyTrend] = await mysqlSequelize.query(`
      SELECT year, week_number, COUNT(*) as keyword_count,
             AVG(relevance_score) as avg_score
      FROM trending_data
      WHERE destination_id = ? ${dateFilter}
      GROUP BY year, week_number
      ORDER BY year, week_number
    `, { replacements: [destinationId, ...(dateFilter ? [replacements[1]] : [])] });

    return {
      topKeywords,
      directionDistribution: directionDist,
      weeklyTrend,
      totalKeywords: topKeywords.length,
    };
  }
}

const trendVisualizer = new TrendVisualizer();
export default trendVisualizer;
