'use client';

import { useState, useEffect, useRef } from 'react';
import { getPortalUrl } from '@/lib/portal-url';
import { analytics, trackSectionViewed } from '@/lib/analytics';

interface MapPreviewProps {
  locale: string;
  poiCount?: number;
  poiLimit?: number;
  mapLabel?: Record<string, string>;
}

const LABELS: Record<string, Record<string, string>> = {
  discover: { nl: 'Ontdek ruim', en: 'Discover over', de: 'Entdecke über', es: 'Descubre más de' },
  locations:{ nl: 'locaties', en: 'locations', de: 'Standorte', es: 'ubicaciones' },
  sub:      { nl: 'Restaurants · Stranden · Bezienswaardigheden · Winkels', en: 'Restaurants · Beaches · Attractions · Shops', de: 'Restaurants · Strände · Sehenswürdigkeiten · Geschäfte', es: 'Restaurantes · Playas · Atracciones · Tiendas' },
  mapTitle: { nl: 'Ontdek jouw mooiste plekjes', en: 'Discover your favorite spots', de: 'Entdecke deine schönsten Orte', es: 'Descubre tus mejores lugares' },
};

const MAP_CATEGORIES = [
  { key: 'beach', nl: 'Stranden & Natuur', en: 'Beaches & Nature', de: 'Strände & Natur', es: 'Playas & Naturaleza', color: '#3498db', filter: 'beaches' },
  { key: 'food', nl: 'Food & Drinks', en: 'Food & Drinks', de: 'Essen & Trinken', es: 'Comida & Bebidas', color: '#e74c3c', filter: 'food' },
  { key: 'active', nl: 'Actief', en: 'Active', de: 'Aktiv', es: 'Activo', color: '#1abc9c', filter: 'active' },
  { key: 'shopping', nl: 'Winkelen', en: 'Shopping', de: 'Einkaufen', es: 'Compras', color: '#9b59b6', filter: 'shopping' },
];

// Category color mapping matching the main Map.tsx
const CATEGORY_COLORS: Record<string, string> = {
  'food & drinks': '#e74c3c',
  'eten & drinken': '#e74c3c',
  'shopping': '#9b59b6',
  'winkelen': '#9b59b6',
  'nature': '#27ae60',
  'natuur': '#27ae60',
  'culture': '#e67e22',
  'cultuur': '#e67e22',
  'beach': '#3498db',
  'strand': '#3498db',
  'sport': '#1abc9c',
  'actief': '#1abc9c',
  'nightlife': '#8e44ad',
  'nachtleven': '#8e44ad',
};

function getCategoryColor(category?: string): string {
  if (!category) return 'var(--hb-primary)';
  const lower = category.toLowerCase();
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return 'var(--hb-primary)';
}

export default function MapPreview({ locale, poiCount = 1500, poiLimit = 8, mapLabel }: MapPreviewProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [markers, setMarkers] = useState<any[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const t = (key: string) => LABELS[key]?.[locale] || LABELS[key]?.en || key;

  // Track section visibility
  useEffect(() => {
    if (markers.length > 0) return trackSectionViewed(sectionRef.current, 'map_preview');
  }, [markers.length]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/pois?limit=${poiLimit}&sort=rating:desc&min_rating=4&min_reviews=5`);
        const data = await res.json();
        setMarkers(data?.data || []);
      } catch (err) {
        console.error('MapPreview load failed:', err);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!mapRef.current || markers.length === 0 || mapInstanceRef.current) return;

    // Dynamic import Leaflet (client only)
    import('leaflet').then((L) => {
      // Fix default icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const validMarkers = markers.filter(
        (m) => m.latitude && m.longitude && !isNaN(m.latitude) && !isNaN(m.longitude)
      );

      if (validMarkers.length === 0 || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        touchZoom: false,
        doubleClickZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      const bounds = L.latLngBounds([]);

      validMarkers.forEach((poi) => {
        const color = getCategoryColor(poi.category);
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        L.marker([poi.latitude, poi.longitude], { icon }).addTo(map);
        bounds.extend([poi.latitude, poi.longitude]);
      });

      if (bounds.isValid()) {
        // Zoom in close enough that Calpe is clearly visible with POIs
        map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
      }

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [markers]);

  return (
    <div ref={sectionRef} className="md:hidden mx-4">
      <button
        onClick={() => { analytics.map_preview_clicked(); window.location.href = `${getPortalUrl()}/pois?view=map${locale !== 'en' ? `&lang=${locale}` : ''}`; }}
        className="relative w-full rounded-2xl overflow-hidden shadow-sm"
        style={{ height: 200, isolation: 'isolate', zIndex: 0 }}
      >
        {/* Leaflet CSS */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

        {/* Map container */}
        <div ref={mapRef} className="absolute inset-0" />

        {/* White overlay label */}
        <div
          className="absolute z-[1000]"
          style={{
            bottom: 14, left: 14, right: 14,
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 12,
            padding: '12px 14px',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
            🗺️ {t('mapTitle')}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MAP_CATEGORIES.map(cat => (
              <a
                key={cat.key}
                href={`${getPortalUrl()}/pois?categories=${encodeURIComponent(cat.filter)}${locale !== 'en' ? `&lang=${locale}` : ''}`}
                onClick={(e) => { e.stopPropagation(); analytics.category_button_clicked(cat.en); }}
                className="text-[11px] font-semibold rounded-md px-2.5 py-1 text-white transition-opacity active:opacity-80"
                style={{ backgroundColor: cat.color }}
              >
                {cat[locale as keyof typeof cat] || cat.en}
              </a>
            ))}
          </div>
        </div>
      </button>
    </div>
  );
}
