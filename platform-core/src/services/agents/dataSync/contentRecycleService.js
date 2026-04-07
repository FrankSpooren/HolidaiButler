/**
 * Content Recycle Service — Opdracht 4 (HB Content Studio State-of-the-Art Polish)
 *
 * Wekelijks (dinsdag 07:00) genereert dit service "♻️ Hergebruik" suggesties:
 * vindt top-performing content items >30 dagen oud en maakt nieuwe content_suggestions
 * met source='recycle' en original_item_id pointer naar het origineel.
 *
 * De gebruiker kan vervolgens met "Genereer verse versie" een nieuwe variant maken
 * met actuele context (bestaande generation pipeline).
 */
import { mysqlSequelize } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

const RECYCLE_AGE_DAYS = 30;
const RECYCLE_TOP_N = 5;

/**
 * Generate recycle suggestions for one destination.
 * Returns { destination_id, candidates_found, suggestions_created, skipped_existing }.
 */
export async function generateRecycleSuggestions(destinationId) {
  const cutoffDate = new Date(Date.now() - RECYCLE_AGE_DAYS * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 19).replace('T', ' ');

  // 1. Find top-performing published items older than cutoff
  //    Aggregate engagement across all platforms for that item.
  const [topPerformers] = await mysqlSequelize.query(
    `SELECT ci.id, ci.title, ci.content_type, ci.target_platform, ci.published_at,
            COALESCE(SUM(cp.engagement), 0) AS total_engagement,
            COALESCE(SUM(cp.views), 0) AS total_views
     FROM content_items ci
     LEFT JOIN content_performance cp ON cp.content_item_id = ci.id
     WHERE ci.destination_id = :destId
       AND ci.approval_status = 'published'
       AND ci.published_at IS NOT NULL
       AND ci.published_at < :cutoff
     GROUP BY ci.id, ci.title, ci.content_type, ci.target_platform, ci.published_at
     ORDER BY total_engagement DESC, total_views DESC, ci.published_at DESC
     LIMIT :limit`,
    {
      replacements: { destId: destinationId, cutoff: cutoffDate, limit: RECYCLE_TOP_N },
    }
  );

  let created = 0;
  let skipped = 0;

  for (const item of topPerformers || []) {
    // Skip if there's already a recycle-suggestion for this original_item_id that is still pending/approved
    const [[existing]] = await mysqlSequelize.query(
      `SELECT id FROM content_suggestions
       WHERE destination_id = :destId
         AND source = 'recycle'
         AND original_item_id = :origId
         AND status IN ('pending', 'approved')
       LIMIT 1`,
      { replacements: { destId: destinationId, origId: item.id } }
    );

    if (existing) {
      skipped++;
      continue;
    }

    const engagementText = item.total_engagement > 0
      ? `${item.total_engagement} engagement (${item.total_views} views)`
      : 'gepubliceerd zonder gemeten engagement';

    await mysqlSequelize.query(
      `INSERT INTO content_suggestions
        (destination_id, title, summary, content_type, status, source, original_item_id, created_at, updated_at)
       VALUES (:destId, :title, :summary, :contentType, 'pending', 'recycle', :origId, NOW(), NOW())`,
      {
        replacements: {
          destId: destinationId,
          title: `♻️ Hergebruik: ${item.title}`.slice(0, 500),
          summary: `Dit item behaalde ${engagementText}. Overweeg een actuele versie met een frisse invalshoek.`,
          contentType: ['blog', 'social_post', 'video_script'].includes(item.content_type) ? item.content_type : 'social_post',
          origId: item.id,
        },
      }
    );
    created++;
  }

  logger.info(`[ContentRecycle] dest=${destinationId} candidates=${(topPerformers || []).length} created=${created} skipped=${skipped}`);

  return {
    destination_id: destinationId,
    candidates_found: (topPerformers || []).length,
    suggestions_created: created,
    skipped_existing: skipped,
  };
}

/**
 * Run for all active destinations (called by BullMQ worker).
 */
export async function runRecycleSuggestionsAllDestinations() {
  const [destinations] = await mysqlSequelize.query(
    `SELECT id FROM destinations WHERE status = 'active'`
  );
  const results = [];
  for (const d of destinations || []) {
    try {
      const r = await generateRecycleSuggestions(d.id);
      results.push(r);
    } catch (err) {
      logger.error(`[ContentRecycle] Failed for destination ${d.id}:`, err.message);
      results.push({ destination_id: d.id, error: err.message });
    }
  }
  return results;
}

export default { generateRecycleSuggestions, runRecycleSuggestionsAllDestinations };
