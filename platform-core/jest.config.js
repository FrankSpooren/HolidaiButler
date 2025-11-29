/**
 * Jest Configuration
 * Enterprise-level testing setup
 */

export default {
  // Use Node environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js',
    '**/*.spec.js'
  ],

  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/index.js', // Entry point
  ],

  coverageDirectory: 'coverage',

  coverageThresholds: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },

  // Module paths
  moduleDirectories: ['node_modules', 'src'],

  // Transform ESM modules
  transform: {},

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Test timeout
  testTimeout: 10000,
};
