/**
 * FavoritesPage - Display user's saved/favorited POIs and Agenda Events
 *
 * Route: /favorites
 * Layout: RootLayout
 * Auth: Public (uses localStorage)
 *
 * Features:
 * - Tabbed interface: POIs | Events
 * - Display all saved POIs from localStorage
 * - Display all saved Agenda events from localStorage
 * - Grid view of favorited items
 * - Remove from favorites
 * - Click to open detail modal
 * - Empty state when no favorites
 */

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { nl, enUS, es, de, sv, pl } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { poiService } from '../features/poi/services/poiService';
import type { POI } from '../features/poi/types/poi.types';
import { POIImage } from '../features/poi/components/POIImage';
import { POIRating } from '../features/poi/components/POIRating';
import { POIDetailModal } from '../features/poi/components/POIDetailModal';
import { AgendaDetailModal } from '../features/agenda/components/AgendaDetailModal';
import { agendaService, type AgendaEvent } from '../features/agenda/services/agendaService';
import { useLanguage } from '../i18n/LanguageContext';
import { useFavorites } from '../shared/contexts/FavoritesContext';
import { useAgendaFavorites, type AgendaFavorite } from '../shared/contexts/AgendaFavoritesContext';
import { getCategoryIcon, getCategoryColor } from '../shared/config/categoryConfig';
import { getDistanceFromUser, getUserLocation, type Coordinates } from '../shared/utils/distance';
import './FavoritesPage.css';

const dateLocales: Record<string, Locale> = {
  nl: nl,
  en: enUS,
  es: es,
  de: de,
  sv: sv,
  pl: pl,
};

// Category colors for agenda events
const agendaCategoryConfig: Record<string, { color: string; icon: string }> = {
  music: { color: 'linear-gradient(135deg, #354f48, #49605a)', icon: '🎵' },
  culture: { color: 'linear-gradient(135deg, #253444, #3a4856)', icon: '🏛️' },
  active: { color: 'linear-gradient(135deg, #016193, #1a709d)', icon: '⚽' },
  nature: { color: 'linear-gradient(135deg, #b4942e, #bb9e42)', icon: '🌿' },
  food: { color: 'linear-gradient(135deg, #4f766b, #608379)', icon: '🍽️' },
  festivals: { color: 'linear-gradient(135deg, #354f48, #49605a)', icon: '🎉' },
  markets: { color: 'linear-gradient(135deg, #b4892e, #bb9442)', icon: '🛒' },
  creative: { color: 'linear-gradient(135deg, #004568, #195777)', icon: '🎨' },
};

