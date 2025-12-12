/**
 * Jest Test Setup
 * Configures test environment before running tests
 */

// Load environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.QR_SECRET_KEY = 'test-qr-secret-key';
process.env.PAYMENT_ENGINE_URL = 'http://localhost:3005';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.MAILERLITE_API_KEY = 'test-mailerlite-key';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Suppress console logs during tests (optional)
if (process.env.SUPPRESS_LOGS !== 'false') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error for debugging failed tests
    error: console.error,
  };
}

// Global test timeout
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
  // Allow time for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 500));
});
