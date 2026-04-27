/**
 * Circuit Breaker Service
 * In-memory fault tolerance for external API calls
 *
 * Based on Netflix Hystrix pattern
 * States: CLOSED → OPEN → HALF_OPEN → CLOSED
 *
 * @module services/circuitBreaker
 */

import logger from '../utils/logger.js';

const STATES = {
  CLOSED: 'closed',
  OPEN: 'open',
  HALF_OPEN: 'half_open',
};

const DEFAULT_CONFIG = {
  failureThreshold: 50,    // failure rate % to open circuit
  volumeThreshold: 5,      // minimum calls before checking rate
  timeout: 30000,          // ms before attempting reset (OPEN → HALF_OPEN)
  windowSize: 100,         // max entries in sliding window
  resetTimeout: 60000,     // ms before auto-reset from OPEN
  monitorInterval: 30000,  // ms between monitor checks
};

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...options };
    this.fallbackHandler = options.fallback || null;

    // In-memory state
    this._state = STATES.CLOSED;
    this._openedAt = null;
    this._failureCount = 0;
    this._successCount = 0;
    this._lastFailure = null;
    this._lastSuccess = null;
    this._window = []; // sliding window: [{timestamp, success}]
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute(fn, ...args) {
    const state = this._state;

    if (state === STATES.OPEN) {
      if (this.canAttemptReset()) {
        this._state = STATES.HALF_OPEN;
      } else {
        return this.handleOpenCircuit();
      }
    }

    try {
      const result = await fn(...args);
      this.recordSuccess();
      if (this._state === STATES.HALF_OPEN) {
        this.closeCircuit();
      }
      return result;
    } catch (error) {
      this.recordFailure();
      if (this.shouldOpenCircuit()) {
        this.openCircuit();
      }
      throw error;
    }
  }

  recordSuccess() {
    this._successCount++;
    this._lastSuccess = Date.now();
    this._window.push({ timestamp: Date.now(), success: true });
    this.trimWindow();
  }

  recordFailure() {
    this._failureCount++;
    this._lastFailure = Date.now();
    this._window.push({ timestamp: Date.now(), success: false });
    this.trimWindow();
  }

  trimWindow() {
    const cutoff = Date.now() - 60000; // 1 minute window
    this._window = this._window.filter(e => e.timestamp > cutoff);
    if (this._window.length > this.config.windowSize) {
      this._window = this._window.slice(-this.config.windowSize);
    }
  }

  shouldOpenCircuit() {
    if (this._state === STATES.OPEN) return false;
    if (this._window.length < this.config.volumeThreshold) return false;
    const failures = this._window.filter(e => !e.success).length;
    const failureRate = (failures / this._window.length) * 100;
    return failureRate >= this.config.failureThreshold;
  }

  openCircuit() {
    this._state = STATES.OPEN;
    this._openedAt = Date.now();
    logger.error(`Circuit breaker OPENED: ${this.name}`);
  }

  closeCircuit() {
    this._state = STATES.CLOSED;
    this._openedAt = null;
    this._window = [];
    logger.info(`Circuit breaker CLOSED: ${this.name}`);
  }

  canAttemptReset() {
    if (!this._openedAt) return true;
    return (Date.now() - this._openedAt) >= this.config.resetTimeout;
  }

  handleOpenCircuit() {
    if (this.fallbackHandler) return this.fallbackHandler();
    const error = new Error(`Circuit breaker is OPEN for ${this.name}`);
    error.code = 'CIRCUIT_OPEN';
    error.service = this.name;
    throw error;
  }

  async reset() {
    this._state = STATES.CLOSED;
    this._failureCount = 0;
    this._successCount = 0;
    this._openedAt = null;
    this._window = [];
    logger.info(`Circuit breaker ${this.name}: RESET`);
  }

  async getStats() {
    const failures = this._window.filter(e => !e.success).length;
    const successes = this._window.filter(e => e.success).length;
    const total = this._window.length;
    const failureRate = total > 0 ? Math.round((failures / total) * 10000) / 100 : 0;

    return {
      name: this.name,
      state: this._state,
      failureRate,
      failures: this._failureCount,
      successes: this._successCount,
      windowSize: total,
      openedAt: this._openedAt,
      lastFailure: this._lastFailure,
      lastSuccess: this._lastSuccess,
    };
  }
}

class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
  }

  getBreaker(name, options = {}) {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name);
  }

  async execute(name, fn, options = {}) {
    const breaker = this.getBreaker(name, options);
    return breaker.execute(fn);
  }

  async getAllStats() {
    const stats = {};
    for (const [name, breaker] of this.breakers.entries()) {
      stats[name] = await breaker.getStats();
    }
    return stats;
  }

  async resetAll() {
    for (const breaker of this.breakers.values()) {
      await breaker.reset();
    }
    logger.info('All circuit breakers reset');
  }

  async reset(name) {
    const breaker = this.breakers.get(name);
    if (breaker) await breaker.reset();
  }
}

const circuitBreakerManager = new CircuitBreakerManager();
export default circuitBreakerManager;
export { CircuitBreaker, CircuitBreakerManager, STATES };
