import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAgendaFavorites } from '../shared/contexts/AgendaFavoritesContext';
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

// Interest category configuration - Colors matching POI page, with emoji icons
const INTEREST_CATEGORIES = [
  { id: 'music', icon: '🎵', color: 'linear-gradient(135deg, #354f48, #49605a)' },
  { id: 'culture', icon: '🏛️', color: 'linear-gradient(135deg, #253444, #3a4856)' },
  { id: 'active', icon: '⚽', color: 'linear-gradient(135deg, #016193, #1a709d)' },
  { id: 'nature', icon: '🌿', color: 'linear-gradient(135deg, #b4942e, #bb9e42)' },
  { id: 'food', icon: '🍽️', color: 'linear-gradient(135deg, #4f766b, #608379)' },
  { id: 'festivals', icon: '🎉', color: 'linear-gradient(135deg, #354f48, #49605a)' },
  { id: 'markets', icon: '🛒', color: 'linear-gradient(135deg, #b4892e, #bb9442)' },
  { id: 'creative', icon: '🎨', color: 'linear-gradient(135deg, #004568, #195777)' },
];

// Category labels in all 6 languages - original Agenda labels
const categoryLabels: Record<string, Record<string, string>> = {
  nl: {
    music: 'Muziek',
    culture: 'Cultuur',
    active: 'Actief',
    nature: 'Natuur',
    food: 'Food',
    festivals: 'Festivals',
    markets: 'Markten',
    creative: 'Creatief',
  },
  en: {
    music: 'Music',
    culture: 'Culture',
    active: 'Active',
    nature: 'Nature',
    food: 'Food',
    festivals: 'Festivals',
    markets: 'Markets',
    creative: 'Creative',
  },
  de: {
    music: 'Musik',
    culture: 'Kultur',
    active: 'Aktiv',
    nature: 'Natur',
    food: 'Essen',
    festivals: 'Festivals',
    markets: 'Märkte',
    creative: 'Kreativ',
  },
  es: {
    music: 'Música',
    culture: 'Cultura',
    active: 'Activo',
    nature: 'Naturaleza',
    food: 'Comida',
    festivals: 'Festivales',
    markets: 'Mercados',
    creative: 'Creativo',
  },
  sv: {
    music: 'Musik',
    culture: 'Kultur',
    active: 'Aktiv',
    nature: 'Natur',
    food: 'Mat',
    festivals: 'Festivaler',
    markets: 'Marknader',
    creative: 'Kreativ',
  },
  pl: {
    music: 'Muzyka',
    culture: 'Kultura',
    active: 'Aktywne',
    nature: 'Natura',
    food: 'Jedzenie',
    festivals: 'Festiwale',
    markets: 'Targi',
    creative: 'Kreatywny',
  },
};

// Search placeholder translations
const searchPlaceholders: Record<string, string> = {
  nl: 'Zoek evenementen en activiteiten',
  en: 'Search Events and Activities',
  de: 'Veranstaltungen und Aktivitäten suchen',
  es: 'Buscar eventos y actividades',
  sv: 'Sök evenemang och aktiviteter',
  pl: 'Szukaj wydarzeń i aktywności',
};

// Keywords for smart categorization based on title/description
const categoryKeywords: Record<string, string[]> = {
  music: ['music', 'concert', 'band', 'orchestra', 'jazz', 'rock', 'live music', 'dj', 'festival music', 'singing', 'choir', 'guitar', 'piano', 'flamenco'],
  culture: ['museum', 'history', 'heritage', 'castle', 'church', 'cathedral', 'monument', 'archaeological', 'historic', 'cultural', 'tradition', 'folklore', 'exhibition', 'gallery', 'art exhibition'],
  active: ['hiking', 'cycling', 'running', 'sport', 'fitness', 'yoga', 'swimming', 'tennis', 'golf', 'football', 'basketball', 'climbing', 'kayak', 'surfing', 'diving', 'walk', 'tour', 'adventure'],
  nature: ['beach', 'nature', 'park', 'garden', 'mountain', 'forest', 'wildlife', 'bird', 'botanical', 'landscape', 'outdoor', 'natural', 'eco', 'hiking', 'trail', 'peñon', 'ifach', 'sierra'],
  food: ['food', 'restaurant', 'tapas', 'wine', 'gastronomy', 'cooking', 'culinary', 'tasting', 'dinner', 'lunch', 'brunch', 'cafe', 'bar', 'paella', 'cuisine'],
  festivals: ['festival', 'fiesta', 'carnival', 'parade', 'celebration', 'party', 'fireworks', 'fair', 'feria', 'hogueras', 'moors', 'christians'],
  markets: ['market', 'mercado', 'flea', 'antique', 'craft', 'artisan', 'farmers', 'street market', 'bazaar', 'fair'],
  creative: ['painting', 'art class', 'workshop', 'craft', 'pottery', 'sculpture', 'photography', 'drawing', 'creative', 'artistic', 'design', 'handmade', 'diy', 'oil painting', 'watercolor', 'ceramic'],
};

