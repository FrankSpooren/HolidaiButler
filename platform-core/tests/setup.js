/**
 * Jest Setup
 * Global test configuration and mocks
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.JWT_ADMIN_SECRET = 'test-admin-secret-key-for-testing-only';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.DB_HOST = 'localhost';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_NAME = 'test_db';
process.env.DATABASE_USER = 'test';
process.env.DATABASE_PASSWORD = 'test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test timeout
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
  // Add any cleanup logic here
  await new Promise((resolve) => setTimeout(resolve, 100));
});