export function FavoritesPage() {
  const { t, language } = useLanguage();
  const { favorites, toggleFavorite } = useFavorites();
  const { agendaFavorites, removeAgendaFavorite } = useAgendaFavorites();
  const [activeTab, setActiveTab] = useState<'pois' | 'events'>('pois');
  const [selectedPOIId, setSelectedPOIId] = useState<number | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventDate, setSelectedEventDate] = useState<string | null>(null);
  const [selectedEventDate, setSelectedEventDate] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const locale = dateLocales[language] || nl;

  // Convert favorites Sets to arrays
  const savedPOIIds = Array.from(favorites);
  const savedEventIds = Array.from(agendaFavorites);

  // Get user location
  useEffect(() => {
    getUserLocation()
      .then(setUserLocation)
      .catch(() => {
        console.log('Geolocation not available');
      });
  }, []);

  // Fetch all POIs (we'll filter to show only saved ones)
  const { data: allPOIs, isLoading: isLoadingPOIs } = useQuery({
    queryKey: ['pois', 'all'],
    queryFn: () => poiService.getPOIs({ limit: 1000 }),
  });

  // Fetch all events (we'll filter to show only saved ones)
  const { data: allEvents, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['agenda-events', 'all'],
    queryFn: () => agendaService.getEvents({ limit: 1000 }),
  });

  // Filter to show only saved POIs
  const favoritePOIs = (allPOIs?.data || []).filter((poi: POI) =>
    savedPOIIds.includes(poi.id)
  );

  // Filter to show only saved events
  const favoriteEvents = (allEvents?.data || []).filter((event: AgendaEvent) =>
    savedEventIds.includes(event._id)
  );

  const isLoading = activeTab === 'pois' ? isLoadingPOIs : isLoadingEvents;

  // Remove POI from favorites
  const handleRemoveFavorite = (poiId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    toggleFavorite(poiId);
  };

  // Remove Event from favorites
  const handleRemoveEventFavorite = (eventId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    toggleAgendaFavorite(eventId);
  };

  // Open POI detail modal
  const handlePOIClick = (poiId: number) => {
    setSelectedPOIId(poiId);
  };

  // Open Event detail modal
  const handleEventClick = (eventId: string) => {
    setSelectedEventId(eventId);
  };

  // Close POI modal
  const handleCloseModal = () => {
    setSelectedPOIId(null);
  };

  // Close Event modal
  const handleCloseEventModal = () => {
    setSelectedEventId(null);
  };

  // Get event title
  const getEventTitle = (event: AgendaEvent): string => {
    return typeof event.title === 'string'
      ? event.title
      : event.title?.[language] || event.title?.nl || event.title?.en || 'Event';
  };

  // Get event description
  const getEventDescription = (event: AgendaEvent): string => {
    const desc = typeof event.description === 'string'
      ? event.description
      : event.description?.[language] || event.description?.nl || event.description?.en || '';
    return desc.length > 80 ? desc.substring(0, 80) + '...' : desc;
  };

  // Get event category color
  const getEventCategoryColor = (event: AgendaEvent): string => {
    const categoryKey = event.primaryCategory || 'culture';
    return agendaCategoryConfig[categoryKey]?.color || agendaCategoryConfig.culture.color;
  };

  // Get event category label (uses language)
  const getEventCategoryLabel = (event: AgendaEvent): string => {
    const categoryKey = event.primaryCategory || 'culture';
    const labelsByLang: Record<string, Record<string, string>> = {
      nl: { music: 'Muziek', culture: 'Cultuur', active: 'Actief', nature: 'Natuur', food: 'Food', festivals: 'Festivals', markets: 'Markten', creative: 'Creatief' },
      en: { music: 'Music', culture: 'Culture', active: 'Active', nature: 'Nature', food: 'Food', festivals: 'Festivals', markets: 'Markets', creative: 'Creative' },
      de: { music: 'Musik', culture: 'Kultur', active: 'Aktiv', nature: 'Natur', food: 'Essen', festivals: 'Festivals', markets: 'Märkte', creative: 'Kreativ' },
      es: { music: 'Música', culture: 'Cultura', active: 'Activo', nature: 'Naturaleza', food: 'Comida', festivals: 'Festivales', markets: 'Mercados', creative: 'Creativo' },
      sv: { music: 'Musik', culture: 'Kultur', active: 'Aktiv', nature: 'Natur', food: 'Mat', festivals: 'Festivaler', markets: 'Marknader', creative: 'Kreativ' },
      pl: { music: 'Muzyka', culture: 'Kultura', active: 'Aktywne', nature: 'Natura', food: 'Jedzenie', festivals: 'Festiwale', markets: 'Targi', creative: 'Kreatywny' },
    };
    const labels = labelsByLang[language] || labelsByLang.en;
    return labels[categoryKey] || 'Event';
  };

  // Calculate distance to POI
  const getDistance = (poi: POI): string => {
    return getDistanceFromUser(
      { latitude: poi.latitude, longitude: poi.longitude },
      userLocation
    );
  };

  // Convert text to title case
  const toTitleCase = (str: string) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="favorites-page">
      {/* Header */}
      <div className="favorites-header">
        <h1 className="favorites-title">❤️ {t.nav?.favorites || 'My Favorites'}</h1>
        <p className="favorites-subtitle">
          {activeTab === 'pois'
            ? `${favoritePOIs.length} ${favoritePOIs.length === 1 ? 'saved place' : 'saved places'}`
            : `${favoriteEventsWithDates.length} ${favoriteEventsWithDates.length === 1 ? 'saved event' : 'saved events'}`
          }
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="favorites-tabs">
        <button
          className={`favorites-tab ${activeTab === 'pois' ? 'active' : ''}`}
          onClick={() => setActiveTab('pois')}
        >
          📍 POIs ({favoritePOIs.length})
        </button>
        <button
          className={`favorites-tab ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          📅 Events ({favoriteEventsWithDates.length})
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="favorites-loading">
          <div className="loading-spinner">⏳</div>
          <p>Loading your favorites...</p>
        </div>
      )}

      {/* POIs Tab Content */}
      {activeTab === 'pois' && (
        <>
          {/* Empty State for POIs */}
          {!isLoading && favoritePOIs.length === 0 && (
            <div className="favorites-empty">
              <div className="empty-icon">💔</div>
              <h2 className="empty-title">No favorite places yet</h2>
              <p className="empty-text">
                Start exploring and save your favorite places to see them here!
              </p>
              <a href="/pois" className="empty-cta">
                Explore POIs
              </a>
            </div>
          )}

          {/* POIs Grid */}
          {!isLoading && favoritePOIs.length > 0 && (
            <div className="favorites-grid">
              {favoritePOIs.map((poi: POI) => (
                <div key={poi.id} className="favorite-card">
                  {/* Category Label */}
                  <div
                    className="favorite-category-label"
                    style={{ background: getCategoryColor(poi.category) }}
                  >
                    {poi.category}
                  </div>

                  {/* POI Image */}
                  <div onClick={() => handlePOIClick(poi.id)} style={{ cursor: 'pointer' }}>
                    <POIImage
                      poi={poi}
                      height="200px"
                      categoryColor={getCategoryColor(poi.category)}
                      categoryIcon={getCategoryIcon(poi.category)}
                    />
                  </div>

                  {/* Remove Button */}
                  <button
                    className="favorite-remove-btn"
                    onClick={(e) => handleRemoveFavorite(poi.id, e)}
                    title="Remove from favorites"
                  >
                    ❤️
                  </button>

                  {/* POI Content */}
                  <div
                    className="favorite-content"
                    onClick={() => handlePOIClick(poi.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <h3 className="favorite-name">{toTitleCase(poi.name)}</h3>
                    <div className="favorite-description">
                      {poi.description || 'No description available'}
                    </div>

                    {/* Rating */}
                    <div className="favorite-rating">
                      <POIRating rating={poi.rating} size="small" showReviewCount={false} />
                    </div>

                    {/* Distance */}
                    <div className="favorite-distance">
                      <svg
                        className="distance-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Events Tab Content */}
      {activeTab === 'events' && (
        <>
          {/* Empty State for Events */}
          {!isLoading && favoriteEventsWithDates.length === 0 && (
            <div className="favorites-empty">
              <div className="empty-icon">📅</div>
              <h2 className="empty-title">No favorite events yet</h2>
              <p className="empty-text">
                Browse the agenda and save your favorite events to see them here!
              </p>
              <a href="/agenda" className="empty-cta">
                Explore Agenda
              </a>
            </div>
          )}

          {/* Events Grid */}
          {!isLoading && favoriteEventsWithDates.length > 0 && (
            <div className="favorites-grid">
              {favoriteEventsWithDates.map(({ event, selectedDate, favoriteKey }) => (
                <div key={favoriteKey} className="favorite-card">
                  {/* Category Label */}
                  <div
                    className="favorite-category-label"
                    style={{ background: getEventCategoryColor(event) }}
                  >
                    {getEventCategoryLabel(event)}
                  </div>

                  {/* Event Image */}
                  <div
                    className="favorite-event-image-container"
                    onClick={() => handleEventClick(event._id, selectedDate)}
                    style={{ cursor: 'pointer' }}
                  >
                    {event.images?.[0]?.url ? (
                      <img
                        src={event.images[0].url}
                        alt={getEventTitle(event)}
                        className="favorite-event-image"
                      />
                    ) : (
                      <div
                        className="favorite-event-placeholder"
                        style={{ background: getEventCategoryColor(event) }}
                      >
                        📅
                      </div>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    className="favorite-remove-btn"
                    onClick={(e) => handleRemoveEventFavorite(event._id, selectedDate, e)}
                    title="Remove from favorites"
                  >
                    ❤️
                  </button>

                  {/* Event Content */}
                  <div
                    className="favorite-content"
                    onClick={() => handleEventClick(event._id, selectedDate)}
                    style={{ cursor: 'pointer' }}
                  >
                    <h3 className="favorite-name">{toTitleCase(getEventTitle(event))}</h3>
                    <div className="favorite-description">
                      {getEventDescription(event) || 'No description available'}
                    </div>

                    {/* Date */}
                    <div className="favorite-event-date">
                      📅 {format(new Date(selectedDate), 'd MMM yyyy', { locale })}
                    </div>

                    {/* Location */}
                    {event.location?.name && (
                      <div className="favorite-distance">
                        <svg
                          className="distance-icon"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
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
                        {event.location.name}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* POI Detail Modal */}
      {selectedPOIId && (
        <POIDetailModal
          poiId={selectedPOIId}
          isOpen={selectedPOIId !== null}
          onClose={handleCloseModal}
        />
      )}

      {/* Event Detail Modal */}
      {selectedEventId && (
        <AgendaDetailModal
          eventId={selectedEventId}
          isOpen={selectedEventId !== null}
          onClose={handleCloseEventModal}
        />
      )}
    </div>
  );
}
