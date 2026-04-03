/**
 * Pexels API Client — Stock photo source for content images
 * EU-compliant: free to use with attribution (CC0-like license).
 * Rate limit: 200 requests/hour, 20,000/month.
 *
 * @version 1.0.0
 */

import logger from '../../../utils/logger.js';

const PEXELS_API_URL = 'https://api.pexels.com/v1';
const apiKey = process.env.PEXELS_API_KEY;

/**
 * Search Pexels for images matching a query
 * @param {string} query - Search query
 * @param {number} perPage - Number of results (max 80)
 * @returns {Array} Normalized photo objects
 */
export async function searchPexels(query, perPage = 5) {
  if (!apiKey) {
    logger.debug('[Pexels] PEXELS_API_KEY not configured — skipping');
    return [];
  }

  try {
    const url = `${PEXELS_API_URL}/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;
    const response = await fetch(url, {
      headers: {
        'Authorization': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn(`[Pexels] API error ${response.status}: ${errorText}`);
      return [];
    }

    const data = await response.json();
    return (data.photos || []).map(photo => ({
      id: `pexels_${photo.id}`,
      urls: {
        regular: photo.src?.large2x || photo.src?.large,
        small: photo.src?.medium,
        thumb: photo.src?.small,
      },
      user: {
        name: photo.photographer,
        username: photo.photographer_url?.split('/').pop() || '',
        profile: photo.photographer_url,
      },
      links: {
        html: photo.url,
      },
      description: photo.alt || '',
      width: photo.width,
      height: photo.height,
      source: 'pexels',
    }));
  } catch (error) {
    logger.error('[Pexels] Search failed:', error.message);
    return [];
  }
}

export default { searchPexels };
