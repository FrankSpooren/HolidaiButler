/**
 * Content Freshness Service
 *
 * Calculates and maintains content freshness scores for all active POIs.
 * Integrated into De Koerier (Agent #4, Data Sync) for scheduled execution.
 *
 * Freshness is based on:
 * - last_updated timestamp (primary indicator)
 * - content_verified_at (external verification boost)
 * - website_scraped_at (website reachability check)
 *
 * Score ranges:
 * - fresh (80-100): content <30 days old OR externally verified <14 days
 * - aging (50-79): content 30-90 days old
 * - stale (20-49): content 90-180 days old
 * - unverified (0-19): content >180 days old OR never verified
 *
 * @module dataSync/freshnessService
 * @version 1.0.0
 * @since Fase II Blok B
 */

import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calculate freshness score for a single POI
 * @param {Object} poi - POI row with timestamp fields
 * @returns {{ score: number, status: string }}
 */
function calculateFreshnessScore(poi) {
  const now = Date.now();

  // Has any enriched content at all?
  const hasContent = !!(poi.enriched_detail_description && poi.enriched_detail_description.trim());
  if (!hasContent) {
    return { score: 0, status: 'unverified', sla: 'no_content' };
  }

  // Primary: how old is the CONTENT? (not any DB touch)
  const contentModified = poi.content_modified_at ? new Date(poi.content_modified_at).getTime() : null;
  const lastUpdated = poi.last_updated ? new Date(poi.last_updated).getTime() : null;
  const contentAge = contentModified ? (now - contentModified) / DAY_MS
    : (lastUpdated ? (now - lastUpdated) / DAY_MS : Infinity);

  // Boost: external verification
  const verifiedAt = poi.content_verified_at ? new Date(poi.content_verified_at).getTime() : null;
  const verifiedAge = verifiedAt ? (now - verifiedAt) / DAY_MS : Infinity;

  // Boost: website scraped recently
  const scrapedAt = poi.website_scraped_at ? new Date(poi.website_scraped_at).getTime() : null;
  const scrapedAge = scrapedAt ? (now - scrapedAt) / DAY_MS : Infinity;

  // Tier-SLA thresholds (days)
  const tier = poi.tier || 4;
  const TIER_SLA = { 1: 2, 2: 10, 3: 35, 4: 100 };
  const slaMax = TIER_SLA[tier] || 100;

  // Best age: use most recent signal
  const bestAge = Math.min(contentAge, verifiedAge, scrapedAge);

  let score;
  let sla;

  // SLA compliance check
  if (bestAge <= slaMax) {
    // Within SLA: score 60-100 based on how fresh within the SLA window
    const freshness = 1 - (bestAge / slaMax);
    score = Math.round(60 + freshness * 40);
    sla = 'within_sla';
  } else if (bestAge <= slaMax * 2) {
    // Overdue but not critical: score 30-59
    const overdue = (bestAge - slaMax) / slaMax;
    score = Math.round(59 - overdue * 30);
    sla = 'overdue';
  } else {
    // Critical: score 0-29
    const critical = Math.min((bestAge - slaMax * 2) / (slaMax * 2), 1);
    score = Math.max(0, Math.round(29 - critical * 29));
    sla = 'critical';
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Determine status
  let status;
  if (score >= 60) status = 'fresh';
  else if (score >= 30) status = 'aging';
  else status = 'stale';

  return { score, status, sla, contentAgeDays: Math.round(bestAge), tier };
}

/**
 * Recalculate freshness scores for all active POIs of a destination
 * @param {number} destinationId - 1=Calpe, 2=Texel
 * @returns {Promise<Object>} Summary of freshness calculation
 */
async function recalculateFreshness(destinationId) {
  try {
    const { mysqlSequelize } = await import('../../../config/database.js');
    const { QueryTypes } = await import('sequelize');

    const pois = await mysqlSequelize.query(`
      SELECT id, tier, last_updated, content_modified_at, content_verified_at, website_scraped_at,
             enriched_detail_description
      FROM POI
      WHERE destination_id = ? AND is_active = 1
    `, { replacements: [destinationId], type: QueryTypes.SELECT });

    const stats = { fresh: 0, aging: 0, stale: 0, unverified: 0, total: pois.length };
    const batches = [];
    let currentBatch = [];

    for (const poi of pois) {
      const { score, status } = calculateFreshnessScore(poi);
      currentBatch.push({ id: poi.id, score, status });
      stats[status]++;

      // Batch updates (50 at a time)
      if (currentBatch.length >= 50) {
        batches.push([...currentBatch]);
        currentBatch = [];
      }
    }
    if (currentBatch.length > 0) batches.push(currentBatch);

    // Execute batch updates
    for (const batch of batches) {
      const cases_score = batch.map(b => `WHEN ${b.id} THEN ${b.score}`).join(' ');
      const cases_status = batch.map(b => `WHEN ${b.id} THEN '${b.status}'`).join(' ');
      const ids = batch.map(b => b.id).join(',');

      await mysqlSequelize.query(`
        UPDATE POI SET
          content_freshness_score = CASE id ${cases_score} END,
          content_freshness_status = CASE id ${cases_status} END
        WHERE id IN (${ids})
      `);
    }

    return stats;
  } catch (error) {
    console.error(`[Freshness] Error recalculating for destination ${destinationId}:`, error.message);
    throw error;
  }
}

/**
 * Recalculate freshness for all destinations
 * @returns {Promise<Object>} Stats per destination
 */
async function recalculateAll() {
  const results = {};
  for (const destId of [1, 2]) {
    results[destId] = await recalculateFreshness(destId);
  }
  return results;
}

/**
 * Mark a POI as externally verified (updates content_verified_at + recalculates score)
 * @param {number} poiId
 * @param {string} verifiedBy - Who verified (e.g. 'admin', 'agent-koerier')
 */
async function markVerified(poiId, verifiedBy = 'manual') {
  const { mysqlSequelize } = await import('../../../config/database.js');

  await mysqlSequelize.query(`
    UPDATE POI SET
      content_verified_at = NOW(),
      content_verified_by = ?
    WHERE id = ?
  `, { replacements: [verifiedBy, poiId] });

  // Recalculate this POI's freshness
  const { QueryTypes } = await import('sequelize');
  const [poi] = await mysqlSequelize.query(`
    SELECT id, last_updated, content_verified_at, website_scraped_at,
           enriched_detail_description
    FROM POI WHERE id = ?
  `, { replacements: [poiId], type: QueryTypes.SELECT });

  if (poi) {
    const { score, status } = calculateFreshnessScore(poi);
    await mysqlSequelize.query(`
      UPDATE POI SET content_freshness_score = ?, content_freshness_status = ? WHERE id = ?
    `, { replacements: [score, status, poiId] });
  }
}

/**
 * Get freshness summary for admin dashboard
 * @param {number|null} destinationId - Filter by destination, null for all
 * @returns {Promise<Object>} Dashboard stats
 */
async function getFreshnessSummary(destinationId = null) {
  const { mysqlSequelize } = await import('../../../config/database.js');
  const { QueryTypes } = await import('sequelize');

  const where = ['is_active = 1'];
  const params = [];
  if (destinationId) {
    where.push('destination_id = ?');
    params.push(destinationId);
  }

  const rows = await mysqlSequelize.query(`
    SELECT
      destination_id,
      content_freshness_status as status,
      COUNT(*) as count,
      ROUND(AVG(content_freshness_score), 1) as avg_score
    FROM POI
    WHERE ${where.join(' AND ')}
    GROUP BY destination_id, content_freshness_status
    ORDER BY destination_id, FIELD(content_freshness_status, 'fresh', 'aging', 'stale', 'unverified')
  `, { replacements: params, type: QueryTypes.SELECT });

  // Build summary
  const summary = {};
  for (const row of rows) {
    const dest = row.destination_id;
    if (!summary[dest]) {
      summary[dest] = { fresh: 0, aging: 0, stale: 0, unverified: 0, total: 0, avgScore: 0 };
    }
    summary[dest][row.status] = parseInt(row.count);
    summary[dest].total += parseInt(row.count);
  }

  // Calculate weighted avg score per destination
  for (const dest of Object.keys(summary)) {
    const avgRows = await mysqlSequelize.query(`
      SELECT ROUND(AVG(content_freshness_score), 1) as avg
      FROM POI WHERE destination_id = ? AND is_active = 1 AND content_freshness_score IS NOT NULL
    `, { replacements: [dest], type: QueryTypes.SELECT });
    summary[dest].avgScore = avgRows[0]?.avg ? parseFloat(avgRows[0].avg) : 0;
  }

  return summary;
}

/**
 * Agent integration: run freshness check as part of De Koerier
 * @param {number} destinationId
 * @returns {Promise<Object>} Results for audit log
 */
async function runFreshnessCheck(destinationId) {
  const startTime = Date.now();

  try {
    const stats = await recalculateFreshness(destinationId);
    const duration = Date.now() - startTime;

    const destName = destinationId === 1 ? 'Calpe' : destinationId === 2 ? 'Texel' : `dest-${destinationId}`;

    await logAgent('data-sync', 'freshness_check', {
      destination: destName,
      destination_id: destinationId,
      ...stats,
      duration_ms: duration,
      freshPercent: stats.total > 0 ? Math.round(stats.fresh / stats.total * 100) : 0
    });

    return {
      success: true,
      destination: destName,
      stats,
      duration_ms: duration
    };
  } catch (error) {
    await logError('data-sync', error, { action: 'freshness_check', destination_id: destinationId });
    return { success: false, error: error.message };
  }
}

export {
  calculateFreshnessScore,
  recalculateFreshness,
  recalculateAll,
  markVerified,
  getFreshnessSummary,
  runFreshnessCheck
};

export default {
  calculateFreshnessScore,
  recalculateFreshness,
  recalculateAll,
  markVerified,
  getFreshnessSummary,
  runFreshnessCheck
};
