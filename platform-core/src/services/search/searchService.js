/**
 * Unified Search Service — VII-E2 Batch A, Block A1
 *
 * Provides FULLTEXT-powered search across POIs, Events, and Articles (Content Studio blogs).
 * Used by the public /api/v1/search endpoint.
 *
 * @module services/search/searchService
 * @version 1.0.0
 */

import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';

const { QueryTypes } = (await import('sequelize')).default;

/**
 * Search POIs using FULLTEXT index.
 * Falls back to LIKE if FULLTEXT yields 0 results (handles short queries).
 */
export async function searchPois(destinationId, query, limit, lang) {
  try {
    // FULLTEXT search across name + enriched descriptions (all languages in one index)
    let results = await mysqlSequelize.query(`
      SELECT
        id, name, category, tier, rating, google_review_count AS review_count,
        latitude, longitude,
        enriched_tile_description AS tile_en,
        enriched_tile_description_nl AS tile_nl,
        enriched_tile_description_de AS tile_de,
        enriched_tile_description_es AS tile_es,
        MATCH(name, enriched_detail_description, enriched_detail_description_nl,
              enriched_detail_description_de, enriched_detail_description_es)
          AGAINST (:q IN NATURAL LANGUAGE MODE) AS relevance_score,
        'poi' AS result_type
      FROM POI
      WHERE destination_id = :destId
        AND is_active = 1
        AND MATCH(name, enriched_detail_description, enriched_detail_description_nl,
                  enriched_detail_description_de, enriched_detail_description_es)
          AGAINST (:q IN NATURAL LANGUAGE MODE)
      ORDER BY relevance_score DESC
      LIMIT :lim
    `, {
      replacements: { q: query, destId: destinationId, lim: parseInt(limit) },
      type: QueryTypes.SELECT,
    });

    // Fallback to LIKE for very short queries (FULLTEXT ignores words < ft_min_word_len)
    if (results.length === 0 && query.length >= 2) {
      const likePattern = `%${query}%`;
      results = await mysqlSequelize.query(`
        SELECT
          id, name, category, tier, rating, google_review_count AS review_count,
          latitude, longitude,
          enriched_tile_description AS tile_en,
          enriched_tile_description_nl AS tile_nl,
          enriched_tile_description_de AS tile_de,
          enriched_tile_description_es AS tile_es,
          1.0 AS relevance_score,
          'poi' AS result_type
        FROM POI
        WHERE destination_id = :destId
          AND is_active = 1
          AND (name LIKE :like OR category LIKE :like)
        ORDER BY rating DESC
        LIMIT :lim
      `, {
        replacements: { destId: destinationId, like: likePattern, lim: parseInt(limit) },
        type: QueryTypes.SELECT,
      });
    }

    // Pick tile description in requested language
    return results.map(r => ({
      id: r.id,
      name: r.name,
            category: r.category,
      tier: r.tier,
      rating: r.rating ? parseFloat(r.rating) : null,
      review_count: r.review_count || 0,
      latitude: r.latitude ? parseFloat(r.latitude) : null,
      longitude: r.longitude ? parseFloat(r.longitude) : null,
      tile_description: r[`tile_${lang}`] || r.tile_en || null,
      relevance_score: parseFloat(r.relevance_score) || 0,
      result_type: 'poi',
    }));
  } catch (err) {
    logger.error('[SearchService] POI search error:', err.message);
    return [];
  }
}

/**
 * Search Events (agenda table) using FULLTEXT index.
 * Only returns future events (date >= today).
 */
