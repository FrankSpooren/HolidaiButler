import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { AgendaCard } from '@/features/agenda/components/AgendaCard';
import { AgendaDetailModal } from '@/features/agenda/components/AgendaDetailModal';
import { AgendaFilterModal, type AgendaFilters } from '@/features/agenda/components/AgendaFilterModal';
import { agendaService, type AgendaEvent } from '@/features/agenda/services/agendaService';
import { getUserLocation, getDistanceFromUser, type Coordinates } from '@/shared/utils/distance';
import './AgendaPage.css';

/**
 * AgendaPage - Events & Activities Calendar
 * Route: /agenda
 * Design: Matches POILandingPage exactly
 */

type ViewMode = 'grid' | 'list' | 'map';

// Interest category configuration matching POI categories
const INTEREST_CATEGORIES = [
  { id: 'music', label: 'Music', icon: '🎵', color: '#E67E22' },
  { id: 'culture', label: 'Culture & History', icon: '🏛️', color: '#9C59B8' },
  { id: 'active', label: 'Active', icon: '⚽', color: '#3498DB' },
  { id: 'nature', label: 'Beaches & Nature', icon: '🌿', color: '#1ABC9C' },
  { id: 'food', label: 'Food & Drinks', icon: '🍽️', color: '#27AE60' },
  { id: 'festivals', label: 'Recreation', icon: '🎉', color: '#E67E22' },
  { id: 'markets', label: 'Shopping', icon: '🛒', color: '#F39C12' },
  { id: 'family', label: 'Health & Wellbeing', icon: '🧘', color: '#E91E63' },
];

// Map event categories to interest categories
const categoryMapping: Record<string, string> = {
  culture: 'culture',
  exhibitions: 'culture',
  festivals: 'festivals',
  music: 'music',
  markets: 'markets',
  'food-drink': 'food',
  'active-sports': 'active',
  nature: 'nature',
  family: 'family',
  tours: 'culture',
  workshops: 'festivals',
  entertainment: 'festivals',
  relaxation: 'family',
  folklore: 'culture',
  beach: 'nature',
};

const defaultFilters: AgendaFilters = {
  interests: [],
  distance: 50,
  company: [],
  dateType: 'all',
};

