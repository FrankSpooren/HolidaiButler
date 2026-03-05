import { NextRequest, NextResponse } from 'next/server';
import type { TenantMapping } from '@/types/tenant';

const DOMAIN_MAP: Record<string, TenantMapping> = {
  'holidaibutler.com': { slug: 'calpe', defaultLocale: 'nl' },
  'www.holidaibutler.com': { slug: 'calpe', defaultLocale: 'nl' },
  'calpe.holidaibutler.com': { slug: 'calpe', defaultLocale: 'nl' },
  'texelmaps.nl': { slug: 'texel', defaultLocale: 'nl' },
  'www.texelmaps.nl': { slug: 'texel', defaultLocale: 'nl' },
  'texel.holidaibutler.com': { slug: 'texel', defaultLocale: 'nl' },
  'warrewijzer.be': { slug: 'warrewijzer', defaultLocale: 'nl' },
  'www.warrewijzer.be': { slug: 'warrewijzer', defaultLocale: 'nl' },
  'alicante.holidaibutler.com': { slug: 'alicante', defaultLocale: 'es' },
};

const DEFAULT_TENANT: TenantMapping = { slug: 'calpe', defaultLocale: 'nl' };

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')?.replace(/:\d+$/, '') ?? '';
  const tenant = DOMAIN_MAP[hostname] ?? DEFAULT_TENANT;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', tenant.slug);
  requestHeaders.set('x-tenant-locale', tenant.defaultLocale);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)',
  ],
};
