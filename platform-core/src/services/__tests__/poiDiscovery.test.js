/**
 * POI Discovery Service Tests
 */

import poiDiscoveryService from '../poiDiscovery.js';

describe('POI Discovery Service', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two coordinates', () => {
      // Valencia to Barcelona (approx 300km)
      const lat1 = 39.4699;
      const lon1 = -0.3763;
      const lat2 = 41.3851;
      const lon2 = 2.1734;

      const distance = poiDiscoveryService.calculateDistance(lat1, lon1, lat2, lon2);

      // Should be approximately 300,000 meters (300km)
      expect(distance).toBeGreaterThan(250000);
      expect(distance).toBeLessThan(350000);
    });

    it('should return 0 for same coordinates', () => {
      const distance = poiDiscoveryService.calculateDistance(
        39.4699,
        -0.3763,
        39.4699,
        -0.3763
      );

      expect(distance).toBeLessThan(1); // Essentially 0
    });

    it('should calculate short distances accurately', () => {
      // Two points very close together (same street)
      const distance = poiDiscoveryService.calculateDistance(
        39.4699,
        -0.3763,
        39.4700,
        -0.3764
      );

      // Should be less than 200 meters
      expect(distance).toBeLessThan(200);
    });
  });

  describe('calculateNameSimilarity', () => {
    it('should return 1.0 for identical names', () => {
      const similarity = poiDiscoveryService.calculateNameSimilarity(
        'Restaurant La Pepica',
        'Restaurant La Pepica'
      );

      expect(similarity).toBe(1.0);
    });

    it('should return high similarity for similar names', () => {
      const similarity = poiDiscoveryService.calculateNameSimilarity(
        'Restaurant La Pepica',
        'La Pepica Restaurant'
      );

      expect(similarity).toBeGreaterThan(0.6);
    });

    it('should be case-insensitive', () => {
      const similarity = poiDiscoveryService.calculateNameSimilarity(
        'RESTAURANT LA PEPICA',
        'restaurant la pepica'
      );

      expect(similarity).toBe(1.0);
    });

    it('should handle special characters', () => {
      const similarity = poiDiscoveryService.calculateNameSimilarity(
        'Restaurant La Pepica (Valencia)',
        'Restaurant La Pepica'
      );

      // Should still have decent similarity
      expect(similarity).toBeGreaterThan(0.5);
    });

    it('should return low similarity for different names', () => {
      const similarity = poiDiscoveryService.calculateNameSimilarity(
        'Restaurant La Pepica',
        'Museum of Arts'
      );

      expect(similarity).toBeLessThan(0.3);
    });
  });

  describe('filterByCriteria', () => {
    it('should filter POIs by minimum reviews', () => {
      const pois = [
        { name: 'POI 1', review_count: 100, average_rating: 4.5 },
        { name: 'POI 2', review_count: 50, average_rating: 4.5 },
        { name: 'POI 3', review_count: 10, average_rating: 4.5 },
      ];

      const criteria = { minReviews: 60 };

      const filtered = poiDiscoveryService.filterByCriteria(pois, criteria);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('POI 1');
    });

    it('should filter POIs by minimum rating', () => {
      const pois = [
        { name: 'POI 1', review_count: 100, average_rating: 4.5 },
        { name: 'POI 2', review_count: 100, average_rating: 4.0 },
        { name: 'POI 3', review_count: 100, average_rating: 3.5 },
      ];

      const criteria = { minRating: 4.2 };

      const filtered = poiDiscoveryService.filterByCriteria(pois, criteria);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('POI 1');
    });

    it('should filter POIs by price level', () => {
      const pois = [
        { name: 'POI 1', review_count: 100, average_rating: 4.5, price_level: 1 },
        { name: 'POI 2', review_count: 100, average_rating: 4.5, price_level: 2 },
        { name: 'POI 3', review_count: 100, average_rating: 4.5, price_level: 4 },
      ];

      const criteria = { priceLevel: [1, 2] };

      const filtered = poiDiscoveryService.filterByCriteria(pois, criteria);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(p => p.name)).toEqual(['POI 1', 'POI 2']);
    });

    it('should apply multiple criteria filters', () => {
      const pois = [
        { name: 'POI 1', review_count: 100, average_rating: 4.5, price_level: 1 },
        { name: 'POI 2', review_count: 50, average_rating: 4.5, price_level: 1 },
        { name: 'POI 3', review_count: 100, average_rating: 3.5, price_level: 1 },
        { name: 'POI 4', review_count: 100, average_rating: 4.5, price_level: 4 },
      ];

      const criteria = {
        minReviews: 60,
        minRating: 4.0,
        priceLevel: [1, 2],
      };

      const filtered = poiDiscoveryService.filterByCriteria(pois, criteria);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('POI 1');
    });
  });

  describe('generateSlug', () => {
    it('should convert name to URL-friendly slug', () => {
      const slug = poiDiscoveryService.generateSlug('Restaurant La Pepica');

      expect(slug).toBe('restaurant-la-pepica');
    });

    it('should handle special characters', () => {
      const slug = poiDiscoveryService.generateSlug('Café & Bar (Valencia)');

      expect(slug).toBe('caf-bar-valencia');
    });

    it('should remove leading/trailing dashes', () => {
      const slug = poiDiscoveryService.generateSlug('---Test Name---');

      expect(slug).toBe('test-name');
    });

    it('should handle multiple spaces', () => {
      const slug = poiDiscoveryService.generateSlug('Test    Multiple    Spaces');

      expect(slug).toBe('test-multiple-spaces');
    });
  });

  describe('extractCity', () => {
    it('should extract city from destination string', () => {
      const city = poiDiscoveryService.extractCity('Valencia, Spain');

      expect(city).toBe('Valencia');
    });

    it('should handle destination without country', () => {
      const city = poiDiscoveryService.extractCity('Valencia');

      expect(city).toBe('Valencia');
    });

    it('should trim whitespace', () => {
      const city = poiDiscoveryService.extractCity('  Valencia  ,  Spain  ');

      expect(city).toBe('Valencia');
    });
  });

  describe('extractCountry', () => {
    it('should extract country from destination string', () => {
      const country = poiDiscoveryService.extractCountry('Valencia, Spain');

      expect(country).toBe('Spain');
    });

    it('should return Unknown if no country', () => {
      const country = poiDiscoveryService.extractCountry('Valencia');

      expect(country).toBe('Unknown');
    });

    it('should trim whitespace', () => {
      const country = poiDiscoveryService.extractCountry('Valencia  ,  Spain  ');

      expect(country).toBe('Spain');
    });
  });
});
