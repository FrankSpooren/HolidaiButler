/**
 * Distance Calculation Utilities
 * Using Haversine formula for accurate distance between coordinates
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Calpe city center coordinates (fallback location) */
export const CALPE_CENTER: Coordinates = {
  latitude: 38.6439,
  longitude: 0.0410
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 *
 * @param coord1 - First coordinate
 * @param coord2 - Second coordinate
 * @returns Distance in kilometers
 */
export function calculateDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
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
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 * - < 1km: show in meters (e.g., "450 m")
 * - >= 1km: show in kilometers with 1 decimal (e.g., "2.3 km")
 *
 * @param distanceKm - Distance in kilometers
 * @returns Formatted distance string
 */
export function formatDistance(distanceKm: number): string {
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
export function getUserLocation(): Promise<Coordinates> {
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
 * @param poiCoords - POI coordinates
 * @param userCoords - Optional user coordinates (will use Calpe center if not provided)
 * @returns Formatted distance string
 */
export function getDistanceFromUser(
  poiCoords: Coordinates,
  userCoords?: Coordinates | null
): string {
  const fromLocation = userCoords || CALPE_CENTER;
  const distanceKm = calculateDistance(fromLocation, poiCoords);
  return formatDistance(distanceKm);
}

/**
 * Hook for managing user location state
 * Can be used in components that need real-time user location
 */
export interface UseUserLocationReturn {
  userLocation: Coordinates | null;
  isLoading: boolean;
  error: GeolocationPositionError | Error | null;
  requestLocation: () => Promise<void>;
}

/**
 * React hook for user location (to be used in components)
 * Note: This is just the interface. The actual hook implementation
 * should be in a hooks file
 */
export function createUserLocationHook() {
  // This would be implemented as a proper React hook
  // Left as a utility template for now
  return {
    getUserLocation,
    calculateDistance,
    formatDistance,
    getDistanceFromUser,
    CALPE_CENTER
  };
}
