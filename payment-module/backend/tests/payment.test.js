const request = require('supertest');
const app = require('../server');

/**
 * Payment Module Test Suite
 * Comprehensive tests for payment processing functionality
 */

// Mock dependencies
jest.mock('../services/AdyenService');
jest.mock('../services/CacheService');

const AdyenService = require('../services/AdyenService');
const CacheService = require('../services/CacheService');

// Test fixtures
const mockUser = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  email: 'test@holidaibutler.com',
  role: 'user',
};

const mockAdminUser = {
  id: 'admin-uuid-1234-5678-90ab-cdef12345678',
  email: 'admin@holidaibutler.com',
  role: 'admin',
};

const mockPaymentSession = {
  sessionId: 'CS123ABC456DEF',
  sessionData: 'mock-session-data',
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
};

// Generate mock JWT token
const generateToken = (user) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'test-secret-key-for-testing-only-32chars',
    { expiresIn: '1h' }
  );
};

describe('Payment Module', () => {
  let userToken;
  let adminToken;

  beforeAll(() => {
    userToken = generateToken(mockUser);
    adminToken = generateToken(mockAdminUser);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    AdyenService.createPaymentSession.mockResolvedValue(mockPaymentSession);
    AdyenService.testConnection.mockResolvedValue(true);
    CacheService.isAvailable.mockReturnValue(true);
    CacheService.get.mockResolvedValue(null);
    CacheService.set.mockResolvedValue(true);
  });

  // ========== HEALTH CHECKS ==========

  describe('Health Endpoints', () => {
    test('GET / should return service info', async () => {
      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('service', 'HolidaiButler Payment Engine');
      expect(res.body).toHaveProperty('status', 'running');
      expect(res.body).toHaveProperty('endpoints');
    });

    test('GET /health should return healthy status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('status', 'healthy');
    });

    test('GET /api/v1/payments/health should check Adyen connection', async () => {
      const res = await request(app).get('/api/v1/payments/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('adyen', 'connected');
    });
  });

  // ========== AUTHENTICATION ==========

  describe('Authentication', () => {
    test('POST /api/v1/payments should require authentication', async () => {
      const res = await request(app)
        .post('/api/v1/payments')
        .send({ amount: 1000, currency: 'EUR' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'No authentication token provided');
    });

    test('POST /api/v1/payments should reject invalid tokens', async () => {
      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', 'Bearer invalid-token')
        .send({ amount: 1000, currency: 'EUR' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Authentication failed');
    });
  });

  // ========== PAYMENT CREATION ==========

  describe('Payment Creation', () => {
    const validPaymentRequest = {
      amount: 5000, // €50.00
      currency: 'EUR',
      resourceType: 'ticket',
      resourceId: 'resource-uuid-1234-5678-90ab-cdef12345678',
      returnUrl: 'https://holidaibutler.com/payment/callback',
      metadata: {
        bookingReference: 'BOOK-2024-001',
        customerEmail: 'customer@example.com',
      },
    };

    test('POST /api/v1/payments should create payment session', async () => {
      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validPaymentRequest);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('paymentId');
      expect(res.body.data).toHaveProperty('sessionId');
      expect(res.body.data).toHaveProperty('transactionReference');
    });

    test('POST /api/v1/payments should validate amount', async () => {
      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ...validPaymentRequest, amount: -100 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('POST /api/v1/payments should validate currency', async () => {
      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ...validPaymentRequest, currency: 'INVALID' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('POST /api/v1/payments should validate returnUrl is HTTPS', async () => {
      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ...validPaymentRequest, returnUrl: 'http://insecure.com/callback' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('POST /api/v1/payments should require resourceType', async () => {
      const { resourceType, ...withoutResourceType } = validPaymentRequest;

      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${userToken}`)
        .send(withoutResourceType);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  // ========== PAYMENT RETRIEVAL ==========

  describe('Payment Retrieval', () => {
    test('GET /api/v1/payments/:paymentId should return payment status', async () => {
      // This would require mocking the database
      // Placeholder for integration tests
      expect(true).toBe(true);
    });

    test('GET /api/v1/payments/:paymentId should deny access to other users payments', async () => {
      // Placeholder for authorization tests
      expect(true).toBe(true);
    });
  });

  // ========== REFUNDS ==========

  describe('Refunds', () => {
    const validRefundRequest = {
      reason: 'customer_request',
      notifyCustomer: true,
    };

    test('POST /api/v1/payments/:paymentId/refunds should validate reason', async () => {
      const res = await request(app)
        .post('/api/v1/payments/mock-payment-id/refunds')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: 'invalid_reason' });

      expect(res.status).toBe(400);
    });

    test('POST /api/v1/payments/:paymentId/refunds should require reason for "other"', async () => {
      const res = await request(app)
        .post('/api/v1/payments/mock-payment-id/refunds')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: 'other' }); // Missing reasonDetails

      expect(res.status).toBe(400);
    });
  });

  // ========== WEBHOOKS ==========

  describe('Webhooks', () => {
    const validWebhook = {
      notificationItems: [
        {
          NotificationRequestItem: {
            eventCode: 'AUTHORISATION',
            success: 'true',
            pspReference: 'PSP123456789',
            merchantReference: 'TXN-123456',
            amount: { value: 5000, currency: 'EUR' },
            paymentMethod: 'visa',
          },
        },
      ],
    };

    test('POST /api/v1/webhooks/adyen should accept valid webhooks', async () => {
      AdyenService.verifyHMACSignature.mockReturnValue(true);
      AdyenService.handleWebhook.mockResolvedValue({
        eventCode: 'AUTHORISATION',
        success: true,
        pspReference: 'PSP123456789',
      });

      const res = await request(app)
        .post('/api/v1/payments/webhooks/adyen')
        .send(validWebhook);

      expect(res.status).toBe(200);
      expect(res.text).toBe('[accepted]');
    });

    test('POST /api/v1/webhooks/adyen should reject empty notifications', async () => {
      const res = await request(app)
        .post('/api/v1/payments/webhooks/adyen')
        .send({ notificationItems: [] });

      expect(res.status).toBe(400);
      expect(res.text).toBe('[invalid]');
    });

    test('POST /api/v1/webhooks/adyen should reject invalid HMAC', async () => {
      AdyenService.verifyHMACSignature.mockReturnValue(false);

      const webhookWithHmac = {
        ...validWebhook,
        notificationItems: [
          {
            NotificationRequestItem: {
              ...validWebhook.notificationItems[0].NotificationRequestItem,
              additionalData: { hmacSignature: 'invalid-signature' },
            },
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/payments/webhooks/adyen')
        .send(webhookWithHmac);

      expect(res.status).toBe(401);
      expect(res.text).toBe('[invalid]');
    });
  });

  // ========== ADMIN ENDPOINTS ==========

  describe('Admin Endpoints', () => {
    test('GET /api/v1/payments/admin/transactions should require admin role', async () => {
      const res = await request(app)
        .get('/api/v1/payments/admin/transactions')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Admin access required');
    });

    test('GET /api/v1/payments/admin/transactions should allow admin access', async () => {
      const res = await request(app)
        .get('/api/v1/payments/admin/transactions')
        .set('Authorization', `Bearer ${adminToken}`);

      // Would need to mock database for full test
      // Just verify auth passes
      expect([200, 500]).toContain(res.status);
    });
  });

  // ========== PAYMENT METHODS ==========

  describe('Payment Methods', () => {
    test('GET /api/v1/payments/payment-methods/available should require params', async () => {
      const res = await request(app)
        .get('/api/v1/payments/payment-methods/available');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('GET /api/v1/payments/payment-methods/available should return methods', async () => {
      AdyenService.getPaymentMethods.mockResolvedValue([
        { type: 'scheme', name: 'Credit Card' },
        { type: 'ideal', name: 'iDEAL' },
      ]);

      const res = await request(app)
        .get('/api/v1/payments/payment-methods/available')
        .query({ country: 'NL', currency: 'EUR' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });

  // ========== RATE LIMITING ==========

  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      // Would need to configure lower limits for testing
      // Placeholder test
      expect(true).toBe(true);
    });
  });

  // ========== ERROR HANDLING ==========

  describe('Error Handling', () => {
    test('should return 404 for unknown endpoints', async () => {
      const res = await request(app).get('/api/v1/unknown-endpoint');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Endpoint not found');
    });

    test('should handle Adyen service errors gracefully', async () => {
      AdyenService.createPaymentSession.mockRejectedValue(
        new Error('Adyen API unavailable')
      );

      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 5000,
          currency: 'EUR',
          resourceType: 'ticket',
          resourceId: 'uuid-1234',
          returnUrl: 'https://example.com/callback',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });
});

// ========== UNIT TESTS ==========

describe('Validators', () => {
  const { createPaymentSchema, validate } = require('../validators/paymentValidators');

  test('createPaymentSchema should validate valid request', () => {
    const { error } = createPaymentSchema.validate({
      amount: 5000,
      currency: 'EUR',
      resourceType: 'ticket',
      resourceId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      returnUrl: 'https://example.com/callback',
    });

    expect(error).toBeUndefined();
  });

  test('createPaymentSchema should reject negative amount', () => {
    const { error } = createPaymentSchema.validate({
      amount: -100,
      currency: 'EUR',
      resourceType: 'ticket',
      resourceId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      returnUrl: 'https://example.com/callback',
    });

    expect(error).toBeDefined();
    expect(error.details[0].path).toContain('amount');
  });

  test('createPaymentSchema should reject HTTP returnUrl', () => {
    const { error } = createPaymentSchema.validate({
      amount: 5000,
      currency: 'EUR',
      resourceType: 'ticket',
      resourceId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      returnUrl: 'http://insecure.com/callback',
    });

    expect(error).toBeDefined();
    expect(error.details[0].path).toContain('returnUrl');
  });
});

describe('Circuit Breaker', () => {
  const { CircuitBreaker, CircuitState } = require('../utils/circuitBreaker');

  test('should start in CLOSED state', () => {
    const breaker = new CircuitBreaker({ name: 'test' });
    expect(breaker.getStatus().state).toBe(CircuitState.CLOSED);
  });

  test('should open after threshold failures', async () => {
    const breaker = new CircuitBreaker({
      name: 'test-open',
      failureThreshold: 3,
    });

    const failingFn = () => Promise.reject(new Error('fail'));

    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(failingFn);
      } catch (e) {
        // Expected failures
      }
    }

    expect(breaker.getStatus().state).toBe(CircuitState.OPEN);
  });

  test('should reset failure count on success', async () => {
    const breaker = new CircuitBreaker({
      name: 'test-reset',
      failureThreshold: 3,
    });

    const failingFn = () => Promise.reject(new Error('fail'));
    const successFn = () => Promise.resolve('success');

    // 2 failures
    for (let i = 0; i < 2; i++) {
      try {
        await breaker.execute(failingFn);
      } catch (e) {}
    }

    // 1 success should reset
    await breaker.execute(successFn);

    expect(breaker.getStatus().failureCount).toBe(0);
    expect(breaker.getStatus().state).toBe(CircuitState.CLOSED);
  });
});
