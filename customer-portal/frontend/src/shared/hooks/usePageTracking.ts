import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Pageview tracking hook — Fase 9B
 * Sends fire-and-forget pageview events to the tracking endpoint.
 * GDPR compliant: no PII (no IP, no user agent).
 */

function getPageType(pathname: string): string {
  if (pathname === '/') return 'home';
  if (pathname === '/pois') return 'poi_list';
  if (/^\/pois\/\d+/.test(pathname)) return 'poi_detail';
  if (pathname === '/chatbot' || pathname.startsWith('/chat')) return 'chatbot';
  if (pathname === '/search' || pathname.startsWith('/search')) return 'search';
  return 'other';
}

function extractPoiId(pathname: string): number | null {
  const match = pathname.match(/^\/pois\/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    const destination = import.meta.env.VITE_DESTINATION_ID || 'calpe';
    const pageType = getPageType(location.pathname);

    fetch('/api/v1/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination,
        page_type: pageType,
        url: location.pathname,
        poi_id: extractPoiId(location.pathname)
      })
    }).catch(() => {}); // fire and forget
  }, [location.pathname]);
}
