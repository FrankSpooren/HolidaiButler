'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PoiFilters {
  categories: string[];
  min_rating: number | null;
  min_reviews: number | null;
  sort: string;
}

interface PoiFilterModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: PoiFilters) => void;
  currentFilters: PoiFilters;
  availableCategories: string[];
  locale: string;
}

const LABELS: Record<string, Record<string, string>> = {
  nl: {
    title: 'Filters',
    category: 'Categorie',
    rating: 'Minimale beoordeling',
    reviews: 'Minimum reviews',
    sort: 'Sorteren',
    all: 'Alle',
    apply: 'Toepassen',
    clear: 'Wissen',
    ratingDesc: 'Beste beoordeling',
    nameAsc: 'Naam (A-Z)',
    reviewCountDesc: 'Meeste reviews',
    comingSoon: 'Binnenkort beschikbaar',
    priceLevel: 'Prijsniveau',
    openNow: 'Nu geopend',
    accessibility: 'Toegankelijkheid',
    distance: 'Afstand',
  },
  en: {
    title: 'Filters',
    category: 'Category',
    rating: 'Minimum rating',
    reviews: 'Minimum reviews',
    sort: 'Sort by',
    all: 'All',
    apply: 'Apply',
    clear: 'Clear',
    ratingDesc: 'Best rating',
    nameAsc: 'Name (A-Z)',
    reviewCountDesc: 'Most reviews',
    comingSoon: 'Coming soon',
    priceLevel: 'Price level',
    openNow: 'Open now',
    accessibility: 'Accessibility',
    distance: 'Distance',
  },
  de: {
    title: 'Filter',
    category: 'Kategorie',
    rating: 'Mindestbewertung',
    reviews: 'Mindestanzahl Bewertungen',
    sort: 'Sortieren nach',
    all: 'Alle',
    apply: 'Anwenden',
    clear: 'Zur\u00fccksetzen',
    ratingDesc: 'Beste Bewertung',
    nameAsc: 'Name (A-Z)',
    reviewCountDesc: 'Meiste Bewertungen',
    comingSoon: 'Bald verf\u00fcgbar',
    priceLevel: 'Preisniveau',
    openNow: 'Jetzt ge\u00f6ffnet',
    accessibility: 'Barrierefreiheit',
    distance: 'Entfernung',
  },
  es: {
    title: 'Filtros',
    category: 'Categor\u00eda',
    rating: 'Puntuaci\u00f3n m\u00ednima',
    reviews: 'Rese\u00f1as m\u00ednimas',
    sort: 'Ordenar por',
    all: 'Todos',
    apply: 'Aplicar',
    clear: 'Limpiar',
    ratingDesc: 'Mejor puntuaci\u00f3n',
    nameAsc: 'Nombre (A-Z)',
    reviewCountDesc: 'M\u00e1s rese\u00f1as',
    comingSoon: 'Pr\u00f3ximamente',
    priceLevel: 'Nivel de precio',
    openNow: 'Abierto ahora',
    accessibility: 'Accesibilidad',
    distance: 'Distancia',
  },
};

const RATING_OPTIONS = [null, 3.0, 4.0, 4.5];
const REVIEW_OPTIONS = [null, 3, 10, 25];
const SORT_OPTIONS = ['rating:desc', 'name:asc', 'review_count:desc'];

const CATEGORY_COLORS: Record<string, string> = {
  'food & drinks': '#4f766b', 'restaurants': '#4f766b',
  'beaches & nature': '#b4942e', 'culture & history': '#253444',
  'recreation': '#354f48', 'active': '#016193',
  'shopping': '#b4892e', 'nightlife': '#7B2D8E',
  'eten & drinken': '#E53935', 'natuur': '#7CB342',
  'cultuur & historie': '#004B87', 'cultuur': '#004B87',
  'actief': '#FF6B00', 'winkelen': '#AB47BC',
  'recreatief': '#354f48', 'strand': '#7CB342',
};

