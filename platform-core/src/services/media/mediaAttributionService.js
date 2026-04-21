/**
 * Media Revenue Attribution Service — USP #5
 * "De enige Media Library waar elke foto een ROI heeft."
 *
 * Model: engagement-weighted attribution.
 * Total revenue (ticket_orders + reservation deposits) per destination per month
 * is distributed proportionally to each media item based on its share of total engagement.
 */
import { mysqlSequelize } from '../../config/database.js';
import { QueryTypes } from 'sequelize';

/**
 * Attribute revenue for a destination for a given year/month.
 */
export async function attributeRevenue(destinationId, year, month) {
  // 1. Get total revenue for the period (tickets + deposits)
  const [ticketRev] = await mysqlSequelize.query(
    `SELECT COALESCE(SUM(total_cents), 0) as total
     FROM ticket_orders
     WHERE destination_id = ? AND status IN ('paid','confirmed')
       AND YEAR(created_at) = ? AND MONTH(created_at) = ?`,
    { replacements: [destinationId, year, month], type: QueryTypes.SELECT }
  );
  const [depositRev] = await mysqlSequelize.query(
    `SELECT COALESCE(SUM(deposit_cents), 0) as total
     FROM reservations
     WHERE destination_id = ? AND deposit_status = 'paid'
       AND YEAR(created_at) = ? AND MONTH(created_at) = ?`,
    { replacements: [destinationId, year, month], type: QueryTypes.SELECT }
  );
  const totalRevenue = parseInt(ticketRev.total) + parseInt(depositRev.total);

  // 2. Get total bookings count
  const [ticketCount] = await mysqlSequelize.query(
    `SELECT COUNT(*) as cnt FROM ticket_orders
     WHERE destination_id = ? AND status IN ('paid','confirmed')
       AND YEAR(created_at) = ? AND MONTH(created_at) = ?`,
    { replacements: [destinationId, year, month], type: QueryTypes.SELECT }
  );
  const [resCount] = await mysqlSequelize.query(
    `SELECT COUNT(*) as cnt FROM reservations
     WHERE destination_id = ? AND status IN ('confirmed','completed')
       AND YEAR(created_at) = ? AND MONTH(created_at) = ?`,
    { replacements: [destinationId, year, month], type: QueryTypes.SELECT }
  );
  const totalBookings = parseInt(ticketCount.cnt) + parseInt(resCount.cnt);

  // 3. Get engagement per media (via content_items × content_performance)
  const mediaEngagement = await mysqlSequelize.query(
    `SELECT ci.media_ids,
            SUM(cp.views) as views, SUM(cp.clicks) as clicks, SUM(cp.engagement) as engagement
     FROM content_items ci
     JOIN content_performance cp ON cp.content_item_id = ci.id
     WHERE ci.destination_id = ?
       AND ci.media_ids IS NOT NULL AND ci.media_ids != '' AND ci.media_ids != '[]'
       AND YEAR(cp.measured_at) = ? AND MONTH(cp.measured_at) = ?
     GROUP BY ci.id`,
    { replacements: [destinationId, year, month], type: QueryTypes.SELECT }
  );

  // Aggregate engagement per media_id
  const mediaStats = {};
  let totalEngagement = 0;
  for (const item of mediaEngagement) {
    let ids = [];
    try { ids = JSON.parse(item.media_ids); } catch { continue; }
    const numIds = (Array.isArray(ids) ? ids : []).map(id => {
      if (typeof id === 'number') return id;
      const s = String(id);
      if (s.startsWith('media:')) return parseInt(s.slice(6));
      if (/^\d+$/.test(s)) return parseInt(s);
      return null;
    }).filter(Boolean);

    const eng = parseInt(item.engagement) || 0;
    totalEngagement += eng;
    for (const mid of numIds) {
      if (!mediaStats[mid]) mediaStats[mid] = { views: 0, clicks: 0, engagement: 0 };
      mediaStats[mid].views += parseInt(item.views) || 0;
      mediaStats[mid].clicks += parseInt(item.clicks) || 0;
      mediaStats[mid].engagement += eng;
    }
  }

  // 4. Distribute revenue proportionally by engagement share
  let attributed = 0;
  for (const [mediaId, stats] of Object.entries(mediaStats)) {
    const share = totalEngagement > 0 ? stats.engagement / totalEngagement : 0;
    const attrRevenue = Math.round(totalRevenue * share);
    const attrBookings = Math.round(totalBookings * share);

    await mysqlSequelize.query(
      `INSERT INTO media_revenue_attribution
        (media_id, destination_id, period_year, period_month, views, clicks, engagement, bookings, revenue_cents, attribution_model, calculated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'engagement_weighted', NOW())
       ON DUPLICATE KEY UPDATE
        views = VALUES(views), clicks = VALUES(clicks), engagement = VALUES(engagement),
        bookings = VALUES(bookings), revenue_cents = VALUES(revenue_cents), calculated_at = NOW()`,
      { replacements: [parseInt(mediaId), destinationId, year, month, stats.views, stats.clicks, stats.engagement, attrBookings, attrRevenue] }
    );
    attributed++;
  }

  return { destinationId, year, month, totalRevenue, totalBookings, totalEngagement, attributedMedia: attributed };
}

/**
 * Get revenue data for a single media item.
 */
export async function getMediaRevenue(mediaId, months = 12) {
  return mysqlSequelize.query(
    `SELECT period_year, period_month, views, clicks, engagement, bookings, revenue_cents, attribution_model
     FROM media_revenue_attribution
     WHERE media_id = ?
     ORDER BY period_year DESC, period_month DESC
     LIMIT ?`,
    { replacements: [mediaId, months], type: QueryTypes.SELECT }
  );
}

/**
 * Get top revenue-generating media.
 */
export async function getRevenueTop(destinationId, limit = 10) {
  return mysqlSequelize.query(
    `SELECT mra.media_id, m.filename, m.original_name, m.alt_text_en, m.media_type,
            SUM(mra.revenue_cents) as total_revenue, SUM(mra.bookings) as total_bookings,
            SUM(mra.engagement) as total_engagement,
            CONCAT('/media-files/', m.destination_id, '/', m.filename) as url
     FROM media_revenue_attribution mra
     JOIN media m ON m.id = mra.media_id
     WHERE mra.destination_id = ?
     GROUP BY mra.media_id
     HAVING total_revenue > 0
     ORDER BY total_revenue DESC
     LIMIT ?`,
    { replacements: [destinationId, limit], type: QueryTypes.SELECT }
  );
}

export default { attributeRevenue, getMediaRevenue, getRevenueTop };
