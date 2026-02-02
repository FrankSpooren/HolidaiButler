/**
 * MapView - Interactive Leaflet Map for POI Display
 *
 * Features:
 * - Renders POIs as markers on interactive map
 * - Category-colored markers
 * - Click handler to open POI detail modal (via onMarkerClick callback)
 * - Integrates with search/filter params
 * - Multi-destination aware (uses DestinationContext for coordinates)
 */

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useDestination } from '@/shared/contexts/DestinationContext';
import { poiService } from '../services/poiService';
import type { POISearchParams } from '../types/poi.types';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Fix Leaflet default marker icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewProps {
  searchParams?: POISearchParams;
  height?: string;
  onMarkerClick?: (poiId: number) => void;
  perCategory?: number; // Limit POIs per category for cleaner display
  disableAutoBounds?: boolean; // Keep map centered on Calpe instead of auto-fitting
  maxPOIs?: number; // Maximum total POIs to display
  minRating?: number; // Quality filter: minimum rating
  categories?: string[]; // Allowed categories (presentation categories)
}

interface POIFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    id: number;
    name: string;
    category: string;
    rating?: number;
    price_level?: number;
  };
}

interface GeoJSONResponse {
  type: 'FeatureCollection';
  features: POIFeature[];
}

// Category color mapping (Calpe English + Texel Dutch categories)
const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    // Calpe categories (English)
    'Active': '#FF6B35',
    'Beaches & Nature': '#4ECDC4',
    'Culture & History': '#F7931E',
    'Food & Drinks': '#6A4C93',
    'Health & Wellbeing': '#7FA594',
    'Recreation': '#FFD23F',
    'Shopping': '#FF006E',
    'Practical': '#8B8B8B',
    // Texel categories (Dutch) with brand colors
    'Actief': '#FF6B00',
    'Cultuur & Historie': '#004B87',
    'Eten & Drinken': '#E53935',
    'Gezondheid & Verzorging': '#43A047',
    'Natuur': '#7CB342',
    'Praktisch': '#607D8B',
    'Winkelen': '#AB47BC',
  };
  return colors[category] || '#5E8B7E';
};

// Create custom colored marker icon
const createColoredIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
};

// Component to update map view when data changes
function MapUpdater({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      // NEW: Tighter zoom for better POI visibility (5 POIs per category)
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [bounds, map]);

  return null;
}

export function MapView({
  searchParams,
  height = '600px',
  onMarkerClick,
  perCategory = 2, // Default: 2 POIs per category for cleaner map
  disableAutoBounds = true, // Default: keep centered on destination
  maxPOIs = 50, // Default: max 50 POIs for cleaner map
  minRating = 4, // Default: quality filter rating >= 4
  categories // Allowed categories (presentation categories)
}: MapViewProps) {
  const [geoData, setGeoData] = useState<GeoJSONResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);

  // Get destination-specific coordinates from context
  const destination = useDestination();
  const DEFAULT_CENTER: [number, number] = [destination.coordinates.lat, destination.coordinates.lng];
  // Zoom level depends on destination size:
  // - Texel is a 25km island, needs lower zoom (10) to show entire island
  // - Calpe is a compact city, zoom 14 is appropriate
  const DEFAULT_ZOOM = destination.id === 'texel' ? 10 : 14;

  useEffect(() => {
    const fetchGeoJSON = async () => {
      setLoading(true);
      setError(null);

      try {
        // Build params with quality filters and limits
        const params: Record<string, any> = {
          ...searchParams,
          per_category: perCategory,
          limit: maxPOIs,
          min_rating: minRating
        };

        // Add categories filter if provided
        if (categories && categories.length > 0) {
          params.categories = categories.join(',');
        }

        const data = await poiService.getGeoJSON(params);
        setGeoData(data);

        // Only calculate bounds if auto-bounds is enabled
        if (!disableAutoBounds && data.features && data.features.length > 0) {
          const coordinates = data.features.map((f: POIFeature) => [
            f.geometry.coordinates[1], // lat
            f.geometry.coordinates[0], // lng
          ] as [number, number]);

          const newBounds = L.latLngBounds(coordinates);
          setBounds(newBounds);
        } else {
          setBounds(null); // Keep default center
        }
      } catch (err) {
        console.error('Failed to fetch GeoJSON:', err);
        setError('Failed to load map data');
      } finally {
        setLoading(false);
      }
    };

    fetchGeoJSON();
  }, [searchParams, perCategory, disableAutoBounds, maxPOIs, minRating, categories]);

  const handleMarkerClick = (poiId: number) => {
    // Open POI detail modal (if callback provided)
    if (onMarkerClick) {
      onMarkerClick(poiId);
    }
  };

  if (loading) {
    return (
      <div className="map-loading" style={{ height }}>
        <div className="loading-spinner">Loading map...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="map-error" style={{ height }}>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!geoData || geoData.features.length === 0) {
    return (
      <div className="map-empty" style={{ height }}>
        <div className="empty-message">No POIs to display on map</div>
      </div>
    );
  }

  return (
    <div className="map-container" style={{ height }}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater bounds={bounds} />

        {geoData.features.map((feature: POIFeature) => {
          const { coordinates } = feature.geometry;
          const { id, name, category, rating, price_level } = feature.properties;
          const color = getCategoryColor(category);
          const icon = createColoredIcon(color);

          return (
            <Marker
              key={id}
              position={[coordinates[1], coordinates[0]]} // [lat, lng]
              icon={icon}
              eventHandlers={{
                click: () => handleMarkerClick(id),
              }}
            >
              <Popup>
                <div className="poi-popup">
                  <h3 className="popup-title">{name}</h3>
                  <div className="popup-category">{category}</div>
                  {rating && (
                    <div className="popup-rating">
                      ⭐ {typeof rating === 'number' ? rating.toFixed(1) : parseFloat(String(rating)).toFixed(1)}
                    </div>
                  )}
                  {price_level && (
                    <div className="popup-price">
                      {'€'.repeat(price_level)}
                    </div>
                  )}
                  {onMarkerClick && (
                    <button
                      className="popup-button"
                      onClick={() => handleMarkerClick(id)}
                    >
                      View Details →
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="map-info">
        Showing {geoData.features.length} POI{geoData.features.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

export default MapView;
