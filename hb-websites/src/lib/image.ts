/**
 * Image optimization helper — srcset/sizes generation via Image Resize Proxy
 *
 * Uses /api/v1/img/ endpoint for on-the-fly resize + format conversion.
 * Supports webp with jpg fallback.
 *
 * @module lib/image
 * @version 1.0.0 — Fase VII-D P0
 */

const ASSET_BASE = process.env.HB_ASSET_URL || 'https://api.holidaibutler.com';
const WIDTHS = [400, 600, 800, 1200] as const;

/**
 * Convert a full image URL to a resize proxy URL at a specific width.
 * Only works for POI images hosted on our server (poi-images path).
 */
function toProxyUrl(imageUrl: string, width: number, format: 'webp' | 'jpg' = 'webp'): string {
  if (!imageUrl) return '';

  // Extract path from full URL: https://test.holidaibutler.com/poi-images/texel/xxx/image_1.jpg
  // → /texel/xxx/image_1.jpg (relative to poi-images root)
  let imgPath = '';

  if (imageUrl.includes('/poi-images/')) {
    imgPath = imageUrl.split('/poi-images/')[1];
  } else if (imageUrl.startsWith('/')) {
    // Already a relative path
    imgPath = imageUrl.replace(/^\/poi-images\//, '');
  } else {
    // External URL — can't proxy, return as-is
    return imageUrl;
  }

  if (!imgPath) return imageUrl;

  return `${ASSET_BASE}/api/v1/img/${imgPath}?w=${width}&f=${format}`;
}

/**
 * Generate srcSet string for responsive images.
 * Returns srcSet for webp format at standard widths.
 */
export function generateSrcSet(imageUrl: string): string {
  if (!imageUrl || !imageUrl.includes('/poi-images/')) return '';

  return WIDTHS
    .map(w => `${toProxyUrl(imageUrl, w)} ${w}w`)
    .join(', ');
}

/**
 * Generate optimized image URL at a specific width.
 */
export function optimizedImageUrl(imageUrl: string, width: number = 600): string {
  if (!imageUrl || !imageUrl.includes('/poi-images/')) return imageUrl;
  return toProxyUrl(imageUrl, width);
}

/**
 * Default sizes attribute for responsive images.
 */
export const DEFAULT_SIZES = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
export const FULL_WIDTH_SIZES = '100vw';
export const HALF_WIDTH_SIZES = '(max-width: 640px) 100vw, 50vw';
