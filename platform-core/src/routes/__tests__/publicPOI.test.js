/**
 * Public POI Routes Tests
 * Integration tests for customer-facing POI endpoints
 */

import express from 'express';
import request from 'supertest';

// Create test app with routes
const createTestApp = async () => {
  const app = express();
  app.use(express.json());

  // Import routes dynamically
  const { default: publicPOIRouter } = await import('../publicPOI.js');
  app.use('/api/v1/pois', publicPOIRouter);

  return app;
};

describe('Public POI Routes', () => {
  let app;

  beforeAll(async () => {
    app = await createTestApp();
  });

  // =========================================================================
  // GET /api/v1/pois
  // =========================================================================

  describe('GET /api/v1/pois', () => {
    it('should return sample POIs when database not connected', async () => {
      const response = await request(app)
        .get('/api/v1/pois')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.pois).toBeDefined();
      expect(Array.isArray(response.body.data.pois)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should return pagination info', async () => {
      const response = await request(app)
        .get('/api/v1/pois')
        .expect(200);

      const { pagination } = response.body.data;
      expect(pagination).toHaveProperty('total');
      expect(pagination).toHaveProperty('page');
      expect(pagination).toHaveProperty('limit');
      expect(pagination).toHaveProperty('pages');
    });

    it('should handle query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/pois')
        .query({ page: 1, limit: 10, category: 'beach' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should accept category filter', async () => {
      const response = await request(app)
        .get('/api/v1/pois')
        .query({ category: 'food_drinks' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should accept city filter', async () => {
      const response = await request(app)
        .get('/api/v1/pois')
        .query({ city: 'Calpe' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should accept status filter defaulting to active', async () => {
      const response = await request(app)
        .get('/api/v1/pois')
        .query({ status: 'active' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // =========================================================================
  // GET /api/v1/pois/:id
  // =========================================================================

  describe('GET /api/v1/pois/:id', () => {
    it('should return 503 when database not connected', async () => {
      const response = await request(app)
        .get('/api/v1/pois/123')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database not available');
    });

    it('should handle slug-based lookups', async () => {
      const response = await request(app)
        .get('/api/v1/pois/penyal-difac')
        .expect(503); // 503 because no DB connection

      expect(response.body.success).toBe(false);
    });

    it('should sanitize id parameter', async () => {
      // Test SQL injection attempt - should not cause 500 error
      const response = await request(app)
        .get('/api/v1/pois/1; DROP TABLE pois;--')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database not available');
    });

    it('should handle malicious input safely', async () => {
      // Test with special characters
      const response = await request(app)
        .get("/api/v1/pois/' OR '1'='1")
        .expect(503);

      expect(response.body.success).toBe(false);
    });
  });

  // =========================================================================
  // Sample POIs Structure
  // =========================================================================

  describe('Sample POIs Structure', () => {
    it('should have correct POI structure', async () => {
      const response = await request(app)
        .get('/api/v1/pois')
        .expect(200);

      const poi = response.body.data.pois[0];

      expect(poi).toHaveProperty('id');
      expect(poi).toHaveProperty('name');
      expect(poi).toHaveProperty('slug');
      expect(poi).toHaveProperty('description');
      expect(poi).toHaveProperty('category');
      expect(poi).toHaveProperty('city');
      expect(poi).toHaveProperty('address');
      expect(poi).toHaveProperty('latitude');
      expect(poi).toHaveProperty('longitude');
      expect(poi).toHaveProperty('status');
      expect(poi).toHaveProperty('tier');
    });

    it('should have valid category values', async () => {
      const response = await request(app)
        .get('/api/v1/pois')
        .expect(200);

      const validCategories = [
        'food_drinks',
        'museum',
        'beach',
        'historical',
        'routes',
        'healthcare',
        'shopping',
        'activities',
        'accommodation',
        'nightlife',
      ];

      response.body.data.pois.forEach((poi) => {
        expect(validCategories).toContain(poi.category);
      });
    });

    it('should have valid tier values', async () => {
      const response = await request(app)
        .get('/api/v1/pois')
        .expect(200);

      const validTiers = ['basic', 'standard', 'premium'];

      response.body.data.pois.forEach((poi) => {
        expect(validTiers).toContain(poi.tier);
      });
    });

    it('should have images array with proper structure', async () => {
      const response = await request(app)
        .get('/api/v1/pois')
        .expect(200);

      response.body.data.pois.forEach((poi) => {
        expect(Array.isArray(poi.images)).toBe(true);
        if (poi.images.length > 0) {
          expect(poi.images[0]).toHaveProperty('url');
          expect(poi.images[0]).toHaveProperty('isPrimary');
        }
      });
    });

    it('should have rating and review count', async () => {
      const response = await request(app)
        .get('/api/v1/pois')
        .expect(200);

      response.body.data.pois.forEach((poi) => {
        expect(typeof poi.rating).toBe('number');
        expect(poi.rating).toBeGreaterThanOrEqual(0);
        expect(poi.rating).toBeLessThanOrEqual(5);
        expect(typeof poi.reviewCount).toBe('number');
        expect(poi.reviewCount).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // =========================================================================
  // Security Tests
  // =========================================================================

  describe('Security', () => {
    it('should not leak sensitive information in error responses', async () => {
      const response = await request(app)
        .get('/api/v1/pois/nonexistent')
        .expect(503);

      // Should not contain stack traces or internal details
      expect(response.body.stack).toBeUndefined();
      expect(response.body.sql).toBeUndefined();
      expect(response.body.query).toBeUndefined();
    });

    it('should handle very long id parameter', async () => {
      const longId = 'a'.repeat(1000);

      const response = await request(app)
        .get(`/api/v1/pois/${longId}`)
        .expect(503);

      expect(response.body.success).toBe(false);
    });

    it('should handle unicode in parameters', async () => {
      const response = await request(app)
        .get('/api/v1/pois/测试-poi')
        .expect(503);

      expect(response.body.success).toBe(false);
    });
  });

  // =========================================================================
  // Response Format
  // =========================================================================

  describe('Response Format', () => {
    it('should return JSON content type', async () => {
      await request(app)
        .get('/api/v1/pois')
        .expect('Content-Type', /json/)
        .expect(200);
    });

    it('should have consistent success format', async () => {
      const response = await request(app)
        .get('/api/v1/pois')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
    });

    it('should have consistent error format', async () => {
      const response = await request(app)
        .get('/api/v1/pois/nonexistent')
        .expect(503);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });
});
