'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

/**
 * MapList Block — VII-E2 Batch A, Block A3
 *
 * Synchronized Map + List view with bidirectional interaction:
 * - Card click → map flies to marker + highlights
 * - Marker click → list scrolls to card + highlights
 * - Hover sync between list and map
 * - Mobile: tab switcher (Map | List)
 * - Container queries for responsive split layout
 * - WCAG 2.2 AA: keyboard nav, aria-current, focus management
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

const heightMap = { compact: '50vh', medium: '65vh', full: '80vh' };

const splitMap: Record<string, string> = {
  split_50_50: 'grid-cols-2',
  split_60_40: 'grid-cols-[3fr_2fr]',
  split_70_30: 'grid-cols-[7fr_3fr]',
};

export default function MapList(props: MapListProps) {
  const {
    source = 'pois',
    categories,
    minRating = 3.5,
    limit = 30,
    layout = 'split_60_40',
    height = 'medium',
    enableClustering = false,
    title,
  } = props;

  const [items, setItems] = useState<MapListPOI[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map');
  const [mapReady, setMapReady] = useState(false);

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

    fetch(`${endpoint}?${params.toString()}`, {
      headers: { 'X-Destination-ID': typeof window !== 'undefined' ? (window as any).__HB_DESTINATION_ID__ || '' : '' },
    })
      .then(r => r.json())
      .then(data => {
        const arr = data?.data ?? data ?? [];
        setItems(Array.isArray(arr) ? arr.filter((p: MapListPOI) => p.latitude && p.longitude) : []);
      })
      .catch(() => {});
  }, [source, categories, minRating, limit]);

  // Initialize Leaflet map
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
          html: `<div data-poi-id="${item.id}" style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);transition:transform 0.2s,box-shadow 0.2s;cursor:pointer"></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([item.latitude, item.longitude], { icon }).addTo(map);
        marker.on('click', () => handleMarkerClick(item.id));
        markersMap.current.set(item.id, marker);
        bounds.push([item.latitude, item.longitude]);
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [30, 30] });
      }

      if (!cancelled) setMapReady(true);
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
      el.style.boxShadow = isSelected ? '0 0 0 3px var(--hb-color-primary, #3b82f6), 0 4px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.3)';
      el.style.zIndex = isSelected ? '1000' : isHovered ? '999' : '';
    });
  }, [selectedId, hoveredId]);

  // Marker click → scroll card into view
  const handleMarkerClick = useCallback((id: number) => {
    setSelectedId(id);
    const cardEl = cardRefs.current.get(id);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // On mobile, switch to list tab
    setActiveTab('list');
  }, []);

  // Card click → fly map to marker
  const handleCardClick = useCallback((id: number) => {
    setSelectedId(id);
    const marker = markersMap.current.get(id);
    if (marker && leafletMap.current) {
      const latlng = marker.getLatLng();
      leafletMap.current.flyTo(latlng, 16, { duration: 0.8 });
      marker.openPopup();
    }
    // On mobile, switch to map tab
    setActiveTab('map');
  }, []);

  const tabLabels = {
    map: { en: 'Map', nl: 'Kaart', de: 'Karte', es: 'Mapa' },
    list: { en: 'List', nl: 'Lijst', de: 'Liste', es: 'Lista' },
  };

  return (
    <section className="@container map-list-block" role="region" aria-label={title || 'Map with list'}>
      {title && (
        <h2 className="text-xl font-heading font-semibold text-[var(--hb-text-primary,#1e293b)] mb-4">
          {title}
        </h2>
      )}

      {/* Mobile tab switcher */}
      <div className="@[768px]:hidden flex rounded-xl overflow-hidden border border-[var(--hb-border-default,#e2e8f0)] mb-3" role="tablist">
        {(['map', 'list'] as const).map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors min-h-[44px]
              ${activeTab === tab
                ? 'bg-[var(--hb-color-primary,#3b82f6)] text-white'
                : 'bg-[var(--hb-bg-surface,#fff)] text-[var(--hb-text-muted,#64748b)]'
              }`}
          >
            {tabLabels[tab][locale as keyof typeof tabLabels.map] || tabLabels[tab].en}
            {tab === 'list' && ` (${items.length})`}
          </button>
        ))}
      </div>

      {/* Desktop: split layout / Mobile: tab panels */}
      <div className={`@[768px]:grid @[768px]:${splitMap[layout]} @[768px]:gap-4`} style={{ height: heightMap[height] }}>

        {/* Map panel */}
        <div
          className={`@[max-width:767px]:${activeTab === 'map' ? 'block' : 'hidden'} @[768px]:block h-full`}
          role="tabpanel"
          aria-label="Map view"
        >
          <div
            ref={mapRef}
            className="w-full h-full rounded-xl overflow-hidden shadow-sm"
            style={{ minHeight: '300px' }}
          />
        </div>

        {/* List panel */}
        <div
          className={`@[max-width:767px]:${activeTab === 'list' ? 'block' : 'hidden'} @[768px]:block h-full overflow-y-auto`}
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
                  role="listitem"
                  tabIndex={0}
                  onClick={() => handleCardClick(item.id)}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onKeyDown={e => e.key === 'Enter' && handleCardClick(item.id)}
                  aria-current={isSelected ? 'true' : undefined}
                  className={`flex gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200
                    ${isSelected
                      ? 'ring-2 ring-[var(--hb-color-primary,#3b82f6)] bg-[var(--hb-color-primary,#3b82f6)]/5'
                      : isHovered
                        ? 'bg-[var(--hb-bg-muted,#f8fafc)]'
                        : 'bg-[var(--hb-bg-surface,#fff)] border border-[var(--hb-border-default,#e2e8f0)]'
                    }`}
                >
                  {/* Thumbnail */}
                  {imgUrl && (
                    <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-[var(--hb-bg-muted,#f1f5f9)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: catColor }}
                        aria-hidden="true"
                      />
                      <span className="font-medium text-sm text-[var(--hb-text-primary,#1e293b)] truncate">
                        {item.name}
                      </span>
                    </div>
                    {item.category && (
                      <span className="text-xs text-[var(--hb-text-muted,#64748b)]">{item.category}</span>
                    )}
                    {item.rating && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-amber-500">{'\u2605'}</span>
                        <span className="text-xs font-medium text-[var(--hb-text-primary,#1e293b)]">
                          {item.rating.toFixed ? item.rating.toFixed(1) : item.rating}
                        </span>
                        {item.review_count ? (
                          <span className="text-xs text-[var(--hb-text-muted,#94a3b8)]">
                            ({item.review_count})
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
