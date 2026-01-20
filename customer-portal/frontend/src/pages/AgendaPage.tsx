import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { nl, enUS, de, es, sv, pl } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useLanguage } from '../i18n/LanguageContext';
import { useAgendaFavorites } from '../shared/contexts/AgendaFavoritesContext';
import { useAgendaComparison } from '../shared/contexts/AgendaComparisonContext';
import { AgendaCard } from '@/features/agenda/components/AgendaCard';
import { AgendaDetailModal } from '@/features/agenda/components/AgendaDetailModal';
import { AgendaFilterModal, type AgendaFilters } from '@/features/agenda/components/AgendaFilterModal';
import { AgendaComparisonBar } from '@/features/agenda/components/AgendaComparisonBar';
import { AgendaComparisonModal } from '@/features/agenda/components/AgendaComparisonModal';
import { agendaService, type AgendaEvent } from '@/features/agenda/services/agendaService';
import { getUserLocation, getDistanceFromUser, type Coordinates } from '@/shared/utils/distance';
import './AgendaPage.css';

/**
 * AgendaPage - Events & Activities Calendar
 * Route: /agenda
 * Enterprise-level virtualized infinite scroll using @tanstack/react-virtual
 * Uses WINDOW SCROLLING for unified scroll experience - no nested scroll containers
 */

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
  const { isInComparison, toggleComparison, canAddMore, comparisonEvents } = useAgendaComparison();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventDate, setSelectedEventDate] = useState<string | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState<boolean>(false);
  const [comparisonModalOpen, setComparisonModalOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<AgendaFilters>(defaultFilters);
  const [showHeader, setShowHeader] = useState<boolean>(true);
  const [visibleDateKey, setVisibleDateKey] = useState<string>('');

  // Grid container ref for measuring width
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const columnCount = useColumnCount();

  // For infinite loading - how many items are currently loaded
  const [loadedCount, setLoadedCount] = useState<number>(24);

  // Fetch ALL events - virtualization handles display efficiently
  const { data: eventsData, isLoading, error } = useQuery({
    queryKey: ['agenda-events', searchQuery, selectedCategory],
    queryFn: () => agendaService.getEvents({
      search: searchQuery || undefined,
      categories: selectedCategory || undefined,
      limit: 500, // Fetch more - virtualization renders only visible
      page: 1,
    }),
    staleTime: 60000,
  });

  const allEvents = eventsData?.data || [];

  // Filter and sort ALL events
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

      result = result.filter(event => {
        const eventDate = new Date(event.startDate);
        eventDate.setHours(0, 0, 0, 0);
        switch (filters.dateType) {
          case 'today':
            return eventDate.getTime() === today.getTime();
          case 'tomorrow':
            return eventDate.getTime() === tomorrow.getTime();
          case 'weekend': {
            const dayOfWeek = today.getDay();
            let weekendStart = new Date(today);
            let weekendEnd = new Date(today);

            if (dayOfWeek === 0) {
              weekendStart = today;
              weekendEnd = today;
            } else if (dayOfWeek === 6) {
              weekendStart = today;
              weekendEnd = new Date(today);
              weekendEnd.setDate(today.getDate() + 1);
            } else {
              const daysUntilSaturday = 6 - dayOfWeek;
              weekendStart = new Date(today);
              weekendStart.setDate(today.getDate() + daysUntilSaturday);
              weekendEnd = new Date(weekendStart);
              weekendEnd.setDate(weekendStart.getDate() + 1);
            }

            return eventDate >= weekendStart && eventDate <= weekendEnd;
          }
          case 'custom':
            if (filters.dateStart && filters.dateEnd) {
              return eventDate >= new Date(filters.dateStart) && eventDate <= new Date(filters.dateEnd);
            }
            return true;
          default:
            return true;
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
    return result;
  }, [allEvents, selectedCategory, filters, userLocation, searchQuery, language]);

  // Events to display (limited by loadedCount for infinite scroll)
  const displayedEvents = useMemo(() => {
    return filteredEvents.slice(0, loadedCount);
  }, [filteredEvents, loadedCount]);

  // Group events by date and create rows that DON'T cross date boundaries
  const virtualRows = useMemo(() => {
    const rows: { dateKey: string; events: typeof displayedEvents }[] = [];
    let currentDateKey = '';
    let currentRow: typeof displayedEvents = [];

    displayedEvents.forEach((event) => {
      const eventDate = new Date(event.startDate);
      const dateKey = eventDate.toISOString().split('T')[0];

      if (dateKey !== currentDateKey) {
        // New date - finish current row if any and start fresh
        if (currentRow.length > 0) {
          rows.push({ dateKey: currentDateKey, events: [...currentRow] });
        }
        currentDateKey = dateKey;
        currentRow = [event];
      } else if (currentRow.length >= columnCount) {
        // Same date but row is full - start new row
        rows.push({ dateKey: currentDateKey, events: [...currentRow] });
        currentRow = [event];
      } else {
        // Same date and row has space
        currentRow.push(event);
      }
    });

    // Don't forget the last row
    if (currentRow.length > 0) {
      rows.push({ dateKey: currentDateKey, events: [...currentRow] });
    }

    return rows;
  }, [displayedEvents, columnCount]);

  // Calculate row count based on virtualRows
  const rowCount = virtualRows.length;

  // Row height based on screen size - must fit entire card + gap
  // Mobile: image 160px + content ~190px = ~350px + 12px gap = 362px
  // Desktop: image 200px + content ~220px = ~420px + 12px gap = 432px
  const rowHeight = columnCount <= 2 ? 362 : 432;

  // Window virtualizer - scrolls with the WINDOW, not a container
  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => rowHeight,
    overscan: 3, // Render 3 extra rows above/below for smooth scrolling
    scrollMargin: gridContainerRef.current?.offsetTop ?? 0,
  });

  // Compute formatted visible date from key
  const visibleDateFormatted = useMemo(() => {
    if (!visibleDateKey) return '';
    const locale = dateLocales[language] || dateLocales.en;
    const formatStr = dateHeaderFormats[language] || dateHeaderFormats.en;
    const [year, month, day] = visibleDateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, formatStr, { locale });
  }, [visibleDateKey, language]);

  // Get user location
  useEffect(() => {
    getUserLocation().then(setUserLocation).catch(() => {});
  }, []);

  // Set initial visible date key when events load
  useEffect(() => {
    if (filteredEvents.length > 0) {
      const d = new Date(filteredEvents[0].startDate);
      const firstDateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!visibleDateKey) {
        setVisibleDateKey(firstDateKey);
      }
    }
  }, [filteredEvents, visibleDateKey]);

  // Scroll direction detection - hide header on scroll down, show on scroll up
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

  // Update visible date based on virtualizer scroll position
  useEffect(() => {
    const virtualItems = virtualizer.getVirtualItems();
    if (virtualItems.length > 0 && virtualRows.length > 0) {
      const firstVisibleRowIndex = virtualItems[0].index;
      if (virtualRows[firstVisibleRowIndex]) {
        const dateKey = virtualRows[firstVisibleRowIndex].dateKey;
        if (dateKey !== visibleDateKey) {
          setVisibleDateKey(dateKey);
        }
      }
    }
  }, [virtualizer.getVirtualItems(), virtualRows, visibleDateKey]);

  // Infinite scroll - load more when near bottom
  useEffect(() => {
    const virtualItems = virtualizer.getVirtualItems();
    if (virtualItems.length > 0) {
      const lastVisibleRowIndex = virtualItems[virtualItems.length - 1].index;
      // Load more when within 2 rows of the end
      if (lastVisibleRowIndex >= rowCount - 2 && loadedCount < filteredEvents.length) {
        setLoadedCount(prev => Math.min(prev + 12, filteredEvents.length));
      }
    }
  }, [virtualizer.getVirtualItems(), rowCount, loadedCount, filteredEvents.length]);

  // Reset loadedCount when filters change
  useEffect(() => {
    setLoadedCount(24);
    // Scroll to top when filters change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedCategory, searchQuery, filters]);

  // Helper function for distance calculation
  const getDistance = useCallback((event: AgendaEvent): string => {
    if (!event.location?.coordinates || !userLocation) return '';
    return getDistanceFromUser(
      { latitude: event.location.coordinates.lat, longitude: event.location.coordinates.lng },
      userLocation
    );
  }, [userLocation]);

  const handleQuickFilter = (type: 'today' | 'tomorrow' | 'weekend') => {
    setFilters(prev => ({ ...prev, dateType: prev.dateType === type ? 'all' : type }));
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.interests.length > 0) count += filters.interests.length;
    if (filters.distance < 50) count++;
    if (filters.company.length > 0) count += filters.company.length;
    if (filters.dateType !== 'all') count++;
    return count;
  };

  const handleCompare = () => {
    setComparisonModalOpen(true);
  };

  const noResults = noResultsLabels[language] || noResultsLabels.en;

  // Get virtual items for rendering
  const virtualItems = virtualizer.getVirtualItems();

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
            onChange={(e) => setSearchQuery(e.target.value)}
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
              onClick={() => setSelectedCategory(prev => prev === category.id ? '' : category.id)}
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

      {/* Virtualized Grid - Window scrolling for unified scroll experience */}
      {!isLoading && !error && filteredEvents.length > 0 && (
        <div
          ref={gridContainerRef}
          className="agenda-grid-container"
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualRow) => {
            const rowIndex = virtualRow.index;
            const rowData = virtualRows[rowIndex];
            if (!rowData) return null;

            const rowEvents = rowData.events;

            // Card height = rowHeight - gap (12px)
            const cardHeight = rowHeight - 12;

            return (
              <div
                key={virtualRow.key}
                className="agenda-virtual-row"
                data-date={rowData.dateKey}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${cardHeight}px`,
                  transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
                }}
              >
                <div className="agenda-grid-row">
                  {rowEvents.map((event) => {
                    return (
                      <div key={event._id} className="agenda-grid-item">
                        <AgendaCard
                          event={event}
                          onClick={() => {
                            setSelectedEventId(event._id);
                            setSelectedEventDate(event.startDate);
                          }}
                          onSave={toggleAgendaFavorite}
                          isSaved={isAgendaFavorite(event._id)}
                          distance={getDistance(event)}
                          detectedCategory={detectCategory(event, language)}
                          isInComparison={isInComparison(event._id)}
                          onToggleComparison={toggleComparison}
                          canAddMore={canAddMore}
                          showComparison={true}
                          dateKey={rowData.dateKey}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No Results */}
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
        onApply={(newFilters) => setFilters(newFilters)}
        initialFilters={filters}
        resultCount={filteredEvents.length}
      />

      {/* Detail Modal */}
      {selectedEventId && (
        <AgendaDetailModal
          eventId={selectedEventId}
          isOpen={selectedEventId !== null}
          onClose={() => {
            setSelectedEventId(null);
            setSelectedEventDate(null);
          }}
          selectedDate={selectedEventDate || undefined}
        />
      )}

      {/* Comparison Modal */}
      {comparisonModalOpen && (
        <AgendaComparisonModal
          eventIds={Array.from(comparisonEvents)}
          isOpen={comparisonModalOpen}
          onClose={() => setComparisonModalOpen(false)}
        />
      )}

      {/* Comparison Bar */}
      <AgendaComparisonBar onCompare={handleCompare} />

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
