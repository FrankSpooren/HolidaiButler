/**
 * Unsplash API Client — Stock photo fallback for content images
 * EU-compliant: only public search queries sent, images downloaded to Hetzner (EU).
 * Rate limit: 50 requests/hour (free tier).
 *
 * @version 1.0.0
 */

import logger from '../../../utils/logger.js';

const UNSPLASH_API_URL = 'https://api.unsplash.com';
const accessKey = process.env.UNSPLASH_ACCESS_KEY;

/**
 * Search Unsplash for images matching a query
 * @param {string} query - Search query
 * @param {number} perPage - Number of results (max 30)
 * @returns {Array} Unsplash photo objects
 */
export async function searchUnsplash(query, perPage = 5) {
  if (!accessKey) {
    logger.debug('[Unsplash] UNSPLASH_ACCESS_KEY not configured — skipping');
    return [];
  }

  try {
    const url = `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn(`[Unsplash] API error ${response.status}: ${errorText}`);
      return [];
    }

    const data = await response.json();
    return (data.results || []).map(photo => ({
      id: photo.id,
      urls: {
        regular: photo.urls?.regular,
        small: photo.urls?.small,
        thumb: photo.urls?.thumb,
      },
      user: {
        name: photo.user?.name,
        username: photo.user?.username,
        profile: photo.user?.links?.html,
      },
      links: {
        html: photo.links?.html,
        download: photo.links?.download_location,
      },
      description: photo.description || photo.alt_description,
      width: photo.width,
      height: photo.height,
    }));
  } catch (error) {
    logger.error('[Unsplash] Search failed:', error.message);
    return [];
  }
}

/**
 * Track Unsplash download (required by TOS)
 * @param {string} downloadLocation - Photo download_location URL
 */
export async function trackDownload(downloadLocation) {
  if (!accessKey || !downloadLocation) return;

  try {
    await fetch(downloadLocation, {
      headers: { 'Authorization': `Client-ID ${accessKey}` },
    });
  } catch (e) {
    logger.warn('[Unsplash] Download tracking failed:', e.message);
  }
}

export default { searchUnsplash, trackDownload };
