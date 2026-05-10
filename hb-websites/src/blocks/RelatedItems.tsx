'use client';

import { useState, useEffect } from 'react';

/**
 * RelatedItems Block — VII-E2 Batch A, Block A4
 *
 * Shows related POIs/events on detail pages based on category or proximity.
 * Auto-detects source item from URL (/poi/123 → sourceId=123, type=poi).
 */

export interface RelatedItemsProps {
  itemType?: 'poi' | 'event';
  sourceId?: number;
  sourceContext?: 'auto' | 'explicit';
  relationStrategy?: 'same_category' | 'nearby';
  limit?: number;
  layout?: 'grid' | 'carousel' | 'list';
  title?: string;
}

interface RelatedItem {
  id: number;
  name?: string;
  title?: string;
  category?: string;
  rating?: number;
  review_count?: number;
  tile_description?: string;
  description?: string;
  date?: string;
  distance_km?: string;
  result_type: string;
}

export default function RelatedItems(props: RelatedItemsProps) {
  const {
    itemType = 'poi',
    sourceId: explicitId,
    sourceContext = 'auto',
    relationStrategy = 'same_category',
    limit = 4,
    layout = 'grid',
    title,
  } = props;

  const [items, setItems] = useState<RelatedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const locale = typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en';

  // Resolve source ID from URL or explicit prop
  const resolveSourceId = (): number | null => {
    if (sourceContext === 'explicit' && explicitId) return explicitId;
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname;
    const match = path.match(/\/(poi|event)\/(\d+)/);
    if (match) return parseInt(match[2]);
    return explicitId || null;
  };

  useEffect(() => {
    const id = resolveSourceId();
    if (!id) { setLoading(false); return; }

    fetch(`/api/v1/related?type=${itemType}&id=${id}&strategy=${relationStrategy}&limit=${limit}&lang=${locale}`)
      .then(r => r.json())
      .then(data => {
        setItems(data?.related || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [itemType, explicitId, relationStrategy, limit, locale]);

  const defaultTitle = locale === 'nl' ? 'Bekijk ook' : locale === 'de' ? 'Siehe auch' : locale === 'es' ? 'Ver tambien' : 'You might also like';
  const displayTitle = title || defaultTitle;

  if (loading) {
    return (
      <section className="related-items-block py-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{displayTitle}</h3>
        <div className="flex gap-4">
          {Array.from({ length: limit }, (_, i) => (
            <div key={i} className="flex-1 h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  const gridCols = layout === 'list' ? '' : items.length <= 2 ? 'sm:grid-cols-2' : items.length <= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4';

  return (
    <section className="related-items-block" role="region" aria-label={displayTitle}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{displayTitle}</h3>

      <div className={layout === 'list' ? 'space-y-3' : `grid grid-cols-1 ${gridCols} gap-4`}>
        {items.map(item => {
          const name = item.name || item.title || '';
          const desc = item.tile_description || item.description || '';
          const href = item.result_type === 'poi' ? `/poi/${item.id}` : `/event/${item.id}`;

          return (
            <a
              key={item.id}
              href={href}
              className={`block rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow ${
                layout === 'list' ? 'flex gap-4 items-center' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-gray-900 truncate">{name}</h4>
                {item.category && (
                  <span className="text-xs text-gray-500">{item.category}</span>
                )}
                {desc && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{desc}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  {item.rating && (
                    <span className="text-xs">
                      <span className="text-amber-500">{'\u2605'}</span> {typeof item.rating === 'number' ? item.rating.toFixed(1) : item.rating}
                    </span>
                  )}
                  {item.distance_km && (
                    <span className="text-xs text-gray-400">{item.distance_km} km</span>
                  )}
                  {item.date && (
                    <span className="text-xs text-gray-400">
                      {new Date(item.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
