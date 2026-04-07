/**
 * Image Selection Engine — Smart image matching for content items
 * Matches content keywords to POI images, media library, and Unsplash fallback.
 *
 * @version 2.0.0 — Hybrid B/C keyword search (keywords_verified + keywords_visual FULLTEXT)
 */

import { mysqlSequelize } from '../../../config/database.js';
import { searchUnsplash } from './unsplashClient.js';
import { searchPexels } from './pexelsClient.js';
import { searchFlickr } from './flickrClient.js';
import logger from '../../../utils/logger.js';

/**
 * Select best matching images for a content item
 * @param {Object} contentItem - { title, body_en, poi_id, destination_id, content_type, target_platform }
 * @param {number} destinationId
 * @returns {Array} Ranked image candidates with source labels
 */
/**
 * Theme detection — keep in sync with contentGenerator.js THEME_MAP.
 * Maps content text to POI category filters so image selection is thematically aligned.
 */
const IMAGE_THEME_MAP = [
  { match: /\b(old town|historic|history|culture|heritage|landmark|church|monument|plaza|museum|architectur|chapel|cathedral|fortress|castle|ruins?|ancient|roman|moorish|baroque)/i,
    categories: ['Culture & History'],
    googleCategories: ['Historical landmark','Catholic church','Tourist attraction','Sculpture','Memorial','Bridge','Cultural center','Plaza','Museum','Chapel','Park','Art gallery','Monument','Mural'] },
  { match: /\b(food|restaurant|tapas|paella|dining|cuisine|gastronom|cafe|coffee|bar|wine|drink|bakery|pastr|seafood|dessert|brunch)/i,
    categories: ['Food & Drinks'],
    googleCategories: ['Restaurant','Cafe','Bar','Tapas restaurant','Bakery','Wine bar','Pizza restaurant','Seafood restaurant','Coffee shop','Pastry shop','Ice cream shop'] },
  { match: /\b(beach|sea|swim|snorkel|dive|water|coast|cala|playa|sand|sunbath|shore|mediterranean|ocean)/i,
    categories: ['Beaches & Nature'],
    googleCategories: ['Beach','Cove','Natural feature','Coastline','Marina'] },
  { match: /\b(hike|hiking|trail|mountain|nature|outdoor|walk|peñón|penon|ifach|park|view\s?point|mirador)/i,
    categories: ['Beaches & Nature','Activities & Sports'],
    googleCategories: ['Hiking area','Park','Natural feature','Mountain','Nature preserve','Scenic spot','Viewpoint'] },
  { match: /\b(family|kids|children|playground|fun|amusement)/i,
    categories: ['Activities & Sports','Family & Kids'],
    googleCategories: ['Amusement park','Playground','Water park','Family entertainment'] },
  { match: /\b(shop|shopping|market|boutique|souvenir)/i,
    categories: ['Shopping'],
    googleCategories: ['Shopping mall','Market','Boutique','Store','Souvenir store','Gift shop'] },
  { match: /\b(spa|wellness|relax|massage|yoga|meditat)/i,
    categories: ['Wellness'],
    googleCategories: ['Spa','Wellness center','Yoga studio','Massage'] },
];

/**
 * Theme detection with title-priority. Title is far more focused than body prose
 * (which often mentions food, beaches, family etc as side colour). When the title
 * matches a theme, that becomes the ONLY theme. Body fallback only when title is generic.
 */
function detectImageThemes(title, body) {
  if (!title && !body) return [];
  // Pass 1: title-only — strict, focused
  if (title) {
    const titleThemes = IMAGE_THEME_MAP.filter(t => t.match.test(title));
    if (titleThemes.length > 0) return titleThemes;
  }
  // Pass 2: body fallback — broad, take first match only to avoid dilution
  if (body) {
    const bodyThemes = IMAGE_THEME_MAP.filter(t => t.match.test(body));
    return bodyThemes.slice(0, 1);
  }
  return [];
}

/**
 * Build SQL fragments to filter images by parent POI category aligned with detected themes.
 * Returns { whereClause: string, params: object } or null if no themes detected.
 */
