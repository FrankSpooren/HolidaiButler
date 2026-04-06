import { NextRequest, NextResponse } from 'next/server';
import type { TenantMapping } from '@/types/tenant';

const DOMAIN_MAP: Record<string, TenantMapping> = {
  'holidaibutler.com': { slug: 'calpe', defaultLocale: 'nl' },
  'www.holidaibutler.com': { slug: 'calpe', defaultLocale: 'nl' },
  'calpetrip.com': { slug: 'calpe', defaultLocale: 'en' },
  'www.calpetrip.com': { slug: 'calpe', defaultLocale: 'en' },
  'calpe.holidaibutler.com': { slug: 'calpe', defaultLocale: 'nl' },
  'dev.holidaibutler.com': { slug: 'calpe', defaultLocale: 'nl' },
  'texelmaps.nl': { slug: 'texel', defaultLocale: 'nl' },
  'www.texelmaps.nl': { slug: 'texel', defaultLocale: 'nl' },
  'dev.texelmaps.nl': { slug: 'texel', defaultLocale: 'nl' },
  'test.texelmaps.nl': { slug: 'texel', defaultLocale: 'nl' },
  'texel.holidaibutler.com': { slug: 'texel', defaultLocale: 'nl' },
  'warrewijzer.be': { slug: 'warrewijzer', defaultLocale: 'nl' },
  'www.warrewijzer.be': { slug: 'warrewijzer', defaultLocale: 'nl' },
  'alicante.holidaibutler.com': { slug: 'alicante', defaultLocale: 'es' },
};

const DEFAULT_TENANT: TenantMapping = { slug: 'calpe', defaultLocale: 'nl' };

// Known subdomains that should NOT be treated as tenant slugs
const RESERVED_SUBDOMAINS = new Set(['www', 'dev', 'test', 'api', 'admin', 'mail', 'staging']);

function resolveTenant(hostname: string): TenantMapping {
  // 1. Exact match in domain map (highest priority)
  const exact = DOMAIN_MAP[hostname];
  if (exact) return exact;

  // 2. Wildcard subdomain detection for *.holidaibutler.com
  if (hostname.endsWith('.holidaibutler.com')) {
    const subdomain = hostname.replace('.holidaibutler.com', '');
    if (subdomain && !RESERVED_SUBDOMAINS.has(subdomain)) {
      // Subdomain = tenant slug (e.g., "newtenant.holidaibutler.com" → slug "newtenant")
      return { slug: subdomain, defaultLocale: 'nl' };
    }
  }

  // 3. Fallback
  return DEFAULT_TENANT;
}

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')?.replace(/:\d+$/, '') ?? '';
  const tenant = resolveTenant(hostname);

  // Locale resolution: cookie > browser Accept-Language > default (EN)
  const localeCookie = request.cookies.get('hb_locale')?.value;
  const validLocales = ['nl', 'en', 'de', 'es', 'fr'];
  let locale: string;
  if (localeCookie && validLocales.includes(localeCookie)) {
    locale = localeCookie;
  } else {
    // Detect browser language from Accept-Language header
    const acceptLang = request.headers.get('accept-language') || '';
    const browserLang = acceptLang.split(',').map(l => l.split(';')[0].trim().substring(0, 2).toLowerCase()).find(l => validLocales.includes(l));
    locale = browserLang || 'en'; // fallback to EN when no match
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', tenant.slug);
  requestHeaders.set('x-tenant-locale', locale);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)',
  ],
};