export default function PoiFilterModal({
  open, onClose, onApply, currentFilters, availableCategories, locale,
}: PoiFilterModalProps) {
  const [filters, setFilters] = useState<PoiFilters>(currentFilters);
  const t = LABELS[locale] || LABELS.en;

  useEffect(() => {
    if (open) setFilters(currentFilters);
  }, [open, currentFilters]);

  // ESC key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const toggleCategory = useCallback((cat: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }));
  }, []);

  const handleClear = () => {
    setFilters({ categories: [], min_rating: null, min_reviews: null, sort: 'rating:desc' });
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const activeCount = (
    filters.categories.length +
    (filters.min_rating ? 1 : 0) +
    (filters.min_reviews ? 1 : 0) +
    (filters.sort !== 'rating:desc' ? 1 : 0)
  );

  if (!open) return null;

  const sortLabels: Record<string, string> = {
    'rating:desc': t.ratingDesc,
    'name:asc': t.nameAsc,
    'review_count:desc': t.reviewCountDesc,
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white z-50 shadow-2xl overflow-y-auto animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-heading font-bold">{t.title}</h2>
          <button onClick={onClose} className="text-2xl text-muted hover:text-foreground">&times;</button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-6 overflow-y-auto">
          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold mb-3">{t.category}</h3>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map(cat => {
                const isActive = filters.categories.includes(cat);
                const color = CATEGORY_COLORS[cat.toLowerCase()] ?? '#30c59b';
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: isActive ? color : `${color}15`,
                      color: isActive ? '#FFFFFF' : color,
                      border: `1px solid ${isActive ? color : `${color}40`}`,
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rating */}
          <div>
            <h3 className="text-sm font-semibold mb-3">{t.rating}</h3>
            <div className="flex flex-wrap gap-2">
              {RATING_OPTIONS.map(opt => (
                <button
                  key={String(opt)}
                  onClick={() => setFilters(prev => ({ ...prev, min_rating: opt }))}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filters.min_rating === opt
                      ? 'bg-primary text-on-primary'
                      : 'bg-gray-100 text-foreground hover:bg-gray-200'
                  }`}
                >
                  {opt === null ? t.all : `≥ ${opt}`}
                  {opt !== null && <span className="ml-1 text-accent">★</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Min reviews */}
          <div>
            <h3 className="text-sm font-semibold mb-3">{t.reviews}</h3>
            <div className="flex flex-wrap gap-2">
              {REVIEW_OPTIONS.map(opt => (
                <button
                  key={String(opt)}
                  onClick={() => setFilters(prev => ({ ...prev, min_reviews: opt }))}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filters.min_reviews === opt
                      ? 'bg-primary text-on-primary'
                      : 'bg-gray-100 text-foreground hover:bg-gray-200'
                  }`}
                >
                  {opt === null ? t.all : `≥ ${opt}`}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <h3 className="text-sm font-semibold mb-3">{t.sort}</h3>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => setFilters(prev => ({ ...prev, sort: opt }))}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filters.sort === opt
                      ? 'bg-primary text-on-primary'
                      : 'bg-gray-100 text-foreground hover:bg-gray-200'
                  }`}
                >
                  {sortLabels[opt] ?? opt}
                </button>
              ))}
            </div>
          </div>

          {/* Disabled future filters */}
          <div className="border-t pt-4 space-y-3 opacity-50">
            {[t.priceLevel, t.openNow, t.accessibility, t.distance].map(label => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm">{label}</span>
                <span className="text-xs bg-gray-100 text-muted px-2 py-0.5 rounded">{t.comingSoon}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t sticky bottom-0 bg-white flex gap-3">
          <button
            onClick={handleClear}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-foreground font-medium hover:bg-gray-50 transition-colors"
          >
            {t.clear}
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2.5 rounded-lg bg-primary text-on-primary font-medium hover:bg-primary/90 transition-colors"
          >
            {t.apply} {activeCount > 0 && `(${activeCount})`}
          </button>
        </div>

      </div>
    </>
  );
}
