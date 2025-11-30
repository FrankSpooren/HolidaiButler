/**
 * FavoritesPage - Display user's saved/favorited POIs
 *
 * Route: /favorites
 * Layout: RootLayout
 * Auth: Public (uses localStorage)
 *
 * Features:
 * - Display all saved POIs from localStorage
 * - Grid view of favorited POIs
 * - Remove from favorites
 * - Click to open detail modal
 * - Empty state when no favorites
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { poiService } from '../features/poi/services/poiService';
import type { POI } from '../features/poi/types/poi.types';
import { POIImage } from '../features/poi/components/POIImage';
import { POIRating } from '../features/poi/components/POIRating';
import { POIDetailModal } from '../features/poi/components/POIDetailModal';
import { useLanguage } from '../i18n/LanguageContext';
import { useFavorites } from '../shared/contexts/FavoritesContext';
import { getCategoryIcon, getCategoryColor } from '../shared/config/categoryConfig';
import { getDistanceFromUser, getUserLocation, type Coordinates } from '../shared/utils/distance';
import './FavoritesPage.css';

export function FavoritesPage() {
  const { t } = useLanguage();
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const [selectedPOIId, setSelectedPOIId] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);

  // Convert favorites Set to array
  const savedPOIIds = Array.from(favorites);

  // Get user location
  useEffect(() => {
    getUserLocation()
      .then(setUserLocation)
      .catch(() => {
        console.log('Geolocation not available');
      });
  }, []);

  // Fetch all POIs (we'll filter to show only saved ones)
  const { data: allPOIs, isLoading } = useQuery({
    queryKey: ['pois', 'all'],
    queryFn: () => poiService.getPOIs({ limit: 1000 }),
  });

  // Filter to show only saved POIs
  const favoritePOIs = (allPOIs?.data || []).filter((poi: POI) =>
    savedPOIIds.includes(poi.id)
  );

  // Remove from favorites
  const handleRemoveFavorite = (poiId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    toggleFavorite(poiId);
  };

  // Open POI detail modal
  const handlePOIClick = (poiId: number) => {
    setSelectedPOIId(poiId);
  };

  // Close modal
  const handleCloseModal = () => {
    setSelectedPOIId(null);
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
          {favoritePOIs.length} {favoritePOIs.length === 1 ? 'saved place' : 'saved places'}
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="favorites-loading">
          <div className="loading-spinner">⏳</div>
          <p>Loading your favorites...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && favoritePOIs.length === 0 && (
        <div className="favorites-empty">
          <div className="empty-icon">💔</div>
          <h2 className="empty-title">No favorites yet</h2>
          <p className="empty-text">
            Start exploring and save your favorite places to see them here!
          </p>
          <a href="/pois" className="empty-cta">
            Explore POIs
          </a>
        </div>
      )}

      {/* Favorites Grid */}
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

      {/* POI Detail Modal */}
      {selectedPOIId && (
        <POIDetailModal
          poiId={selectedPOIId}
          isOpen={selectedPOIId !== null}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
