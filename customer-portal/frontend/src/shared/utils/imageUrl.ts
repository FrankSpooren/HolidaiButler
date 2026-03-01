/**
 * Image URL utilities (Fase II-B.4)
 *
 * Constructs responsive image URLs using the backend image resize proxy.
 * Supports srcSet generation for responsive images.
 *
 * Image resize endpoint: /api/v1/img/<path>?w=<width>&q=<quality>&f=<format>
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.holidaibutler.com/api/v1';

// Standard breakpoints for responsive images
export const IMAGE_SIZES = {
  thumbnail: 200,   // POI tile cards
  small: 400,       // List view, mobile detail
  medium: 600,      // Detail view, tablet
  large: 800,       // Detail view, desktop
  full: 1200,       // Lightbox, full screen
} as const;

/**
 * Extract the relative image path from a full URL or local path.
 * Input:  "https://test.holidaibutler.com/poi-images/171/abc.jpg"
 *         "/poi-images/171/abc.jpg"
 *         "/poi-images/texel/ChIJ.../image_1.jpg"
 * Output: "171/abc.jpg" or "texel/ChIJ.../image_1.jpg"
 */
function extractImagePath(url: string): string | null {
  if (!url) return null;

  // Match /poi-images/ pattern and extract the rest
  const match = url.match(/\/poi-images\/(.+)$/);
  if (match) return match[1];

  // If it's already a relative path (no /poi-images/ prefix)
  if (!url.startsWith('http') && !url.startsWith('/')) {
    return url;
  }

  return null;
}

/**
 * Get a resized image URL via the backend proxy.
 *
 * @param originalUrl - The original image URL (from POI data)
 * @param width - Target width (will be snapped to nearest allowed size)
 * @param quality - JPEG quality 1-100 (default 80)
 * @param format - Output format: 'jpg' | 'webp' (default 'jpg')
 * @returns Resized image URL or original if path can't be extracted
 */
export function getResizedImageUrl(
  originalUrl: string,
  width: number,
  quality = 80,
  format: 'jpg' | 'webp' = 'jpg'
): string {
  const path = extractImagePath(originalUrl);
  if (!path) return originalUrl; // Fallback to original

  const params = new URLSearchParams();
  params.set('w', String(width));
  if (quality !== 80) params.set('q', String(quality));
  if (format !== 'jpg') params.set('f', format);

  return `${API_BASE}/img/${path}?${params.toString()}`;
}

/**
 * Generate srcSet string for responsive images.
 *
 * @param originalUrl - The original image URL
 * @param sizes - Array of widths to include (default: [200, 400, 600, 800])
 * @param quality - JPEG quality (default 80)
 * @returns srcSet string for use in <img> tag
 */
export function getImageSrcSet(
  originalUrl: string,
  sizes: number[] = [IMAGE_SIZES.thumbnail, IMAGE_SIZES.small, IMAGE_SIZES.medium, IMAGE_SIZES.large],
  quality = 80
): string {
  const path = extractImagePath(originalUrl);
  if (!path) return ''; // Can't generate srcSet without path

  return sizes
    .map(w => `${API_BASE}/img/${path}?w=${w}&q=${quality} ${w}w`)
    .join(', ');
}

/**
 * Get the default `sizes` attribute for common use cases.
 */
export const IMAGE_SIZES_ATTR = {
  // POI tile card: 2 columns mobile, 3 tablet, 4 desktop
  tile: '(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw',
  // List view thumbnail
  listThumb: '120px',
  // Detail modal: full width mobile, 60% desktop (2-col layout)
  detail: '(max-width: 768px) 100vw, 60vw',
  // Lightbox: always full viewport
  lightbox: '100vw',
} as const;
