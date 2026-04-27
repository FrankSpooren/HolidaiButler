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
  tier?: number;
}

// Category color mapping — from Customer Portal categoryConfig.ts gradient primary colors
const CATEGORY_COLORS: Record<string, string> = {
  // Calpe (EN)
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
  // Texel (NL)
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

/** Tier badge colors — matches PoiGrid.tsx */
const TIER_COLORS: Record<number, string> = {
  1: '#D4AF37',
  2: '#C0C0C0',
  3: '#CD7F32',
};

// Legend items per locale
const LEGEND_ITEMS_I18N: Record<string, { nl: string; en: string; de: string; es: string; color: string }[]> = {
  default: [
    { nl: 'Eten & Drinken', en: 'Food & Drinks', de: 'Essen & Trinken', es: 'Comida & Bebidas', color: '#E53935' },
    { nl: 'Stranden & Natuur', en: 'Beaches & Nature', de: 'Strände & Natur', es: 'Playas & Naturaleza', color: '#7CB342' },
    { nl: 'Cultuur & Historie', en: 'Culture & History', de: 'Kultur & Geschichte', es: 'Cultura e Historia', color: '#004B87' },
    { nl: 'Actief & Sport', en: 'Active & Sport', de: 'Aktiv & Sport', es: 'Activo & Deporte', color: '#FF6B00' },
    { nl: 'Recreatief', en: 'Recreation', de: 'Freizeit', es: 'Recreación', color: '#354f48' },
  ],
};

export default function Map({
  center,
  zoom = 14,
  categoryFilter,
  markers: staticMarkers,
  overlayLabel,
  showLegend = true,
  markerLimit = 20,
  height,
}: MapProps) {
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

      // Fix Leaflet default marker icons
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

      // Helper: create marker with category color + optional tier ring
      const createMarker = (lat: number, lng: number, poi: { name: string; category?: string; rating?: number; id?: number; tier?: number }) => {
        const color = getCategoryColor(poi.category);
        const tierColor = poi.tier && poi.tier <= 3 ? TIER_COLORS[poi.tier] : null;
        const borderStyle = tierColor ? `border: 3px solid ${tierColor}` : 'border: 3px solid #fff';

        const icon = L.divIcon({
          className: 'hb-marker',
          html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};${borderStyle};box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -14],
        });

        const ratingHtml = poi.rating ? `<br><span style="color:#f59e0b">\u2605</span> ${poi.rating}` : '';
        const tierHtml = poi.tier && poi.tier <= 3 ? ` <span style="color:${tierColor};font-size:11px;font-weight:bold">T${poi.tier}</span>` : '';

        return L.marker([lat, lng], { icon })
          .bindPopup(
            `<div style="min-width:150px">` +
            `<strong>${poi.name}</strong>${tierHtml}` +
            (poi.category ? `<br><span style="color:#64748b;font-size:12px">${poi.category}</span>` : '') +
            ratingHtml +
            (poi.id ? `<br><a href="/poi/${poi.id}" style="color:#3b82f6;font-size:12px">Details \u2192</a>` : '') +
            `</div>`
          );
      };

      // Static markers (e.g. POI detail page)
      if (staticMarkers && staticMarkers.length > 0) {
        const colors = new Set<string>();
        for (const m of staticMarkers) {
          if (!m.lat || !m.lng) continue;
          colors.add(getCategoryColor(m.category));
          createMarker(m.lat, m.lng, { name: m.name, category: m.category, rating: m.rating, id: m.id }).addTo(map);
        }
        if (!cancelled) setUsedColors(colors);
        return;
      }

      // Fetch tourist POIs
      try {
        const TOURIST_CATS = 'Natuur,Eten & Drinken,Cultuur & Historie,Actief,Recreatief,Beaches & Nature,Food & Drinks,Culture & History,Active';
        const params = new URLSearchParams();
        params.set('categories', categoryFilter?.length ? categoryFilter.join(',') : TOURIST_CATS);
        params.set('limit', String(markerLimit * 4));
        params.set('sort', 'rating:desc');
        params.set('min_rating', '3.5');

        const res = await fetch(`/api/pois?${params.toString()}`);
        if (!res.ok) throw new Error(`API ${res.status}`);

        const json = await res.json();
        const allPois: MapPOI[] = json.data ?? json ?? [];

        // Round-robin by category for diversity
        const byCat: Record<string, MapPOI[]> = {};
        for (const p of allPois) {
          const cat = p.category || 'Other';
          if (!byCat[cat]) byCat[cat] = [];
          byCat[cat].push(p);
        }
        const cats = Object.keys(byCat);
        const selected: MapPOI[] = [];
        let idx = 0;
        while (selected.length < markerLimit && idx < markerLimit * 4) {
          const cat = cats[idx % cats.length];
          const pick = byCat[cat]?.shift();
          if (pick) selected.push(pick);
          idx++;
          if (cats.every(c => (byCat[c]?.length ?? 0) === 0)) break;
        }

        if (cancelled) return;

        const colors = new Set<string>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const leafletMarkers: any[] = [];

        for (const poi of selected) {
          if (!poi.latitude || !poi.longitude) continue;
          colors.add(getCategoryColor(poi.category));
          const marker = createMarker(poi.latitude, poi.longitude, {
            name: poi.name,
            category: poi.category,
            rating: poi.rating,
            id: poi.id,
            tier: poi.tier,
          }).addTo(map);
          leafletMarkers.push(marker);
        }

        if (!cancelled) setUsedColors(colors);

        // Auto-fit bounds
        if (leafletMarkers.length > 0 && !center) {
          const group = L.featureGroup(leafletMarkers);
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
  }, [center, zoom, categoryFilter, markerLimit]);

  const locale = (typeof document !== 'undefined' ? document.documentElement.lang : 'nl') || 'nl';
  const legendItems = LEGEND_ITEMS_I18N.default;
  const visibleLegend = legendItems.filter(item => usedColors.has(item.color));

  // Responsive height: use prop or defaults
  const heightStyle = height || undefined;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="relative">
        <div
          ref={mapRef}
          className={heightStyle ? 'w-full rounded-tenant overflow-hidden shadow-sm' : 'w-full h-[300px] sm:h-[400px] lg:h-[500px] rounded-tenant overflow-hidden shadow-sm'}
          style={heightStyle ? { height: heightStyle } : undefined}
          aria-label="Interactive map"
          role="application"
        />
        {overlayLabel && (
          <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-lg border border-gray-100">
            <span className="text-sm sm:text-base font-semibold text-gray-800">{overlayLabel}</span>
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-500 mt-2 text-center" role="alert">{error}</p>
      )}
      {showLegend && visibleLegend.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3 justify-center overflow-x-auto" aria-label="Map legend">
          {visibleLegend.map(item => {
            const label = (item as Record<string, string>)[locale] || item.en || item.nl;
            return (
              <div key={item.color} className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                <span
                  className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                  style={{ backgroundColor: item.color, border: '1.5px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                  aria-hidden="true"
                />
                {label}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
