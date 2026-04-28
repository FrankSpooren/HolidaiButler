/**
 * Flickr API Client — Stock photo source for content images
 * Uses Flickr REST API with API key authentication.
 * Rate limit: 3600 requests/hour.
 * License filter: Commercial-use allowed (CC BY, CC BY-SA, CC0, US Gov).
 *
 * @version 1.0.0
 */

import logger from '../../../utils/logger.js';

const FLICKR_API_URL = 'https://api.flickr.com/services/rest';
const apiKey = process.env.FLICKR_API_KEY;

// Flickr license IDs that allow commercial use:
// 4 = CC BY 2.0, 5 = CC BY-SA 2.0, 7 = No known restrictions, 9 = CC0, 10 = PDM
const COMMERCIAL_LICENSES = '4,5,7,9,10';

/**
 * Search Flickr for images matching a query
 * @param {string} query - Search query
 * @param {number} perPage - Number of results (max 500)
 * @returns {Array} Normalized photo objects
 */
export async function searchFlickr(query, perPage = 5) {
  if (!apiKey) {
    logger.debug('[Flickr] FLICKR_API_KEY not configured — skipping');
    return [];
  }

  try {
    const params = new URLSearchParams({
      method: 'flickr.photos.search',
      api_key: apiKey,
      text: query,
      per_page: String(perPage),
      format: 'json',
      nojsoncallback: '1',
      sort: 'relevance',
      content_type: '1',           // photos only (no screenshots/illustrations)
      media: 'photos',
      license: COMMERCIAL_LICENSES, // only commercially usable
      extras: 'url_l,url_m,url_s,owner_name,description',
      orientation: 'landscape',
    });

    const response = await fetch(`${FLICKR_API_URL}?${params.toString()}`, { signal: AbortSignal.timeout(30000) });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn(`[Flickr] API error ${response.status}: ${errorText}`);
      return [];
    }

    const data = await response.json();
    if (data.stat !== 'ok') {
      logger.warn(`[Flickr] API returned stat=${data.stat}: ${data.message || ''}`);
      return [];
    }

    return (data.photos?.photo || []).map(photo => ({
      id: `flickr_${photo.id}`,
      urls: {
        regular: photo.url_l || buildFlickrUrl(photo, 'b'),
        small: photo.url_m || buildFlickrUrl(photo, 'z'),
        thumb: photo.url_s || buildFlickrUrl(photo, 't'),
      },
      user: {
        name: photo.ownername || '',
        username: photo.owner || '',
        profile: `https://www.flickr.com/photos/${photo.owner}/`,
      },
      links: {
        html: `https://www.flickr.com/photos/${photo.owner}/${photo.id}/`,
      },
      description: typeof photo.description === 'object'
        ? (photo.description._content || '').slice(0, 200)
        : (photo.description || ''),
      width: null,
      height: null,
      source: 'flickr',
    }));
  } catch (error) {
    logger.error('[Flickr] Search failed:', error.message);
    return [];
  }
}

/**
 * Build Flickr image URL from photo object
 * Size suffixes: s=75x75, t=100, m=240, z=640, b=1024, o=original
 */
function buildFlickrUrl(photo, size = 'b') {
  return `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_${size}.jpg`;
}

export default { searchFlickr };