function buildThemeFilter(themes, paramPrefix = 'tf') {
  if (!themes || themes.length === 0) return null;
  const cats = [...new Set(themes.flatMap(t => t.categories))];
  const googleCats = [...new Set(themes.flatMap(t => t.googleCategories))];
  if (cats.length === 0 && googleCats.length === 0) return null;

  const conditions = [];
  const params = {};
  if (cats.length > 0) {
    const catKeys = cats.map((_, i) => `:${paramPrefix}_cat${i}`);
    conditions.push(`p.category IN (${catKeys.join(',')})`);
    cats.forEach((c, i) => { params[`${paramPrefix}_cat${i}`] = c; });
  }
  if (googleCats.length > 0) {
    const gcKeys = googleCats.map((_, i) => `:${paramPrefix}_gc${i}`);
    conditions.push(`p.google_category IN (${gcKeys.join(',')})`);
    googleCats.forEach((g, i) => { params[`${paramPrefix}_gc${i}`] = g; });
  }
  return { whereClause: `(${conditions.join(' OR ')})`, params };
}

export async function selectImages(contentItem, destinationId, { forSuggestion = false, excludeIds = [] } = {}) {
  const fullText = (contentItem.title || '') + ' ' + (contentItem.body_en || '');
  const keywords = extractKeywords(fullText);
  const themes = detectImageThemes(contentItem.title || '', contentItem.body_en || '');
  const themeFilter = buildThemeFilter(themes);
  const candidates = [];

  if (themes.length > 0) {
    logger.info(`[ImageSelector] Detected themes: [${themes.flatMap(t => t.categories).join(', ')}] for content "${(contentItem.title||'').substring(0,50)}"`);
  }

  // Priority: find POIs whose names appear in the generated content body
  // (grounded content has real POI names with links like calpetrip.com/pois?poi=123)
  try {
    const bodyLower = fullText.toLowerCase();
    const [namedPois] = await mysqlSequelize.query(
      `SELECT id, name FROM POI WHERE destination_id = :destId AND is_active = 1 AND CHAR_LENGTH(name) > 4
       ORDER BY review_count DESC LIMIT 50`,
      { replacements: { destId: destinationId } }
    );
    const bodyMatchedPoiIds = namedPois
      .filter(p => bodyLower.includes(p.name.toLowerCase().replace(/\.$/, '')))
      .map(p => p.id);

    if (bodyMatchedPoiIds.length > 0) {
      const [matchedImages] = await mysqlSequelize.query(
        `SELECT i.id, i.poi_id, i.image_url, i.local_path, i.display_order, p.name as poi_name
         FROM imageurls i JOIN POI p ON i.poi_id = p.id
         WHERE i.poi_id IN (${bodyMatchedPoiIds.join(',')})
         AND i.local_path IS NOT NULL
         ORDER BY i.display_order ASC LIMIT 10`
      );
      candidates.push(...matchedImages.map(img => ({
        source: 'body_poi_match',
        id: `poi:${img.id}`,
        imageurls_id: img.id,
        poi_id: img.poi_id,
        poi_name: img.poi_name,
        url: buildImageUrl(img),
        relevance: 1.0,
      })));
    }
  } catch (err) {
    logger.warn('[ImageSelector] Body POI match failed:', err.message);
  }

  // For auto-attach: content-type limieten. For suggestion UI: always show 5+ options.
  const maxImages = forSuggestion ? 6
    : contentItem.content_type === 'social_post' ? 1
    : contentItem.content_type === 'video_script' ? 1
    : 3; // blog

  // Check if this is a content_only destination (skip POI images entirely)
  let isContentOnlyDest = false;
  try {
    const [[destRow]] = await mysqlSequelize.query(
      'SELECT destination_type FROM destinations WHERE id = :id',
      { replacements: { id: Number(destinationId) } }
    );
    isContentOnlyDest = destRow?.destination_type === 'content_only';
  } catch { /* default to false */ }

  try {
    // Load already-used image IDs across all content items in this destination to ensure diversity
    const [usedRows] = await mysqlSequelize.query(
      `SELECT media_ids FROM content_items WHERE destination_id = :destId AND media_ids IS NOT NULL AND media_ids != '[]' AND media_ids != 'null'`,
      { replacements: { destId: destinationId } }
    );
    const usedImageIds = new Set();
    for (const row of usedRows) {
      const ids = typeof row.media_ids === 'string' ? JSON.parse(row.media_ids) : row.media_ids;
      if (Array.isArray(ids)) {
        ids.forEach(id => usedImageIds.add(typeof id === 'string' && id.startsWith('poi:') ? Number(id.replace('poi:', '')) : Number(id)));
      }
    }

    // Build exclude set from passed IDs (for refresh functionality)
    const excludeSet = new Set(excludeIds.map(Number).filter(n => !isNaN(n)));

    // 1. POI-based match: if content is about a specific POI (SKIP for content_only)
    if (contentItem.poi_id && !isContentOnlyDest) {
      const excludeClause = excludeSet.size > 0 ? `AND i.id NOT IN (${[...excludeSet].join(',')})` : '';
      const [poiImages] = await mysqlSequelize.query(
        `SELECT i.id, i.poi_id, i.image_url, i.local_path, i.display_order, p.name as poi_name
         FROM imageurls i JOIN POI p ON i.poi_id = p.id
         WHERE i.poi_id = :poiId ${excludeClause}
         ORDER BY i.display_order ASC LIMIT 8`,
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

    // 2a. THEME-FIRST: top-rated images from POIs whose category matches detected themes
    // This guarantees thematic relevance BEFORE falling back to keyword fuzzy matching.
    if (themeFilter && candidates.length < maxImages && !isContentOnlyDest) {
      try {
        const imgExcludeClause = excludeSet.size > 0 ? `AND i.id NOT IN (${[...excludeSet].join(',')})` : '';
        const [themeImages] = await mysqlSequelize.query(
          `SELECT i.id, i.poi_id, i.image_url, i.local_path, i.display_order,
                  p.name as poi_name, p.rating, p.review_count, p.category, p.google_category
           FROM imageurls i
           JOIN POI p ON i.poi_id = p.id
           WHERE p.destination_id = :destId AND p.is_active = 1 AND p.rating >= 4.0
             AND i.local_path IS NOT NULL
             AND ${themeFilter.whereClause}
             ${imgExcludeClause}
           ORDER BY p.rating DESC, p.review_count DESC, i.display_order ASC
           LIMIT 30`,
          { replacements: { destId: destinationId, ...themeFilter.params } }
        );
        // Dedupe by POI (max 2 per POI for diversity)
        const themePoiCount = {};
        for (const img of themeImages) {
          if (candidates.length >= maxImages * 2) break;
          if (candidates.some(c => c.id === img.id)) continue;
          themePoiCount[img.poi_id] = (themePoiCount[img.poi_id] || 0) + 1;
          if (themePoiCount[img.poi_id] > 2) continue;
          candidates.push({
            source: 'theme_match',
            id: `poi:${img.id}`,
            imageurls_id: img.id,
            poi_id: img.poi_id,
            poi_name: img.poi_name,
            url: buildImageUrl(img),
            relevance: usedImageIds.has(img.id) ? 0.6 : 0.95,
          });
        }
        logger.info(`[ImageSelector] Theme-first pass: ${candidates.length} candidates after theme filter`);
      } catch (themeErr) {
        logger.warn('[ImageSelector] Theme-first query failed:', themeErr.message);
      }
    }

    // 2b. FULLTEXT keyword match — only fills remaining slots, also theme-filtered when possible
    if (candidates.length < maxImages && keywords.length > 0 && !isContentOnlyDest) {
      const searchTerms = keywords.slice(0, 8).join(' ');
      const imgExcludeClause = excludeSet.size > 0 ? `AND i.id NOT IN (${[...excludeSet].join(',')})` : '';
      const orderClause = excludeSet.size > 0 ? 'ORDER BY relevance_score DESC, RAND()' : 'ORDER BY relevance_score DESC, i.display_order ASC';
      const themeJoin = themeFilter ? `AND ${themeFilter.whereClause}` : '';

      try {
        // FULLTEXT search across both verified (Google) and visual (Pixtral) keywords
        // Verified keywords get 2x weight via scoring
        const [keywordImages] = await mysqlSequelize.query(
          `SELECT i.id, i.poi_id, i.image_url, i.local_path, i.display_order,
                  p.name as poi_name,
                  (IFNULL(MATCH(i.keywords_verified) AGAINST(:terms IN BOOLEAN MODE), 0) * 2 +
                   IFNULL(MATCH(i.keywords_visual) AGAINST(:terms IN BOOLEAN MODE), 0)) as relevance_score
           FROM imageurls i
           JOIN POI p ON i.poi_id = p.id
           WHERE p.destination_id = :destId AND p.is_active = 1
             AND (MATCH(i.keywords_verified) AGAINST(:terms IN BOOLEAN MODE)
                  OR MATCH(i.keywords_visual) AGAINST(:terms IN BOOLEAN MODE))
             ${themeJoin}
             ${imgExcludeClause}
           ${orderClause}
           LIMIT 20`,
          { replacements: { destId: destinationId, terms: searchTerms, ...(themeFilter?.params || {}) } }
        );

        // Deduplicate by POI (max 2 per POI) and prefer unused images
        const poiCount = {};
        for (const img of keywordImages) {
          if (candidates.some(c => c.id === img.id)) continue;
          poiCount[img.poi_id] = (poiCount[img.poi_id] || 0) + 1;
          if (poiCount[img.poi_id] > 2) continue;

          candidates.push({
            source: 'keyword_match',
            id: `poi:${img.id}`,
            imageurls_id: img.id,
            poi_id: img.poi_id,
            poi_name: img.poi_name,
            url: buildImageUrl(img),
            relevance: usedImageIds.has(img.id) ? 0.3 : 0.7,
          });
        }
      } catch (ftErr) {
        // Fallback to LIKE search if FULLTEXT not available
        logger.warn('[ImageSelector] FULLTEXT search failed, falling back to LIKE:', ftErr.message);
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
              id: `poi:${img.id}`,
              imageurls_id: img.id,
              poi_id: img.poi_id,
              poi_name: poi.name,
              url: buildImageUrl(img),
              relevance: usedImageIds.has(img.id) ? 0.3 : 0.7,
            })));
          }
        }
      }
    }

    // 3. Media Library: search uploaded content images
    if (candidates.length < maxImages) {
      const mediaExcludeClause = excludeSet.size > 0 ? `AND id NOT IN (${[...excludeSet].join(',')})` : '';
      const mediaOrder = excludeSet.size > 0 ? 'ORDER BY RAND() LIMIT 5' : 'ORDER BY created_at DESC LIMIT 5';
      const [mediaMatches] = await mysqlSequelize.query(
        `SELECT id, filename, alt_text, mime_type FROM media
         WHERE destination_id = :destId AND mime_type LIKE 'image%' ${mediaExcludeClause}
         ${mediaOrder}`,
        { replacements: { destId: destinationId } }
      );
      const apiBase = process.env.API_BASE_URL || 'https://api.holidaibutler.com';
      candidates.push(...mediaMatches.map(m => ({
        source: 'media_library',
        id: `media:${m.id}`,
        media_id: m.id,
        url: `${apiBase}/media-files/${destinationId}/${m.filename}`,
        alt_text: m.alt_text,
        relevance: 0.5,
      })));
    }

    // 4. External stock photo fallback (if <3 candidates): Unsplash → Pexels → Flickr
    if (candidates.length < 3) {
      const query = keywords.slice(0, 3).join(' ') + (isContentOnlyDest ? '' : ' tourism');
      const needed = Math.max(1, 3 - candidates.length);

      // 4a. Unsplash
      try {
        const unsplashResults = await searchUnsplash(query, needed);
        candidates.push(...unsplashResults.map(u => ({
          source: 'unsplash',
          id: u.urls?.regular || u.urls?.small || u.id,
          provider_id: u.id,
          url: u.urls?.regular || u.urls?.small,
          thumbnail: u.urls?.thumb,
          photographer: u.user?.name,
          unsplash_link: u.links?.html,
          relevance: 0.3,
        })));
      } catch (e) {
        logger.warn('[ImageSelector] Unsplash fallback failed:', e.message);
      }

      // 4b. Pexels (if still need more)
      if (candidates.length < 3) {
        try {
          const pexelsResults = await searchPexels(query, needed);
          candidates.push(...pexelsResults.map(p => ({
            source: 'pexels',
            id: p.urls?.regular || p.urls?.small || p.id,
            provider_id: p.id,
            url: p.urls?.regular || p.urls?.small,
            thumbnail: p.urls?.thumb,
            photographer: p.user?.name,
            pexels_link: p.links?.html,
            relevance: 0.25,
          })));
        } catch (e) {
          logger.warn('[ImageSelector] Pexels fallback failed:', e.message);
        }
      }

      // 4c. Flickr (if still need more)
      if (candidates.length < 3) {
        try {
          const flickrResults = await searchFlickr(query, needed);
          candidates.push(...flickrResults.map(f => ({
            source: 'flickr',
            id: f.urls?.regular || f.urls?.small || f.id,
            provider_id: f.id,
            url: f.urls?.regular || f.urls?.small,
            thumbnail: f.urls?.thumb,
            photographer: f.user?.name,
            flickr_link: f.links?.html,
            relevance: 0.2,
          })));
        } catch (e) {
          logger.warn('[ImageSelector] Flickr fallback failed:', e.message);
        }
      }
    }
  } catch (error) {
    logger.error('[ImageSelector] Image selection failed:', error);
  }

  // Sort by relevance, prefer unused images, return content-type appropriate count
  return candidates.sort((a, b) => b.relevance - a.relevance).slice(0, maxImages);
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
