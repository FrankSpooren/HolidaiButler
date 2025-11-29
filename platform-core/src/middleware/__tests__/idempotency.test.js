/**
 * Idempotency Middleware Tests
 */

import { idempotency, strictIdempotency, clearIdempotencyKey } from '../idempotency.js';
import redis from '../../config/redis.js';

// Mock Redis
jest.mock('../../config/redis.js');
jest.mock('../../utils/logger.js');

describe('Idempotency Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: 'POST',
      path: '/api/resource',
      body: { data: 'test' },
      user: { id: 'user123' },
      get: jest.fn((header) => {
        if (header === 'Idempotency-Key' || header === 'idempotency-key') {
          return req.headers?.['idempotency-key'];
        }
        return null;
      }),
      headers: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    next = jest.fn();

    // Reset Redis mocks
    redis.get = jest.fn().mockResolvedValue(null);
    redis.setex = jest.fn().mockResolvedValue('OK');
    redis.del = jest.fn().mockResolvedValue(1);
    redis.keys = jest.fn().mockResolvedValue([]);

    jest.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should skip idempotency for GET requests', async () => {
      req.method = 'GET';

      const middleware = idempotency();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(redis.get).not.toHaveBeenCalled();
    });

    it('should skip idempotency when no key provided and not required', async () => {
      req.headers = {}; // No idempotency key

      const middleware = idempotency();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(redis.get).not.toHaveBeenCalled();
    });

    it('should reject request when key missing and required', async () => {
      req.headers = {}; // No idempotency key

      const middleware = strictIdempotency();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Idempotency Key Required',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid idempotency key format', async () => {
      req.headers = { 'idempotency-key': 'invalid key!' }; // Invalid characters

      const middleware = idempotency();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid Idempotency Key',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept valid idempotency key', async () => {
      req.headers = { 'idempotency-key': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' };

      const middleware = idempotency();
      await middleware(req, res, next);

      expect(redis.get).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Request processing', () => {
    it('should return 409 if request is currently being processed', async () => {
      req.headers = { 'idempotency-key': 'test-key-123' };

      // Mock processing lock exists
      redis.get = jest.fn().mockImplementation((key) => {
        if (key.includes('processing')) {
          return Promise.resolve('1'); // Processing lock exists
        }
        return Promise.resolve(null);
      });

      const middleware = idempotency();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Request In Progress',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should set processing lock when starting new request', async () => {
      req.headers = { 'idempotency-key': 'test-key-123' };

      const middleware = idempotency();
      await middleware(req, res, next);

      // Should set processing lock
      expect(redis.setex).toHaveBeenCalledWith(
        expect.stringContaining('processing'),
        300, // 5 minutes
        '1'
      );
    });

    it('should cache successful response', async () => {
      req.headers = { 'idempotency-key': 'test-key-123' };

      const middleware = idempotency();
      await middleware(req, res, next);

      // Simulate successful response
      res.status(200);
      await res.json({ success: true, data: 'result' });

      // Should cache response
      expect(redis.setex).toHaveBeenCalledWith(
        expect.stringContaining('idempotency:user123:test-key-123'),
        expect.any(Number),
        expect.any(String)
      );

      // Should clear processing lock
      expect(redis.del).toHaveBeenCalledWith(
        expect.stringContaining('processing')
      );
    });

    it('should NOT cache error responses (4xx/5xx)', async () => {
      req.headers = { 'idempotency-key': 'test-key-123' };

      redis.setex = jest.fn().mockResolvedValue('OK');

      const middleware = idempotency();
      await middleware(req, res, next);

      // Simulate error response
      res.status(400);
      await res.json({ success: false, error: 'Bad request' });

      // Should NOT cache error response
      const cacheCall = redis.setex.mock.calls.find(
        (call) => call[0].includes('idempotency:user123:test-key-123')
      );
      expect(cacheCall).toBeUndefined();

      // Should still clear processing lock
      expect(redis.del).toHaveBeenCalledWith(
        expect.stringContaining('processing')
      );
    });
  });

  describe('Cached response replay', () => {
    it('should return cached response when available', async () => {
      req.headers = { 'idempotency-key': 'test-key-123' };

      const cachedResponse = {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: { success: true, id: 'resource-123' },
      };

      redis.get = jest.fn().mockResolvedValue(JSON.stringify(cachedResponse));

      const middleware = idempotency();
      await middleware(req, res, next);

      // Should return cached response
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        id: 'resource-123',
      });

      // Should set replay header
      expect(res.set).toHaveBeenCalledWith('X-Idempotency-Replay', 'true');

      // Should NOT call next (request not processed)
      expect(next).not.toHaveBeenCalled();
    });

    it('should restore cached response headers', async () => {
      req.headers = { 'idempotency-key': 'test-key-123' };

      const cachedResponse = {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value',
        },
        body: { data: 'test' },
      };

      redis.get = jest.fn().mockResolvedValue(JSON.stringify(cachedResponse));

      const middleware = idempotency();
      await middleware(req, res, next);

      // Should restore all headers
      expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(res.set).toHaveBeenCalledWith('X-Custom-Header', 'custom-value');
      expect(res.set).toHaveBeenCalledWith('X-Idempotency-Replay', 'true');
    });
  });

  describe('Request fingerprinting', () => {
    it('should differentiate requests with different bodies', async () => {
      req.headers = { 'idempotency-key': 'test-key-123' };

      const middleware = idempotency();

      // First request
      req.body = { amount: 100 };
      await middleware(req, res, next);
      const firstKey = redis.setex.mock.calls[0][0];

      jest.clearAllMocks();
      redis.get = jest.fn().mockResolvedValue(null);
      redis.setex = jest.fn().mockResolvedValue('OK');

      // Second request with different body
      req.body = { amount: 200 };
      await middleware(req, res, next);
      const secondKey = redis.setex.mock.calls[0][0];

      // Keys should be different (different fingerprints)
      expect(firstKey).not.toBe(secondKey);
    });

    it('should use same key for identical requests', async () => {
      req.headers = { 'idempotency-key': 'test-key-123' };
      req.body = { amount: 100 };

      const middleware = idempotency();

      // First request
      await middleware(req, res, next);
      const firstKey = redis.setex.mock.calls[0][0];

      jest.clearAllMocks();
      redis.get = jest.fn().mockResolvedValue(null);
      redis.setex = jest.fn().mockResolvedValue('OK');

      // Second identical request
      await middleware(req, res, next);
      const secondKey = redis.setex.mock.calls[0][0];

      // Keys should be identical
      expect(firstKey).toBe(secondKey);
    });
  });

  describe('User isolation', () => {
    it('should isolate idempotency keys by user', async () => {
      const idempotencyKey = 'test-key-123';

      // User 1 request
      req.headers = { 'idempotency-key': idempotencyKey };
      req.user = { id: 'user1' };

      const middleware = idempotency();
      await middleware(req, res, next);

      const user1Key = redis.setex.mock.calls[0][0];

      jest.clearAllMocks();
      redis.get = jest.fn().mockResolvedValue(null);
      redis.setex = jest.fn().mockResolvedValue('OK');

      // User 2 request with same idempotency key
      req.user = { id: 'user2' };
      await middleware(req, res, next);

      const user2Key = redis.setex.mock.calls[0][0];

      // Keys should be different (different users)
      expect(user1Key).toContain('user1');
      expect(user2Key).toContain('user2');
      expect(user1Key).not.toBe(user2Key);
    });
  });

  describe('Configuration options', () => {
    it('should use custom TTL', async () => {
      req.headers = { 'idempotency-key': 'test-key-123' };

      const customTTL = 3600; // 1 hour
      const middleware = idempotency({ ttl: customTTL });

      await middleware(req, res, next);

      // Simulate successful response
      res.status(200);
      await res.json({ data: 'test' });

      // Should use custom TTL
      expect(redis.setex).toHaveBeenCalledWith(
        expect.any(String),
        customTTL,
        expect.any(String)
      );
    });

    it('should use custom header name', async () => {
      req.get = jest.fn((header) => {
        if (header === 'X-Request-ID' || header === 'x-request-id') {
          return 'custom-key-123';
        }
        return null;
      });

      const middleware = idempotency({ headerName: 'X-Request-ID' });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(redis.get).toHaveBeenCalled();
    });

    it('should apply only to specified methods', async () => {
      req.headers = { 'idempotency-key': 'test-key-123' };

      const middleware = idempotency({ methods: ['POST', 'PUT'] });

      // POST request - should apply
      req.method = 'POST';
      await middleware(req, res, next);
      expect(redis.get).toHaveBeenCalled();

      jest.clearAllMocks();

      // DELETE request - should skip
      req.method = 'DELETE';
      await middleware(req, res, next);
      expect(redis.get).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should fail open when Redis is unavailable', async () => {
      req.headers = { 'idempotency-key': 'test-key-123' };

      // Mock Redis error
      redis.get = jest.fn().mockRejectedValue(new Error('Redis connection failed'));

      const middleware = idempotency();
      await middleware(req, res, next);

      // Should allow request through despite Redis error
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(500);
    });

    it('should clear processing lock on error', async () => {
      req.headers = { 'idempotency-key': 'test-key-123' };

      const middleware = idempotency();
      await middleware(req, res, next);

      // Simulate error in request processing
      const errorHandler = next.mock.calls[0][0];
      if (typeof errorHandler === 'function') {
        await errorHandler(new Error('Processing failed'));
      }

      // Should clear processing lock
      expect(redis.del).toHaveBeenCalledWith(
        expect.stringContaining('processing')
      );
    });
  });

  describe('Response size limits', () => {
    it('should not cache responses exceeding 1MB', async () => {
      req.headers = { 'idempotency-key': 'test-key-123' };

      const middleware = idempotency();
      await middleware(req, res, next);

      // Create large response (> 1MB)
      const largeData = 'x'.repeat(1024 * 1024 + 1);
      res.status(200);
      await res.json({ data: largeData });

      // Should NOT cache large response
      const cacheCall = redis.setex.mock.calls.find(
        (call) =>
          call[0].includes('idempotency:user123:test-key-123') &&
          !call[0].includes('processing')
      );
      expect(cacheCall).toBeUndefined();
    });
  });
});
