import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { nl, enUS, de, es, sv, pl } from 'date-fns/locale';
import type { Locale } from 'date-fns';
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
 */

// Interest category configuration
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

// Category labels in all 6 languages
const categoryLabels: Record<string, Record<string, string>> = {
  nl: { music: 'Muziek', culture: 'Cultuur', active: 'Actief', nature: 'Natuur', food: 'Food', festivals: 'Festivals', markets: 'Markten', creative: 'Creatief' },
  en: { music: 'Music', culture: 'Culture', active: 'Active', nature: 'Nature', food: 'Food', festivals: 'Festivals', markets: 'Markets', creative: 'Creative' },
  de: { music: 'Musik', culture: 'Kultur', active: 'Aktiv', nature: 'Natur', food: 'Essen', festivals: 'Festivals', markets: 'Märkte', creative: 'Kreativ' },
  es: { music: 'Música', culture: 'Cultura', active: 'Activo', nature: 'Naturaleza', food: 'Comida', festivals: 'Festivales', markets: 'Mercados', creative: 'Creativo' },
  sv: { music: 'Musik', culture: 'Kultur', active: 'Aktiv', nature: 'Natur', food: 'Mat', festivals: 'Festivaler', markets: 'Marknader', creative: 'Kreativ' },
  pl: { music: 'Muzyka', culture: 'Kultura', active: 'Aktywne', nature: 'Natura', food: 'Jedzenie', festivals: 'Festiwale', markets: 'Targi', creative: 'Kreatywny' },
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

// Quick filter button translations
const quickFilterLabels: Record<string, { today: string; tomorrow: string; weekend: string }> = {
  nl: { today: 'Vandaag', tomorrow: 'Morgen', weekend: 'Dit weekend' },
  en: { today: 'Today', tomorrow: 'Tomorrow', weekend: 'This Weekend' },
  de: { today: 'Heute', tomorrow: 'Morgen', weekend: 'Dieses Wochenende' },
  es: { today: 'Hoy', tomorrow: 'Mañana', weekend: 'Este fin de semana' },
  sv: { today: 'Idag', tomorrow: 'Imorgon', weekend: 'Denna helg' },
  pl: { today: 'Dzisiaj', tomorrow: 'Jutro', weekend: 'Ten weekend' },
};

// No results translations
const noResultsLabels: Record<string, { title: string; subtitle: string }> = {
  nl: { title: 'Geen Events gevonden', subtitle: 'Pas je zoekfilter(s) aan' },
  en: { title: 'No Events found', subtitle: 'Adjust your search filter(s)' },
  de: { title: 'Keine Events gefunden', subtitle: 'Passen Sie Ihre Suchfilter an' },
  es: { title: 'No se encontraron eventos', subtitle: 'Ajusta tus filtros de búsqueda' },
  sv: { title: 'Inga evenemang hittades', subtitle: 'Justera dina sökfilter' },
  pl: { title: 'Nie znaleziono wydarzeń', subtitle: 'Dostosuj filtry wyszukiwania' },
};

// Date locales for formatting
const dateLocales: Record<string, Locale> = { nl: nl, en: enUS, de: de, es: es, sv: sv, pl: pl };

// Date header formats - WITHOUT comma after day
const dateHeaderFormats: Record<string, string> = {
  nl: 'EEEE d MMMM yyyy',
  en: 'EEEE MMMM d yyyy',
  de: 'EEEE d. MMMM yyyy',
  es: "EEEE d 'de' MMMM 'de' yyyy",
  sv: 'EEEE d MMMM yyyy',
  pl: 'EEEE d MMMM yyyy',
};

// Keywords for smart categorization
const categoryKeywords: Record<string, string[]> = {
  music: ['music', 'concert', 'band', 'orchestra', 'jazz', 'rock', 'live music', 'dj', 'singing', 'choir', 'guitar', 'piano', 'flamenco'],
  culture: ['museum', 'history', 'heritage', 'castle', 'church', 'cathedral', 'monument', 'archaeological', 'historic', 'cultural', 'tradition', 'folklore', 'exhibition', 'gallery'],
  active: ['hiking', 'cycling', 'running', 'sport', 'fitness', 'yoga', 'swimming', 'tennis', 'golf', 'football', 'basketball', 'climbing', 'kayak', 'surfing', 'diving', 'walk', 'tour', 'adventure'],
  nature: ['beach', 'nature', 'park', 'garden', 'mountain', 'forest', 'wildlife', 'bird', 'botanical', 'landscape', 'outdoor', 'natural', 'eco', 'trail', 'peñon', 'ifach', 'sierra'],
  food: ['food', 'restaurant', 'tapas', 'wine', 'gastronomy', 'cooking', 'culinary', 'tasting', 'dinner', 'lunch', 'brunch', 'cafe', 'bar', 'paella', 'cuisine'],
  festivals: ['festival', 'fiesta', 'carnival', 'parade', 'celebration', 'party', 'fireworks', 'fair', 'feria', 'hogueras', 'moors', 'christians'],
  markets: ['market', 'mercado', 'flea', 'antique', 'craft', 'artisan', 'farmers', 'street market', 'bazaar'],
  creative: ['painting', 'art class', 'workshop', 'craft', 'pottery', 'sculpture', 'photography', 'drawing', 'creative', 'artistic', 'design', 'handmade', 'diy'],
};

// Smart categorization function
function detectCategory(event: AgendaEvent, language: string): string {
  const title = typeof event.title === 'string'
    ? event.title.toLowerCase()
    : (event.title?.[language] || event.title?.en || event.title?.nl || '').toLowerCase();
  const description = typeof event.description === 'string'
    ? event.description.toLowerCase()
    : (event.description?.[language] || event.description?.en || event.description?.nl || '').toLowerCase();
  const combinedText = `${title} ${description}`;

  const scores: Record<string, number> = {};
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    scores[category] = 0;
    for (const keyword of keywords) {
      if (combinedText.includes(keyword)) {
        scores[category] += title.includes(keyword) ? 3 : 1;
      }
    }
  }

  let maxScore = 0;
  let bestCategory = 'culture';
  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  if (maxScore === 0 && event.primaryCategory) {
    const mapped = categoryMapping[event.primaryCategory];
    if (mapped) return mapped;
  }
  return bestCategory;
}

