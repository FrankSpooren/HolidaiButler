/**
 * Admin POI Routes Integration Tests
 * Tests for /api/admin/pois/* endpoints
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// Mock Sequelize
const mockPOIs = [
  {
    id: 1,
    uuid: 'poi-uuid-1',
    name: 'Test Restaurant',
    slug: 'test-restaurant',
    category: 'food_drinks',
    subcategory: 'restaurant',
    latitude: 38.6446,
    longitude: 0.0647,
    city: 'Calpe',
    country: 'Spain',
    rating: 4.5,
    review_count: 100,
    verified: true,
    active: true,
    toJSON: function() { return { ...this }; }
  },
  {
    id: 2,
    uuid: 'poi-uuid-2',
    name: 'Beach Club',
    slug: 'beach-club',
    category: 'beach',
    subcategory: 'beach_club',
    latitude: 38.6500,
    longitude: 0.0700,
    city: 'Calpe',
    country: 'Spain',
    rating: 4.2,
    review_count: 50,
    verified: false,
    active: true,
    toJSON: function() { return { ...this }; }
  }
];

// Mock POI model
jest.mock('../../models/index.js', () => ({
  POI: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  AdminUser: {
    findByPk: jest.fn()
  }
}));

// Mock admin auth middleware
jest.mock('../../middleware/adminAuth.js', () => ({
  verifyAdminToken: (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET);
      req.adminUser = { id: decoded.userId, role: decoded.role };
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
  },
  requireRole: (...roles) => (req, res, next) => {
    if (roles.includes(req.adminUser?.role)) {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Access denied' });
    }
  }
}));

import { POI } from '../../models/index.js';
import adminPOIRoutes from '../../routes/adminPOI.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/admin/pois', adminPOIRoutes);

// Generate test token
const generateTestToken = (role = 'super_admin') => {
  return jwt.sign(
    { userId: 'test-user-id', role, type: 'access' },
    process.env.JWT_ADMIN_SECRET,
    { expiresIn: '1h' }
  );
};

describe('Admin POI Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/pois', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/admin/pois');
      expect(res.status).toBe(401);
    });

    it('should return paginated list of POIs', async () => {
      const token = generateTestToken();

      POI.findAll.mockResolvedValue(mockPOIs);
      POI.count.mockResolvedValue(2);

      const res = await request(app)
        .get('/api/admin/pois')
        .set('Authorization', `Bearer ${token}`)
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pois).toHaveLength(2);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should filter POIs by category', async () => {
      const token = generateTestToken();

      POI.findAll.mockResolvedValue([mockPOIs[0]]);
      POI.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/admin/pois')
        .set('Authorization', `Bearer ${token}`)
        .query({ category: 'food_drinks' });

      expect(res.status).toBe(200);
      expect(POI.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'food_drinks'
          })
        })
      );
    });

    it('should filter POIs by verified status', async () => {
      const token = generateTestToken();

      POI.findAll.mockResolvedValue([mockPOIs[0]]);
      POI.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/admin/pois')
        .set('Authorization', `Bearer ${token}`)
        .query({ verified: 'true' });

      expect(res.status).toBe(200);
      expect(POI.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            verified: true
          })
        })
      );
    });

    it('should search POIs by name', async () => {
      const token = generateTestToken();

      POI.findAll.mockResolvedValue([mockPOIs[0]]);
      POI.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/admin/pois')
        .set('Authorization', `Bearer ${token}`)
        .query({ search: 'Restaurant' });

      expect(res.status).toBe(200);
      expect(res.body.data.pois).toHaveLength(1);
    });
  });

  describe('GET /api/admin/pois/:id', () => {
    it('should return single POI by ID', async () => {
      const token = generateTestToken();

      POI.findByPk.mockResolvedValue(mockPOIs[0]);

      const res = await request(app)
        .get('/api/admin/pois/1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.poi.name).toBe('Test Restaurant');
    });

    it('should return 404 for non-existent POI', async () => {
      const token = generateTestToken();

      POI.findByPk.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/admin/pois/999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/admin/pois', () => {
    it('should create new POI with valid data', async () => {
      const token = generateTestToken();

      const newPOI = {
        name: 'New Restaurant',
        category: 'food_drinks',
        latitude: 38.6500,
        longitude: 0.0700,
        city: 'Calpe'
      };

      const createdPOI = {
        id: 3,
        uuid: 'poi-uuid-3',
        ...newPOI,
        slug: 'new-restaurant',
        save: jest.fn().mockResolvedValue()
      };

      POI.create.mockResolvedValue(createdPOI);
      POI.findOne.mockResolvedValue(null); // No duplicate slug

      const res = await request(app)
        .post('/api/admin/pois')
        .set('Authorization', `Bearer ${token}`)
        .send(newPOI);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.poi.name).toBe('New Restaurant');
    });

    it('should return 400 for missing required fields', async () => {
      const token = generateTestToken();

      const invalidPOI = {
        name: 'Test'
        // Missing required fields
      };

      const res = await request(app)
        .post('/api/admin/pois')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidPOI);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid category', async () => {
      const token = generateTestToken();

      const invalidPOI = {
        name: 'Test POI',
        category: 'invalid_category',
        latitude: 38.6500,
        longitude: 0.0700
      };

      const res = await request(app)
        .post('/api/admin/pois')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidPOI);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/admin/pois/:id', () => {
    it('should update POI with valid data', async () => {
      const token = generateTestToken();

      const existingPOI = {
        ...mockPOIs[0],
        update: jest.fn().mockResolvedValue({
          ...mockPOIs[0],
          name: 'Updated Restaurant'
        })
      };

      POI.findByPk.mockResolvedValue(existingPOI);

      const res = await request(app)
        .put('/api/admin/pois/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Restaurant' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(existingPOI.update).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Restaurant' })
      );
    });

    it('should return 404 for non-existent POI', async () => {
      const token = generateTestToken();

      POI.findByPk.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/admin/pois/999')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/admin/pois/:id', () => {
    it('should delete POI', async () => {
      const token = generateTestToken('super_admin');

      const existingPOI = {
        ...mockPOIs[0],
        destroy: jest.fn().mockResolvedValue()
      };

      POI.findByPk.mockResolvedValue(existingPOI);

      const res = await request(app)
        .delete('/api/admin/pois/1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(existingPOI.destroy).toHaveBeenCalled();
    });

    it('should return 404 for non-existent POI', async () => {
      const token = generateTestToken('super_admin');

      POI.findByPk.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/admin/pois/999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/admin/pois/:id/verify', () => {
    it('should verify POI', async () => {
      const token = generateTestToken();

      const existingPOI = {
        ...mockPOIs[1],
        verified: false,
        update: jest.fn().mockResolvedValue({
          ...mockPOIs[1],
          verified: true
        })
      };

      POI.findByPk.mockResolvedValue(existingPOI);

      const res = await request(app)
        .post('/api/admin/pois/2/verify')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(existingPOI.update).toHaveBeenCalledWith(
        expect.objectContaining({ verified: true })
      );
    });
  });

  describe('POST /api/admin/pois/:id/feature', () => {
    it('should toggle featured status', async () => {
      const token = generateTestToken();

      const existingPOI = {
        ...mockPOIs[0],
        featured: false,
        update: jest.fn().mockResolvedValue({
          ...mockPOIs[0],
          featured: true
        })
      };

      POI.findByPk.mockResolvedValue(existingPOI);

      const res = await request(app)
        .post('/api/admin/pois/1/feature')
        .set('Authorization', `Bearer ${token}`)
        .send({ featured: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/admin/pois/stats', () => {
    it('should return POI statistics', async () => {
      const token = generateTestToken();

      POI.count.mockImplementation(({ where }) => {
        if (!where) return Promise.resolve(100);
        if (where.verified === true) return Promise.resolve(75);
        if (where.active === true) return Promise.resolve(95);
        if (where.featured === true) return Promise.resolve(10);
        return Promise.resolve(0);
      });

      const res = await request(app)
        .get('/api/admin/pois/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats).toBeDefined();
    });
  });

  describe('POST /api/admin/pois/bulk', () => {
    it('should perform bulk operations', async () => {
      const token = generateTestToken('super_admin');

      POI.update.mockResolvedValue([2]);

      const res = await request(app)
        .post('/api/admin/pois/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({
          action: 'verify',
          ids: [1, 2]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 for invalid action', async () => {
      const token = generateTestToken('super_admin');

      const res = await request(app)
        .post('/api/admin/pois/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({
          action: 'invalid_action',
          ids: [1, 2]
        });

      expect(res.status).toBe(400);
    });
  });
});
