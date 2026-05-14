/**
 * ContentItemResource — Enterprise DTO/Resource Pattern (Optie 4)
 *
 * Centralized hydration + shape contract for content_items responses.
 * Eliminates duplicate inline parsing/resolution logic across endpoints.
 *
 * Pattern inspired by: Laravel API Resources, Spring DTOs, .NET MediatR ResponseModels.
 * Versioned schemas (V1, V2, ...) for non-breaking schema evolution.
 *
 * Usage:
 *   const dto = await ContentItemResource.V1(itemRow, { imageBase, apiBase });
 *   res.json({ success: true, data: dto });
 *
 *   // Batch:
 *   const dtos = await ContentItemResource.collection(rows, options);
 *
 * @module resources/ContentItemResource
 * @version 1.0.0
 */

import { mysqlSequelize } from '../config/database.js';
import logger from '../utils/logger.js';

const DEFAULT_IMAGE_BASE = process.env.IMAGE_BASE_URL || 'https://test.holidaibutler.com';
const DEFAULT_API_BASE = process.env.API_BASE_URL || 'https://api.holidaibutler.com';

// ---------------------------------------------------------------------
// Internal: hydrate raw media_ids → image objects
// ---------------------------------------------------------------------

async function hydrateImages(rawIds, options = {}) {
  const { imageBase = DEFAULT_IMAGE_BASE, apiBase = DEFAULT_API_BASE, mediaCache = null } = options;
  if (!Array.isArray(rawIds) || rawIds.length === 0) return [];

  // Partition: "poi:NNN" prefixed vs. plain numeric (media library)
  const poiIds = rawIds
    .filter(id => typeof id === 'string' && id.startsWith('poi:'))
    .map(id => Number(id.replace('poi:', '')))
    .filter(id => Number.isFinite(id) && id > 0);
  const mediaIds = rawIds
    .filter(id => !(typeof id === 'string' && id.startsWith('poi:')))
    .map(id => Number(id))
    .filter(id => Number.isFinite(id) && id > 0);

  const resolved = [];

  // POI images via imageurls table
  if (poiIds.length > 0) {
    const [poiImages] = await mysqlSequelize.query(
      'SELECT id, local_path, image_url FROM imageurls WHERE id IN (:ids)',
      { replacements: { ids: poiIds } }
    );
    for (const img of poiImages) {
      const imgPath = img.local_path ? img.local_path.replace(/^\/poi-images\//, '/') : null;
      resolved.push({
        id: `poi:${img.id}`,
        url: imgPath ? `${imageBase}/api/v1/img${imgPath}?w=600&f=webp` : img.image_url,
        thumbnail: imgPath ? `${imageBase}/api/v1/img${imgPath}?w=200&f=webp` : img.image_url,
        alt_text: img.local_path ? img.local_path.split('/').pop().replace(/\.\w+$/, '') : 'POI image',
        source: 'poi',
        width: null,
        height: null,
      });
    }
  }

  // Media library images via media table (with width/height/alt_text)
  if (mediaIds.length > 0) {
    const [mediaImages] = await mysqlSequelize.query(
      'SELECT id, filename, alt_text, alt_text_nl, alt_text_en, alt_text_de, alt_text_es, destination_id, width, height, mime_type FROM media WHERE id IN (:ids)',
      { replacements: { ids: mediaIds } }
    );
    for (const img of mediaImages) {
      const fullUrl = `${apiBase}/media-files/${img.destination_id}/${img.filename}`;
      resolved.push({
        id: img.id,
        url: fullUrl,
        thumbnail: fullUrl,  // TODO: variant generation pipeline
        alt_text: img.alt_text || img.alt_text_nl || img.filename.replace(/\.\w+$/, ''),
        source: 'media',
        width: img.width || null,
        height: img.height || null,
        mime_type: img.mime_type || null,
      });
    }
  }

  // Fallback: bare numeric IDs not found in media → try imageurls (legacy)
  if (resolved.length === 0 && mediaIds.length > 0) {
    const [fallback] = await mysqlSequelize.query(
      'SELECT id, local_path, image_url FROM imageurls WHERE id IN (:ids)',
      { replacements: { ids: mediaIds } }
    );
    for (const img of fallback) {
      const imgPath = img.local_path ? img.local_path.replace(/^\/poi-images\//, '/') : null;
      resolved.push({
        id: img.id,
        url: imgPath ? `${imageBase}/api/v1/img${imgPath}?w=600&f=webp` : img.image_url,
        thumbnail: imgPath ? `${imageBase}/api/v1/img${imgPath}?w=200&f=webp` : img.image_url,
        alt_text: img.local_path ? img.local_path.split('/').pop().replace(/\.\w+$/, '') : 'image',
        source: 'imageurls',
        width: null,
        height: null,
      });
    }
  }

  // Preserve original order from rawIds
  if (resolved.length > 1 && rawIds.length > 1) {
    const orderMap = new Map();
    rawIds.forEach((rid, idx) => {
      const key = typeof rid === 'string' && rid.startsWith('poi:') ? rid : String(Number(rid));
      orderMap.set(key, idx);
    });
    resolved.sort((a, b) => {
      const aKey = typeof a.id === 'string' && a.id.startsWith('poi:') ? a.id : String(Number(a.id));
      const bKey = typeof b.id === 'string' && b.id.startsWith('poi:') ? b.id : String(Number(b.id));
      const aIdx = orderMap.has(aKey) ? orderMap.get(aKey) : 999;
      const bIdx = orderMap.has(bKey) ? orderMap.get(bKey) : 999;
      return aIdx - bIdx;
    });
  }

  return resolved;
}

// ---------------------------------------------------------------------
// Internal: JSON parse safe helpers
// ---------------------------------------------------------------------

function parseJsonSafe(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

// ---------------------------------------------------------------------
// Public: V1 resource
// ---------------------------------------------------------------------

class ContentItemResource {
  /**
   * V1 contract — hydrates a content_items row to a fully resolved DTO.
   *
   * @param {Object} item - Raw content_items row
   * @param {Object} [options]
   * @param {string} [options.imageBase]
   * @param {string} [options.apiBase]
   * @param {boolean} [options.includeBodies=true]
   * @param {boolean} [options.includeImages=true]
   * @param {boolean} [options.includeLegacyResolvedImages=true] - keep `resolved_images` alias for backward compat
   * @returns {Promise<Object>} DTO
   */
  static async V1(item, options = {}) {
    if (!item) return null;
    const {
      imageBase = DEFAULT_IMAGE_BASE,
      apiBase = DEFAULT_API_BASE,
      includeBodies = true,
      includeImages = true,
      includeLegacyResolvedImages = true,
    } = options;

    const seoData = parseJsonSafe(item.seo_data, {});
    const socialMetadata = parseJsonSafe(item.social_metadata, {});
    const keywordCluster = parseJsonSafe(item.keyword_cluster, []);
    const mediaIds = parseJsonSafe(item.media_ids, []);
    const provenance = parseJsonSafe(item.provenance, null);

    let images = [];
    if (includeImages && Array.isArray(mediaIds) && mediaIds.length > 0) {
      try {
        images = await hydrateImages(mediaIds, { imageBase, apiBase });
      } catch (err) {
        logger.warn(`[ContentItemResource] image hydration failed for item ${item.id}: ${err.message}`);
      }
    }

    const dto = {
      // Identity
      id: item.id,
      concept_id: item.concept_id || null,
      destination_id: item.destination_id,
      suggestion_id: item.suggestion_id || null,
      poi_id: item.poi_id || null,
      source_content_id: item.source_content_id || null,
      // Type & target
      content_type: item.content_type,
      target_platform: item.target_platform || null,
      target_language: item.target_language || item.language || null,
      // Title + bodies
      title: item.title || null,
      ...(includeBodies && {
        bodies: {
          nl: item.body_nl || null,
          en: item.body_en || null,
          de: item.body_de || null,
          es: item.body_es || null,
          fr: item.body_fr || null,
        },
        // Backward-compat individual body fields (deprecation path)
        body_nl: item.body_nl || null,
        body_en: item.body_en || null,
        body_de: item.body_de || null,
        body_es: item.body_es || null,
        body_fr: item.body_fr || null,
      }),
      // Workflow
      approval_status: item.approval_status,
      approved_by: item.approved_by || null,
      scheduled_at: item.scheduled_at || null,
      published_at: item.published_at || null,
      publish_url: item.publish_url || null,
      // SEO
      seo_score: item.seo_score || seoData?.overallScore || null,
      seo_data: seoData,
      seo_grade: seoData?.grade || null,
      // Keywords
      keyword_cluster: Array.isArray(keywordCluster) ? keywordCluster : [],
      // Social
      hashtags: parseJsonSafe(item.hashtags, []),
      social_metadata: socialMetadata,
      // Char counts
      char_count: item.char_count || null,
      char_limit: item.char_limit || null,
      // AI/Compliance
      ai_model: item.ai_model || null,
      ai_generated: item.ai_generated === 1 || item.ai_generated === true,
      provenance,
      // Media (Issue B fix — Optie 4 DTO)
      media_ids: Array.isArray(mediaIds) ? mediaIds : [],
      ...(includeImages && {
        images,
        ...(includeLegacyResolvedImages && { resolved_images: images }),  // alias for old frontend code
      }),
      // Timestamps
      created_at: item.created_at,
      updated_at: item.updated_at,
      // Resource versioning
      _resource_version: 'V1',
    };

    return dto;
  }

  /**
   * Hydrate a collection of items (batch).
   * @param {Array<Object>} items
   * @param {Object} [options]
   * @returns {Promise<Array<Object>>}
   */
  static async collection(items, options = {}) {
    if (!Array.isArray(items)) return [];
    return Promise.all(items.map(item => ContentItemResource.V1(item, options)));
  }

  /**
   * Lightweight V1 — skip images (for list endpoints where performance matters).
   * @param {Object} item
   * @returns {Promise<Object>}
   */
  static async V1Light(item, options = {}) {
    return ContentItemResource.V1(item, { ...options, includeImages: false });
  }
}

export { hydrateImages };
export default ContentItemResource;