const categoryMapping: Record<string, string> = {
  culture: 'culture', exhibitions: 'culture', festivals: 'festivals', music: 'music',
  markets: 'markets', 'food-drink': 'food', 'active-sports': 'active', nature: 'nature',
  tours: 'culture', workshops: 'creative', entertainment: 'festivals', folklore: 'culture',
  beach: 'nature', creative: 'creative',
};

const defaultFilters: AgendaFilters = { interests: [], distance: 50, company: [], dateType: 'all' };

export function AgendaPage() {
  const { t, language } = useLanguage();
  const { isAgendaFavorite, toggleAgendaFavorite } = useAgendaFavorites();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [limit, setLimit] = useState<number>(12);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<AgendaFilters>(defaultFilters);
  const [showHeader, setShowHeader] = useState<boolean>(true);
  const [lastScrollY, setLastScrollY] = useState<number>(0);
  const [visibleDateKey, setVisibleDateKey] = useState<string>(''); // Store date key, not formatted string

  // Fetch events
  const { data: eventsData, isLoading, error } = useQuery({
    queryKey: ['agenda-events', searchQuery, selectedCategory, limit],
    queryFn: () => agendaService.getEvents({
      search: searchQuery || undefined,
      categories: selectedCategory || undefined,
      limit: 100,
      page: 1,
    }),
    staleTime: 60000,
  });

  const allEvents = eventsData?.data || [];

  // Filter events
  const filteredEvents = useMemo(() => {
    let result = [...allEvents];

    if (selectedCategory) {
      result = result.filter(event => detectCategory(event, language) === selectedCategory);
    }
    if (filters.interests.length > 0) {
      result = result.filter(event => filters.interests.includes(detectCategory(event, language)));
    }
    if (filters.distance < 50 && userLocation) {
      result = result.filter(event => {
        if (!event.location?.coordinates) return true;
        const dist = parseFloat(getDistanceFromUser(
          { latitude: event.location.coordinates.lat, longitude: event.location.coordinates.lng },
          userLocation
        ).replace(' km', ''));
        return !isNaN(dist) && dist <= filters.distance;
      });
    }
    if (filters.dateType !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const endOfWeekend = new Date(today);
      endOfWeekend.setDate(endOfWeekend.getDate() + (7 - today.getDay()));

      result = result.filter(event => {
        const eventDate = new Date(event.startDate);
        eventDate.setHours(0, 0, 0, 0);
        switch (filters.dateType) {
          case 'today': return eventDate.getTime() === today.getTime();
          case 'tomorrow': return eventDate.getTime() === tomorrow.getTime();
          case 'weekend': return eventDate >= today && eventDate <= endOfWeekend;
          case 'custom':
            if (filters.dateStart && filters.dateEnd) {
              return eventDate >= new Date(filters.dateStart) && eventDate <= new Date(filters.dateEnd);
            }
            return true;
          default: return true;
        }
      });
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(event => {
        const title = typeof event.title === 'string' ? event.title : event.title?.[language] || event.title?.nl || event.title?.en || '';
        return title.toLowerCase().includes(query);
      });
    }
    // Sort by date ascending (chronological order)
    result.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    return result.slice(0, limit);
  }, [allEvents, selectedCategory, filters, userLocation, searchQuery, language, limit]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const groups: { date: string; dateFormatted: string; events: typeof filteredEvents }[] = [];
    const locale = dateLocales[language] || dateLocales.en;
    const formatStr = dateHeaderFormats[language] || dateHeaderFormats.en;

    filteredEvents.forEach(event => {
      const eventDate = new Date(event.startDate);
      const dateKey = eventDate.toISOString().split('T')[0];
      const dateFormatted = format(eventDate, formatStr, { locale });
      const existingGroup = groups.find(g => g.date === dateKey);
      if (existingGroup) {
        existingGroup.events.push(event);
      } else {
        groups.push({ date: dateKey, dateFormatted, events: [event] });
      }
    });
    groups.sort((a, b) => a.date.localeCompare(b.date));
    return groups;
  }, [filteredEvents, language]);

  const hasMore = filteredEvents.length >= limit && allEvents.length > limit;

  // Compute formatted visible date from key - updates when language changes
  const visibleDateFormatted = useMemo(() => {
    if (!visibleDateKey) return '';
    const locale = dateLocales[language] || dateLocales.en;
    const formatStr = dateHeaderFormats[language] || dateHeaderFormats.en;
    const date = new Date(visibleDateKey);
    return format(date, formatStr, { locale });
  }, [visibleDateKey, language]);

  // Get user location
  useEffect(() => {
    getUserLocation().then(setUserLocation).catch(() => {});
  }, []);

  // Scroll direction detection
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setShowHeader(currentScrollY < 50 || currentScrollY <= lastScrollY);
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Set initial visible date key
  useEffect(() => {
    if (filteredEvents.length > 0 && !visibleDateKey) {
      const firstDateKey = new Date(filteredEvents[0].startDate).toISOString().split('T')[0];
      setVisibleDateKey(firstDateKey);
    }
  }, [filteredEvents, visibleDateKey]);

  // Update visible date key on scroll (for the subheader)
  useEffect(() => {
    const handleDateScroll = () => {
      const cards = document.querySelectorAll('.agenda-card-wrapper');
      for (let i = cards.length - 1; i >= 0; i--) {
        const card = cards[i] as HTMLElement;
        if (card.getBoundingClientRect().top <= 290) {
          const dateKey = card.getAttribute('data-date-key');
          if (dateKey && dateKey !== visibleDateKey) setVisibleDateKey(dateKey);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleDateScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleDateScroll);
  }, [visibleDateKey]);

  const getDistance = (event: AgendaEvent): string => {
    if (!event.location?.coordinates || !userLocation) return '';
    return getDistanceFromUser(
      { latitude: event.location.coordinates.lat, longitude: event.location.coordinates.lng },
      userLocation
    );
  };

  const handleQuickFilter = (type: 'today' | 'tomorrow' | 'weekend') => {
    setFilters(prev => ({ ...prev, dateType: prev.dateType === type ? 'all' : type }));
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

  const noResults = noResultsLabels[language] || noResultsLabels.en;

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
            onChange={(e) => { setSearchQuery(e.target.value); setLimit(12); }}
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
              onClick={() => { setSelectedCategory(prev => prev === category.id ? '' : category.id); setLimit(12); }}
            >
              <span className="agenda-category-icon">{category.icon}</span>
              {categoryLabels[language]?.[category.id] || categoryLabels.en[category.id]}
            </div>
          ))}
        </div>
      </div>

      {/* Filter Row with Quick Filters AND Date - all move together */}
      <div className={`agenda-filter-row ${showHeader ? 'header-visible' : 'header-hidden'}`}>
        <div className="agenda-filter-buttons">
          <button className="agenda-filter-btn" onClick={() => setFilterModalOpen(true)}>
            🔽 {t.poi?.filters || 'Filters'} ({getActiveFilterCount()})
          </button>
          <div className="agenda-quick-filters">
            <button className={`agenda-quick-filter-btn ${filters.dateType === 'today' ? 'active' : ''}`} onClick={() => handleQuickFilter('today')}>
              {quickFilterLabels[language]?.today || 'Today'}
            </button>
            <button className={`agenda-quick-filter-btn ${filters.dateType === 'tomorrow' ? 'active' : ''}`} onClick={() => handleQuickFilter('tomorrow')}>
              {quickFilterLabels[language]?.tomorrow || 'Tomorrow'}
            </button>
            <button className={`agenda-quick-filter-btn ${filters.dateType === 'weekend' ? 'active' : ''}`} onClick={() => handleQuickFilter('weekend')}>
              {quickFilterLabels[language]?.weekend || 'This Weekend'}
            </button>
          </div>
        </div>
        {/* Date subheader - inside filter row so they move together */}
        {!isLoading && !error && filteredEvents.length > 0 && (
          <div className="agenda-date-subheader">
            <span className="agenda-date-subheader-text">{visibleDateFormatted}</span>
          </div>
        )}
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

      {/* Single continuous grid - all events flow together, 4 per row */}
      {!isLoading && !error && filteredEvents.length > 0 && (
        <div className="agenda-grid">
          {filteredEvents.map((event) => {
            const eventDateKey = new Date(event.startDate).toISOString().split('T')[0];
            return (
              <div key={event._id} className="agenda-card-wrapper" data-date-key={eventDateKey}>
                <AgendaCard
                  event={event}
                  onClick={() => setSelectedEventId(event._id)}
                  onSave={toggleAgendaFavorite}
                  isSaved={isAgendaFavorite(event._id)}
                  distance={getDistance(event)}
                  detectedCategory={detectCategory(event, language)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {!isLoading && !error && hasMore && (
        <button className="agenda-load-more" onClick={() => setLimit(prev => prev + 12)}>
          {t.poi?.loadMore || 'Load more'} ({allEvents.length - filteredEvents.length} remaining)
        </button>
      )}

      {/* No Results - Updated text */}
      {!isLoading && !error && filteredEvents.length === 0 && (
        <div className="agenda-no-results">
          <p className="agenda-no-results-icon">🔍</p>
          <h3>{noResults.title}</h3>
          <p>{noResults.subtitle}</p>
        </div>
      )}

      {/* Filter Modal */}
      <AgendaFilterModal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        onApply={(newFilters) => { setFilters(newFilters); setLimit(12); }}
        initialFilters={filters}
        resultCount={filteredEvents.length}
      />

      {/* Detail Modal */}
      {selectedEventId && (
        <AgendaDetailModal
          eventId={selectedEventId}
          isOpen={selectedEventId !== null}
          onClose={() => setSelectedEventId(null)}
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
          <p className="agenda-footer-copy">© 2025 HolidaiButler. Powered by AI. Made with ❤️ for travelers.</p>
        </div>
      </footer>
    </>
  );
}

export default AgendaPage;
