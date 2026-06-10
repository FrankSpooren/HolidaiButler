import { headers } from 'next/headers';
import { fetchTenantConfig } from '@/lib/api';
import type { WeatherWidgetProps } from '@/types/blocks';
import WeatherWidgetView, { type WeatherData } from './WeatherWidgetView';

/**
 * WeatherWidget v3 (BLOK Punt 2 — Frank UX feedback 2026-06-10)
 *
 * v3 changes vs v2:
 *   - Hybrid Server/Client split: server fetches data + passes to client view
 *   - Layout-switching gebeurt client-side via useState (geen iframe reload nodig
 *     wanneer admin live-edit postMessages stuurt)
 *   - WeatherWidgetView luistert naar postMessage('layout-update') van parent
 *     window (Page Builder iframe context) en synchroniseert layout-prop zonder
 *     refetch
 *   - WeatherWidgetSkeleton voor initial-render fallback
 *   - Provenance + validation flags doorgegeven aan view voor debug-overlay
 *
 * SSR Node fetch vereist absolute URL. baseUrl wordt geconstrueerd vanuit
 * request-headers (own host) per-tenant zonder env-var.
 */

async function fetchPublicWeather(destinationId: number, locale: string, withTip: boolean, baseUrl: string): Promise<WeatherData | null> {
  try {
    const url = `${baseUrl}/api/v1/weather/public?destinationId=${destinationId}&locale=${locale}&withTip=${withTip ? 'true' : 'false'}`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) {
      console.error('[WeatherWidget] fetchPublicWeather non-ok:', res.status, url);
      return null;
    }
    const json = await res.json();
    return json?.data || null;
  } catch (err) {
    console.error('[WeatherWidget] fetchPublicWeather error:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

export default async function WeatherWidget({ layout = 'compact', showBrandTip = false }: WeatherWidgetProps & { showBrandTip?: boolean }) {
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const locale = (headersList.get('x-tenant-locale') || 'en').toLowerCase().slice(0, 2);
  const tenant = await fetchTenantConfig(tenantSlug);
  if (!tenant?.id) return null;

  // Apache proxy chain kan komma-separated x-forwarded-host opleveren +
  // protocol-prefix; strip beide.
  const proto = (headersList.get('x-forwarded-proto') || 'https').split(',')[0].trim();
  const rawHost = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost';
  const host = rawHost.split(',')[0].trim().replace(/^https?:\/\//, '');
  const baseUrl = `${proto}://${host}`;

  const weather = await fetchPublicWeather(Number(tenant.id), locale, !!showBrandTip, baseUrl);
  if (!weather) return null;

  return (
    <WeatherWidgetView
      data={weather}
      locale={locale}
      tenantDisplayName={tenant.displayName || ''}
      initialLayout={layout}
      initialShowBrandTip={!!showBrandTip}
    />
  );
}
