'use client';

import { useState, useMemo, useCallback } from 'react';
import { CardImage, CardContent } from '@/components/ui/Card';
import PoiCard from '@/components/ui/PoiCard';
import Rating from '@/components/ui/Rating';
import PoiFilterModal, { type PoiFilters } from './PoiFilterModal';

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

const FILTER_LABELS: Record<string, string> = {
  nl: 'Filters', en: 'Filters', de: 'Filter', es: 'Filtros',
};

interface PoiFilterBarProps {
  pois: POI[];
  columns?: number;
  locale: string;
}

const DEFAULT_FILTERS: PoiFilters = {
  categories: [],
  min_rating: null,
  min_reviews: null,
  sort: 'rating:desc',
};

export default function PoiFilterBar({ pois: initialPois, columns = 3, locale }: PoiFilterBarProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState<PoiFilters>(DEFAULT_FILTERS);
  const [filteredPois, setFilteredPois] = useState<POI[] | null>(null);
  const [loading, setLoading] = useState(false);

  const pois = filteredPois ?? initialPois;

  const categories = useMemo(() => {
    const cats = new Map<string, number>();
    for (const poi of initialPois) {
      if (poi.category) {
        cats.set(poi.category, (cats.get(poi.category) || 0) + 1);
      }
    }
    return [...cats.entries()].sort((a, b) => b[1] - a[1]);
  }, [initialPois]);

  const allCategories = useMemo(() => categories.map(([cat]) => cat), [categories]);

  const displayed = activeCategory
    ? pois.filter(p => p.category === activeCategory)
    : pois;

  const allLabel = locale === 'nl' ? 'Alles' : locale === 'de' ? 'Alle' : locale === 'es' ? 'Todos' : 'All';

  const gridCols = columns === 2 ? 'sm:grid-cols-2' : columns === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3';

  const activeFilterCount = (
    filters.categories.length +
    (filters.min_rating ? 1 : 0) +
    (filters.min_reviews ? 1 : 0) +
    (filters.sort !== 'rating:desc' ? 1 : 0)
  );

  const handleApplyFilters = useCallback(async (newFilters: PoiFilters) => {
    setFilters(newFilters);

    const hasFilters = newFilters.categories.length > 0 || newFilters.min_rating || newFilters.min_reviews || newFilters.sort !== 'rating:desc';

    if (!hasFilters) {
      setFilteredPois(null);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (newFilters.categories.length > 0) params.set('categories', newFilters.categories.join(','));
      if (newFilters.min_rating) params.set('min_rating', String(newFilters.min_rating));
      if (newFilters.min_reviews) params.set('min_reviews', String(newFilters.min_reviews));
      if (newFilters.sort) params.set('sort', newFilters.sort);
      params.set('limit', '50');

      const res = await fetch(`/api/pois?${params.toString()}`, {
        headers: { 'Accept-Language': locale },
      });
      const data = await res.json();
      setFilteredPois(data?.data ?? []);
    } catch {
      setFilteredPois(null);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  return (
    <>
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {/* Filter button */}
        <button
          onClick={() => setModalOpen(true)}
          className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors bg-surface text-foreground border border-gray-200 hover:bg-gray-100 flex items-center gap-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          {FILTER_LABELS[locale] || 'Filters'}
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-primary text-on-primary">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Quick category chips */}
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <p className="text-center text-muted py-8">
          {locale === 'nl' ? 'Geen resultaten gevonden' : locale === 'de' ? 'Keine Ergebnisse gefunden' : locale === 'es' ? 'No se encontraron resultados' : 'No results found'}
        </p>
      ) : (
        <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
          {displayed.map((poi) => {
            const imageUrl = poi.images?.[0] ?? poi.thumbnail_url ?? '';
            const catStyle = getCategoryStyle(poi.category ?? '');
            return (
              <PoiCard key={poi.id} poiId={poi.id} href={`/poi/${poi.id}`}>
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
              </PoiCard>
            );
          })}
        </div>
      )}

      <PoiFilterModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onApply={handleApplyFilters}
        currentFilters={filters}
        availableCategories={allCategories}
        locale={locale}
      />
    </>
  );
}
