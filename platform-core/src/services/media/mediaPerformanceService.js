/**
 * Media Performance Service — USP #1
 * "De enige Media Library die weet welke foto bookings oplevert."
 *
 * Aggregates content_items × content_performance per media_id.
 * Score: engagement 50%, CTR 30%, usage_frequency 20%.
 */
import { mysqlSequelize } from '../../config/database.js';
import { QueryTypes } from 'sequelize';

/**
 * Aggregate performance for all media in a destination.
 * JOIN content_items (media_ids JSON) × content_performance per media-ID.
 */
export async function aggregatePerformance(destinationId, days = 90) {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  // Get all published content items with media_ids
  const items = await mysqlSequelize.query(
    `SELECT ci.id, ci.media_ids, ci.destination_id,
            SUM(cp.views) as total_views, SUM(cp.clicks) as total_clicks,
            SUM(cp.engagement) as total_engagement, SUM(cp.reach) as total_reach
     FROM content_items ci
     LEFT JOIN content_performance cp ON cp.content_item_id = ci.id AND cp.measured_at >= ?
     WHERE ci.destination_id = ? AND ci.approval_status = 'published'
       AND ci.media_ids IS NOT NULL AND ci.media_ids != '' AND ci.media_ids != '[]'
     GROUP BY ci.id`,
    { replacements: [cutoff, destinationId], type: QueryTypes.SELECT }
  );

  // Aggregate per media_id
  const mediaStats = {};
  for (const item of items) {
    let mediaIds = [];
    try {
      const parsed = JSON.parse(item.media_ids);
      mediaIds = Array.isArray(parsed) ? parsed : [];
    } catch { continue; }

    // Extract numeric IDs from various formats (poi:123, media:45, bare 67)
    const numericIds = mediaIds.map(id => {
      if (typeof id === 'number') return id;
      const str = String(id);
      if (str.startsWith('media:')) return parseInt(str.slice(6));
      if (/^\d+$/.test(str)) return parseInt(str);
      return null;
    }).filter(Boolean);

    for (const mediaId of numericIds) {
      if (!mediaStats[mediaId]) {
        mediaStats[mediaId] = { uses: 0, views: 0, clicks: 0, engagement: 0, reach: 0, lastUsed: null };
      }
      const s = mediaStats[mediaId];
      s.uses++;
      s.views += parseInt(item.total_views) || 0;
      s.clicks += parseInt(item.total_clicks) || 0;
      s.engagement += parseInt(item.total_engagement) || 0;
      s.reach += parseInt(item.total_reach) || 0;
    }
  }

  // Calculate scores and upsert
  const entries = Object.entries(mediaStats);
  let count = 0;
  for (const [mediaId, stats] of entries) {
    const ctr = stats.views > 0 ? (stats.clicks / stats.views) * 100 : 0;
    const engRate = stats.reach > 0 ? (stats.engagement / stats.reach) * 100 : 0;
    const score = calculateScore(stats, ctr, engRate);

    await mysqlSequelize.query(
      `INSERT INTO media_performance (media_id, destination_id, total_uses, total_views,
        total_clicks, total_engagement, avg_ctr, avg_engagement_rate, performance_score, calculated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
        total_uses = VALUES(total_uses), total_views = VALUES(total_views),
        total_clicks = VALUES(total_clicks), total_engagement = VALUES(total_engagement),
        avg_ctr = VALUES(avg_ctr), avg_engagement_rate = VALUES(avg_engagement_rate),
        performance_score = VALUES(performance_score), calculated_at = NOW()`,
      { replacements: [mediaId, destinationId, stats.uses, stats.views, stats.clicks, stats.engagement, ctr, engRate, score] }
    );
    count++;
  }

  // Calculate percentile ranks
  await calculatePercentiles(destinationId);

  return { count, destinationId, days };
}

/**
 * Score: engagement 50%, CTR 30%, usage_frequency 20%.
 * Normalized to 0-10 scale.
 */
function calculateScore(stats, ctr, engRate) {
  // Normalize each metric to 0-10
  const engScore = Math.min(10, engRate * 2);        // 5% engagement rate = 10
  const ctrScore = Math.min(10, ctr * 5);            // 2% CTR = 10
  const useScore = Math.min(10, stats.uses * 2);     // 5 uses = 10

  return Math.round((engScore * 0.5 + ctrScore * 0.3 + useScore * 0.2) * 10) / 10;
}

/**
 * Rank all media within a destination by performance_score.
 */
async function calculatePercentiles(destinationId) {
  await mysqlSequelize.query(
    `UPDATE media_performance mp
     JOIN (
       SELECT id, ROUND(PERCENT_RANK() OVER (ORDER BY performance_score) * 100) as prank
       FROM media_performance WHERE destination_id = ?
     ) ranked ON mp.id = ranked.id
     SET mp.percentile_rank = ranked.prank`,
    { replacements: [destinationId] }
  );
}

/**
 * Get top performers for a destination.
 */
export async function getTopPerformers(destinationId, limit = 10, days = 90) {
  return mysqlSequelize.query(
    `SELECT mp.*, m.filename, m.original_name, m.alt_text_en, m.media_type,
            CONCAT('/media-files/', m.destination_id, '/', m.filename) as url
     FROM media_performance mp
     JOIN media m ON m.id = mp.media_id
     WHERE mp.destination_id = ? AND mp.performance_score > 0
     ORDER BY mp.performance_score DESC
     LIMIT ?`,
    { replacements: [destinationId, limit], type: QueryTypes.SELECT }
  );
}

/**
 * Get performance for a single media item.
 */
export async function getMediaPerformance(mediaId) {
  const [perf] = await mysqlSequelize.query(
    `SELECT mp.*, m.filename, m.original_name
     FROM media_performance mp
     JOIN media m ON m.id = mp.media_id
     WHERE mp.media_id = ?`,
    { replacements: [mediaId], type: QueryTypes.SELECT }
  );
  if (!perf) return null;

  // Get content items that use this media
  const usedIn = await mysqlSequelize.query(
    `SELECT ci.id, ci.title, ci.content_type, ci.approval_status,
            cp.views, cp.clicks, cp.engagement, cp.platform
     FROM content_items ci
     LEFT JOIN content_performance cp ON cp.content_item_id = ci.id
     WHERE ci.media_ids LIKE ? AND ci.approval_status = 'published'
     ORDER BY cp.engagement DESC
     LIMIT 20`,
    { replacements: [`%${mediaId}%`], type: QueryTypes.SELECT }
  );

  return { ...perf, usedIn };
}

export default { aggregatePerformance, getTopPerformers, getMediaPerformance, calculateScore };
