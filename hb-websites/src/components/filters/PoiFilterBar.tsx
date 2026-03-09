'use client';

import { useState, useMemo } from 'react';
import Card, { CardImage, CardContent } from '@/components/ui/Card';
import Rating from '@/components/ui/Rating';

interface POI {
  id: number;
  name: string;
  category?: string;
  description?: string;
  images?: string[];
  thumbnail_url?: string;
  rating?: number;
  reviewCount?: number;
  review_count?: number;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'food & drinks': { bg: '#FEE2E2', text: '#991B1B' },
  'eten & drinken': { bg: '#FEE2E2', text: '#991B1B' },
  'restaurants': { bg: '#FEE2E2', text: '#991B1B' },
  'beaches & nature': { bg: '#DCFCE7', text: '#166534' },
  'natuur': { bg: '#DCFCE7', text: '#166534' },
  'nature': { bg: '#DCFCE7', text: '#166534' },
  'culture & history': { bg: '#DBEAFE', text: '#1E40AF' },
  'cultuur & historie': { bg: '#DBEAFE', text: '#1E40AF' },
  'cultuur': { bg: '#DBEAFE', text: '#1E40AF' },
  'active': { bg: '#FFEDD5', text: '#9A3412' },
  'actief': { bg: '#FFEDD5', text: '#9A3412' },
  'shopping': { bg: '#F3E8FF', text: '#6B21A8' },
  'winkelen': { bg: '#F3E8FF', text: '#6B21A8' },
  'recreation': { bg: '#CFFAFE', text: '#155E75' },
  'recreatief': { bg: '#CFFAFE', text: '#155E75' },
  'nightlife': { bg: '#FDE68A', text: '#92400E' },
};

function getCategoryStyle(category: string): { bg: string; text: string } {
  return CATEGORY_COLORS[category.toLowerCase()] ?? { bg: '#F3F4F6', text: '#374151' };
}

interface PoiFilterBarProps {
  pois: POI[];
  columns?: number;
  locale: string;
}

export default function PoiFilterBar({ pois, columns = 3, locale }: PoiFilterBarProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Map<string, number>();
    for (const poi of pois) {
      if (poi.category) {
        cats.set(poi.category, (cats.get(poi.category) || 0) + 1);
      }
    }
    return [...cats.entries()].sort((a, b) => b[1] - a[1]);
  }, [pois]);

  const filtered = activeCategory
    ? pois.filter(p => p.category === activeCategory)
    : pois;

  const allLabel = locale === 'nl' ? 'Alles' : locale === 'de' ? 'Alle' : locale === 'es' ? 'Todos' : 'All';

  const gridCols = columns === 2 ? 'sm:grid-cols-2' : columns === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        <button
          onClick={() => setActiveCategory(null)}
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeCategory === null
              ? 'bg-primary text-on-primary'
              : 'bg-surface text-muted hover:bg-primary/10'
          }`}
        >
          {allLabel} ({pois.length})
        </button>
        {categories.map(([cat, count]) => {
          const style = getCategoryStyle(cat);
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(isActive ? null : cat)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? style.text : style.bg,
                color: isActive ? '#fff' : style.text,
              }}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>
      <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
        {filtered.map((poi) => {
          const imageUrl = poi.images?.[0] ?? poi.thumbnail_url ?? '';
          const catStyle = getCategoryStyle(poi.category ?? '');
          return (
            <Card key={poi.id} href={`/poi/${poi.id}`}>
              {imageUrl && <CardImage src={imageUrl} alt={poi.name} />}
              <CardContent>
                <span
                  className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full"
                  style={{ backgroundColor: catStyle.bg, color: catStyle.text }}
                >
                  {poi.category}
                </span>
                <h3 className="mt-2 text-lg font-heading font-semibold text-foreground line-clamp-1">
                  {poi.name}
                </h3>
                {poi.description && (
                  <p className="mt-1 text-sm text-muted line-clamp-2">{poi.description}</p>
                )}
                {poi.rating && (
                  <div className="mt-2">
                    <Rating value={poi.rating} count={poi.reviewCount ?? poi.review_count} size="sm" />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
