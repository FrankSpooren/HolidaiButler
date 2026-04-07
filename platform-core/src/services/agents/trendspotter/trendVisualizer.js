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

    // Opdracht 7-C: attach 4-week sparkline history per keyword (single bulk query)
    const trendsWithHistory = rows.map(r => r.toJSON ? r.toJSON() : { ...r });
    if (trendsWithHistory.length > 0) {
      const keywords = [...new Set(trendsWithHistory.map(t => t.keyword).filter(Boolean))];
      if (keywords.length > 0) {
        try {
          const [historyRows] = await mysqlSequelize.query(
            `SELECT keyword, year, week_number, AVG(relevance_score) as score
             FROM trending_data
             WHERE destination_id = :destId
               AND keyword IN (:keywords)
             GROUP BY keyword, year, week_number
             ORDER BY year DESC, week_number DESC`,
            { replacements: { destId: destinationId, keywords } }
          );
          // Group by keyword, keep last 4 weeks (most recent first), reverse → chronological
          const byKeyword = {};
          for (const h of historyRows) {
            if (!byKeyword[h.keyword]) byKeyword[h.keyword] = [];
            if (byKeyword[h.keyword].length < 4) {
              byKeyword[h.keyword].push({ score: Number(h.score) || 0, week: Number(h.week_number) || 0 });
            }
          }
          for (const t of trendsWithHistory) {
            const arr = (byKeyword[t.keyword] || []).slice().reverse();
            t.history = arr.map(x => x.score);
            t.history_weeks = arr.map(x => x.week);
          }
        } catch (e) {
          // Non-fatal: trends still returnable without history
          for (const t of trendsWithHistory) { t.history = []; t.history_weeks = []; }
        }
      }
    }

    return { trends: trendsWithHistory, total: count };
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
