'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFilterPublisher, type ActiveFilters } from '@/components/filters/FilterContext';

/**
 * FilterBar Block — VII-E2 Batch A, Block A2
 *
 * Standalone reusable filter bar for page builder.
 * Publishes filter state via FilterContext to other blocks on the same page.
 *
 * Features:
 * - Category chip filters (fetched dynamically or from config)
 * - Rating filter (3.5+, 4.0+, 4.5+)
 * - Date preset filter (all/today/week/month)
 * - Sort options
 * - Reset button with active count badge
 * - Mobile: horizontal scroll with collapsible modal
 * - WCAG 2.2 AA: min 44px touch targets, aria-pressed, focus ring
 * - Container queries for responsive layout
 */

export interface FilterBarProps {
  filters?: string[];
  categories?: string[];
  layout?: 'horizontal' | 'vertical' | 'auto';
  showResetButton?: boolean;
  showActiveCount?: boolean;
  title?: string;
  collapsibleOnMobile?: boolean;
}

const RATING_OPTIONS = [
  { value: 3.5, label: '3.5+' },
  { value: 4.0, label: '4.0+' },
  { value: 4.5, label: '4.5+' },
];

const DATE_PRESETS: Record<string, Record<string, string>> = {
  all: { en: 'All', nl: 'Alles', de: 'Alle', es: 'Todos' },
  today: { en: 'Today', nl: 'Vandaag', de: 'Heute', es: 'Hoy' },
  week: { en: 'This week', nl: 'Deze week', de: 'Diese Woche', es: 'Esta semana' },
  month: { en: 'This month', nl: 'Deze maand', de: 'Diesen Monat', es: 'Este mes' },
};

const SORT_OPTIONS: Record<string, Record<string, string>> = {
  'rating:desc': { en: 'Best rated', nl: 'Beste beoordeling', de: 'Beste Bewertung', es: 'Mejor valorado' },
  'name:asc': { en: 'Name (A-Z)', nl: 'Naam (A-Z)', de: 'Name (A-Z)', es: 'Nombre (A-Z)' },
  'reviews:desc': { en: 'Most reviews', nl: 'Meeste reviews', de: 'Meiste Bewertungen', es: 'Mas resenas' },
};

// Category colors (same as PoiFilterBar for consistency)
const CATEGORY_COLORS: Record<string, string> = {
  'food & drinks': '#4f766b', 'restaurants': '#4f766b', 'eten & drinken': '#E53935',
  'beaches & nature': '#b4942e', 'natuur': '#7CB342', 'nature': '#7CB342',
  'culture & history': '#253444', 'cultuur & historie': '#004B87', 'cultuur': '#004B87',
  'recreation': '#354f48', 'recreatief': '#354f48',
  'active': '#016193', 'actief': '#FF6B00',
  'shopping': '#b4892e', 'winkelen': '#AB47BC',
  'health & wellbeing': '#004568', 'gezondheid & verzorging': '#43A047',
  'practical': '#016193', 'praktisch': '#607D8B',
};

function getCatColor(category: string): string {
  return CATEGORY_COLORS[category.toLowerCase()] ?? 'var(--hb-color-primary, #3b82f6)';
}

