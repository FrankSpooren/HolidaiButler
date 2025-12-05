import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Agenda Store - Zustand state management
 * Manages filters, search, and UI state for the Agenda module
 */

export interface AgendaFilters {
  dateRange: string;
  category: string | null;
  categories: string[];
  audience: string | null;
  timeOfDay: string | null;
  isFree: boolean | null;
  search: string;
  page: number;
  limit: number;
}

export interface AgendaState {
  filters: AgendaFilters;
  viewMode: 'grid' | 'list';
  mobileFilterOpen: boolean;
  selectedEventId: string | null;
  language: string;
}

export interface AgendaActions {
  setFilter: (key: keyof AgendaFilters, value: unknown) => void;
  setFilters: (newFilters: Partial<AgendaFilters>) => void;
  clearFilters: () => void;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  toggleCategory: (category: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  toggleMobileFilter: () => void;
  setSelectedEventId: (eventId: string | null) => void;
  setLanguage: (language: string) => void;
  getActiveFiltersCount: () => number;
  getQueryParams: () => Record<string, unknown>;
}

const defaultFilters: AgendaFilters = {
  dateRange: 'upcoming',
  category: null,
  categories: [],
  audience: null,
  timeOfDay: null,
  isFree: null,
  search: '',
  page: 1,
  limit: 24,
};

export const useAgendaStore = create<AgendaState & AgendaActions>()(
  persist(
    (set, get) => ({
      // State
      filters: { ...defaultFilters },
      viewMode: 'grid',
      mobileFilterOpen: false,
      selectedEventId: null,
      language: 'nl',

      // Actions
      setFilter: (key, value) =>
        set((state) => ({
          filters: {
            ...state.filters,
            [key]: value,
            page: key !== 'page' ? 1 : state.filters.page,
          },
        })),

      setFilters: (newFilters) =>
        set((state) => ({
          filters: {
            ...state.filters,
            ...newFilters,
            page: 1,
          },
        })),

      clearFilters: () =>
        set({
          filters: { ...defaultFilters },
        }),

      setSearch: (search) =>
        set((state) => ({
          filters: {
            ...state.filters,
            search,
            page: 1,
          },
        })),

      setPage: (page) =>
        set((state) => ({
          filters: {
            ...state.filters,
            page,
          },
        })),

      toggleCategory: (category) =>
        set((state) => {
          const categories = state.filters.categories.includes(category)
            ? state.filters.categories.filter((c) => c !== category)
            : [...state.filters.categories, category];

          return {
            filters: {
              ...state.filters,
              categories,
              page: 1,
            },
          };
        }),

      setViewMode: (viewMode) => set({ viewMode }),

      toggleMobileFilter: () =>
        set((state) => ({
          mobileFilterOpen: !state.mobileFilterOpen,
        })),

      setSelectedEventId: (eventId) => set({ selectedEventId: eventId }),

      setLanguage: (language) => {
        localStorage.setItem('language', language);
        set({ language });
      },

      getActiveFiltersCount: () => {
        const { filters } = get();
        let count = 0;

        if (filters.category) count++;
        if (filters.categories.length > 0) count += filters.categories.length;
        if (filters.audience) count++;
        if (filters.timeOfDay) count++;
        if (filters.isFree !== null) count++;
        if (filters.dateRange !== 'upcoming') count++;

        return count;
      },

      getQueryParams: () => {
        const { filters } = get();
        const params: Record<string, unknown> = {};

        if (filters.dateRange) params.dateRange = filters.dateRange;
        if (filters.category) params.category = filters.category;
        if (filters.categories.length > 0) params.categories = filters.categories.join(',');
        if (filters.audience) params.audience = filters.audience;
        if (filters.timeOfDay) params.timeOfDay = filters.timeOfDay;
        if (filters.isFree !== null) params.isFree = filters.isFree;
        if (filters.search) params.search = filters.search;
        params.page = filters.page;
        params.limit = filters.limit;

        return params;
      },
    }),
    {
      name: 'agenda-storage',
      partialize: (state) => ({
        filters: state.filters,
        viewMode: state.viewMode,
        language: state.language,
      }),
    }
  )
);

export default useAgendaStore;