// Smart categorization function - scans title and description
function detectCategory(event: AgendaEvent, language: string): string {
  const title = typeof event.title === 'string'
    ? event.title.toLowerCase()
    : (event.title?.[language] || event.title?.en || event.title?.nl || '').toLowerCase();

  const description = typeof event.description === 'string'
    ? event.description.toLowerCase()
    : (event.description?.[language] || event.description?.en || event.description?.nl || '').toLowerCase();

  const combinedText = `${title} ${description}`;

  // Score each category based on keyword matches
  const scores: Record<string, number> = {};

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    scores[category] = 0;
    for (const keyword of keywords) {
      if (combinedText.includes(keyword)) {
        // Title matches are worth more
        if (title.includes(keyword)) {
          scores[category] += 3;
        } else {
          scores[category] += 1;
        }
      }
    }
  }

  // Find the category with highest score
  let maxScore = 0;
  let bestCategory = 'culture'; // default fallback

  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  // If no keywords matched, use the event's primaryCategory with mapping
  if (maxScore === 0 && event.primaryCategory) {
    const mapped = categoryMapping[event.primaryCategory];
    if (mapped) return mapped;
  }

  return bestCategory;
}

// Map event categories to interest categories (fallback)
const categoryMapping: Record<string, string> = {
  culture: 'culture',
  exhibitions: 'culture',
  festivals: 'festivals',
  music: 'music',
  markets: 'markets',
  'food-drink': 'food',
  'active-sports': 'active',
  nature: 'nature',
  tours: 'culture',
  workshops: 'creative',
  entertainment: 'festivals',
  folklore: 'culture',
  beach: 'nature',
  creative: 'creative',
};

const defaultFilters: AgendaFilters = {
  interests: [],
  distance: 50,
  company: [],
  dateType: 'all',
};

export function AgendaPage() {
  const { t, language } = useLanguage();
  const { agendaFavorites, isAgendaFavorite, toggleAgendaFavorite } = useAgendaFavorites();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [limit, setLimit] = useState<number>(12);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<AgendaFilters>(defaultFilters);
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

  // Filter events based on filters with smart categorization
  const filteredEvents = useMemo(() => {
    let result = [...allEvents];

    // Filter by selected category chip using smart detection
    if (selectedCategory) {
      result = result.filter(event => {
        const detectedCategory = detectCategory(event, language);
        return detectedCategory === selectedCategory;
      });
    }

    // Filter by interests from filter modal using smart detection
    if (filters.interests.length > 0) {
      result = result.filter(event => {
        const detectedCategory = detectCategory(event, language);
        return filters.interests.includes(detectedCategory);
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
    toggleAgendaFavorite(eventId);
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
            placeholder={searchPlaceholders[language] || searchPlaceholders.en}
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
              {categoryLabels[language]?.[category.id] || categoryLabels.en[category.id]}
            </div>
          ))}
        </div>
      </div>

      {/* Filter Row */}
      <div className={`agenda-filter-row ${showHeader ? 'header-visible' : 'header-hidden'}`}>
        <button className="agenda-filter-btn" onClick={() => setFilterModalOpen(true)}>
          🔽 {t.poi?.filters || 'Filters'} ({getActiveFilterCount()})
        </button>
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
      {!isLoading && !error && (
        <div className="agenda-grid">
          {filteredEvents.map((event) => (
            <AgendaCard
              key={event._id}
              event={event}
              onClick={() => handleEventClick(event._id)}
              onSave={handleToggleSave}
              isSaved={isAgendaFavorite(event._id)}
              distance={getDistance(event)}
              detectedCategory={detectCategory(event, language)}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {!isLoading && !error && hasMore && (
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
