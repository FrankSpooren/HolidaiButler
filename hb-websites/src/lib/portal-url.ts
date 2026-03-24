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
  if (typeof window === 'undefined') return 'https://calpetrip.com';
  const host = window.location.hostname;
  return HOST_TO_PORTAL[host] || `https://${host}`;
}
