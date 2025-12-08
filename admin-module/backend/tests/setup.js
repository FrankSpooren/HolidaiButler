/**
 * Jest Test Setup for Admin Module
 * Sets up test environment, mocks, and helpers
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_ADMIN_SECRET = 'test-admin-secret-key-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_NAME = 'holidaibutler_test';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Set test timeout
jest.setTimeout(15000);

// Mock console to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Test helpers
export const testHelpers = {
  /**
   * Generate a valid admin JWT token for testing
   */
  generateTestAdminToken: (userId = 'test-user-id', role = 'super_admin') => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId, role, type: 'access' },
      process.env.JWT_ADMIN_SECRET,
      { expiresIn: '1h' }
    );
  },

  /**
   * Generate a refresh token for testing
   */
  generateTestRefreshToken: (userId = 'test-user-id') => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
  },

  /**
   * Create mock admin user
   */
  createMockAdminUser: (overrides = {}) => ({
    id: 'test-admin-id',
    email: 'admin@test.com',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'super_admin',
    status: 'active',
    loginAttempts: 0,
    lockUntil: null,
    isLocked: false,
    lastLogin: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    comparePassword: jest.fn().mockResolvedValue(true),
    incLoginAttempts: jest.fn().mockResolvedValue(),
    resetLoginAttempts: jest.fn().mockResolvedValue(),
    save: jest.fn().mockResolvedValue(),
    toSafeJSON: jest.fn().mockReturnValue({
      id: 'test-admin-id',
      email: 'admin@test.com',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'super_admin',
      status: 'active'
    }),
    ...overrides
  }),

  /**
   * Create mock POI
   */
  createMockPOI: (overrides = {}) => ({
    id: 1,
    uuid: 'test-poi-uuid',
    name: 'Test Restaurant',
    slug: 'test-restaurant',
    description: 'A test restaurant',
    category: 'food_drinks',
    subcategory: 'restaurant',
    latitude: 38.6446,
    longitude: 0.0647,
    address: 'Test Street 123',
    city: 'Calpe',
    region: 'Costa Blanca',
    country: 'Spain',
    rating: 4.5,
    review_count: 100,
    price_level: 2,
    phone: '+34 123 456 789',
    website: 'https://test.com',
    verified: true,
    active: true,
    featured: false,
    tier: 2,
    poi_score: 7.5,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(),
    destroy: jest.fn().mockResolvedValue(),
    ...overrides
  }),

  /**
   * Create mock booking
   */
  createMockBooking: (overrides = {}) => ({
    id: 'test-booking-id',
    bookingNumber: 'BKG-20251201-ABC123',
    confirmationCode: 'CONF123',
    type: 'attraction_ticket',
    customerFirstName: 'John',
    customerLastName: 'Doe',
    customerEmail: 'john@test.com',
    customerPhone: '+34 123 456 789',
    status: 'confirmed',
    paymentStatus: 'completed',
    pricingTotal: 99.99,
    currency: 'EUR',
    visitDate: '2025-12-15',
    visitTime: '10:00',
    visitParticipants: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  /**
   * Wait for async operations
   */
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Clean up after all tests
afterAll(async () => {
  // Close any open handles
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Reset mocks between tests
afterEach(() => {
  jest.clearAllMocks();
});
