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

/** Category color mapping — exact Customer Portal categoryConfig.ts gradient primary colors as bg, white text */
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  // Calpe (EN) — exact hex from Customer Portal linear-gradient first stop
  'food & drinks': { bg: '#4f766b', text: '#FFFFFF' },
  'restaurants': { bg: '#4f766b', text: '#FFFFFF' },
  'beaches & nature': { bg: '#b4942e', text: '#FFFFFF' },
  'culture & history': { bg: '#253444', text: '#FFFFFF' },
  'recreation': { bg: '#354f48', text: '#FFFFFF' },
  'active': { bg: '#016193', text: '#FFFFFF' },
  'shopping': { bg: '#b4892e', text: '#FFFFFF' },
  'health & wellbeing': { bg: '#004568', text: '#FFFFFF' },
  'practical': { bg: '#016193', text: '#FFFFFF' },
  'nightlife': { bg: '#7B2D8E', text: '#FFFFFF' },
  // Texel (NL) — exact hex from Customer Portal linear-gradient first stop
  'eten & drinken': { bg: '#E53935', text: '#FFFFFF' },
  'natuur': { bg: '#7CB342', text: '#FFFFFF' },
  'nature': { bg: '#7CB342', text: '#FFFFFF' },
  'cultuur & historie': { bg: '#004B87', text: '#FFFFFF' },
  'cultuur': { bg: '#004B87', text: '#FFFFFF' },
  'actief': { bg: '#FF6B00', text: '#FFFFFF' },
  'winkelen': { bg: '#AB47BC', text: '#FFFFFF' },
  'recreatief': { bg: '#354f48', text: '#FFFFFF' },
  'gezondheid & verzorging': { bg: '#43A047', text: '#FFFFFF' },
  'praktisch': { bg: '#607D8B', text: '#FFFFFF' },
  'strand': { bg: '#7CB342', text: '#FFFFFF' },
};

function getCategoryStyle(category: string): { bg: string; text: string } {
  return CATEGORY_COLORS[category.toLowerCase()] ?? { bg: '#30c59b', text: '#FFFFFF' };
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
                backgroundColor: isActive ? style.bg : `${style.bg}20`,
                color: isActive ? '#FFFFFF' : style.bg,
                border: isActive ? 'none' : `1px solid ${style.bg}40`,
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
