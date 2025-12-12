/**
 * API Integration Tests
 */

const request = require('supertest');

// Mock all external dependencies
jest.mock('../../models', () => require('../__mocks__/models'));
jest.mock('../../services/cache', () => ({
  connect: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn().mockResolvedValue(true),
  healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
  getStatistics: jest.fn().mockResolvedValue({ connected: true }),
  getRestaurant: jest.fn().mockResolvedValue(null),
  cacheRestaurant: jest.fn().mockResolvedValue(true),
  invalidateRestaurant: jest.fn().mockResolvedValue(true),
  getTables: jest.fn().mockResolvedValue(null),
  cacheTables: jest.fn().mockResolvedValue(true),
  getAvailability: jest.fn().mockResolvedValue(null),
  flushAll: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  stream: { write: jest.fn() },
}));

// Import app after mocks
const app = require('../../server');

describe('API Integration Tests', () => {
  describe('Health Endpoints', () => {
    it('GET /health should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.service).toBe('reservations-module');
    });

    it('GET / should return service info', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.service).toContain('Reservations');
      expect(response.body.endpoints).toBeDefined();
    });

    it('GET /api/v1/monitoring/live should return alive', async () => {
      const response = await request(app)
        .get('/api/v1/monitoring/live')
        .expect(200);

      expect(response.body.alive).toBe(true);
    });
  });

  describe('Restaurant Endpoints', () => {
    it('GET /api/v1/restaurants should return restaurants list', async () => {
      const { Restaurant } = require('../../models');
      Restaurant.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [{
          id: 'test-uuid',
          name: 'Test Restaurant',
          is_active: true,
        }],
      });

      const response = await request(app)
        .get('/api/v1/restaurants')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.restaurants).toBeDefined();
    });

    it('GET /api/v1/restaurants/:id should return 404 for invalid id', async () => {
      const { Restaurant } = require('../../models');
      Restaurant.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/restaurants/invalid-uuid')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Availability Endpoints', () => {
    it('POST /api/v1/availability/check should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/availability/check')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/v1/unknown-route')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });
});
