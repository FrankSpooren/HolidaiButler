/**
 * Client-side helper: determine the customer-portal base URL
 * based on the current hostname. Used by mobile components for external links.
 */
const HOST_TO_PORTAL: Record<string, string> = {
  'dev.holidaibutler.com': 'https://calpetrip.com',
  'calpetrip.com': 'https://calpetrip.com',
  'www.calpetrip.com': 'https://calpetrip.com',
  'dev.texelmaps.nl': 'https://texelmaps.nl',
  'texelmaps.nl': 'https://texelmaps.nl',
  'www.texelmaps.nl': 'https://texelmaps.nl',
  'dev.warrewijzer.be': 'https://warrewijzer.be',
  'warrewijzer.be': 'https://warrewijzer.be',
};

export function getPortalUrl(): string {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname;
  // Return empty string for relative URLs when running on Next.js (same origin)
  // Only return full URL for external customer-portal links
  if (HOST_TO_PORTAL[host]) return '';
  return `https://${host}`;
}

/**
 * Determine destination slug from current hostname.
 * Used by components that need destination-specific config (ProgramCard, CategoryBrowser).
 */
const HOST_TO_SLUG: Record<string, string> = {
  'calpetrip.com': 'calpe', 'www.calpetrip.com': 'calpe', 'dev.holidaibutler.com': 'calpe',
  'texelmaps.nl': 'texel', 'www.texelmaps.nl': 'texel', 'dev.texelmaps.nl': 'texel',
  'warrewijzer.be': 'warrewijzer', 'www.warrewijzer.be': 'warrewijzer', 'dev.warrewijzer.be': 'warrewijzer',
};

export function getDestinationSlug(): string {
  if (typeof window === 'undefined') return 'calpe';
  return HOST_TO_SLUG[window.location.hostname] || 'calpe';
}
