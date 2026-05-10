'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

/**
 * FilterContext — Shared filter state for cross-block communication (VII-E2 A2)
 *
 * When a standalone FilterBar block is placed above a PoiGrid or EventCalendar,
 * the FilterBar publishes its active filters via this context. Consuming blocks
 * read and apply these filters to their data fetching.
 *
 * Wraps all blocks on a page (injected by PageBlocksProvider in layout).
 */

export interface ActiveFilters {
  categories: string[];
  minRating: number | null;
  datePreset: 'all' | 'today' | 'week' | 'month' | null;
  sortBy: string | null;
  query: string | null;
}

const DEFAULT_FILTERS: ActiveFilters = {
  categories: [],
  minRating: null,
  datePreset: null,
  sortBy: null,
  query: null,
};

interface FilterContextValue {
  filters: ActiveFilters;
  setFilters: (filters: ActiveFilters) => void;
  updateFilter: <K extends keyof ActiveFilters>(key: K, value: ActiveFilters[K]) => void;
  resetFilters: () => void;
  activeCount: number;
  hasExternalFilters: boolean;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<ActiveFilters>(DEFAULT_FILTERS);
  const [hasExternalFilters, setHasExternal] = useState(false);

  const setFilters = useCallback((f: ActiveFilters) => {
    setFiltersState(f);
    setHasExternal(true);
  }, []);

  const updateFilter = useCallback(<K extends keyof ActiveFilters>(key: K, value: ActiveFilters[K]) => {
    setFiltersState(prev => ({ ...prev, [key]: value }));
    setHasExternal(true);
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  const activeCount =
    filters.categories.length +
    (filters.minRating ? 1 : 0) +
    (filters.datePreset && filters.datePreset !== 'all' ? 1 : 0) +
    (filters.sortBy ? 1 : 0);

  return (
    <FilterContext.Provider value={{ filters, setFilters, updateFilter, resetFilters, activeCount, hasExternalFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

/**
 * Hook for blocks that consume shared filters (PoiGrid, EventCalendar, MapList).
 * Returns null if no FilterProvider exists (backward compatible).
 */
export function useFilterContext(): FilterContextValue | null {
  return useContext(FilterContext);
}

/**
 * Hook for the FilterBar block itself to publish filter state.
 */
export function useFilterPublisher() {
  const ctx = useContext(FilterContext);
  if (!ctx) {
    throw new Error('useFilterPublisher must be used within a FilterProvider');
  }
  return ctx;
}
