/**
 * Resolve asset URL for browser-facing resources (logos, favicons, images).
 *
 * Priority:
 * 1. Already absolute URL (http/https) → use as-is
 * 2. HB_ASSET_URL env var → public-facing API base URL
 * 3. HARDCODED FALLBACK → https://api.holidaibutler.com
 *
 * NEVER falls back to HB_API_URL (localhost:3001) because that is
 * server-side only and unreachable from the browser.
 *
 * This is the SINGLE source of truth for asset URL resolution.
 * Do NOT duplicate this logic elsewhere.
 */
export function resolveAssetUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const baseUrl = process.env.HB_ASSET_URL || 'https://api.holidaibutler.com';
  return `${baseUrl}${path}`;
}