export default function FilterBar(props: FilterBarProps) {
  const {
    filters: enabledFilters = ['category', 'rating', 'date_preset', 'sort'],
    categories: configCategories,
    layout = 'auto',
    showResetButton = true,
    showActiveCount = true,
    title,
    collapsibleOnMobile = true,
  } = props;

  const filterCtx = useFilterPublisher();
  const { filters: activeFilters, updateFilter, resetFilters, activeCount } = filterCtx;

  const [availableCategories, setAvailableCategories] = useState<string[]>(configCategories || []);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const locale = typeof document !== 'undefined'
    ? document.documentElement.lang || 'en'
    : 'en';

  // Fetch categories dynamically if not provided via config
  useEffect(() => {
    if (configCategories && configCategories.length > 0) return;

    fetch('/api/v1/pois?limit=0&categories_only=true', {
      headers: { 'X-Destination-ID': typeof window !== 'undefined' ? (window as any).__HB_DESTINATION_ID__ || '' : '' },
    })
      .then(r => r.json())
      .then(data => {
        const cats = data?.categories || data?.data?.categories || [];
        if (Array.isArray(cats) && cats.length > 0) {
          setAvailableCategories(cats);
        }
      })
      .catch(() => {});
  }, [configCategories]);

  const toggleCategory = useCallback((cat: string) => {
    const current = activeFilters.categories;
    const next = current.includes(cat)
      ? current.filter(c => c !== cat)
      : [...current, cat];
    updateFilter('categories', next);
  }, [activeFilters.categories, updateFilter]);

  const showCategory = enabledFilters.includes('category');
  const showRating = enabledFilters.includes('rating');
  const showDate = enabledFilters.includes('date_preset');
  const showSort = enabledFilters.includes('sort');

  const layoutClass = layout === 'vertical'
    ? 'flex flex-col gap-4'
    : layout === 'horizontal'
      ? 'flex flex-wrap items-center gap-3'
      : 'flex flex-wrap items-center gap-3 @[max-width:639px]:flex-col @[max-width:639px]:items-stretch';

  return (
    <section
      className="@container filter-bar-block"
      role="region"
      aria-label={title || (locale === 'nl' ? 'Filters' : 'Filters')}
    >
      {/* Title + Reset row */}
      {(title || (showResetButton && activeCount > 0)) && (
        <div className="flex items-center justify-between mb-3">
          {title && (
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--hb-text-muted,#64748b)]">
              {title}
            </h3>
          )}
          {showResetButton && activeCount > 0 && (
            <button
              onClick={resetFilters}
              className="text-sm text-[var(--hb-color-primary,#3b82f6)] hover:underline min-h-[44px] px-2 flex items-center gap-1"
            >
              {locale === 'nl' ? 'Wissen' : locale === 'de' ? 'Zurucksetzen' : locale === 'es' ? 'Borrar' : 'Clear'}
              {showActiveCount && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-[var(--hb-color-primary,#3b82f6)] text-white">
                  {activeCount}
                </span>
              )}
            </button>
          )}
        </div>
      )}

      {/* Mobile toggle */}
      {collapsibleOnMobile && (
        <button
          onClick={() => setMobileExpanded(!mobileExpanded)}
          className="@[640px]:hidden flex items-center gap-2 w-full px-4 py-3 mb-3 rounded-xl border border-[var(--hb-border-default,#e2e8f0)] bg-[var(--hb-bg-surface,#fff)] text-sm font-medium min-h-[48px]"
          aria-expanded={mobileExpanded}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          {locale === 'nl' ? 'Filters' : 'Filters'}
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-[var(--hb-color-primary,#3b82f6)] text-white">
              {activeCount}
            </span>
          )}
          <svg className={`w-4 h-4 ml-auto transition-transform ${mobileExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {/* Filter content */}
      <div className={`${collapsibleOnMobile ? '@[max-width:639px]:' + (mobileExpanded ? 'block' : 'hidden') + ' @[640px]:block' : ''} ${layoutClass}`}>

        {/* Category chips */}
        {showCategory && availableCategories.length > 0 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Category filters">
            {availableCategories.map(cat => {
              const isActive = activeFilters.categories.includes(cat);
              const color = getCatColor(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  aria-pressed={isActive}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-all min-h-[36px]
                             focus:outline-none focus:ring-2 focus:ring-[var(--hb-color-primary,#3b82f6)] focus:ring-offset-2"
                  style={{
                    backgroundColor: isActive ? color : `${color}15`,
                    color: isActive ? '#fff' : color,
                    border: `1px solid ${isActive ? color : color + '40'}`,
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}

        {/* Rating chips */}
        {showRating && (
          <div className="flex gap-2" role="group" aria-label="Rating filter">
            {RATING_OPTIONS.map(opt => {
              const isActive = activeFilters.minRating === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => updateFilter('minRating', isActive ? null : opt.value)}
                  aria-pressed={isActive}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all min-h-[36px]
                    focus:outline-none focus:ring-2 focus:ring-[var(--hb-color-primary,#3b82f6)] focus:ring-offset-2
                    ${isActive
                      ? 'bg-[var(--hb-color-primary,#3b82f6)] text-white'
                      : 'bg-[var(--hb-bg-muted,#f1f5f9)] text-[var(--hb-text-primary,#1e293b)] hover:bg-[var(--hb-bg-muted,#e2e8f0)]'
                    }`}
                >
                  {'\u2605'} {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Date preset chips */}
        {showDate && (
          <div className="flex gap-2" role="group" aria-label="Date filter">
            {Object.entries(DATE_PRESETS).map(([key, labels]) => {
              const isActive = (activeFilters.datePreset || 'all') === key;
              return (
                <button
                  key={key}
                  onClick={() => updateFilter('datePreset', key === 'all' ? null : key as ActiveFilters['datePreset'])}
                  aria-pressed={isActive}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all min-h-[36px]
                    focus:outline-none focus:ring-2 focus:ring-[var(--hb-color-primary,#3b82f6)] focus:ring-offset-2
                    ${isActive
                      ? 'bg-[var(--hb-color-primary,#3b82f6)] text-white'
                      : 'bg-[var(--hb-bg-muted,#f1f5f9)] text-[var(--hb-text-primary,#1e293b)] hover:bg-[var(--hb-bg-muted,#e2e8f0)]'
                    }`}
                >
                  {labels[locale] || labels.en}
                </button>
              );
            })}
          </div>
        )}

        {/* Sort dropdown */}
        {showSort && (
          <select
            value={activeFilters.sortBy || 'rating:desc'}
            onChange={e => updateFilter('sortBy', e.target.value === 'rating:desc' ? null : e.target.value)}
            aria-label={locale === 'nl' ? 'Sorteren' : 'Sort by'}
            className="px-3 py-2 rounded-xl border border-[var(--hb-border-default,#e2e8f0)] bg-[var(--hb-bg-surface,#fff)]
                       text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[var(--hb-color-primary,#3b82f6)]"
          >
            {Object.entries(SORT_OPTIONS).map(([value, labels]) => (
              <option key={value} value={value}>{labels[locale] || labels.en}</option>
            ))}
          </select>
        )}
      </div>
    </section>
  );
}