export async function searchEvents(destinationId, query, limit, lang) {
  try {
    let results = await mysqlSequelize.query(`
      SELECT
        a.id, a.title, a.short_description, a.date, a.time,
        a.location_name, a.location_lat, a.location_lon, a.image, a.url,
        a.title_nl, a.title_de, a.title_es, a.title_en,
        a.short_description_nl, a.short_description_de, a.short_description_es, a.short_description_en,
        MATCH(a.title, a.short_description, a.title_en, a.short_description_en,
              a.title_nl, a.short_description_nl, a.title_de, a.short_description_de,
              a.title_es, a.short_description_es)
          AGAINST (:q IN NATURAL LANGUAGE MODE) AS relevance_score,
        'event' AS result_type
      FROM agenda a
      WHERE a.destination_id = :destId
        AND a.date >= CURDATE()
        AND MATCH(a.title, a.short_description, a.title_en, a.short_description_en,
                  a.title_nl, a.short_description_nl, a.title_de, a.short_description_de,
                  a.title_es, a.short_description_es)
          AGAINST (:q IN NATURAL LANGUAGE MODE)
      ORDER BY relevance_score DESC
      LIMIT :lim
    `, {
      replacements: { q: query, destId: destinationId, lim: parseInt(limit) },
      type: QueryTypes.SELECT,
    });

    // LIKE fallback
    if (results.length === 0 && query.length >= 2) {
      const likePattern = `%${query}%`;
      results = await mysqlSequelize.query(`
        SELECT
          a.id, a.title, a.short_description, a.date, a.time,
          a.location_name, a.location_lat, a.location_lon, a.image, a.url,
          a.title_nl, a.title_de, a.title_es, a.title_en,
          a.short_description_nl, a.short_description_de, a.short_description_es, a.short_description_en,
          1.0 AS relevance_score,
          'event' AS result_type
        FROM agenda a
        WHERE a.destination_id = :destId
          AND a.date >= CURDATE()
          AND (a.title LIKE :like OR a.location_name LIKE :like)
        ORDER BY a.date ASC
        LIMIT :lim
      `, {
        replacements: { destId: destinationId, like: likePattern, lim: parseInt(limit) },
        type: QueryTypes.SELECT,
      });
    }

    return results.map(r => {
      const title = r[`title_${lang}`] || r.title_en || r.title || '';
      const desc = r[`short_description_${lang}`] || r.short_description_en || r.short_description || '';
      return {
        id: r.id,
        title,
        description: desc,
        date: r.date,
        time: r.time,
        location_name: r.location_name,
        latitude: r.location_lat ? parseFloat(r.location_lat) : null,
        longitude: r.location_lon ? parseFloat(r.location_lon) : null,
        image: r.image,
        url: r.url,
        relevance_score: parseFloat(r.relevance_score) || 0,
        result_type: 'event',
      };
    });
  } catch (err) {
    logger.error('[SearchService] Event search error:', err.message);
    return [];
  }
}

/**
 * Search Articles (content_items with content_type='blog' and approval_status='published').
 */
export async function searchArticles(destinationId, query, limit, lang) {
  try {
    let results = await mysqlSequelize.query(`
      SELECT
        c.id, c.title, c.title_en, c.title_nl, c.title_de, c.title_es,
        c.body_en, c.body_nl, c.body_de, c.body_es,
        c.published_at, c.media_ids, c.seo_data,
        MATCH(c.title, c.title_en, c.title_nl, c.title_de, c.title_es,
              c.body_en, c.body_nl, c.body_de, c.body_es)
          AGAINST (:q IN NATURAL LANGUAGE MODE) AS relevance_score,
        'article' AS result_type
      FROM content_items c
      WHERE c.destination_id = :destId
        AND c.content_type = 'blog'
        AND c.approval_status = 'published'
        AND MATCH(c.title, c.title_en, c.title_nl, c.title_de, c.title_es,
                  c.body_en, c.body_nl, c.body_de, c.body_es)
          AGAINST (:q IN NATURAL LANGUAGE MODE)
      ORDER BY relevance_score DESC
      LIMIT :lim
    `, {
      replacements: { q: query, destId: destinationId, lim: parseInt(limit) },
      type: QueryTypes.SELECT,
    });

    // LIKE fallback
    if (results.length === 0 && query.length >= 2) {
      const likePattern = `%${query}%`;
      results = await mysqlSequelize.query(`
        SELECT
          c.id, c.title, c.title_en, c.title_nl, c.title_de, c.title_es,
          c.body_en, c.body_nl, c.body_de, c.body_es,
          c.published_at, c.media_ids, c.seo_data,
          1.0 AS relevance_score,
          'article' AS result_type
        FROM content_items c
        WHERE c.destination_id = :destId
          AND c.content_type = 'blog'
          AND c.approval_status = 'published'
          AND (c.title LIKE :like OR c.title_en LIKE :like OR c.title_nl LIKE :like)
        ORDER BY c.published_at DESC
        LIMIT :lim
      `, {
        replacements: { destId: destinationId, like: likePattern, lim: parseInt(limit) },
        type: QueryTypes.SELECT,
      });
    }

    return results.map(r => {
      const title = r[`title_${lang}`] || r.title_en || r.title || '';
      const bodyField = `body_${lang}`;
      const body = r[bodyField] || r.body_en || '';
      // Truncate body to first 200 chars for snippet
      const snippet = body.replace(/<[^>]+>/g, '').substring(0, 200);
      return {
        id: r.id,
        title,
        snippet,
        published_at: r.published_at,
        relevance_score: parseFloat(r.relevance_score) || 0,
        result_type: 'article',
      };
    });
  } catch (err) {
    logger.error('[SearchService] Article search error:', err.message);
    return [];
  }
}

/**
 * Log search event for analytics.
 */
export async function logSearchEvent(destinationId, query, resultCount) {
  try {
    await mysqlSequelize.query(`
      INSERT INTO search_logs (destination_id, query, result_count, searched_at)
      VALUES (:destId, :q, :cnt, NOW())
    `, {
      replacements: { destId: destinationId, q: query.substring(0, 255), cnt: resultCount },
      type: QueryTypes.INSERT,
    });
  } catch {
    // search_logs table might not exist yet — silent fail, non-critical
  }
}
