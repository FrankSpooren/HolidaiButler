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
    distance: 25, // Default 25km = no filtering
    minRating: 0,
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
      [filterName]: Array.isArray(prev[filterName]) ? [] : defaultFilters[filterName] ?? '',
    }));
  }, []);

  /**
   * Count active filters
   */
  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      if (value === null || value === undefined || value === '') return false;
      if (key === 'distance' && value === 25) return false; // Default distance
      if (key === 'minRating' && value === 0) return false; // Default rating
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
        if (key === 'distance' && value === 25) return false;
        if (key === 'minRating' && value === 0) return false;
        return true;
      })
      .map(([key, value]) => ({ key, value }));
  }, [filters]);

  /**
   * Apply filters to a dataset
   * @param {Array} items - Array of items to filter
   * @param {Object} userLocation - Optional user location for distance filtering
   * @returns {Array} Filtered items
   */
  const applyFilters = useCallback((items, userLocation = null) => {
    return items.filter(item => {
      // Category filter
      if (filters.categories.length > 0) {
        if (!filters.categories.includes(item.category)) {
          return false;
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

      // Rating filter
      if (filters.minRating > 0) {
        if (!item.rating || item.rating < filters.minRating) {
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
      } else if (typeof value === 'number' && key !== 'distance' && key !== 'minRating') {
        params.set(key, String(value));
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
      } else if (key === 'distance' || key === 'minRating') {
        newFilters[key] = parseFloat(value);
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

// Named export for ES module compatibility
export { useFilterState };

// Default export for backwards compatibility
export default useFilterState;
