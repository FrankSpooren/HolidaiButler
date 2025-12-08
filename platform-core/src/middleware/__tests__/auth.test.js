/**
 * Authentication Middleware Tests
 * Tests for JWT verification, RBAC, and security features
 */

import jwt from 'jsonwebtoken';
import {
  authenticate,
  verifyToken,
  optionalAuth,
  requireAdmin,
  requireRole,
  requirePermission,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateAdminToken,
  validateFields,
  logActivity,
} from '../auth.js';

// Test secret from setup.js
const TEST_SECRET = 'test-secret-key-for-testing-only';

describe('Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      body: {},
      params: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  // =========================================================================
  // authenticate / verifyToken
  // =========================================================================

  describe('authenticate', () => {
    it('should authenticate valid JWT token', () => {
      const payload = { userId: 1, email: 'test@example.com', role: 'user' };
      const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;

      authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(1);
      expect(req.user.email).toBe('test@example.com');
      expect(req.user.role).toBe('user');
    });

    it('should reject request without authorization header', () => {
      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'NO_TOKEN',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with malformed authorization header', () => {
      req.headers.authorization = 'InvalidFormat token123';

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'NO_TOKEN',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject expired token', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '-1h' });
      req.headers.authorization = `Bearer ${token}`;

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'TOKEN_EXPIRED',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token', () => {
      req.headers.authorization = 'Bearer invalid.token.here';

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_TOKEN',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should normalize user object with userId or id', () => {
      const payload = { id: 99, email: 'test@example.com' };
      const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;

      authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.id).toBe(99);
    });

    it('should set default role to user if not provided', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;

      authenticate(req, res, next);

      expect(req.user.role).toBe('user');
    });
  });

  // =========================================================================
  // optionalAuth
  // =========================================================================

  describe('optionalAuth', () => {
    it('should attach user if valid token present', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;

      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(1);
    });

    it('should continue without user if no token', () => {
      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('should continue without user if invalid token', () => {
      req.headers.authorization = 'Bearer invalid.token';

      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('should continue without user if expired token', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '-1h' });
      req.headers.authorization = `Bearer ${token}`;

      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });
  });

  // =========================================================================
  // requireAdmin
  // =========================================================================

  describe('requireAdmin', () => {
    it('should allow admin users', () => {
      req.user = { id: 1, email: 'admin@example.com', role: 'admin' };

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow users with isAdmin flag', () => {
      req.user = { id: 1, email: 'admin@example.com', role: 'user', isAdmin: true };

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject non-admin users', () => {
      req.user = { id: 1, email: 'user@example.com', role: 'user' };

      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'FORBIDDEN',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated users', () => {
      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'NOT_AUTHENTICATED',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // requireRole
  // =========================================================================

  describe('requireRole', () => {
    it('should allow user with matching role', async () => {
      req.user = { id: 1, email: 'mod@example.com', role: 'moderator' };

      const middleware = requireRole('moderator');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow user with one of multiple roles', async () => {
      req.user = { id: 1, email: 'admin@example.com', role: 'admin' };

      const middleware = requireRole(['admin', 'super_admin']);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject user without required role', async () => {
      req.user = { id: 1, email: 'user@example.com', role: 'user' };

      const middleware = requireRole('admin');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INSUFFICIENT_ROLE',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', async () => {
      const middleware = requireRole('admin');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // requirePermission
  // =========================================================================

  describe('requirePermission', () => {
    it('should reject unauthenticated user', async () => {
      const middleware = requirePermission('poi.create');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'NOT_AUTHENTICATED',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    // Note: Full permission testing requires database mocking
    // These tests verify the middleware structure
    it('should accept array of permissions', async () => {
      req.user = { id: 1, email: 'test@example.com' };

      const middleware = requirePermission(['poi.create', 'poi.update'], 'ANY');
      await middleware(req, res, next);

      // Will fail permission check without DB, but should not crash
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // =========================================================================
  // Token Generation
  // =========================================================================

  describe('generateToken', () => {
    it('should generate valid JWT token', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const token = generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const decoded = jwt.verify(token, TEST_SECRET);
      expect(decoded.userId).toBe(1);
      expect(decoded.email).toBe('test@example.com');
    });

    it('should set default expiration to 24h', () => {
      const payload = { userId: 1 };
      const token = generateToken(payload);
      const decoded = jwt.decode(token);

      const now = Math.floor(Date.now() / 1000);
      const expectedExp = now + 24 * 60 * 60; // 24 hours

      expect(decoded.exp).toBeGreaterThan(now);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExp + 5); // 5 second tolerance
    });

    it('should respect custom expiration', () => {
      const payload = { userId: 1 };
      const token = generateToken(payload, '1h');
      const decoded = jwt.decode(token);

      const now = Math.floor(Date.now() / 1000);
      const expectedExp = now + 60 * 60; // 1 hour

      expect(decoded.exp).toBeLessThanOrEqual(expectedExp + 5);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate valid refresh token', () => {
      const payload = { userId: 1 };
      const token = generateRefreshToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, TEST_SECRET);
      expect(decoded.userId).toBe(1);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const payload = { userId: 1 };
      const token = generateRefreshToken(payload);

      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe(1);
    });

    it('should throw on invalid refresh token', () => {
      expect(() => verifyRefreshToken('invalid.token')).toThrow('Invalid refresh token');
    });
  });

  describe('generateAdminToken', () => {
    it('should generate admin token with 8h expiration', () => {
      const payload = { userId: 1, role: 'admin' };
      const token = generateAdminToken(payload);
      const decoded = jwt.decode(token);

      const now = Math.floor(Date.now() / 1000);
      const expectedExp = now + 8 * 60 * 60; // 8 hours

      expect(decoded.exp).toBeLessThanOrEqual(expectedExp + 5);
    });
  });

  // =========================================================================
  // validateFields
  // =========================================================================

  describe('validateFields', () => {
    it('should allow valid fields', () => {
      req.body = { name: 'Test', email: 'test@example.com' };

      const middleware = validateFields(['name', 'email', 'password']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject invalid fields', () => {
      req.body = { name: 'Test', isAdmin: true, role: 'admin' };

      const middleware = validateFields(['name', 'email']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_FIELDS',
            invalidFields: expect.arrayContaining(['isAdmin', 'role']),
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow empty body', () => {
      req.body = {};

      const middleware = validateFields(['name', 'email']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // logActivity
  // =========================================================================

  describe('logActivity', () => {
    it('should call next and log activity for authenticated user', async () => {
      req.user = { id: 1, email: 'test@example.com' };
      req.params = { id: '123' };

      const middleware = logActivity('update', 'poi');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should call next for unauthenticated user without error', async () => {
      const middleware = logActivity('view', 'poi');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Alias verification
  // =========================================================================

  describe('verifyToken alias', () => {
    it('should be same as authenticate', () => {
      expect(verifyToken).toBe(authenticate);
    });
  });
});
