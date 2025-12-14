import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { usePOIs } from '../features/poi/hooks/usePOIs';
import { poiService } from '../features/poi/services/poiService';
import type { POI } from '../features/poi/types/poi.types';
import { MapView } from '../features/poi/components/MapView';
import { POIImage } from '../features/poi/components/POIImage';
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
import './POILandingPage.css';

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
  label: string;
  icon: string;
  color: string;
}

// Categories are defined in component to access translations

export function POILandingPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { isInComparison, toggleComparison, canAddMore, comparisonPOIs } = useComparison();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [limit, setLimit] = useState<number>(12);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [selectedPOIId, setSelectedPOIId] = useState<number | null>(null);
  const [scrollPosition, setScrollPosition] = useState<number>(0);
  const [viewModeBeforeModal, setViewModeBeforeModal] = useState<ViewMode>('grid');
  const [comparisonModalOpen, setComparisonModalOpen] = useState<boolean>(false);
  const [showHeader, setShowHeader] = useState<boolean>(true);
  const [lastScrollY, setLastScrollY] = useState<number>(0);

  // Use centralized category configuration (single source of truth)
  const categories: Category[] = CATEGORIES_ARRAY.map(cat => ({
    id: cat.id,
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

  // Filter modal state
  const [filterModalOpen, setFilterModalOpen] = useState<boolean>(false);
  const [distance, setDistance] = useState<number>(25); // Default 25km = no filtering
  const [minReviews, setMinReviews] = useState<number>(0);
  const [minRating, setMinRating] = useState<number>(0);
  const [priceLevel, setPriceLevel] = useState<number[]>([]);
  const [openNow, setOpenNow] = useState<boolean>(false);
  const [accessibility, setAccessibility] = useState<string[]>([]);

  // Get category label for backend (backend expects "Active", "Food", etc. not "active", "food")
  const getCategoryLabel = (categoryId: string): string => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.label || categoryId;
  };

  // Fetch POIs with filters
  // For default view (no filters), fetch more to create vacation-focused mix
  const fetchLimit = (!searchQuery && !selectedCategory) ? 200 : limit;

  const { data, isLoading, error } = usePOIs({
    q: searchQuery || undefined,
    category: selectedCategory ? getCategoryLabel(selectedCategory) : undefined,
    limit: fetchLimit,
    // Use alphabetical sorting for default view to get varied ratings
    // (default popularity sort returns first 260 POIs all with 5.0 rating)
    sort: (!searchQuery && !selectedCategory) ? 'name:asc' : undefined,
    // Apply filters from filter modal
    min_rating: minRating > 0 ? minRating : undefined,
    open_now: openNow || undefined,
    price_min: priceLevel.length > 0 ? Math.min(...priceLevel) : undefined,
    price_max: priceLevel.length > 0 ? Math.max(...priceLevel) : undefined,
    // IMAGE FILTERING: Presentation layers require images, search does not
    // - Grids show only POIs with valid images for professional appearance
    // - Search shows ALL POIs for maximum results
    require_images: searchQuery ? undefined : true,
  });

  // Filter and sort POIs
  const processedPOIs = useMemo(() => {
    let filtered = (data?.data || []).filter(poi => {
      // Filter out Accommodation category
      if (poi.category === 'Accommodation (do not communicate)') return false;

      // Filter out accommodation-related POIs in other categories
      const accomKeywords = ['realty', 'villa', 'apartment', 'apartamento', 'hotel', 'hostel', 'residencial'];
      const lowerName = poi.name.toLowerCase();
      if (accomKeywords.some(keyword => lowerName.includes(keyword))) return false;

      // Client-side filter: minimum reviews
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

      // Filter out POIs without images in random/default overview (when no search/category filter)
      if (!searchQuery && !selectedCategory) {
        if (!poi.images || poi.images.length === 0) {
          if (!poi.thumbnail_url) return false;
        }
      }

      return true;
    });

    // If no filters active, create vacation-focused mix from priority categories
    if (!searchQuery && !selectedCategory) {
      const vacationCategories = [
        'Beaches & Nature',
        'Culture & History',
        'Food & Drinks',
        'Recreation',
        'Active'
      ];

      // Group by vacation categories
      const byCategory: Record<string, typeof filtered> = {};
      vacationCategories.forEach(cat => {
        byCategory[cat] = filtered.filter(p => p.category === cat);
      });

      // Create balanced mix: take 10 from each category alternating
      const mixed: typeof filtered = [];
      const maxPerCategory = 10;

      for (let i = 0; i < maxPerCategory; i++) {
        vacationCategories.forEach(cat => {
          if (byCategory[cat][i]) {
            mixed.push(byCategory[cat][i]);
          }
        });
      }

      // Fill remaining with rest of vacation categories if less than limit
      if (mixed.length < limit) {
        vacationCategories.forEach(cat => {
          byCategory[cat].slice(maxPerCategory).forEach(poi => {
            if (mixed.length < limit) mixed.push(poi);
          });
        });
      }

      return mixed.slice(0, limit);
    }

    // For filtered views, return as is (limited to requested limit)
    return filtered.slice(0, limit);
  }, [data?.data, searchQuery, selectedCategory, limit, minReviews, distance, userLocation, accessibility]);

  const pois = processedPOIs;
  const hasMore = data?.meta?.has_more || false;

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

  // Scroll direction detection for hide/show header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Don't hide if near top (< 50px)
      if (currentScrollY < 50) {
        setShowHeader(true);
        setLastScrollY(currentScrollY);
        return;
      }

      // Detect scroll direction
      if (currentScrollY > lastScrollY) {
        // Scrolling down - hide header
        setShowHeader(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show header
        setShowHeader(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  // Toggle save/favorite
  const handleToggleFavorite = (poiId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    toggleFavorite(poiId);
  };

  // Load more POIs
  const handleLoadMore = () => {
    setLimit((prev) => prev + 12);
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

  // Category selection
  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory((prev) => (prev === categoryId ? '' : categoryId));
    setLimit(12); // Reset limit when category changes
  };

  // Search handler with autocomplete
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setLimit(12); // Reset limit when search changes

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
        // Silently fall back to Calpe center if geolocation fails
        console.log('Geolocation not available, using Calpe center as fallback');
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
  };

  const applyFilters = () => {
    // Filters will be applied via the usePOIs hook params
    // Reset limit when filters change
    setLimit(12);
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
    if (distance !== 10) count++;
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
              className={`category-chip ${selectedCategory === category.id ? 'active' : ''}`}
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

      {/* Grid View */}
      {viewMode === 'grid' && !isLoading && !error && (
        <div className="poi-grid">
          {pois.map((poi) => (
            <div key={poi.id} className="poi-card">
              {/* Category Label */}
              <div className="poi-category-label-uniform" style={{ background: getCategoryColor(poi.category) }}>
                {poi.category}
              </div>

              {/* POI Image - NEW COMPONENT */}
              <POIImage
                poi={poi}
                height="200px"
                categoryColor={getCategoryColor(poi.category)}
                categoryIcon={getCategoryIcon(poi.category)}
              />

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

                {/* POI Rating - NEW COMPONENT */}
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

                  {/* Comparison Checkbox - Sprint 8.0 */}
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

              {/* Action Buttons - NEW COMPONENT */}
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
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && !isLoading && !error && (
        <div className="poi-list">
          {pois.map((poi) => (
            <div key={poi.id} className="poi-list-item">
              {/* POI Image - NEW COMPONENT */}
              <div className="poi-list-image-wrapper" onClick={() => handlePOIClick(poi.id)} style={{ cursor: 'pointer' }}>
                <POIImage
                  poi={poi}
                  height="120px"
                  categoryColor={getCategoryColor(poi.category)}
                  categoryIcon={getCategoryIcon(poi.category)}
                  className="poi-list-image"
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
              category: selectedCategory ? getCategoryLabel(selectedCategory) : undefined,
            }}
            height="600px"
            onMarkerClick={handlePOIClick}
          />
        </div>
      )}

      {/* Load More */}
      {!isLoading && !error && hasMore && viewMode !== 'map' && (
        <button className="load-more" onClick={handleLoadMore}>
          {t.poi.loadMore} ({data?.meta?.total ? data.meta.total - pois.length : '...'} remaining)
        </button>
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
            © 2025 HolidaiButler. Powered by AI. Made with ❤️ for travelers.
          </p>
        </div>
      </footer>
    </>
  );
}
