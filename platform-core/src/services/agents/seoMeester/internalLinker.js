/**
 * Internal Linker — POI-database link suggestions based on keyword matching
 * Matches content keywords against POI names to suggest internal links.
 *
 * @version 1.0.0
 */

import { mysqlSequelize } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

/**
 * Find POI link suggestions for given content text
 * @param {string} text - Content body to scan for linkable terms
 * @param {number} destinationId
 * @param {number} maxSuggestions - Maximum number of link suggestions (default: 10)
 * @returns {Array} [{ poiId, poiName, matchedTerm, url }]
 */
export async function findLinkSuggestions(text, destinationId, maxSuggestions = 10) {
  if (!text || !destinationId) return [];

  try {
    // Get active POIs for this destination with names
    const [pois] = await mysqlSequelize.query(
      `SELECT id, name, category, enriched_tile_description_en
       FROM POI
       WHERE destination_id = :destId AND is_active = 1 AND name IS NOT NULL
       ORDER BY google_review_count DESC
       LIMIT 500`,
      { replacements: { destId: destinationId } }
    );

    if (!pois || pois.length === 0) return [];

    const textLower = text.toLowerCase();
    const suggestions = [];

    for (const poi of pois) {
      if (suggestions.length >= maxSuggestions) break;

      const poiName = poi.name.trim();
      if (poiName.length < 3) continue; // Skip very short names

      // Check if POI name appears in the content (case-insensitive)
      const nameLower = poiName.toLowerCase();
      if (textLower.includes(nameLower)) {
        suggestions.push({
          poiId: poi.id,
          poiName: poiName,
          matchedTerm: poiName,
          category: poi.category,
          url: `/poi/${poi.id}`,
          description: poi.enriched_tile_description_en || '',
        });
      }
    }

    return suggestions;
  } catch (error) {
    logger.error('[InternalLinker] Error finding link suggestions:', error);
    return [];
  }
}

/**
 * Analyze content for link density (how many internal links per 1000 words)
 */
export function analyzeLinkDensity(text) {
  if (!text) return { totalLinks: 0, density: 0, recommendation: 'Add internal links' };

  // Count markdown links and HTML links
  const markdownLinks = (text.match(/\[.+?\]\(.+?\)/g) || []).length;
  const htmlLinks = (text.match(/<a\s+href/gi) || []).length;
  const totalLinks = markdownLinks + htmlLinks;

  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  const density = wordCount > 0 ? Math.round((totalLinks / wordCount) * 1000 * 10) / 10 : 0;

  let recommendation = 'Good link density';
  if (density === 0) recommendation = 'Add 2-5 internal links to relevant POIs';
  else if (density < 2) recommendation = 'Consider adding more internal links';
  else if (density > 15) recommendation = 'Reduce link density — too many links can hurt readability';

  return { totalLinks, density, recommendation };
}

export default { findLinkSuggestions, analyzeLinkDensity };
