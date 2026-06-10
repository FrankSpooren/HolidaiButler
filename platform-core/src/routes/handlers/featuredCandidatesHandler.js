/**
 * Featured Candidates Handler
 *
 * GET /api/v1/admin-portal/content-items/featured-candidates?destinationId=X&search=Y&limit=25
 *
 * Retourneert content_items kandidaten voor Featured Item block, gerangschikt
 * op brand-fit-score (keyword overlap met destination brand_profile.seo_keywords).
 * Output via ContentItemResource.V1 DTO (Image Resize Proxy URLs).
 *
 * Brand-fit-score (0-1):
 *   - Berekend als Jaccard-similarity tussen item.keyword_cluster en
 *     destination.brand_profile.seo_keywords.
 *   - Items met geen brand_profile keywords krijgen score=null (geen sort-bias).
 *   - Hogere score eerst gesorteerd — gebruiker ziet brand-best-fit bovenaan.
 *
 * Filters:
 *   - Alleen approval_status IN ('approved', 'published', 'scheduled')
 *   - Optionele text-search op title/title_en
 *   - destinationId verplicht (RBAC via destinationScope)
 *
 * @version BLOK E4 (22-05-2026)
 */

import { mysqlSequelize } from '../../config/database.js';
import { QueryTypes } from 'sequelize';
import logger from '../../utils/logger.js';
import ContentItemResource from '../../resources/ContentItemResource.js';

const ELIGIBLE_STATUSES = ['approved', 'published', 'scheduled'];

function safeParseArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  return [];
}

function calculateBrandFit(itemKeywords, brandKeywords) {
  if (!Array.isArray(itemKeywords) || itemKeywords.length === 0) return null;
  if (!Array.isArray(brandKeywords) || brandKeywords.length === 0) return null;

  const itemSet = new Set(itemKeywords.map(k => String(k).toLowerCase().trim()).filter(Boolean));
  const brandSet = new Set(brandKeywords.map(k => String(k).toLowerCase().trim()).filter(Boolean));

  let intersection = 0;
  for (const kw of itemSet) {
    if (brandSet.has(kw)) intersection++;
    else {
      // Partial match: item keyword contains brand keyword or vice versa
      for (const bkw of brandSet) {
        if (kw.includes(bkw) || bkw.includes(kw)) {
          intersection += 0.5;
          break;
        }
      }
    }
  }
  const unionSize = itemSet.size + brandSet.size - intersection;
  if (unionSize === 0) return null;
  return Math.min(1, intersection / unionSize);
}

export async function handleFeaturedCandidates(req, res) {
  const destId = Number(req.query.destinationId || 0);
  const search = String(req.query.search || '').trim();
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));

  if (!destId) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId required' } });
  }

  try {
    // Fetch destination brand_profile.seo_keywords voor score-berekening
    const [[dest]] = await mysqlSequelize.query(
      `SELECT id, name, display_name, brand_profile FROM destinations WHERE id = :id`,
      { replacements: { id: destId } }
    );
    let brandKeywords = [];
    if (dest) {
      try {
        const bp = typeof dest.brand_profile === 'string' ? JSON.parse(dest.brand_profile) : (dest.brand_profile || {});
        brandKeywords = Array.isArray(bp.seo_keywords) ? bp.seo_keywords : [];
      } catch { /* empty */ }
    }

    const whereClauses = ['ci.destination_id = :destId', `ci.approval_status IN ('approved','published','scheduled')`];
    const replacements = { destId, limit };
    if (search) {
      whereClauses.push('(ci.title LIKE :search OR ci.title_en LIKE :search OR ci.title_nl LIKE :search)');
      replacements.search = `%${search}%`;
    }

    const [rows] = await mysqlSequelize.query(
      `SELECT ci.id, ci.destination_id, ci.concept_id, ci.suggestion_id, ci.content_type,
              ci.title, ci.title_en, ci.title_nl, ci.title_de, ci.title_es, ci.title_fr,
              ci.body_en, ci.body_nl, ci.body_de, ci.body_es, ci.body_fr,
              ci.seo_data, ci.seo_score, ci.social_metadata, ci.media_ids, ci.poi_id,
              ci.keyword_cluster, ci.target_platform, ci.approval_status,
              ci.scheduled_at, ci.published_at, ci.publish_url,
              ci.created_at, ci.updated_at
         FROM content_items ci
         WHERE ${whereClauses.join(' AND ')}
         ORDER BY ci.seo_score DESC, ci.updated_at DESC
         LIMIT :limit`,
      { replacements, type: QueryTypes.SELECT }
    ).catch(() => [[]]);

    const items = await ContentItemResource.collection(rows || [], {});

    // Augment with brand-fit-score
    const augmented = items.map((item, idx) => {
      const rawRow = rows[idx] || {};
      const itemKeywords = safeParseArray(rawRow.keyword_cluster);
      const brandFit = calculateBrandFit(itemKeywords, brandKeywords);
      return { ...item, brand_fit_score: brandFit, keyword_count: itemKeywords.length };
    });

    // Sort: brand_fit (highest first, nulls last), then seo_score
    augmented.sort((a, b) => {
      const aFit = a.brand_fit_score ?? -1;
      const bFit = b.brand_fit_score ?? -1;
      if (bFit !== aFit) return bFit - aFit;
      return (b.seo_score || 0) - (a.seo_score || 0);
    });

    return res.json({
      success: true,
      data: {
        items: augmented,
        total: augmented.length,
        destination_id: destId,
        destination_name: dest?.display_name || dest?.name || null,
        brand_keywords_count: brandKeywords.length,
        search: search || null,
      }
    });
  } catch (error) {
    logger.error('[featured-candidates] error:', error);
    return res.status(500).json({ success: false, error: { code: 'FEATURED_CANDIDATES_ERROR', message: error.message } });
  }
}
