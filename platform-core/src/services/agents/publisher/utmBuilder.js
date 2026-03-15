/**
 * UTM Parameter Builder
 * Auto-applies UTM tracking parameters to links in social posts.
 *
 * @version 1.0.0
 */

/**
 * Build a URL with UTM parameters for tracking
 * @param {string} baseUrl - The destination URL
 * @param {Object} contentItem - Content item with id, title, content_type, campaign_tag
 * @param {string} platform - Social media platform name
 * @returns {string} URL with UTM parameters appended
 */
export function buildUtmUrl(baseUrl, contentItem, platform) {
  if (!baseUrl || typeof baseUrl !== 'string') return baseUrl;

  try {
    const url = new URL(baseUrl);

    url.searchParams.set('utm_source', platform);
    url.searchParams.set('utm_medium', 'social');
    url.searchParams.set('utm_campaign', contentItem.campaign_tag || `content_${contentItem.id}`);
    url.searchParams.set('utm_content', contentItem.content_type || 'post');

    if (contentItem.title) {
      const term = contentItem.title
        .substring(0, 50)
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .toLowerCase();
      url.searchParams.set('utm_term', term);
    }

    return url.toString();
  } catch {
    // If URL parsing fails, append as query string
    const separator = baseUrl.includes('?') ? '&' : '?';
    const params = new URLSearchParams({
      utm_source: platform,
      utm_medium: 'social',
      utm_campaign: contentItem.campaign_tag || `content_${contentItem.id}`,
      utm_content: contentItem.content_type || 'post',
    });
    return `${baseUrl}${separator}${params.toString()}`;
  }
}

/**
 * Apply UTM parameters to all URLs found in content body
 * @param {string} body - Content body text
 * @param {Object} contentItem - Content item
 * @param {string} platform - Target platform
 * @returns {string} Body with UTM-tagged URLs
 */
export function applyUtmToContent(body, contentItem, platform) {
  if (!body || typeof body !== 'string') return body;

  // Match URLs in text (http/https)
  const urlRegex = /https?:\/\/[^\s<>"')\]]+/g;

  return body.replace(urlRegex, (url) => {
    // Skip URLs that already have UTM parameters
    if (url.includes('utm_source=') || url.includes('utm_medium=')) {
      return url;
    }
    // Skip non-content URLs (social profiles, CDN, etc.)
    if (/\.(jpg|jpeg|png|gif|svg|webp|mp4|pdf)$/i.test(url)) {
      return url;
    }
    return buildUtmUrl(url, contentItem, platform);
  });
}

export default { buildUtmUrl, applyUtmToContent };
