/**
 * OpenStreetMap Integration Service
 * Free POI discovery using Overpass API
 *
 * Note: OpenStreetMap data is free but may have less review data
 * Best used as complementary source alongside Google Places
 */

import logger from '../utils/logger.js';

class OpenStreetMapService {
  constructor() {
    this.overpassApiUrl = 'https://overpass-api.de/api/interpreter';

    // OSM tag mapping to HolidaiButler categories
    this.categoryTagMapping = {
      food_drinks: [
        'amenity=restaurant',
        'amenity=cafe',
        'amenity=bar',
        'amenity=pub',
        'amenity=fast_food',
      ],
      museum: [
        'tourism=museum',
        'tourism=gallery',
      ],
      beach: [
        'natural=beach',
        'leisure=beach_resort',
      ],
      historical: [
        'historic=monument',
        'historic=memorial',
        'historic=castle',
        'historic=archaeological_site',
        'tourism=attraction',
      ],
      shopping: [
        'shop=mall',
        'shop=department_store',
        'amenity=marketplace',
      ],
      activities: [
        'tourism=attraction',
        'leisure=park',
        'leisure=playground',
        'sport=swimming',
      ],
      accommodation: [
        'tourism=hotel',
        'tourism=hostel',
        'tourism=guest_house',
        'tourism=apartment',
      ],
      nightlife: [
        'amenity=nightclub',
        'amenity=bar',
        'amenity=pub',
      ],
    };

    // Request rate limiting (be nice to OSM servers)
    this.requestDelay = 1000; // 1 second between requests
    this.lastRequestTime = 0;
  }

  /**
   * Search POIs by category and location
   */
  async searchPOIs(location, category, options = {}) {
    const { radius = 5000, maxResults = 50 } = options;

    logger.info(`Searching OpenStreetMap for ${category} in ${location}`);

    try {
      // Get location coordinates (simplified - in production, use geocoding)
      const coords = await this.geocodeLocation(location);

      if (!coords) {
        logger.warn(`Could not geocode location: ${location}`);
        return [];
      }

      // Get OSM tags for category
      const tags = this.categoryTagMapping[category] || [];

      if (tags.length === 0) {
        logger.warn(`No OSM tags mapped for category: ${category}`);
        return [];
      }

      const allResults = [];

      // Query each tag type
      for (const tag of tags) {
        await this.rateLimit();

        try {
          const results = await this.queryOverpass(coords, tag, radius, maxResults);
          allResults.push(...results);
        } catch (error) {
          logger.error(`OSM query failed for tag ${tag}:`, error);
        }
      }

      // Transform to standard format
      const transformed = allResults.map((poi) => this.transformOSMPOI(poi, category));

      logger.info(`Found ${transformed.length} POIs from OpenStreetMap`);

      return transformed;
    } catch (error) {
      logger.error('OpenStreetMap search failed:', error);
      return [];
    }
  }

  /**
   * Query Overpass API
   */
  async queryOverpass(coords, tag, radius, maxResults) {
    const { lat, lon } = coords;

    // Build Overpass QL query
    const query = `
      [out:json][timeout:25];
      (
        node["${tag.split('=')[0]}"="${tag.split('=')[1]}"](around:${radius},${lat},${lon});
        way["${tag.split('=')[0]}"="${tag.split('=')[1]}"](around:${radius},${lat},${lon});
        relation["${tag.split('=')[0]}"="${tag.split('=')[1]}"](around:${radius},${lat},${lon});
      );
      out center ${maxResults};
    `;

    try {
      const response = await fetch(this.overpassApiUrl, {
        method: 'POST',
        body: query,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }

      const data = await response.json();

      return data.elements || [];
    } catch (error) {
      logger.error('Overpass API query failed:', error);
      return [];
    }
  }

  /**
   * Transform OSM POI to standard format
   */
  transformOSMPOI(osmData, category) {
    const tags = osmData.tags || {};

    // Get coordinates (handle nodes vs ways/relations)
    const lat = osmData.lat || osmData.center?.lat;
    const lon = osmData.lon || osmData.center?.lon;

    return {
      name: tags.name || tags['name:en'] || 'Unknown',
      description: tags.description || tags.note || '',
      address: this.buildAddress(tags),
      city: tags['addr:city'] || '',
      country: tags['addr:country'] || '',
      latitude: lat,
      longitude: lon,
      phone: tags.phone || tags['contact:phone'] || null,
      email: tags.email || tags['contact:email'] || null,
      website: tags.website || tags['contact:website'] || null,
      osm_id: osmData.id,
      osm_type: osmData.type,
      review_count: 0, // OSM doesn't have reviews
      average_rating: 0, // OSM doesn't have ratings
      price_level: null,
      _raw: osmData,
      _source: 'openstreetmap',
      _category: category,
    };
  }

  /**
   * Build address from OSM tags
   */
  buildAddress(tags) {
    const parts = [];

    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags['addr:street']) parts.push(tags['addr:street']);
    if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
    if (tags['addr:city']) parts.push(tags['addr:city']);

    return parts.length > 0 ? parts.join(', ') : '';
  }

  /**
   * Geocode location (simplified version)
   * In production, use proper geocoding service
   */
  async geocodeLocation(location) {
    // For now, return hardcoded coordinates for common locations
    // In production, integrate with Nominatim or Google Geocoding API
    const knownLocations = {
      'Valencia, Spain': { lat: 39.4699, lon: -0.3763 },
      'Barcelona, Spain': { lat: 41.3851, lon: 2.1734 },
      'Madrid, Spain': { lat: 40.4168, lon: -3.7038 },
      'Calpe, Spain': { lat: 38.6431, lon: 0.0422 },
      'Amsterdam, Netherlands': { lat: 52.3676, lon: 4.9041 },
    };

    if (knownLocations[location]) {
      return knownLocations[location];
    }

    // Try to use Nominatim for geocoding
    try {
      await this.rateLimit();

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'HolidaiButler/1.0',
          },
        }
      );

      const data = await response.json();

      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
        };
      }
    } catch (error) {
      logger.error('Nominatim geocoding failed:', error);
    }

    return null;
  }

  /**
   * Rate limiting to be respectful to OSM servers
   */
  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.requestDelay) {
      const waitTime = this.requestDelay - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Get POI details by OSM ID
   */
  async getPOIDetails(osmId, osmType = 'node') {
    await this.rateLimit();

    const query = `
      [out:json];
      ${osmType}(${osmId});
      out body;
    `;

    try {
      const response = await fetch(this.overpassApiUrl, {
        method: 'POST',
        body: query,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const data = await response.json();

      if (data.elements && data.elements.length > 0) {
        return data.elements[0];
      }

      return null;
    } catch (error) {
      logger.error('OSM details query failed:', error);
      return null;
    }
  }
}

// Export singleton
const openStreetMapService = new OpenStreetMapService();
export default openStreetMapService;
