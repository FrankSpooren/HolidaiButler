/**
 * Distance Calculation Utilities
 * Using Haversine formula for accurate distance between coordinates
 */

/** Calpe city center coordinates (fallback location) */
export const CALPE_CENTER = {
  latitude: 38.6439,
  longitude: 0.0410
};

/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 *
 * @param {Object} coord1 - First coordinate { latitude, longitude }
 * @param {Object} coord2 - Second coordinate { latitude, longitude }
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(coord1, coord2) {
  const R = 6371; // Earth's radius in kilometers

  // Convert degrees to radians
  const lat1Rad = toRadians(coord1.latitude);
  const lat2Rad = toRadians(coord2.latitude);
  const deltaLatRad = toRadians(coord2.latitude - coord1.latitude);
  const deltaLonRad = toRadians(coord2.longitude - coord1.longitude);

  // Haversine formula
  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLonRad / 2) *
      Math.sin(deltaLonRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in kilometers
}

/**
 * Format distance for display
 * - < 1km: show in meters (e.g., "450 m")
 * - >= 1km: show in kilometers with 1 decimal (e.g., "2.3 km")
 *
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Formatted distance string
 */
export function formatDistance(distanceKm) {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }

  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Get user's current location using browser Geolocation API
 * Returns promise that resolves with coordinates or rejects with error
 */
export function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: false, // Faster, less battery drain
        timeout: 5000, // 5 second timeout
        maximumAge: 300000 // Cache for 5 minutes
      }
    );
  });
}

/**
 * Calculate and format distance from user location (or Calpe center fallback)
 * This is the main function to use in components
 *
 * @param {Object} poiCoords - POI coordinates { latitude, longitude }
 * @param {Object|null} userCoords - Optional user coordinates (will use Calpe center if not provided)
 * @returns {string} Formatted distance string
 */
export function getDistanceFromUser(poiCoords, userCoords = null) {
  const fromLocation = userCoords || CALPE_CENTER;
  const distanceKm = calculateDistance(fromLocation, poiCoords);
  return formatDistance(distanceKm);
}

/**
 * Filter POIs by distance from a location
 *
 * @param {Array} pois - Array of POIs with latitude/longitude
 * @param {Object} location - Center location { latitude, longitude }
 * @param {number} maxDistanceKm - Maximum distance in kilometers
 * @returns {Array} Filtered POIs within distance
 */
export function filterByDistance(pois, location, maxDistanceKm) {
  return pois.filter(poi => {
    if (!poi.latitude || !poi.longitude) return false;
    const distance = calculateDistance(location, {
      latitude: poi.latitude,
      longitude: poi.longitude
    });
    return distance <= maxDistanceKm;
  });
}

/**
 * Sort POIs by distance from a location
 *
 * @param {Array} pois - Array of POIs with latitude/longitude
 * @param {Object} location - Center location { latitude, longitude }
 * @returns {Array} POIs sorted by distance (nearest first)
 */
export function sortByDistance(pois, location) {
  return [...pois].sort((a, b) => {
    const distA = calculateDistance(location, {
      latitude: a.latitude,
      longitude: a.longitude
    });
    const distB = calculateDistance(location, {
      latitude: b.latitude,
      longitude: b.longitude
    });
    return distA - distB;
  });
}
