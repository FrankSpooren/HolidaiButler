/**
 * Image Selection Engine — Smart image matching for content items
 * Matches content keywords to POI images, media library, and Unsplash fallback.
 *
 * @version 1.0.0
 */

import { mysqlSequelize } from '../../../config/database.js';
import { searchUnsplash } from './unsplashClient.js';
import logger from '../../../utils/logger.js';

/**
 * Select best matching images for a content item
 * @param {Object} contentItem - { title, body_en, poi_id, destination_id, content_type, target_platform }
 * @param {number} destinationId
 * @returns {Array} Ranked image candidates with source labels
 */
export async function selectImages(contentItem, destinationId) {
  const keywords = extractKeywords(
    (contentItem.title || '') + ' ' + (contentItem.body_en || '')
  );
  const candidates = [];

  try {
    // 1. POI-based match: if content is about a specific POI
    if (contentItem.poi_id) {
      const [poiImages] = await mysqlSequelize.query(
        `SELECT i.id, i.poi_id, i.image_url, i.local_path, i.display_order, p.name as poi_name
         FROM imageurls i JOIN POI p ON i.poi_id = p.id
         WHERE i.poi_id = :poiId
         ORDER BY i.display_order ASC LIMIT 5`,
        { replacements: { poiId: contentItem.poi_id } }
      );
      candidates.push(...poiImages.map(img => ({
        source: 'poi',
        id: img.id,
        poi_id: img.poi_id,
        poi_name: img.poi_name,
        url: buildImageUrl(img),
        relevance: 1.0,
      })));
    }

    // 2. Keyword match: find POIs matching content keywords
    if (candidates.length < 5 && keywords.length > 0) {
      const keywordConditions = keywords.slice(0, 5).map(kw =>
        `(p.name LIKE :kw_${kw.replace(/[^a-z]/gi, '')} OR p.category LIKE :kw_${kw.replace(/[^a-z]/gi, '')})`
      ).join(' OR ');

      const replacements = { destId: destinationId };
      keywords.slice(0, 5).forEach(kw => {
        replacements[`kw_${kw.replace(/[^a-z]/gi, '')}`] = `%${kw}%`;
      });

      if (keywordConditions) {
        const [matchingPois] = await mysqlSequelize.query(
          `SELECT DISTINCT p.id, p.name FROM POI p
           WHERE p.destination_id = :destId AND p.is_active = 1 AND (${keywordConditions})
           LIMIT 10`,
          { replacements }
        );

        for (const poi of matchingPois) {
          if (candidates.some(c => c.poi_id === poi.id)) continue;
          const [imgs] = await mysqlSequelize.query(
            `SELECT id, poi_id, image_url, local_path, display_order FROM imageurls WHERE poi_id = :poiId ORDER BY display_order ASC LIMIT 2`,
            { replacements: { poiId: poi.id } }
          );
          candidates.push(...imgs.map(img => ({
            source: 'keyword_match',
            id: img.id,
            poi_id: img.poi_id,
            poi_name: poi.name,
            url: buildImageUrl(img),
            relevance: 0.7,
          })));
        }
      }
    }

    // 3. Media Library: search uploaded content images
    if (candidates.length < 5) {
      const [mediaMatches] = await mysqlSequelize.query(
        `SELECT id, filename, file_path, alt_text, mime_type FROM media
         WHERE destination_id = :destId AND mime_type LIKE 'image%'
         ORDER BY created_at DESC LIMIT 5`,
        { replacements: { destId: destinationId } }
      );
      candidates.push(...mediaMatches.map(m => ({
        source: 'media_library',
        id: m.id,
        url: `/storage/media/${m.file_path || m.filename}`,
        alt_text: m.alt_text,
        relevance: 0.5,
      })));
    }

    // 4. Unsplash fallback (if <3 candidates)
    if (candidates.length < 3) {
      try {
        const query = keywords.slice(0, 3).join(' ') + ' tourism';
        const unsplashResults = await searchUnsplash(query, 3);
        candidates.push(...unsplashResults.map(u => ({
          source: 'unsplash',
          id: u.id,
          url: u.urls?.regular || u.urls?.small,
          thumbnail: u.urls?.thumb,
          photographer: u.user?.name,
          unsplash_link: u.links?.html,
          relevance: 0.3,
        })));
      } catch (e) {
        logger.warn('[ImageSelector] Unsplash fallback failed:', e.message);
      }
    }
  } catch (error) {
    logger.error('[ImageSelector] Image selection failed:', error);
  }

  // Sort by relevance, return top 5
  return candidates.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
}

/**
 * Extract meaningful keywords from text for image matching
 */
function extractKeywords(text) {
  if (!text) return [];
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'this', 'that', 'it', 'its', 'has', 'have', 'had', 'not', 'no', 'your',
    'you', 'we', 'our', 'their', 'they', 'can', 'will', 'just', 'about',
    'more', 'most', 'some', 'all', 'any', 'every', 'each', 'here', 'there',
    'when', 'where', 'how', 'what', 'which', 'who', 'than', 'then',
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-záàâãäåèéêëìíîïòóôõöùúûüñçß\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w))
    .filter((w, i, arr) => arr.indexOf(w) === i) // dedupe
    .slice(0, 10);
}

/**
 * Build a full image URL from an imageurls record
 */
function buildImageUrl(img) {
  if (img.local_path) {
    const baseUrl = process.env.IMAGE_BASE_URL || 'https://test.holidaibutler.com';
    return `${baseUrl}/${img.local_path.replace(/^\//, '')}`;
  }
  return img.image_url || '';
}

export default { selectImages };
