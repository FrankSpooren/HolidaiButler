import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook for managing filter state
 * Implements efficient state management with derived values
 *
 * @param {Object} initialFilters - Initial filter values
 * @returns {Object} Filter state and handlers
 */
const useFilterState = (initialFilters = {}) => {
  const defaultFilters = {
    categories: [],
    dateFilter: '',
    priceFilter: '',
    duration: '',
    ageGroup: '',
    location: '',
    accessibility: '',
    guideLanguage: '',
    ...initialFilters,
  };

  const [filters, setFilters] = useState(defaultFilters);

  /**
   * Update a single filter
   */
  const setFilter = useCallback((filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value,
    }));
  }, []);

  /**
   * Update multiple filters at once
   */
  const setMultipleFilters = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  /**
   * Clear a single filter
   */
  const clearFilter = useCallback((filterName) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: Array.isArray(prev[filterName]) ? [] : '',
    }));
  }, []);

  /**
   * Count active filters
   */
  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      if (value === null || value === undefined || value === '') return false;
      return true;
    }).length;
  }, [filters]);

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = useMemo(() => {
    return activeFilterCount > 0;
  }, [activeFilterCount]);

  /**
   * Get active filters as an array of objects
   */
  const activeFilters = useMemo(() => {
    return Object.entries(filters)
      .filter(([key, value]) => {
        if (Array.isArray(value)) return value.length > 0;
        if (value === null || value === undefined || value === '') return false;
        return true;
      })
      .map(([key, value]) => ({ key, value }));
  }, [filters]);

  /**
   * Apply filters to a dataset
   * @param {Array} items - Array of items to filter
   * @returns {Array} Filtered items
   */
  const applyFilters = useCallback((items) => {
    return items.filter(item => {
      // Category filter
      if (filters.categories.length > 0) {
        if (!filters.categories.includes(item.category)) {
          return false;
        }
      }

      // Date filter
      if (filters.dateFilter) {
        const today = new Date();
        const itemDate = new Date(item.date);

        switch (filters.dateFilter) {
          case 'today':
            if (itemDate.toDateString() !== today.toDateString()) return false;
            break;
          case 'tomorrow':
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            if (itemDate.toDateString() !== tomorrow.toDateString()) return false;
            break;
          case 'thisWeek':
            const weekEnd = new Date(today);
            weekEnd.setDate(weekEnd.getDate() + 7);
            if (itemDate < today || itemDate > weekEnd) return false;
            break;
          case 'thisWeekend':
            const dayOfWeek = today.getDay();
            const daysUntilSaturday = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
            const thisSaturday = new Date(today);
            thisSaturday.setDate(today.getDate() + daysUntilSaturday);
            const thisSunday = new Date(thisSaturday);
            thisSunday.setDate(thisSaturday.getDate() + 1);
            if (itemDate.toDateString() !== thisSaturday.toDateString() &&
                itemDate.toDateString() !== thisSunday.toDateString()) return false;
            break;
          case 'nextWeek':
            const nextWeekStart = new Date(today);
            nextWeekStart.setDate(nextWeekStart.getDate() + 7);
            const nextWeekEnd = new Date(nextWeekStart);
            nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
            if (itemDate < nextWeekStart || itemDate > nextWeekEnd) return false;
            break;
        }
      }

      // Price filter
      if (filters.priceFilter) {
        const price = parseFloat(item.price);
        switch (filters.priceFilter) {
          case '0-20':
            if (price > 20) return false;
            break;
          case '20-50':
            if (price < 20 || price > 50) return false;
            break;
          case '50-100':
            if (price < 50 || price > 100) return false;
            break;
          case '100+':
            if (price < 100) return false;
            break;
        }
      }

      // Duration filter
      if (filters.duration) {
        const duration = parseFloat(item.duration); // in hours
        switch (filters.duration) {
          case '0-2':
            if (duration > 2) return false;
            break;
          case '2-4':
            if (duration < 2 || duration > 4) return false;
            break;
          case '4-8':
            if (duration < 4 || duration > 8) return false;
            break;
          case '8+':
            if (duration < 8) return false;
            break;
        }
      }

      // Age group filter
      if (filters.ageGroup) {
        if (!item.ageGroups || !item.ageGroups.includes(filters.ageGroup)) {
          return false;
        }
      }

      // Location filter
      if (filters.location) {
        if (item.location?.toLowerCase() !== filters.location.toLowerCase()) {
          return false;
        }
      }

      // Accessibility filter
      if (filters.accessibility) {
        if (!item.accessibility || !item.accessibility.includes(filters.accessibility)) {
          return false;
        }
      }

      // Guide language filter
      if (filters.guideLanguage) {
        if (!item.languages || !item.languages.includes(filters.guideLanguage)) {
          return false;
        }
      }

      return true;
    });
  }, [filters]);

  /**
   * Convert filters to URL query parameters
   */
  const toQueryParams = useCallback(() => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        params.set(key, value.join(','));
      } else if (value && typeof value === 'string' && value !== '') {
        params.set(key, value);
      }
    });

    return params.toString();
  }, [filters]);

  /**
   * Load filters from URL query parameters
   */
  const fromQueryParams = useCallback((searchParams) => {
    const newFilters = { ...defaultFilters };

    for (const [key, value] of searchParams.entries()) {
      if (key === 'categories') {
        newFilters[key] = value.split(',');
      } else {
        newFilters[key] = value;
      }
    }

    setFilters(newFilters);
  }, []);

  return {
    filters,
    setFilter,
    setMultipleFilters,
    clearFilters,
    clearFilter,
    activeFilterCount,
    hasActiveFilters,
    activeFilters,
    applyFilters,
    toQueryParams,
    fromQueryParams,
  };
};

export default useFilterState;
