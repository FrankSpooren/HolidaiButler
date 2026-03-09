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

/** Category color mapping — derived from Customer Portal categoryConfig.ts gradient primary colors */
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  // Calpe (EN)
  'food & drinks': { bg: '#e0ecea', text: '#4f766b' },
  'restaurants': { bg: '#e0ecea', text: '#4f766b' },
  'beaches & nature': { bg: '#f0e8d4', text: '#b4942e' },
  'culture & history': { bg: '#d8dce0', text: '#253444' },
  'recreation': { bg: '#dae2e0', text: '#354f48' },
  'active': { bg: '#cce0ec', text: '#016193' },
  'shopping': { bg: '#f0e7d4', text: '#b4892e' },
  'health & wellbeing': { bg: '#ccdde8', text: '#004568' },
  'practical': { bg: '#cce0ec', text: '#016193' },
  'nightlife': { bg: '#e8d9ed', text: '#7B2D8E' },
  // Texel (NL)
  'eten & drinken': { bg: '#fcdcdb', text: '#E53935' },
  'natuur': { bg: '#e8f0da', text: '#7CB342' },
  'nature': { bg: '#e8f0da', text: '#7CB342' },
  'cultuur & historie': { bg: '#ccdce8', text: '#004B87' },
  'cultuur': { bg: '#ccdce8', text: '#004B87' },
  'actief': { bg: '#ffe3cc', text: '#FF6B00' },
  'winkelen': { bg: '#f0ddf3', text: '#AB47BC' },
  'recreatief': { bg: '#dcf0e8', text: '#354f48' },
  'gezondheid & verzorging': { bg: '#dceede', text: '#43A047' },
  'praktisch': { bg: '#dfe4e7', text: '#607D8B' },
  'strand': { bg: '#e8f0da', text: '#7CB342' },
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
