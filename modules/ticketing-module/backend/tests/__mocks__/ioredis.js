/**
 * Mock Redis Client for Testing
 */

const mockRedisData = new Map();

class MockRedis {
  constructor() {
    this.data = mockRedisData;
  }

  async get(key) {
    return this.data.get(key) || null;
  }

  async set(key, value) {
    this.data.set(key, value);
    return 'OK';
  }

  async setex(key, ttl, value) {
    this.data.set(key, value);
    // Auto-expire after ttl (simplified mock)
    setTimeout(() => this.data.delete(key), ttl * 1000);
    return 'OK';
  }

  async del(key) {
    this.data.delete(key);
    return 1;
  }

  async keys(pattern) {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(this.data.keys()).filter(k => regex.test(k));
  }

  async flushdb() {
    this.data.clear();
    return 'OK';
  }

  async quit() {
    return 'OK';
  }

  async ping() {
    return 'PONG';
  }

  // Clear all mock data (useful between tests)
  static clearMockData() {
    mockRedisData.clear();
  }
}

module.exports = MockRedis;
