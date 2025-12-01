/**
 * MapView - Interactive Leaflet Map for POI Display
 *
 * Features:
 * - Renders POIs as markers on interactive map
 * - Category-colored markers
 * - Click handler to navigate to POI detail
 * - Integrates with search/filter params
 * - Centered on Calpe, Spain (Costa Blanca)
 * - WCAG 2.1 AA Compliant
 */

import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Button, Chip, Rating } from '@mui/material';
import { useTranslation } from 'react-i18next';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Fix Leaflet default marker icon issue (webpack/vite bundler issue)
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Category color mapping (matching POI categories)
const getCategoryColor = (category) => {
  const colors = {
    'Active': '#FF6B35',
    'nature': '#4ECDC4',
    'Beaches & Nature': '#4ECDC4',
    'culture': '#F7931E',
    'Culture & History': '#F7931E',
    'family': '#9C27B0',
    'Familie': '#9C27B0',
    'food': '#6A4C93',
    'Food & Drinks': '#6A4C93',
    'Health & Wellbeing': '#7FA594',
    'activities': '#FFD23F',
    'Recreation': '#FFD23F',
    'Shopping': '#FF006E',
    'beach': '#00BCD4',
    'Practical': '#8B8B8B',
    'Natuur': '#4ECDC4',
    'Cultuur': '#F7931E',
  };
  return colors[category] || '#667eea';
};

// Create custom colored marker icon
const createColoredIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
};

// Component to update map view when bounds change
function MapUpdater({ bounds }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [bounds, map]);

  return null;
}

const MapView = ({ pois = [], height = '500px', onMarkerClick }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [bounds, setBounds] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Calpe center coordinates (Costa Blanca, Spain)
  const DEFAULT_CENTER = [38.6429, 0.0462];
  const DEFAULT_ZOOM = 14;

  // Calculate bounds when POIs change
  useEffect(() => {
    if (pois && pois.length > 0) {
      const validPois = pois.filter(poi =>
        poi.latitude && poi.longitude &&
        !isNaN(poi.latitude) && !isNaN(poi.longitude)
      );

      if (validPois.length > 0) {
        const coordinates = validPois.map(poi => [poi.latitude, poi.longitude]);
        const newBounds = L.latLngBounds(coordinates);
        setBounds(newBounds);
      }
    }
  }, [pois]);

  const handleMarkerClick = useCallback((poi) => {
    if (onMarkerClick) {
      onMarkerClick(poi);
    } else {
      navigate(`/experiences/${poi.id}`);
    }
  }, [navigate, onMarkerClick]);

  // Show loading state while map initializes
  if (!isMapReady && pois.length === 0) {
    return (
      <Box
        className="map-loading"
        sx={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.100',
          borderRadius: 2,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ ml: 2 }}>
          {t('map.loading', 'Kaart laden...')}
        </Typography>
      </Box>
    );
  }

  // Filter POIs with valid coordinates
  const validPois = pois.filter(poi =>
    poi.latitude && poi.longitude &&
    !isNaN(poi.latitude) && !isNaN(poi.longitude)
  );

  return (
    <Box className="map-container" sx={{ height, position: 'relative' }}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        whenReady={() => setIsMapReady(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {bounds && <MapUpdater bounds={bounds} />}

        {validPois.map((poi) => {
          const color = getCategoryColor(poi.category);
          const markerIcon = createColoredIcon(color);

          return (
            <Marker
              key={poi.id}
              position={[poi.latitude, poi.longitude]}
              icon={markerIcon}
              eventHandlers={{
                click: () => handleMarkerClick(poi),
              }}
            >
              <Popup>
                <div className="poi-popup">
                  <h3 className="popup-title">{poi.name}</h3>
                  <div className="popup-category">
                    <Chip
                      label={poi.category}
                      size="small"
                      sx={{
                        bgcolor: color,
                        color: 'white',
                        fontSize: '0.7rem',
                      }}
                    />
                  </div>
                  {poi.location && (
                    <Typography variant="body2" color="text.secondary" sx={{ my: 0.5 }}>
                      {poi.location}
                    </Typography>
                  )}
                  {poi.rating && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, my: 0.5 }}>
                      <Rating value={poi.rating} readOnly size="small" precision={0.1} />
                      <Typography variant="body2" color="text.secondary">
                        ({poi.reviewCount || 0})
                      </Typography>
                    </Box>
                  )}
                  {poi.price && (
                    <Typography variant="body1" color="primary" fontWeight={600} sx={{ my: 0.5 }}>
                      {'\u20AC'}{poi.price}
                    </Typography>
                  )}
                  <Button
                    variant="contained"
                    size="small"
                    fullWidth
                    onClick={() => handleMarkerClick(poi)}
                    sx={{ mt: 1 }}
                  >
                    {t('map.viewDetails', 'Bekijk details')}
                  </Button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* POI count badge */}
      <Box className="map-info">
        {validPois.length} {validPois.length === 1
          ? t('map.poi', 'locatie')
          : t('map.pois', 'locaties')}
      </Box>
    </Box>
  );
};

export default MapView;
