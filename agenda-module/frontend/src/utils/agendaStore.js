import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Agenda Store - Zustand state management
 * Manages filters, search, and UI state
 */

const useAgendaStore = create(
  persist(
    (set, get) => ({
      // Filters
      filters: {
        dateRange: 'upcoming',
        category: null,
        categories: [],
        audience: null,
        timeOfDay: null,
        isFree: null,
        search: '',
        page: 1,
        limit: 24,
      },

      // UI State
      viewMode: 'grid', // 'grid' or 'list'
      mobileFilterOpen: false,
      selectedEvent: null,

      // Language
      language: 'nl',

      /**
       * Update filters
       */
      setFilter: (key, value) =>
        set((state) => ({
          filters: {
            ...state.filters,
            [key]: value,
            page: key !== 'page' ? 1 : state.filters.page, // Reset page when filters change
          },
        })),

      /**
       * Update multiple filters at once
       */
      setFilters: (newFilters) =>
        set((state) => ({
          filters: {
            ...state.filters,
            ...newFilters,
            page: 1, // Reset page
          },
        })),

      /**
       * Clear all filters
       */
      clearFilters: () =>
        set({
          filters: {
            dateRange: 'upcoming',
            category: null,
            categories: [],
            audience: null,
            timeOfDay: null,
            isFree: null,
            search: '',
            page: 1,
            limit: 24,
          },
        }),

      /**
       * Set search query
       */
      setSearch: (search) =>
        set((state) => ({
          filters: {
            ...state.filters,
            search,
            page: 1,
          },
        })),

      /**
       * Set page
       */
      setPage: (page) =>
        set((state) => ({
          filters: {
            ...state.filters,
            page,
          },
        })),

      /**
       * Toggle category in categories array
       */
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

      /**
       * Set view mode
       */
      setViewMode: (viewMode) => set({ viewMode }),

      /**
       * Toggle mobile filter panel
       */
      toggleMobileFilter: () =>
        set((state) => ({
          mobileFilterOpen: !state.mobileFilterOpen,
        })),

      /**
       * Set selected event
       */
      setSelectedEvent: (event) => set({ selectedEvent: event }),

      /**
       * Set language
       */
      setLanguage: (language) => {
        localStorage.setItem('language', language);
        set({ language });
      },

      /**
       * Get active filters count
       */
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

      /**
       * Get query params object for API
       */
      getQueryParams: () => {
        const { filters } = get();
        const params = {};

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
