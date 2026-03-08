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

// Category color mapping: EN (Calpe) + NL (Texel) names
const CATEGORY_COLORS: Record<string, string> = {
  // Food & Drinks (rood)
  'food & drinks': '#E53935', 'eten & drinken': '#E53935', 'restaurants': '#E53935',
  'restaurant': '#E53935', 'cafe': '#E53935', 'bar': '#E53935',
  // Beaches & Nature (groen)
  'beaches & nature': '#43A047', 'natuur': '#43A047', 'strand': '#43A047',
  'nature': '#43A047', 'beaches': '#43A047', 'park': '#43A047',
  // Culture & History (blauw)
  'culture & history': '#1565C0', 'cultuur & historie': '#1565C0', 'cultuur': '#1565C0',
  'culture': '#1565C0', 'museum': '#1565C0', 'musea': '#1565C0',
  // Active (oranje)
  'active': '#FF6F00', 'actief': '#FF6F00', 'sport': '#FF6F00', 'sports & recreation': '#FF6F00',
  // Shopping (paars)
  'shopping': '#AB47BC', 'winkelen': '#AB47BC', 'shops': '#AB47BC',
  // Recreation (cyaan)
  'recreation': '#26C6DA', 'recreatief': '#26C6DA', 'entertainment': '#26C6DA',
  'leisure': '#26C6DA', 'amusement': '#26C6DA',
  // Health & Wellbeing (lichtgroen)
  'health & wellbeing': '#66BB6A', 'gezondheid & verzorging': '#66BB6A',
  'health': '#66BB6A', 'wellness': '#66BB6A',
  // Practical (grijs)
  'practical': '#78909C', 'praktisch': '#78909C', 'services': '#78909C',
};

const DEFAULT_COLOR = '#5C6BC0';

function getCategoryColor(category?: string): string {
  if (!category) return DEFAULT_COLOR;
  return CATEGORY_COLORS[category.toLowerCase()] ?? DEFAULT_COLOR;
}

// Legend: deduplicate to show one entry per color
const LEGEND_ITEMS = [
  { label: 'Food & Drinks', color: '#E53935' },
  { label: 'Nature', color: '#43A047' },
  { label: 'Culture', color: '#1565C0' },
  { label: 'Active', color: '#FF6F00' },
  { label: 'Shopping', color: '#AB47BC' },
  { label: 'Recreation', color: '#26C6DA' },
  { label: 'Health', color: '#66BB6A' },
  { label: 'Practical', color: '#78909C' },
  { label: 'Other', color: DEFAULT_COLOR },
];

export default function Map({ center, zoom = 14, categoryFilter }: MapProps) {
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
