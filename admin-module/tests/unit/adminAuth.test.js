/**
 * Admin Authentication Routes Tests
 * Tests for /api/admin/auth/* endpoints
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// Mock the models
jest.mock('../../models/index.js', () => ({
  AdminUser: {
    scope: jest.fn().mockReturnThis(),
    findOne: jest.fn(),
    findByPk: jest.fn()
  }
}));

// Mock the middleware
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
  adminRateLimit: () => (req, res, next) => next()
}));

import { AdminUser } from '../../models/index.js';
import adminAuthRoutes from '../../routes/adminAuth.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/admin/auth', adminAuthRoutes);

describe('Admin Authentication Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/admin/auth/login', () => {
    it('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({ password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('required');
    });

    it('should return 400 if password is missing', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({ email: 'admin@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('required');
    });

    it('should return 401 for invalid credentials', async () => {
      AdminUser.scope.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null)
      });

      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({ email: 'wrong@test.com', password: 'wrongpass' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials.');
    });

    it('should return 423 if account is locked', async () => {
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      const mockUser = {
        id: 'user-123',
        email: 'admin@test.com',
        isLocked: true,
        lockUntil,
        status: 'active'
      };

      AdminUser.scope.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser)
      });

      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({ email: 'admin@test.com', password: 'password123' });

      expect(res.status).toBe(423);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Account is locked');
    });

    it('should return 403 if account is inactive', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@test.com',
        isLocked: false,
        status: 'suspended'
      };

      AdminUser.scope.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser)
      });

      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({ email: 'admin@test.com', password: 'password123' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('suspended');
    });

    it('should return 401 for wrong password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@test.com',
        isLocked: false,
        status: 'active',
        comparePassword: jest.fn().mockResolvedValue(false),
        incLoginAttempts: jest.fn().mockResolvedValue()
      };

      AdminUser.scope.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser)
      });

      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({ email: 'admin@test.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(mockUser.incLoginAttempts).toHaveBeenCalled();
    });

    it('should return tokens on successful login', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@test.com',
        firstName: 'Test',
        lastName: 'Admin',
        role: 'super_admin',
        isLocked: false,
        status: 'active',
        loginAttempts: 0,
        lockUntil: null,
        comparePassword: jest.fn().mockResolvedValue(true),
        resetLoginAttempts: jest.fn().mockResolvedValue(),
        save: jest.fn().mockResolvedValue(),
        toSafeJSON: jest.fn().mockReturnValue({
          id: 'user-123',
          email: 'admin@test.com',
          firstName: 'Test',
          lastName: 'Admin',
          role: 'super_admin',
          status: 'active'
        })
      };

      AdminUser.scope.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser)
      });

      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({ email: 'admin@test.com', password: 'correctpassword' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe('admin@test.com');
    });
  });

  describe('POST /api/admin/auth/refresh', () => {
    it('should return 400 if refresh token is missing', async () => {
      const res = await request(app)
        .post('/api/admin/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/admin/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return new access token for valid refresh token', async () => {
      const refreshToken = jwt.sign(
        { userId: 'user-123', type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      const mockUser = {
        id: 'user-123',
        role: 'super_admin',
        status: 'active'
      };

      AdminUser.findByPk.mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/admin/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should return 401 if user is inactive', async () => {
      const refreshToken = jwt.sign(
        { userId: 'user-123', type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      AdminUser.findByPk.mockResolvedValue({
        id: 'user-123',
        status: 'suspended'
      });

      const res = await request(app)
        .post('/api/admin/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/auth/me', () => {
    it('should return 401 without token', async () => {
      const res = await request(app)
        .get('/api/admin/auth/me');

      expect(res.status).toBe(401);
    });

    it('should return user data with valid token', async () => {
      const token = jwt.sign(
        { userId: 'user-123', role: 'super_admin', type: 'access' },
        process.env.JWT_ADMIN_SECRET,
        { expiresIn: '1h' }
      );

      const mockUser = {
        id: 'user-123',
        email: 'admin@test.com',
        firstName: 'Test',
        lastName: 'Admin',
        role: 'super_admin'
      };

      AdminUser.findByPk.mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/api/admin/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
    });
  });

  describe('PUT /api/admin/auth/profile', () => {
    it('should return 400 if no valid fields to update', async () => {
      const token = jwt.sign(
        { userId: 'user-123', role: 'super_admin', type: 'access' },
        process.env.JWT_ADMIN_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .put('/api/admin/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ invalidField: 'value' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should update profile with valid fields', async () => {
      const token = jwt.sign(
        { userId: 'user-123', role: 'super_admin', type: 'access' },
        process.env.JWT_ADMIN_SECRET,
        { expiresIn: '1h' }
      );

      const mockUser = {
        id: 'user-123',
        email: 'admin@test.com',
        firstName: 'Test',
        lastName: 'Admin',
        update: jest.fn().mockResolvedValue(),
        toSafeJSON: jest.fn().mockReturnValue({
          id: 'user-123',
          email: 'admin@test.com',
          firstName: 'Updated',
          lastName: 'Admin'
        })
      };

      AdminUser.findByPk.mockResolvedValue(mockUser);

      const res = await request(app)
        .put('/api/admin/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockUser.update).toHaveBeenCalledWith({ firstName: 'Updated' });
    });
  });

  describe('POST /api/admin/auth/change-password', () => {
    it('should return 400 if passwords are missing', async () => {
      const token = jwt.sign(
        { userId: 'user-123', role: 'super_admin', type: 'access' },
        process.env.JWT_ADMIN_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/api/admin/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 if new password is too short', async () => {
      const token = jwt.sign(
        { userId: 'user-123', role: 'super_admin', type: 'access' },
        process.env.JWT_ADMIN_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/api/admin/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'current123', newPassword: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('at least 8 characters');
    });

    it('should return 401 if current password is wrong', async () => {
      const token = jwt.sign(
        { userId: 'user-123', role: 'super_admin', type: 'access' },
        process.env.JWT_ADMIN_SECRET,
        { expiresIn: '1h' }
      );

      const mockUser = {
        id: 'user-123',
        comparePassword: jest.fn().mockResolvedValue(false)
      };

      AdminUser.scope.mockReturnValue({
        findByPk: jest.fn().mockResolvedValue(mockUser)
      });

      const res = await request(app)
        .post('/api/admin/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'wrongpassword', newPassword: 'newpassword123' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('incorrect');
    });
  });

  describe('POST /api/admin/auth/logout', () => {
    it('should logout successfully', async () => {
      const token = jwt.sign(
        { userId: 'user-123', role: 'super_admin', type: 'access' },
        process.env.JWT_ADMIN_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/api/admin/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Logged out');
    });
  });
});
