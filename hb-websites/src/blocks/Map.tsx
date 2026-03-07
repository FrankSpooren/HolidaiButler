'use client';

import { useEffect, useRef, useState } from 'react';
import type { MapProps } from '@/types/blocks';
import 'leaflet/dist/leaflet.css';

interface MapPOI {
  id: number;
  name: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  rating?: number;
}

export default function Map({ center, zoom = 14, categoryFilter }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let cancelled = false;

    const loadMap = async () => {
      const L = (await import('leaflet')).default;

      // Fix Leaflet default marker icons (known webpack/bundler issue)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (cancelled || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        center: (center as [number, number]) ?? [38.6447, 0.046],
        zoom,
        scrollWheelZoom: false,
      });

      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Fetch POIs
      try {
        const params = new URLSearchParams();
        if (categoryFilter?.length) {
          params.set('categories', categoryFilter.join(','));
        }
        params.set('limit', '500');

        const res = await fetch(`/api/pois?${params.toString()}`);
        if (!res.ok) throw new Error(`API ${res.status}`);

        const json = await res.json();
        const pois: MapPOI[] = json.data ?? json ?? [];

        if (cancelled) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const markers: any[] = [];
        for (const poi of pois) {
          if (!poi.latitude || !poi.longitude) continue;

          const marker = L.marker([poi.latitude, poi.longitude])
            .bindPopup(
              `<div style="min-width:150px">` +
              `<strong>${poi.name}</strong>` +
              (poi.category ? `<br><span style="color:#64748b;font-size:12px">${poi.category}</span>` : '') +
              (poi.rating ? `<br><span style="color:#f59e0b">★</span> ${poi.rating}` : '') +
              `<br><a href="/poi/${poi.id}" style="color:#3b82f6;font-size:12px">Details →</a>` +
              `</div>`
            )
            .addTo(map);
          markers.push(marker);
        }

        // Auto-fit bounds if we have markers and no explicit center was provided
        if (markers.length > 0 && !center) {
          const group = L.featureGroup(markers);
          map.fitBounds(group.getBounds().pad(0.1));
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('Map: failed to load POIs', err);
        if (!cancelled) setError('Could not load map markers');
      }
    };

    loadMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center, zoom, categoryFilter]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div
        ref={mapRef}
        className="w-full h-[400px] sm:h-[500px] rounded-tenant overflow-hidden shadow-sm"
        aria-label="Interactive map"
      />
      {error && (
        <p className="text-sm text-red-500 mt-2 text-center">{error}</p>
      )}
    </section>
  );
}
