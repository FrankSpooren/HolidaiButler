'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';

/**
 * MapList Block — VII-E2 Batch A, Block A3
 *
 * Synchronized Map + List view with bidirectional interaction.
 * Uses standard Tailwind responsive classes (md:) instead of container queries
 * for reliable layout switching.
 */

interface MapListPOI {
  id: number;
  name: string;
  category?: string;
  description?: string;
  rating?: number;
  review_count?: number;
  latitude?: number;
  longitude?: number;
  images?: string[];
  thumbnail_url?: string;
  tier?: number;
}

export interface MapListProps {
  source?: 'pois' | 'events';
  categories?: string[];
  minRating?: number;
  limit?: number;
  layout?: 'split_50_50' | 'split_60_40' | 'split_70_30';
  height?: 'compact' | 'medium' | 'full';
  enableClustering?: boolean;
  title?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'food & drinks': '#4f766b', 'restaurants': '#4f766b', 'eten & drinken': '#E53935',
  'beaches & nature': '#b4942e', 'natuur': '#7CB342', 'nature': '#7CB342',
  'culture & history': '#253444', 'cultuur & historie': '#004B87',
  'recreation': '#354f48', 'recreatief': '#354f48',
  'active': '#016193', 'actief': '#FF6B00',
  'shopping': '#b4892e', 'winkelen': '#AB47BC',
  'gezondheid & verzorging': '#43A047', 'praktisch': '#607D8B',
};

function getCatColor(cat?: string): string {
  return cat ? (CATEGORY_COLORS[cat.toLowerCase()] ?? '#30c59b') : '#30c59b';
}

const heightMap: Record<string, string> = { compact: '50vh', medium: '65vh', full: '80vh' };

