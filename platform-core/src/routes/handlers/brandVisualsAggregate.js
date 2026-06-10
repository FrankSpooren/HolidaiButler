/**
 * Brand Visuals Aggregate Handler
 *
 * GET /api/v1/admin-portal/brand-visuals?destinationId=X&source=all|brand|media|poi&limit=50
 *
 * Aggregeert beschikbare hero/brand-images voor een destinatie uit 3 bronnen:
 *   1. brand   — destinations.branding.brandVisuals (handmatig geuploade brand visuals)
 *   2. media   — media-library items met category='branding' OF tags bevat 'hero'|'brand'
 *   3. poi     — poi_images JOIN POI WHERE POI.destination_id=X AND poi_images.status='primary'
 *
 * Image Resize Proxy:
 *   - POI images (in /storage/poi-images/) → /api/v1/img/<path>?w=400&f=webp voor thumbnails
 *   - Brand visuals + media → directe URL (mogelijk full http://, anders relatief)
 *
 * Integratie-first:
 *   - Hergebruikt bestaande tabellen (geen schema-changes)
 *   - Image Resize Proxy mount /api/v1/img/* (Fase II-B.4)
 *   - destinationScope middleware voor RBAC
 *
 * @version 1.0.0 — BLOK C (22-05-2026)
 */

import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';

const ALLOWED_SOURCES = ['all', 'brand', 'media', 'poi'];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Wrap POI local_path naar Image Resize Proxy URL (thumbnail).
 * Brand-visuals + media gaan direct (assumed full URL of relative path).
 */
function toThumbnailUrl(rawUrl, source, width = 400) {
  if (!rawUrl) return null;
  if (source === 'poi') {
    // POI images zitten in /storage/poi-images/X/Y.jpg; proxy strips /poi-images/ prefix
    const cleanPath = String(rawUrl).replace(/^\/?(poi-images\/)?/, '');
    return `/api/v1/img/${cleanPath}?w=${width}&f=webp&q=80`;
  }
  // Brand/media URLs: directe URL — frontend prepend VITE_API_URL indien relatief
  return rawUrl;
}

async function fetchBrandVisuals(destId) {
  const [[dest]] = await mysqlSequelize.query(
    `SELECT id, name, display_name, branding FROM destinations WHERE id = :id`,
    { replacements: { id: destId } }
  );
  if (!dest) return [];
  let branding = {};
  try { branding = typeof dest.branding === 'string' ? JSON.parse(dest.branding) : (dest.branding || {}); } catch { /* empty */ }
  const visuals = Array.isArray(branding.brandVisuals) ? branding.brandVisuals : [];
  return visuals.map((url, idx) => ({
    id: `brand:${destId}:${idx}`,
    url: toThumbnailUrl(url, 'brand'),
    source_url: url,
    source: 'brand',
    source_id: idx,
    alt_text: null,
    dest_name: dest.display_name || dest.name,
    tags: ['brand']
  }));
}

async function fetchMediaVisuals(destId, limit) {
  // Tags JSON kan 'hero' of 'brand' bevatten. Plus category='branding' counts ook.
  const [rows] = await mysqlSequelize.query(
    `SELECT id, destination_id, category, alt_text, alt_text_en, image_url, local_path, tags, created_at
     FROM media
     WHERE destination_id = :destId
       AND archived = 0
       AND (
         category = 'branding'
         OR JSON_CONTAINS(IFNULL(tags, '[]'), '"hero"')
         OR JSON_CONTAINS(IFNULL(tags, '[]'), '"brand"')
       )
     ORDER BY created_at DESC
     LIMIT :limit`,
    { replacements: { destId, limit } }
  ).catch(err => {
    logger.warn('[brand-visuals] media query failed (non-blocking):', err.message);
    return [[]];
  });
  return (rows || []).map(m => {
    let tagsParsed = [];
    try { tagsParsed = typeof m.tags === 'string' ? JSON.parse(m.tags) : (m.tags || []); } catch { /* empty */ }
    const rawUrl = m.local_path || m.image_url;
    return {
      id: `media:${m.id}`,
      url: toThumbnailUrl(rawUrl, 'media'),
      source_url: rawUrl,
      source: 'media',
      source_id: m.id,
      alt_text: m.alt_text || m.alt_text_en || null,
      dest_name: null,
      tags: Array.isArray(tagsParsed) ? tagsParsed : [],
      category: m.category,
      created_at: m.created_at
    };
  });
}

async function fetchPoiVisuals(destId, limit) {
  const [rows] = await mysqlSequelize.query(
    `SELECT pi.id, pi.poi_id, pi.image_url, pi.local_path, pi.alt_text, pi.caption,
            pi.quality_score, pi.tags, pi.created_at, p.name AS poi_name, p.category AS poi_category
     FROM poi_images pi
     JOIN POI p ON pi.poi_id = p.id
     WHERE p.destination_id = :destId
       AND pi.status = 'primary'
       AND p.is_active = 1
     ORDER BY pi.quality_score DESC, p.rating DESC
     LIMIT :limit`,
    { replacements: { destId, limit } }
  ).catch(err => {
    logger.warn('[brand-visuals] POI query failed (non-blocking):', err.message);
    return [[]];
  });
  return (rows || []).map(pi => {
    let tagsParsed = [];
    try { tagsParsed = typeof pi.tags === 'string' ? JSON.parse(pi.tags) : (pi.tags || []); } catch { /* empty */ }
    const rawUrl = pi.local_path || pi.image_url;
    return {
      id: `poi:${pi.id}`,
      url: toThumbnailUrl(rawUrl, 'poi'),
      source_url: rawUrl,
      source: 'poi',
      source_id: pi.id,
      poi_id: pi.poi_id,
      poi_name: pi.poi_name,
      poi_category: pi.poi_category,
      alt_text: pi.alt_text || pi.caption || pi.poi_name,
      dest_name: null,
      tags: Array.isArray(tagsParsed) ? tagsParsed : [],
      quality_score: pi.quality_score,
      created_at: pi.created_at
    };
  });
}

export async function handleBrandVisualsAggregate(req, res) {
  const destId = Number(req.query.destinationId || 0);
  const sourceParam = String(req.query.source || 'all').toLowerCase();
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || DEFAULT_LIMIT));

  if (!destId) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId required' } });
  }
  if (!ALLOWED_SOURCES.includes(sourceParam)) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_SOURCE', message: `source must be one of: ${ALLOWED_SOURCES.join(', ')}` } });
  }

  try {
    const wantBrand = sourceParam === 'all' || sourceParam === 'brand';
    const wantMedia = sourceParam === 'all' || sourceParam === 'media';
    const wantPoi = sourceParam === 'all' || sourceParam === 'poi';

    const [brandItems, mediaItems, poiItems] = await Promise.all([
      wantBrand ? fetchBrandVisuals(destId) : Promise.resolve([]),
      wantMedia ? fetchMediaVisuals(destId, limit) : Promise.resolve([]),
      wantPoi ? fetchPoiVisuals(destId, limit) : Promise.resolve([])
    ]);

    const items = [...brandItems, ...mediaItems, ...poiItems].slice(0, limit);

    return res.json({
      success: true,
      data: {
        items,
        total: items.length,
        by_source: {
          brand: brandItems.length,
          media: mediaItems.length,
          poi: poiItems.length
        },
        destination_id: destId,
        source: sourceParam,
        limit
      }
    });
  } catch (error) {
    logger.error('[brand-visuals] error:', error);
    return res.status(500).json({ success: false, error: { code: 'BRAND_VISUALS_ERROR', message: error.message } });
  }
}
