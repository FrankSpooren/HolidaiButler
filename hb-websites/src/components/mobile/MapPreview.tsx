'use client';

import { useState, useEffect, useRef } from 'react';

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
};

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
  const t = (key: string) => LABELS[key]?.[locale] || LABELS[key]?.en || key;

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
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
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
    <div className="md:hidden mx-4">
      <button
        onClick={() => { window.location.href = '/explore'; }}
        className="relative w-full rounded-2xl overflow-hidden shadow-sm"
        style={{ height: 200 }}
      >
        {/* Leaflet CSS */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

        {/* Map container */}
        <div ref={mapRef} className="absolute inset-0" />

        {/* Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 pt-10">
          <p className="text-white font-bold text-sm">
            🗺️ {mapLabel?.[locale] || mapLabel?.en || `${t('discover')} ${poiCount.toLocaleString()} ${t('locations')}`}
          </p>
          <p className="text-white/70 text-xs mt-0.5">{t('sub')}</p>
        </div>
      </button>
    </div>
  );
}