export default function MapList(props: MapListProps) {
  const {
    source = 'pois',
    categories,
    minRating = 3.5,
    limit = 30,
    layout = 'split_60_40',
    height = 'medium',
    title,
  } = props;

  const [items, setItems] = useState<MapListPOI[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map');
  const [loading, setLoading] = useState(true);

  const cardRefs = useRef<Map<number, HTMLElement>>(new Map());
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMap = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersMap = useRef<Map<number, any>>(new Map());

  const locale = typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en';

  // Fetch data
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (minRating) params.set('min_rating', String(minRating));
    params.set('min_reviews', '1');
    params.set('sort', 'rating:desc');
    if (categories?.length) params.set('categories', categories.join(','));

    const endpoint = source === 'events' ? '/api/v1/agenda/events' : '/api/v1/pois';

    setLoading(true);
    fetch(`${endpoint}?${params.toString()}`)
      .then(r => {
        if (!r.ok) throw new Error(`API ${r.status}`);
        return r.json();
      })
      .then(data => {
        const arr = data?.data ?? data ?? [];
        const withCoords = Array.isArray(arr) ? arr.filter((p: MapListPOI) => p.latitude && p.longitude) : [];
        setItems(withCoords);
        setLoading(false);
      })
      .catch(err => {
        console.error('[MapList] fetch error:', err);
        setLoading(false);
      });
  }, [source, categories, minRating, limit]);

  // Initialize Leaflet map when items are loaded
  useEffect(() => {
    if (!mapRef.current || leafletMap.current || items.length === 0) return;

    let cancelled = false;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (cancelled || !mapRef.current) return;

      const map = L.map(mapRef.current, { scrollWheelZoom: false, zoomControl: true });
      leafletMap.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19,
      }).addTo(map);

      const bounds: [number, number][] = [];

      for (const item of items) {
        if (!item.latitude || !item.longitude) continue;
        const color = getCatColor(item.category);
        const icon = L.divIcon({
          className: 'hb-maplist-marker',
          html: `<div data-poi-id="${item.id}" style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);transition:transform 0.2s;cursor:pointer"></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([item.latitude, item.longitude], { icon })
          .bindPopup(`<strong>${item.name}</strong>${item.category ? `<br><span style="color:#64748b;font-size:12px">${item.category}</span>` : ''}${item.rating ? `<br><span style="color:#f59e0b">\u2605</span> ${item.rating}` : ''}`)
          .addTo(map);

        const itemId = item.id;
        marker.on('click', () => handleMarkerClick(itemId));
        markersMap.current.set(item.id, marker);
        bounds.push([item.latitude, item.longitude]);
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    };

    initMap();
    return () => {
      cancelled = true;
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
      markersMap.current.clear();
    };
  }, [items]);

  // Sync marker styles on selection/hover
  useEffect(() => {
    markersMap.current.forEach((marker, id) => {
      const el = marker.getElement()?.querySelector('div');
      if (!el) return;
      const isSelected = id === selectedId;
      const isHovered = id === hoveredId;
      el.style.transform = isSelected ? 'scale(1.4)' : isHovered ? 'scale(1.2)' : 'scale(1)';
      el.style.boxShadow = isSelected ? '0 0 0 3px #3b82f6, 0 4px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.3)';
    });
  }, [selectedId, hoveredId]);

  const handleMarkerClick = useCallback((id: number) => {
    setSelectedId(id);
    const cardEl = cardRefs.current.get(id);
    if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setActiveTab('list');
  }, []);

  const handleCardClick = useCallback((id: number) => {
    setSelectedId(id);
    const marker = markersMap.current.get(id);
    if (marker && leafletMap.current) {
      leafletMap.current.flyTo(marker.getLatLng(), 16, { duration: 0.8 });
      marker.openPopup();
    }
    setActiveTab('map');
  }, []);

  const splitClass = layout === 'split_50_50' ? 'md:grid-cols-2' : layout === 'split_70_30' ? 'md:grid-cols-[7fr_3fr]' : 'md:grid-cols-[3fr_2fr]';

  const tabLabel = (tab: 'map' | 'list') => {
    const labels = { map: { en: 'Map', nl: 'Kaart', de: 'Karte', es: 'Mapa' }, list: { en: 'List', nl: 'Lijst', de: 'Liste', es: 'Lista' } };
    return (labels[tab] as Record<string, string>)[locale] || labels[tab].en;
  };

  return (
    <section className="map-list-block" role="region" aria-label={title || 'Map with list'}>
      {title && (
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {/* No results */}
      {!loading && items.length === 0 && (
        <p className="text-center text-gray-500 py-12">
          {locale === 'nl' ? 'Geen locaties gevonden' : 'No locations found'}
        </p>
      )}

      {/* Content */}
      {!loading && items.length > 0 && (
        <>
          {/* Mobile tab switcher */}
          <div className="md:hidden flex rounded-xl overflow-hidden border border-gray-200 mb-3" role="tablist">
            {(['map', 'list'] as const).map(tab => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors min-h-[44px] ${
                  activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
                }`}
              >
                {tabLabel(tab)}{tab === 'list' ? ` (${items.length})` : ''}
              </button>
            ))}
          </div>

          {/* Split layout */}
          <div className={`md:grid ${splitClass} md:gap-4`} style={{ height: heightMap[height] }}>
            {/* Map panel */}
            <div
              className={`${activeTab === 'map' ? 'block' : 'hidden'} md:block h-full`}
              role="tabpanel"
              aria-label="Map view"
            >
              <div
                ref={mapRef}
                className="w-full h-full rounded-xl overflow-hidden shadow-sm border border-gray-200"
                style={{ minHeight: '300px' }}
              />
            </div>

            {/* List panel */}
            <div
              className={`${activeTab === 'list' ? 'block' : 'hidden'} md:block h-full overflow-y-auto`}
              role="tabpanel"
              aria-label="List view"
            >
              <ul role="list" className="space-y-2 pr-1">
                {items.map(item => {
                  const isSelected = item.id === selectedId;
                  const isHovered = item.id === hoveredId;
                  const catColor = getCatColor(item.category);
                  const imgUrl = item.images?.[0] || item.thumbnail_url || '';

                  return (
                    <li
                      key={item.id}
                      ref={el => { if (el) cardRefs.current.set(item.id, el); }}
                      tabIndex={0}
                      onClick={() => handleCardClick(item.id)}
                      onMouseEnter={() => setHoveredId(item.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onKeyDown={e => e.key === 'Enter' && handleCardClick(item.id)}
                      aria-current={isSelected ? 'true' : undefined}
                      className={`flex gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'ring-2 ring-blue-500 bg-blue-50'
                          : isHovered
                            ? 'bg-gray-50'
                            : 'bg-white border border-gray-200'
                      }`}
                    >
                      {imgUrl && (
                        <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imgUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: catColor }}
                          />
                          <span className="font-medium text-sm text-gray-900 truncate">{item.name}</span>
                        </div>
                        {item.category && (
                          <span className="text-xs text-gray-500">{item.category}</span>
                        )}
                        {item.rating && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs text-amber-500">{'\u2605'}</span>
                            <span className="text-xs font-medium">{typeof item.rating === 'number' ? item.rating.toFixed(1) : item.rating}</span>
                            {item.review_count ? <span className="text-xs text-gray-400">({item.review_count})</span> : null}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