export function AgendaPage() {
  const { t, language } = useLanguage();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [limit, setLimit] = useState<number>(12);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<AgendaFilters>(defaultFilters);
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set());
  const [showHeader, setShowHeader] = useState<boolean>(true);
  const [lastScrollY, setLastScrollY] = useState<number>(0);

  // Fetch events
  const { data: eventsData, isLoading, error } = useQuery({
    queryKey: ['agenda-events', searchQuery, selectedCategory, limit],
    queryFn: () => agendaService.getEvents({
      search: searchQuery || undefined,
      categories: selectedCategory || undefined,
      limit: 100, // Fetch more for client-side filtering
      page: 1,
    }),
    staleTime: 60000,
  });

  const allEvents = eventsData?.data || [];

  // Filter events based on filters
  const filteredEvents = useMemo(() => {
    let result = [...allEvents];

    // Filter by selected category chip
    if (selectedCategory) {
      result = result.filter(event => {
        const mappedCategory = categoryMapping[event.primaryCategory];
        return mappedCategory === selectedCategory;
      });
    }

    // Filter by interests from filter modal
    if (filters.interests.length > 0) {
      result = result.filter(event => {
        const mappedCategory = categoryMapping[event.primaryCategory];
        return filters.interests.includes(mappedCategory);
      });
    }

    // Filter by distance
    if (filters.distance < 50 && userLocation) {
      result = result.filter(event => {
        if (!event.location?.coordinates) return true;
        const dist = parseFloat(
          getDistanceFromUser(
            { latitude: event.location.coordinates.lat, longitude: event.location.coordinates.lng },
            userLocation
          ).replace(' km', '')
        );
        return !isNaN(dist) && dist <= filters.distance;
      });
    }

    // Filter by date
    if (filters.dateType !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const endOfWeekend = new Date(today);
      const dayOfWeek = today.getDay();
      const daysUntilSunday = 7 - dayOfWeek;
      endOfWeekend.setDate(endOfWeekend.getDate() + daysUntilSunday);

      result = result.filter(event => {
        const eventDate = new Date(event.startDate);
        eventDate.setHours(0, 0, 0, 0);

        switch (filters.dateType) {
          case 'today':
            return eventDate.getTime() === today.getTime();
          case 'tomorrow':
            return eventDate.getTime() === tomorrow.getTime();
          case 'weekend':
            return eventDate >= today && eventDate <= endOfWeekend;
          case 'custom':
            if (filters.dateStart && filters.dateEnd) {
              const start = new Date(filters.dateStart);
              const end = new Date(filters.dateEnd);
              return eventDate >= start && eventDate <= end;
            }
            return true;
          default:
            return true;
        }
      });
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(event => {
        const title = typeof event.title === 'string'
          ? event.title
          : event.title?.[language] || event.title?.nl || event.title?.en || '';
        return title.toLowerCase().includes(query);
      });
    }

    return result.slice(0, limit);
  }, [allEvents, selectedCategory, filters, userLocation, searchQuery, language, limit]);

  const hasMore = filteredEvents.length >= limit && allEvents.length > limit;

  // Get user location
  useEffect(() => {
    getUserLocation()
      .then(setUserLocation)
      .catch(() => console.log('Geolocation not available'));
  }, []);

  // Scroll direction detection
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 50) {
        setShowHeader(true);
      } else if (currentScrollY > lastScrollY) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Calculate distance to event
  const getDistance = (event: AgendaEvent): string => {
    if (!event.location?.coordinates || !userLocation) return '';
    return getDistanceFromUser(
      { latitude: event.location.coordinates.lat, longitude: event.location.coordinates.lng },
      userLocation
    );
  };

  // Handlers
  const handleEventClick = (eventId: string) => {
    setSelectedEventId(eventId);
  };

  const handleCloseModal = () => {
    setSelectedEventId(null);
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(prev => prev === categoryId ? '' : categoryId);
    setLimit(12);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setLimit(12);
  };

  const handleLoadMore = () => {
    setLimit(prev => prev + 12);
  };

  const handleToggleSave = (eventId: string) => {
    setSavedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const handleApplyFilters = (newFilters: AgendaFilters) => {
    setFilters(newFilters);
    setLimit(12);
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.interests.length > 0) count += filters.interests.length;
    if (filters.distance < 50) count++;
    if (filters.company.length > 0) count += filters.company.length;
    if (filters.dateType !== 'all') count++;
    return count;
  };

  return (
    <>
      {/* Search Section */}
      <div className={`agenda-search-section ${showHeader ? 'header-visible' : 'header-hidden'}`}>
        <div className="agenda-search-bar">
          <span className="agenda-search-icon">🔍</span>
          <input
            type="text"
            className="agenda-search-input"
            placeholder={t.poi?.searchPlaceholder || 'Search POIs, restaurants, beaches...'}
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
      </div>

      {/* Category Chips */}
      <div className={`agenda-category-section ${showHeader ? 'header-visible' : 'header-hidden'}`}>
        <div className="agenda-category-scroll">
          {INTEREST_CATEGORIES.map((category) => (
            <div
              key={category.id}
              className={`agenda-category-chip ${selectedCategory === category.id ? 'active' : ''}`}
              style={{ background: category.color }}
              onClick={() => handleCategoryClick(category.id)}
            >
              <span className="agenda-category-icon">{category.icon}</span>
              {category.label}
            </div>
          ))}
        </div>
      </div>

      {/* Filter Row */}
      <div className={`agenda-filter-row ${showHeader ? 'header-visible' : 'header-hidden'}`}>
        <button className="agenda-filter-btn" onClick={() => setFilterModalOpen(true)}>
          🔽 {t.poi?.filters || 'Filters'} ({getActiveFilterCount()})
        </button>
        <div className="agenda-view-toggle">
          <button
            className={`agenda-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            🔲
          </button>
          <button
            className={`agenda-view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            ☰
          </button>
          <button
            className={`agenda-view-btn ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => setViewMode('map')}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                fill={viewMode === 'map' ? 'white' : '#0273ae'}
                stroke={viewMode === 'map' ? 'white' : '#0273ae'}
                strokeWidth="2"
              />
              <circle cx="12" cy="10" r="3" fill={viewMode === 'map' ? '#D4AF37' : 'white'} />
            </svg>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="agenda-loading-state">
          <Loader2 className="agenda-spinner" />
          <p>{t.common?.loading || 'Loading...'}</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="agenda-error-state">
          <p>Error loading events: {error.message}</p>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && !isLoading && !error && (
        <div className="agenda-grid">
          {filteredEvents.map((event) => (
            <AgendaCard
              key={event._id}
              event={event}
              onClick={() => handleEventClick(event._id)}
              onSave={handleToggleSave}
              isSaved={savedEvents.has(event._id)}
              distance={getDistance(event)}
            />
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && !isLoading && !error && (
        <div className="agenda-list">
          {filteredEvents.map((event) => (
            <AgendaCard
              key={event._id}
              event={event}
              onClick={() => handleEventClick(event._id)}
              onSave={handleToggleSave}
              isSaved={savedEvents.has(event._id)}
              distance={getDistance(event)}
            />
          ))}
        </div>
      )}

      {/* Map View Placeholder */}
      {viewMode === 'map' && !isLoading && !error && (
        <div className="agenda-map-placeholder">
          <p>Map view coming soon...</p>
        </div>
      )}

      {/* Load More */}
      {!isLoading && !error && hasMore && viewMode !== 'map' && (
        <button className="agenda-load-more" onClick={handleLoadMore}>
          {t.poi?.loadMore || 'Load more'} ({allEvents.length - filteredEvents.length} remaining)
        </button>
      )}

      {/* No Results */}
      {!isLoading && !error && filteredEvents.length === 0 && (
        <div className="agenda-no-results">
          <p className="agenda-no-results-icon">🔍</p>
          <h3>{t.poi?.noResults || 'No results found'}</h3>
          <p>{t.poi?.noResultsDesc || 'Try adjusting your filters or search criteria'}</p>
        </div>
      )}

      {/* Filter Modal */}
      <AgendaFilterModal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
        resultCount={filteredEvents.length}
      />

      {/* Detail Modal */}
      {selectedEventId && (
        <AgendaDetailModal
          eventId={selectedEventId}
          isOpen={selectedEventId !== null}
          onClose={handleCloseModal}
        />
      )}

      {/* Footer */}
      <footer className="agenda-footer">
        <div className="agenda-footer-content">
          <div className="agenda-footer-links">
            <Link to="/about" className="agenda-footer-link">About</Link>
            <Link to="/privacy" className="agenda-footer-link">Privacy Policy</Link>
            <Link to="/terms" className="agenda-footer-link">Terms of Service</Link>
            <Link to="/contact" className="agenda-footer-link">Contact</Link>
          </div>
          <p className="agenda-footer-copy">
            © 2025 HolidaiButler. Powered by AI. Made with ❤️ for travelers.
          </p>
        </div>
      </footer>
    </>
  );
}

export default AgendaPage;
