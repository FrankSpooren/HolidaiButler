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

// Category color mapping — from Customer Portal categoryConfig.ts gradient primary colors
const CATEGORY_COLORS: Record<string, string> = {
  // Calpe (EN) — Customer Portal gradient primaries
  'food & drinks': '#4f766b', 'restaurants': '#4f766b', 'restaurant': '#4f766b',
  'cafe': '#4f766b', 'bar': '#4f766b',
  'beaches & nature': '#b4942e', 'beaches': '#b4942e',
  'culture & history': '#253444', 'culture': '#253444', 'museum': '#253444',
  'recreation': '#354f48', 'entertainment': '#354f48', 'leisure': '#354f48',
  'active': '#016193', 'sports & recreation': '#016193',
  'shopping': '#b4892e', 'shops': '#b4892e',
  'health & wellbeing': '#004568', 'health': '#004568', 'wellness': '#004568',
  'practical': '#016193', 'services': '#016193',
  'nightlife': '#7B2D8E',
  // Texel (NL) — Customer Portal gradient primaries
  'eten & drinken': '#E53935',
  'natuur': '#7CB342', 'nature': '#7CB342', 'strand': '#7CB342', 'park': '#7CB342',
  'cultuur & historie': '#004B87', 'cultuur': '#004B87', 'musea': '#004B87',
  'actief': '#FF6B00', 'sport': '#FF6B00',
  'winkelen': '#AB47BC',
  'recreatief': '#354f48', 'amusement': '#354f48',
  'gezondheid & verzorging': '#43A047',
  'praktisch': '#607D8B',
};

const DEFAULT_COLOR = '#30c59b';

function getCategoryColor(category?: string): string {
  if (!category) return DEFAULT_COLOR;
  return CATEGORY_COLORS[category.toLowerCase()] ?? DEFAULT_COLOR;
}

// Legend: deduplicate to show one entry per color
const LEGEND_ITEMS = [
  { label: 'Food & Drinks', color: '#4f766b' },
  { label: 'Nature', color: '#7CB342' },
  { label: 'Culture', color: '#253444' },
  { label: 'Active', color: '#016193' },
  { label: 'Shopping', color: '#b4892e' },
  { label: 'Recreation', color: '#354f48' },
  { label: 'Health', color: '#004568' },
  { label: 'Practical', color: '#607D8B' },
  { label: 'Other', color: DEFAULT_COLOR },
];

export default function Map({ center, zoom = 14, categoryFilter, markers: staticMarkers }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [usedColors, setUsedColors] = useState<Set<string>>(new Set());

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

      // If static markers provided (e.g. POI detail page), render only those — skip fetch
      if (staticMarkers && staticMarkers.length > 0) {
        const colors = new Set<string>();
        for (const m of staticMarkers) {
          if (!m.lat || !m.lng) continue;
          const color = getCategoryColor(m.category);
          colors.add(color);
          const icon = L.divIcon({
            className: 'hb-marker',
            html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -14],
          });
          L.marker([m.lat, m.lng], { icon })
            .bindPopup(
              `<div style="min-width:150px">` +
              `<strong>${m.name}</strong>` +
              (m.category ? `<br><span style="color:#64748b;font-size:12px">${m.category}</span>` : '') +
              (m.rating ? `<br><span style="color:#f59e0b">\u2605</span> ${m.rating}` : '') +
              (m.id ? `<br><a href="/poi/${m.id}" style="color:#3b82f6;font-size:12px">Details \u2192</a>` : '') +
              `</div>`
            )
            .addTo(map);
        }
        if (!cancelled) setUsedColors(colors);
        return; // Done — no fetch needed
      }

      // Fetch ALL POIs (for standalone Map block on explore/overview pages)
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

        const colors = new Set<string>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const markers: any[] = [];
        for (const poi of pois) {
          if (!poi.latitude || !poi.longitude) continue;

          const color = getCategoryColor(poi.category);
          colors.add(color);

          const icon = L.divIcon({
            className: 'hb-marker',
            html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -14],
          });

          const marker = L.marker([poi.latitude, poi.longitude], { icon })
            .bindPopup(
              `<div style="min-width:150px">` +
              `<strong>${poi.name}</strong>` +
              (poi.category ? `<br><span style="color:#64748b;font-size:12px">${poi.category}</span>` : '') +
              (poi.rating ? `<br><span style="color:#f59e0b">\u2605</span> ${poi.rating}` : '') +
              `<br><a href="/poi/${poi.id}" style="color:#3b82f6;font-size:12px">Details \u2192</a>` +
              `</div>`
            )
            .addTo(map);
          markers.push(marker);
        }

        if (!cancelled) setUsedColors(colors);

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

  const visibleLegend = LEGEND_ITEMS.filter(item => usedColors.has(item.color));

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
      {visibleLegend.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3 justify-center">
          {visibleLegend.map(item => (
            <div key={item.color} className="flex items-center gap-1.5 text-xs text-muted">
              <span
                className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                style={{ backgroundColor: item.color, border: '1.5px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
              />
              {item.label}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
