import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { usePOIs } from '../features/poi/hooks/usePOIs';
import { poiService } from '../features/poi/services/poiService';
import type { POI } from '../features/poi/types/poi.types';
import { MapView } from '../features/poi/components/MapView';
import { POITileCarousel } from '../features/poi/components/POITileCarousel';
import { POIRating } from '../features/poi/components/POIRating';
import { POITileActions } from '../features/poi/components/POITileActions';
import { POIDetailModal } from '../features/poi/components/POIDetailModal';
import { POIComparisonModal } from '../features/poi/components/POIComparisonModal';
import { useLanguage } from '../i18n/LanguageContext';
import { useFavorites } from '../shared/contexts/FavoritesContext';
import { useComparison } from '../shared/contexts/ComparisonContext';
import { ComparisonBar } from '../shared/components/ComparisonBar';
import { getDistanceFromUser, getUserLocation, type Coordinates } from '../shared/utils/distance';
import { CATEGORIES_ARRAY, getCategoryIcon, getCategoryColor } from '../shared/config/categoryConfig';
import { useDestination } from '../shared/contexts/DestinationContext';
import './POILandingPage.css';

// Hook to get responsive column count
function useColumnCount() {
  const [columnCount, setColumnCount] = useState(() => {
    if (typeof window === 'undefined') return 2;
    if (window.innerWidth >= 1024) return 4;
    if (window.innerWidth >= 768) return 3;
    return 2;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setColumnCount(4);
      else if (window.innerWidth >= 768) setColumnCount(3);
      else setColumnCount(2);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return columnCount;
}

/**
 * POILandingPage - Browse POIs with Grid, List, and Map views
 *
 * Route: /pois
 * Layout: RootLayout
 * Auth: Public
 *
 * Features:
 * - Search bar
 * - Category chips (8 categories)
 * - Filter modal
 * - View toggle (Grid/List/Map)
 * - Save/favorite POIs
 * - Load more pagination
 */

type ViewMode = 'grid' | 'list' | 'map';

interface Category {
  id: string;
  name: string;  // Database category name (for API)
  label: string; // Translated label (for display)
  icon: string;
  color: string;
}

// Categories are defined in component to access translations

export function POILandingPage() {
  const navigate = useNavigate();
  const [urlParams, setUrlParams] = useSearchParams();
  const { t } = useLanguage();
  const destination = useDestination();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { isInComparison, toggleComparison, canAddMore, comparisonPOIs } = useComparison();

  // Initialize state from URL parameters (persistent filter state - Fase II-B.3)
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (urlParams.get('view') as ViewMode) || 'grid'
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const cats = urlParams.get('categories');
    return cats ? cats.split(',').filter(Boolean) : [];
  });
  const [searchQuery, setSearchQuery] = useState<string>(() =>
    urlParams.get('q') || ''
  );
  // Display control: how many POIs to show (virtualization renders only visible)
  const [loadedCount, setLoadedCount] = useState<number>(24);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [selectedPOIId, setSelectedPOIId] = useState<number | null>(null);
  const [scrollPosition, setScrollPosition] = useState<number>(0);
  const [viewModeBeforeModal, setViewModeBeforeModal] = useState<ViewMode>('grid');
  const [comparisonModalOpen, setComparisonModalOpen] = useState<boolean>(false);
  const [showHeader, setShowHeader] = useState<boolean>(true);

  // Grid virtualization
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const columnCount = useColumnCount();

  // Use centralized category configuration (single source of truth)
  // Enabled categories are destination-specific (configured in vite.config.ts)
  // This ensures Calpe shows Calpe categories and Texel shows Texel categories
  const enabledCategories = destination.categories.enabled;
  const categories: Category[] = CATEGORIES_ARRAY
    .filter(cat => enabledCategories.includes(cat.id))
    .map(cat => ({
      id: cat.id,
      name: cat.name, // Database name for API calls
      label: t.categories[cat.id as keyof typeof t.categories] || cat.name,
      icon: cat.icon,
      color: cat.color
    }));

  // Convert text to title case
  const toTitleCase = (str: string) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Truncate description to first sentence (max 1 sentence for tiles)
  const truncateToOneSentence = (text: string | null): string => {
    if (!text) return 'No description available';

    // Find first sentence ending (. ! or ?)
    const match = text.match(/^[^.!?]+[.!?]/);
    if (match) {
      return match[0].trim();
    }

    // If no sentence ending found, truncate at ~100 chars
    if (text.length > 100) {
      return text.substring(0, 100).trim() + '...';
    }

    return text.trim();
  };

  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState<boolean>(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<Array<{ id: number; name: string; category: string }>>([]);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter modal state (initialized from URL params for persistence)
  const [filterModalOpen, setFilterModalOpen] = useState<boolean>(false);
  const [distance, setDistance] = useState<number>(() => {
    const d = urlParams.get('distance');
    return d ? Number(d) : 25;
  });
  const [minReviews, setMinReviews] = useState<number>(() => {
    const r = urlParams.get('minReviews');
    return r ? Number(r) : 0;
  });
  const [minRating, setMinRating] = useState<number>(() => {
    const r = urlParams.get('rating');
    return r ? Number(r) : 0;
  });
  const [priceLevel, setPriceLevel] = useState<number[]>(() => {
    const p = urlParams.get('price');
    return p ? p.split(',').map(Number).filter(n => !isNaN(n)) : [];
  });
  const [openNow, setOpenNow] = useState<boolean>(() =>
    urlParams.get('openNow') === '1'
  );
  const [accessibility, setAccessibility] = useState<string[]>(() => {
    const a = urlParams.get('access');
    return a ? a.split(',').filter(Boolean) : [];
  });

  // Sync filter state to URL parameters (Fase II-B.3)
  useEffect(() => {
    const params = new URLSearchParams();

    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategories.length > 0) params.set('categories', selectedCategories.join(','));
    if (viewMode !== 'grid') params.set('view', viewMode);
    if (openNow) params.set('openNow', '1');
    if (minRating > 0) params.set('rating', String(minRating));
    if (minReviews > 0) params.set('minReviews', String(minReviews));
    if (priceLevel.length > 0) params.set('price', priceLevel.join(','));
    if (distance < 25) params.set('distance', String(distance));
    if (accessibility.length > 0) params.set('access', accessibility.join(','));

    setUrlParams(params, { replace: true });
  }, [searchQuery, selectedCategories, viewMode, openNow, minRating, minReviews, priceLevel, distance, accessibility]);

  // Get category name for backend (database expects "Active", "Food & Drinks", etc.)
  const getCategoryName = (categoryId: string): string => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name || categoryId;
  };

  // Get selected category names for API (multi-select support - Fase II-B.3)
  const selectedCategoryNames = selectedCategories.map(getCategoryName);

  // Fetch POIs with filters
  // Fetch more upfront - virtualization only renders visible items
  // Browse: ~800 presentation POIs, Search: all POIs for full searchability
  const fetchLimit = searchQuery ? 2000 : 1000;

  const { data, isLoading, error } = usePOIs({
    q: searchQuery || undefined,
    // Multi-select: send first category to API (client-side filters the rest)
    category: selectedCategoryNames.length === 1 ? selectedCategoryNames[0] : undefined,
    limit: fetchLimit,
    // Use alphabetical sorting for default view to get varied ratings
    // (default popularity sort returns first 260 POIs all with 5.0 rating)
    sort: (!searchQuery && selectedCategories.length === 0) ? 'name:asc' : undefined,
    // Apply filters from filter modal
    min_rating: minRating > 0 ? minRating : undefined,
    open_now: openNow || undefined,
    price_min: priceLevel.length > 0 ? Math.min(...priceLevel) : undefined,
    price_max: priceLevel.length > 0 ? Math.max(...priceLevel) : undefined,
    // IMAGE FILTERING: Temporarily disabled for Texel data completeness check
    // TODO: Re-enable after verifying Texel images are properly linked
    // require_images: searchQuery ? undefined : true,
  });

  // Filter and sort POIs
  const processedPOIs = useMemo(() => {
    // Presentation-worthy categories (for default browse view)
    // Now destination-specific (configured in vite.config.ts)
    const presentationCategories = destination.categories.presentation;

    // POIs to exclude from browse view (but keep searchable)
    const excludedSubcategories = ['Laadpunten']; // Charging stations
    const excludedNameKeywords = ['begraafplaats', 'kerkhof', 'cemetery', 'erebegraafplaats'];

    let filtered = (data?.data || []).filter(poi => {
      // Always filter out Accommodation category
      if (poi.category === 'Accommodation (do not communicate)') return false;
      if (poi.category === 'Accommodation') return false;

      // Always filter out accommodation-related POIs in other categories
      const accomKeywords = ['realty', 'villa', 'apartment', 'apartamento', 'hotel', 'hostel', 'residencial'];
      const lowerName = poi.name.toLowerCase();
      if (accomKeywords.some(keyword => lowerName.includes(keyword))) return false;

      // Multi-select category filter (Fase II-B.3)
      if (selectedCategories.length > 1) {
        if (!selectedCategoryNames.includes(poi.category)) return false;
      }

      // DEFAULT BROWSE VIEW: Apply presentation category filter (no search, no category)
      if (!searchQuery && selectedCategories.length === 0) {
        // Only show presentation-worthy categories
        if (!presentationCategories.includes(poi.category)) {
          return false;
        }

        // Quality filters - POI must meet ALL criteria for browse view
        // Rating >= 4.0
        if (!poi.rating || poi.rating < 4) return false;
        // At least 3 reviews
        if (!poi.review_count || poi.review_count < 3) return false;
        // Must have enriched description
        if (!poi.enriched_tile_description) return false;
        // Must have at least 3 images
        if (!poi.images || poi.images.length < 3) return false;

        // Exclude charging stations (Laadpunten) from Praktisch overview
        if (poi.subcategory && excludedSubcategories.includes(poi.subcategory)) {
          return false;
        }

        // Exclude cemeteries from overview (by name keywords)
        if (excludedNameKeywords.some(keyword => lowerName.includes(keyword))) {
          return false;
        }
      }

      // CATEGORY VIEW: Apply quality filters but allow category-specific browsing
      if (selectedCategories.length > 0 && !searchQuery) {
        // Quality filters for category view
        if (!poi.rating || poi.rating < 4) return false;
        if (!poi.review_count || poi.review_count < 3) return false;
        if (!poi.enriched_tile_description) return false;
        if (!poi.images || poi.images.length < 3) return false;

        // Exclude charging stations from Praktisch category view
        if (poi.subcategory && excludedSubcategories.includes(poi.subcategory)) {
          return false;
        }

        // Exclude cemeteries from category view
        if (excludedNameKeywords.some(keyword => lowerName.includes(keyword))) {
          return false;
        }
      }

      // SEARCH VIEW: Show all POIs matching search (no quality filter - full searchability)

      // Client-side filter: minimum reviews (from filter modal, additional to default)
      if (minReviews > 0 && (!poi.review_count || poi.review_count < minReviews)) {
        return false;
      }

      // Client-side filter: distance (if user location is available)
      if (distance < 25 && userLocation) {
        const poiDistance = parseFloat(
          getDistanceFromUser(
            { latitude: poi.latitude, longitude: poi.longitude },
            userLocation
          ).replace(' km', '')
        );
        if (isNaN(poiDistance) || poiDistance > distance) {
          return false;
        }
      }

      // Client-side filter: accessibility features
      if (accessibility.length > 0) {
        const accessibilityMatches = accessibility.some(feature => {
          if (feature === 'wheelchair' && poi.accessibility_features) {
            return poi.accessibility_features.includes('wheelchair_accessible');
          }
          // Add more accessibility mappings as needed
          return false;
        });
        if (!accessibilityMatches) {
          return false;
        }
      }

      // Filter out POIs closed 7/7 days (all days closed)
      if (poi.opening_hours) {
        const parseOpeningHours = (openingHours: any): Record<string, string> | null => {
          if (!openingHours) return null;
          let parsedData: any = openingHours;
          if (typeof openingHours === 'string') {
            try {
              parsedData = JSON.parse(openingHours);
            } catch {
              return null;
            }
          }
          if (typeof parsedData !== 'object' || Array.isArray(parsedData)) {
            return null;
          }
          return parsedData as Record<string, string>;
        };

        const hours = parseOpeningHours(poi.opening_hours);
        if (hours) {
          const allClosed = Object.values(hours).every(
            (day) => day === 'Closed' || day === '' || (Array.isArray(day) && day.length === 0)
          );
          if (allClosed) return false;
        }
      }

      // Note: Image filtering handled by API via require_images parameter

      return true;
    });

    // Apply category mix for DEFAULT BROWSE VIEW only (no search, no category selected)
    if (!searchQuery && selectedCategories.length === 0 && destination.id === 'texel') {
      // Category mix percentages as per spec
      const categoryMix: Record<string, number> = {
        'Actief': 0.20,
        'Cultuur & Historie': 0.20,
        'Eten & Drinken': 0.15,
        'Gezondheid & Verzorging': 0.10,
        'Natuur': 0.20,
        'Praktisch': 0.05,
        'Winkelen': 0.10,
      };

      // Group POIs by category
      const byCategory: Record<string, typeof filtered> = {};
      filtered.forEach(poi => {
        if (!byCategory[poi.category]) byCategory[poi.category] = [];
        byCategory[poi.category].push(poi);
      });

      // Calculate target counts based on mix (aim for ~100 POIs initial display)
      const targetTotal = 100;
      const mixedPOIs: typeof filtered = [];

      Object.entries(categoryMix).forEach(([category, percentage]) => {
        const categoryPOIs = byCategory[category] || [];
        const targetCount = Math.ceil(targetTotal * percentage);
        // Shuffle and take target count
        const shuffled = [...categoryPOIs].sort(() => Math.random() - 0.5);
        mixedPOIs.push(...shuffled.slice(0, targetCount));
      });

      // Shuffle the final mix to interleave categories
      return mixedPOIs.sort(() => Math.random() - 0.5);
    }

    // Return all filtered POIs - loadedCount controls display
    return filtered;
  }, [data?.data, searchQuery, selectedCategories, selectedCategoryNames, minReviews, distance, userLocation, accessibility, destination.categories.presentation, destination.id]);

  // Display only loadedCount items (virtualization renders only visible)
  const pois = useMemo(() => {
    return processedPOIs.slice(0, loadedCount);
  }, [processedPOIs, loadedCount]);

  // Check if there are more POIs to display
  const hasMore = loadedCount < processedPOIs.length;

  // Virtualizer setup for grid view
  const rowCount = Math.ceil(pois.length / columnCount);
  // Row height: mobile 362px (350px card + 12px gap), desktop 432px (420px card + 12px gap)
  const rowHeight = columnCount <= 2 ? 362 : 432;
  const cardHeight = rowHeight - 12;

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => rowHeight,
    overscan: 3,
    scrollMargin: gridContainerRef.current?.offsetTop ?? 0,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Infinite scroll via virtualizer - load more when near bottom (grid view)
  useEffect(() => {
    if (viewMode !== 'grid') return;
    if (virtualItems.length > 0) {
      const lastVisibleRowIndex = virtualItems[virtualItems.length - 1].index;
      // Load more when approaching the last 2 rows
      if (lastVisibleRowIndex >= rowCount - 2 && loadedCount < processedPOIs.length) {
        setLoadedCount(prev => Math.min(prev + 12, processedPOIs.length));
      }
    }
  }, [virtualItems, rowCount, loadedCount, processedPOIs.length, viewMode]);

  // Infinite scroll for list view - load more when near bottom
  useEffect(() => {
    if (viewMode !== 'list') return;

    const handleListScroll = () => {
      const scrollPosition = window.innerHeight + window.scrollY;
      const pageHeight = document.documentElement.scrollHeight;

      // Load more when within 500px of bottom
      if (pageHeight - scrollPosition < 500 && loadedCount < processedPOIs.length) {
        setLoadedCount(prev => Math.min(prev + 12, processedPOIs.length));
      }
    };

    window.addEventListener('scroll', handleListScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleListScroll);
  }, [viewMode, loadedCount, processedPOIs.length]);

  // Debounced autocomplete fetch
  useEffect(() => {
    if (searchQuery.length < 2) {
      setAutocompleteSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const suggestions = await poiService.getAutocomplete(searchQuery);
        setAutocompleteSuggestions(suggestions.slice(0, 8)); // Max 8 suggestions
      } catch (error) {
        console.error('Autocomplete error:', error);
        setAutocompleteSuggestions([]);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Scroll direction detection for hide/show header (with requestAnimationFrame for performance)
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;

      ticking = true;
      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const scrollDiff = currentScrollY - lastScrollY;

        // Only trigger after scrolling more than 10px to avoid jitter
        if (Math.abs(scrollDiff) > 10) {
          if (scrollDiff > 0 && currentScrollY > 100) {
            // Scrolling DOWN and past initial threshold - hide header
            setShowHeader(false);
          } else if (scrollDiff < 0) {
            // Scrolling UP - show header
            setShowHeader(true);
          }
          lastScrollY = currentScrollY;
        }

        // Always show header when at top of page
        if (currentScrollY < 50) {
          setShowHeader(true);
        }

        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Toggle save/favorite
  const handleToggleFavorite = (poiId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    toggleFavorite(poiId);
  };

  // Navigate to POI detail (now opens modal instead of navigating)
  const handlePOIClick = (poiId: number) => {
    // Save current scroll position and view mode
    setScrollPosition(window.scrollY);
    setViewModeBeforeModal(viewMode);
    setSelectedPOIId(poiId);
  };

  // Close modal and restore scroll position and view mode
  const handleCloseModal = () => {
    setSelectedPOIId(null);
    // Restore original view mode (Grid or List) that was active before opening modal
    setViewMode(viewModeBeforeModal);
    // Restore scroll position after modal closes
    setTimeout(() => {
      window.scrollTo(0, scrollPosition);
    }, 50);
  };

  // Category selection (multi-select with Fase II-B.3)
  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        // Deselect: remove from array
        return prev.filter(c => c !== categoryId);
      } else {
        // Select: add to array
        return [...prev, categoryId];
      }
    });
    setLoadedCount(24); // Reset display count when category changes
  };

  // Search handler with autocomplete
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setLoadedCount(24); // Reset display count when search changes

    // Show autocomplete if query is 2+ characters
    if (value.length >= 2) {
      setShowAutocomplete(true);
      // Fetch autocomplete suggestions (debounced in useEffect)
    } else {
      setShowAutocomplete(false);
      setAutocompleteSuggestions([]);
    }
  };

  // Select autocomplete suggestion
  const handleSelectSuggestion = (suggestion: { id: number; name: string; category: string }) => {
    setSearchQuery(suggestion.name);
    setShowAutocomplete(false);

    // Open POI Detail Modal (same as clicking POI card)
    handlePOIClick(suggestion.id);
  };

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Request user location on component mount
  useEffect(() => {
    getUserLocation()
      .then(setUserLocation)
      .catch(() => {
        // Silently fall back to destination center if geolocation fails
        console.log('Geolocation not available, using destination center as fallback');
      });
  }, []);

  // Calculate distance to POI
  const getDistance = (poi: POI): string => {
    return getDistanceFromUser(
      { latitude: poi.latitude, longitude: poi.longitude },
      userLocation
    );
  };

  // getCategoryColor and getCategoryIcon now imported from centralized config
  // This ensures consistent icons and colors across all components

  // Filter modal handlers
  const openFilterModal = () => setFilterModalOpen(true);
  const closeFilterModal = () => setFilterModalOpen(false);

  const clearFilters = () => {
    setDistance(25);
    setMinReviews(0);
    setMinRating(0);
    setPriceLevel([]);
    setOpenNow(false);
    setAccessibility([]);
    setSelectedCategories([]);
  };

  const applyFilters = () => {
    // Filters will be applied via the usePOIs hook params
    // Reset display count when filters change
    setLoadedCount(24);
    closeFilterModal();
  };

  const togglePriceLevel = (level: number) => {
    setPriceLevel((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const toggleAccessibility = (feature: string) => {
    setAccessibility((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]
    );
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (distance !== 25) count++;
    if (minReviews !== 0) count++;
    if (minRating !== 0) count++;
    if (priceLevel.length > 0) count++;
    if (openNow) count++;
    if (accessibility.length > 0) count++;
    return count;
  };

  // Comparison handlers
  const handleToggleComparison = (poiId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent POI card click
    toggleComparison(poiId);
  };

  const handleCompare = () => {
    setComparisonModalOpen(true);
  };

  const handleCloseComparisonModal = () => {
    setComparisonModalOpen(false);
  };

  return (
    <>
      {/* Search Section */}
      <div className={`search-section ${showHeader ? 'header-visible' : 'header-hidden'}`}>
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder={t.poi.searchPlaceholder}
            value={searchQuery}
            onChange={handleSearch}
            onFocus={() => searchQuery.length >= 2 && setShowAutocomplete(true)}
          />
          {/* Autocomplete Dropdown */}
          {showAutocomplete && autocompleteSuggestions.length > 0 && (
            <div ref={autocompleteRef} className="autocomplete-dropdown">
              {autocompleteSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="autocomplete-item"
                  onClick={() => handleSelectSuggestion(suggestion)}
                >
                  <span className="autocomplete-icon">🔍</span>
                  {toTitleCase(suggestion.name)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category Chips */}
      <div className={`category-section ${showHeader ? 'header-visible' : 'header-hidden'}`}>
        <div className="category-scroll">
          {categories.map((category) => (
            <div
              key={category.id}
              className={`category-chip ${selectedCategories.includes(category.id) ? 'active' : ''}`}
              style={{ background: category.color }}
              onClick={() => handleCategoryClick(category.id)}
            >
              <img
                src={category.icon}
                alt={category.label}
                className="category-icon"
                style={{ width: '24px', height: '24px', objectFit: 'contain' }}
              />
              {category.label}
            </div>
          ))}
        </div>
      </div>

      {/* Filter Row */}
      <div className={`filter-row ${showHeader ? 'header-visible' : 'header-hidden'}`}>
        <button className="filter-btn" onClick={openFilterModal}>
          🔽 {t.poi.filters} ({getActiveFilterCount()})
        </button>
        <div className="view-toggle">
          <button
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            title="Grid View"
            onClick={() => setViewMode('grid')}
          >
            🔲
          </button>
          <button
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            title="List View"
            onClick={() => setViewMode('list')}
          >
            ☰
          </button>
          <button
            className={`view-btn ${viewMode === 'map' ? 'active' : ''}`}
            title="Map View"
            onClick={() => setViewMode('map')}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                fill={viewMode === 'map' ? 'white' : '#0273ae'}
                stroke={viewMode === 'map' ? 'white' : '#0273ae'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="10" r="3" fill={viewMode === 'map' ? '#D4AF37' : 'white'} />
            </svg>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
          <p>{t.common.loading}</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#EF4444', fontFamily: 'Inter, sans-serif' }}>
          <p>Error loading POIs: {error.message}</p>
        </div>
      )}

      {/* Grid View - Virtualized with window scrolling */}
      {viewMode === 'grid' && !isLoading && !error && pois.length > 0 && (
        <div
          ref={gridContainerRef}
          className="poi-grid-container"
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualRow) => {
            const rowIndex = virtualRow.index;
            const startIndex = rowIndex * columnCount;
            const rowPOIs = pois.slice(startIndex, startIndex + columnCount);

            return (
              <div
                key={virtualRow.key}
                className="poi-virtual-row"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${cardHeight}px`,
                  transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
                }}
              >
                <div className="poi-grid-row">
                  {rowPOIs.map((poi) => (
                    <div key={poi.id} className="poi-grid-item">
                      <div className="poi-card">
                        {/* Category Label */}
                        <div className="poi-category-label-uniform" style={{ background: getCategoryColor(poi.category) }}>
                          {poi.category}
                        </div>

                        {/* POI Image - Fixed height container */}
                        <div className="poi-image-container">
                          <POITileCarousel
                            images={poi.images || []}
                            thumbnailUrl={poi.thumbnail_url}
                            poiName={poi.name}
                            categoryColor={getCategoryColor(poi.category)}
                            categoryIcon={getCategoryIcon(poi.category)}
                          />
                        </div>

                        {/* Save Button */}
                        <button
                          className={`save-btn ${isFavorite(poi.id) ? 'saved' : ''}`}
                          onClick={(e) => handleToggleFavorite(poi.id, e)}
                        >
                          {isFavorite(poi.id) ? '❤️' : '🤍'}
                        </button>

                        {/* POI Content */}
                        <div className="poi-content" onClick={() => handlePOIClick(poi.id)} style={{ cursor: 'pointer' }}>
                          <div className="poi-title poi-title-smaller">{toTitleCase(poi.name)}</div>
                          <div className="poi-description">{truncateToOneSentence(poi.enriched_tile_description || poi.description)}</div>

                          {/* POI Rating */}
                          <div className="poi-rating">
                            <POIRating rating={poi.rating} size="small" showReviewCount={false} />
                          </div>

                          {/* Distance & Comparison Row */}
                          <div className="poi-bottom-row">
                            {/* Distance */}
                            <div className="poi-distance">
                              <svg className="map-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                  d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                                  fill="#0273ae"
                                  stroke="#0273ae"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <circle cx="12" cy="10" r="3" fill="white" />
                              </svg>
                              {getDistance(poi)}
                            </div>

                            {/* Comparison Checkbox */}
                            <label className="comparison-checkbox-inline" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="comparison-checkbox"
                                checked={isInComparison(poi.id)}
                                onChange={(e) => handleToggleComparison(poi.id, e as any)}
                                disabled={!canAddMore && !isInComparison(poi.id)}
                              />
                              <span className="comparison-checkbox-label">
                                {t.poi.comparison.compare}
                              </span>
                            </label>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <POITileActions
                          poi={poi}
                          onDetailsClick={() => handlePOIClick(poi.id)}
                          labels={{
                            share: t.poi.share,
                            agenda: t.poi.agenda,
                            map: t.poi.map,
                            details: t.poi.details
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && !isLoading && !error && (
        <div className="poi-list">
          {pois.map((poi) => (
            <div key={poi.id} className="poi-list-item">
              {/* POI Image - NEW COMPONENT */}
              <div className="poi-list-image-wrapper" onClick={() => handlePOIClick(poi.id)} style={{ cursor: 'pointer' }}>
                <POITileCarousel
                  images={poi.images || []}
                  thumbnailUrl={poi.thumbnail_url}
                  poiName={poi.name}
                  height="120px"
                  categoryColor={getCategoryColor(poi.category)}
                  categoryIcon={getCategoryIcon(poi.category)}
                />
              </div>

              {/* POI Content */}
              <div className="poi-list-content" onClick={() => handlePOIClick(poi.id)} style={{ cursor: 'pointer' }}>
                <div className="poi-list-header">
                  <div>
                    <div className="poi-list-title">{toTitleCase(poi.name)}</div>
                    <div className="poi-list-category-uniform" style={{ background: getCategoryColor(poi.category) }}>
                      {poi.category}
                    </div>
                  </div>
                </div>
                <div className="poi-list-description">{truncateToOneSentence(poi.enriched_tile_description || poi.description)}</div>
                <div className="poi-list-meta">
                  {/* POI Rating - NEW COMPONENT */}
                  <POIRating rating={poi.rating} size="small" showReviewCount={false} />
                  <div className="poi-distance">
                    <svg className="map-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                        fill="#0273ae"
                        stroke="#0273ae"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="10" r="3" fill="white" />
                    </svg>
                    {getDistance(poi)}
                  </div>

                  {/* Comparison Checkbox - Sprint 8.0 - Now inline with meta */}
                  <label className="comparison-checkbox-container comparison-checkbox-list" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="comparison-checkbox"
                      checked={isInComparison(poi.id)}
                      onChange={(e) => handleToggleComparison(poi.id, e as any)}
                      disabled={!canAddMore && !isInComparison(poi.id)}
                    />
                    <span className="comparison-checkbox-label">
                      {t.poi.comparison.compare}
                    </span>
                  </label>
                </div>

                {/* Action Buttons - NEW COMPONENT (inline for list view) */}
                <div style={{ marginTop: '12px' }}>
                  <POITileActions
                    poi={poi}
                    onDetailsClick={() => handlePOIClick(poi.id)}
                    labels={{
                      share: t.poi.share,
                      agenda: t.poi.agenda,
                      map: t.poi.map,
                      details: t.poi.details
                    }}
                  />
                </div>
              </div>

              {/* Save Button */}
              <button
                className={`poi-list-save-btn ${isFavorite(poi.id) ? 'saved' : ''}`}
                onClick={(e) => handleToggleFavorite(poi.id, e)}
              >
                {isFavorite(poi.id) ? '❤️' : '🤍'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Map View */}
      {viewMode === 'map' && !isLoading && !error && (
        <div className="poi-map-container">
          <MapView
            searchParams={{
              q: searchQuery || undefined,
              category: selectedCategoryNames.length === 1 ? selectedCategoryNames[0] : undefined,
            }}
            height="600px"
            onMarkerClick={handlePOIClick}
            perCategory={7}
            maxPOIs={200}
            minRating={4}
            categories={selectedCategoryNames.length > 0 ? selectedCategoryNames : destination.categories.presentation}
            enableClustering={true}
          />
        </div>
      )}

      {/* No Results */}
      {!isLoading && !error && pois.length === 0 && (
        <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</p>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#1F2937' }}>
            {t.poi.noResults}
          </h3>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>
            {t.poi.noResultsDesc}
          </p>
        </div>
      )}

      {/* Filter Modal */}
      {filterModalOpen && (
        <div className="filter-modal-overlay" onClick={closeFilterModal}>
          <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="filter-header">
              <button className="filter-back-btn" onClick={closeFilterModal}>←</button>
              <h2 className="filter-title">Filters ({getActiveFilterCount()})</h2>
              <button className="filter-close-btn" onClick={closeFilterModal}>×</button>
            </div>

            {/* Body */}
            <div className="filter-body">
              {/* Distance Filter */}
              <div className="filter-section">
                <h3 className="filter-section-title">
                  <span>Distance</span>
                  <span className="filter-section-chevron">▼</span>
                </h3>
                <div className="filter-section-content">
                  <div className="filter-slider-container">
                    <input
                      type="range"
                      className="filter-slider"
                      min="0"
                      max="25"
                      step="0.5"
                      value={distance}
                      onChange={(e) => setDistance(Number(e.target.value))}
                    />
                    <div className="filter-slider-label">Within {distance} km of my location</div>
                  </div>
                </div>
              </div>

              {/* Rating & Reviews */}
              <div className="filter-section">
                <h3 className="filter-section-title">
                  <span>Rating & Reviews</span>
                  <span className="filter-section-chevron">▼</span>
                </h3>
                <div className="filter-section-content">
                  <div className="filter-radio-group">
                    <label className="filter-radio-option">
                      <input
                        type="radio"
                        name="rating"
                        value="5"
                        checked={minRating === 5}
                        onChange={() => setMinRating(5)}
                      />
                      <span>⭐⭐⭐⭐⭐ 5 stars (perfect)</span>
                    </label>
                    <label className="filter-radio-option">
                      <input
                        type="radio"
                        name="rating"
                        value="4"
                        checked={minRating === 4}
                        onChange={() => setMinRating(4)}
                      />
                      <span>⭐⭐⭐⭐ 4+ stars (excellent)</span>
                    </label>
                    <label className="filter-radio-option">
                      <input
                        type="radio"
                        name="rating"
                        value="3"
                        checked={minRating === 3}
                        onChange={() => setMinRating(3)}
                      />
                      <span>⭐⭐⭐ 3+ stars (good)</span>
                    </label>
                    <label className="filter-radio-option">
                      <input
                        type="radio"
                        name="rating"
                        value="0"
                        checked={minRating === 0}
                        onChange={() => setMinRating(0)}
                      />
                      <span>All ratings</span>
                    </label>
                  </div>
                  <div className="filter-slider-container">
                    <label>Minimum reviews:</label>
                    <input
                      type="range"
                      className="filter-slider"
                      min="0"
                      max="100"
                      step="5"
                      value={minReviews}
                      onChange={(e) => setMinReviews(Number(e.target.value))}
                    />
                    <div className="filter-slider-label">{minReviews}+ reviews</div>
                  </div>
                </div>
              </div>

              {/* Price Level */}
              <div className="filter-section">
                <h3 className="filter-section-title">
                  <span>Price Level</span>
                  <span className="filter-section-chevron">▼</span>
                </h3>
                <div className="filter-section-content">
                  <div className="filter-chip-group">
                    <button
                      className={`filter-chip ${priceLevel.includes(1) ? 'active' : ''}`}
                      onClick={() => togglePriceLevel(1)}
                    >
                      € Budget-friendly
                    </button>
                    <button
                      className={`filter-chip ${priceLevel.includes(2) ? 'active' : ''}`}
                      onClick={() => togglePriceLevel(2)}
                    >
                      €€ Moderate
                    </button>
                    <button
                      className={`filter-chip ${priceLevel.includes(3) ? 'active' : ''}`}
                      onClick={() => togglePriceLevel(3)}
                    >
                      €€€ Expensive
                    </button>
                    <button
                      className={`filter-chip ${priceLevel.includes(4) ? 'active' : ''}`}
                      onClick={() => togglePriceLevel(4)}
                    >
                      €€€€ Luxury
                    </button>
                  </div>
                </div>
              </div>

              {/* Opening Hours */}
              <div className="filter-section">
                <h3 className="filter-section-title">
                  <span>Opening Hours</span>
                  <span className="filter-section-chevron">▼</span>
                </h3>
                <div className="filter-section-content">
                  <div className="filter-toggle-group">
                    <label className="filter-toggle">
                      <input
                        type="checkbox"
                        className="filter-checkbox"
                        checked={openNow}
                        onChange={(e) => setOpenNow(e.target.checked)}
                      />
                      <span>Open now</span>
                    </label>
                    <label className="filter-toggle">
                      <input
                        type="checkbox"
                        className="filter-checkbox"
                        onChange={(e) => console.log('Open tomorrow:', e.target.checked)}
                      />
                      <span>Open tomorrow</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Accessibility */}
              <div className="filter-section">
                <h3 className="filter-section-title">
                  <span>Accessibility</span>
                  <span className="filter-section-chevron">▼</span>
                </h3>
                <div className="filter-section-content">
                  <div className="filter-toggle-group">
                    <label className="filter-toggle">
                      <input
                        type="checkbox"
                        className="filter-checkbox"
                        checked={accessibility.includes('wheelchair')}
                        onChange={() => toggleAccessibility('wheelchair')}
                      />
                      <span>♿ Wheelchair accessible</span>
                    </label>
                    <label className="filter-toggle">
                      <input
                        type="checkbox"
                        className="filter-checkbox"
                        checked={accessibility.includes('kids')}
                        onChange={() => toggleAccessibility('kids')}
                      />
                      <span>👶 Kid-friendly</span>
                    </label>
                    <label className="filter-toggle">
                      <input
                        type="checkbox"
                        className="filter-checkbox"
                        checked={accessibility.includes('pets')}
                        onChange={() => toggleAccessibility('pets')}
                      />
                      <span>🐕 Pets welcome</span>
                    </label>
                    <label className="filter-toggle">
                      <input
                        type="checkbox"
                        className="filter-checkbox"
                        checked={accessibility.includes('parking')}
                        onChange={() => toggleAccessibility('parking')}
                      />
                      <span>🅿️ Parking available</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="filter-footer">
              <button className="filter-clear-btn" onClick={clearFilters}>
                Clear filters
              </button>
              <button className="filter-apply-btn" onClick={applyFilters}>
                Show {pois.length} POIs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POI Detail Modal */}
      {selectedPOIId && (
        <POIDetailModal
          poiId={selectedPOIId}
          isOpen={selectedPOIId !== null}
          onClose={handleCloseModal}
        />
      )}

      {/* POI Comparison Modal - Sprint 8.0 */}
      {comparisonModalOpen && (
        <POIComparisonModal
          poiIds={Array.from(comparisonPOIs)}
          isOpen={comparisonModalOpen}
          onClose={handleCloseComparisonModal}
        />
      )}

      {/* Comparison Bar - Sprint 8.0 */}
      <ComparisonBar onCompare={handleCompare} />

      {/* Footer */}
      <footer className="poi-footer">
        <div className="footer-content">
          <div className="footer-links">
            <Link to="/about" className="footer-link">About</Link>
            <Link to="/privacy" className="footer-link">Privacy Policy</Link>
            <Link to="/terms" className="footer-link">Terms of Service</Link>
            <Link to="/contact" className="footer-link">Contact</Link>
          </div>
          <p className="footer-copy">
            © 2025 {destination.name}. Powered by AI. Made with ❤️ for travelers.
          </p>
        </div>
      </footer>
    </>
  );
}
