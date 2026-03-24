/**
 * Destination-aware base URL mapping.
 * Used by mobile components to link to the correct customer-portal domain.
 */
const DESTINATION_DOMAINS: Record<string, string> = {
  calpe: 'https://calpetrip.com',
  texel: 'https://texelmaps.nl',
  warrewijzer: 'https://warrewijzer.be',
  alicante: 'https://alicante.holidaibutler.com',
};

/**
 * Get the customer-portal base URL for a given tenant slug.
 * Falls back to calpetrip.com if unknown.
 */
export function getPortalBaseUrl(tenantSlug?: string): string {
  return DESTINATION_DOMAINS[tenantSlug || 'calpe'] || DESTINATION_DOMAINS.calpe;
}
