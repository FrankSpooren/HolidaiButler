/**
 * Circuit Breaker Service
 * ENTERPRISE: Fault tolerance for external API calls
 *
 * Based on Netflix Hystrix pattern
 * https://martinfowler.com/bliki/CircuitBreaker.html
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, fail fast without calling API
 * - HALF_OPEN: Testing if service recovered, allow one request
 *
 * Flow:
 * 1. Start in CLOSED state
 * 2. Track failures (sliding window)
 * 3. If failure rate > threshold: OPEN circuit
 * 4. After timeout: HALF_OPEN (allow test request)
 * 5. If test succeeds: CLOSED, if fails: OPEN again
 *
 * Features:
 * - Per-service circuit breakers (Apify, Google Places, TripAdvisor)
 * - Redis-based state storage for distributed systems
 * - Sliding window failure tracking
 * - Configurable thresholds and timeouts
 * - Fallback handlers
 * - Metrics and monitoring
 */

import redis from '../config/redis.js';
import logger from '../utils/logger.js';
import eventBus from './eventBus.js';

// Circuit breaker states
const STATES = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

// Default configuration
const DEFAULT_CONFIG = {
  failureThreshold: 50, // 50% failure rate
  successThreshold: 2, // 2 successful requests to close from half-open
  timeout: 60000, // 60 seconds before trying half-open
  windowSize: 10, // Track last 10 requests
  volumeThreshold: 5, // Minimum 5 requests before checking failure rate
};

// Redis key prefix
const BREAKER_PREFIX = 'circuit:';
const WINDOW_PREFIX = 'circuit:window:';

/**
 * Circuit Breaker Class
 */
class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...options };

    // Redis keys
    this.stateKey = `${BREAKER_PREFIX}${name}:state`;
    this.failuresKey = `${BREAKER_PREFIX}${name}:failures`;
    this.successesKey = `${BREAKER_PREFIX}${name}:successes`;
    this.windowKey = `${WINDOW_PREFIX}${name}`;
    this.openedAtKey = `${BREAKER_PREFIX}${name}:opened_at`;

    // Fallback handler
    this.fallbackHandler = options.fallback || null;
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute(fn, ...args) {
    const state = await this.getState();

    // If circuit is OPEN, fail fast
    if (state === STATES.OPEN) {
      const canAttempt = await this.canAttemptReset();

      if (canAttempt) {
        // Transition to HALF_OPEN
        await this.setState(STATES.HALF_OPEN);
        logger.info(`Circuit breaker transitioning to HALF_OPEN: ${this.name}`);
      } else {
        // Circuit still open, use fallback or throw
        return this.handleOpenCircuit();
      }
    }

    // Execute the function
    try {
      const result = await fn(...args);

      // Record success
      await this.recordSuccess();

      return result;
    } catch (error) {
      // Record failure
      await this.recordFailure();

      // Check if circuit should open
      const shouldOpen = await this.shouldOpenCircuit();

      if (shouldOpen) {
        await this.openCircuit();
      }

      throw error;
    }
  }

  /**
   * Get current circuit state
   */
  async getState() {
    const state = await redis.get(this.stateKey);
    return state || STATES.CLOSED;
  }

  /**
   * Set circuit state
   */
  async setState(state) {
    await redis.set(this.stateKey, state);

    if (state === STATES.OPEN) {
      await redis.set(this.openedAtKey, Date.now().toString());
    }
  }

  /**
   * Record successful request
   */
  async recordSuccess() {
    const state = await this.getState();

    // Add to sliding window
    await this.addToWindow(true);

    if (state === STATES.HALF_OPEN) {
      const successes = await redis.incr(this.successesKey);

      if (successes >= this.config.successThreshold) {
        await this.closeCircuit();
      }
    }
  }

  /**
   * Record failed request
   */
  async recordFailure() {
    // Add to sliding window
    await this.addToWindow(false);

    // Increment failure counter
    await redis.incr(this.failuresKey);
  }

  /**
   * Add result to sliding window
   */
  async addToWindow(success) {
    const timestamp = Date.now();
    const value = success ? '1' : '0';

    // Add to sorted set (score = timestamp)
    await redis.zadd(this.windowKey, timestamp, `${timestamp}:${value}`);

    // Remove old entries (outside window)
    const cutoff = timestamp - 60000; // 1 minute window
    await redis.zremrangebyscore(this.windowKey, '-inf', cutoff);

    // Keep only last N entries
    const count = await redis.zcard(this.windowKey);
    if (count > this.config.windowSize) {
      const toRemove = count - this.config.windowSize;
      await redis.zpopmin(this.windowKey, toRemove);
    }
  }

  /**
   * Check if circuit should open
   */
  async shouldOpenCircuit() {
    const state = await this.getState();

    // Don't re-open if already open
    if (state === STATES.OPEN) {
      return false;
    }

    // Get window data
    const window = await redis.zrange(this.windowKey, 0, -1);

    // Need minimum volume before checking
    if (window.length < this.config.volumeThreshold) {
      return false;
    }

    // Calculate failure rate
    const failures = window.filter((entry) => entry.endsWith(':0')).length;
    const failureRate = (failures / window.length) * 100;

    logger.debug('Circuit breaker metrics', {
      name: this.name,
      failureRate,
      failures,
      total: window.length,
      threshold: this.config.failureThreshold,
    });

    return failureRate >= this.config.failureThreshold;
  }

  /**
   * Open circuit
   */
  async openCircuit() {
    await this.setState(STATES.OPEN);

    logger.error(`Circuit breaker OPENED: ${this.name}`, {
      name: this.name,
      config: this.config,
    });

    // Publish event
    await eventBus.publish('circuit.opened', {
      name: this.name,
      timestamp: Date.now(),
    });

    // Reset counters
    await redis.del(this.failuresKey);
    await redis.del(this.successesKey);
  }

  /**
   * Close circuit
   */
  async closeCircuit() {
    await this.setState(STATES.CLOSED);

    logger.info(`Circuit breaker CLOSED: ${this.name}`, {
      name: this.name,
    });

    // Publish event
    await eventBus.publish('circuit.closed', {
      name: this.name,
      timestamp: Date.now(),
    });

    // Reset counters
    await redis.del(this.failuresKey);
    await redis.del(this.successesKey);
    await redis.del(this.openedAtKey);
  }

  /**
   * Check if can attempt reset (transition to half-open)
   */
  async canAttemptReset() {
    const openedAt = await redis.get(this.openedAtKey);

    if (!openedAt) {
      return true;
    }

    const elapsed = Date.now() - parseInt(openedAt);
    return elapsed >= this.config.timeout;
  }

  /**
   * Handle open circuit (fail fast)
   */
  async handleOpenCircuit() {
    logger.warn(`Circuit breaker open, using fallback: ${this.name}`);

    if (this.fallbackHandler) {
      return this.fallbackHandler();
    }

    const error = new Error(`Circuit breaker is OPEN for ${this.name}`);
    error.code = 'CIRCUIT_OPEN';
    error.service = this.name;
    throw error;
  }

  /**
   * Get circuit breaker statistics
   */
  async getStats() {
    const state = await this.getState();
    const window = await redis.zrange(this.windowKey, 0, -1);

    const failures = window.filter((entry) => entry.endsWith(':0')).length;
    const successes = window.filter((entry) => entry.endsWith(':1')).length;

    const failureRate = window.length > 0 ? (failures / window.length) * 100 : 0;

    let openedAt = null;
    if (state === STATES.OPEN) {
      const timestamp = await redis.get(this.openedAtKey);
      openedAt = timestamp ? parseInt(timestamp) : null;
    }

    return {
      name: this.name,
      state,
      failureRate: Math.round(failureRate * 100) / 100,
      failures,
      successes,
      total: window.length,
      openedAt,
      config: this.config,
    };
  }

  /**
   * Force reset circuit breaker
   */
  async reset() {
    await redis.del(this.stateKey);
    await redis.del(this.failuresKey);
    await redis.del(this.successesKey);
    await redis.del(this.windowKey);
    await redis.del(this.openedAtKey);

    logger.info(`Circuit breaker reset: ${this.name}`);
  }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers
 */
class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
  }

  /**
   * Get or create circuit breaker
   */
  getBreaker(name, options = {}) {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name);
  }

  /**
   * Execute function with circuit breaker
   */
  async execute(name, fn, options = {}) {
    const breaker = this.getBreaker(name, options);
    return breaker.execute(fn);
  }

  /**
   * Get all circuit breaker stats
   */
  async getAllStats() {
    const stats = [];

    for (const [name, breaker] of this.breakers.entries()) {
      const stat = await breaker.getStats();
      stats.push(stat);
    }

    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  async resetAll() {
    for (const breaker of this.breakers.values()) {
      await breaker.reset();
    }

    logger.info('All circuit breakers reset');
  }

  /**
   * Reset specific circuit breaker
   */
  async reset(name) {
    const breaker = this.breakers.get(name);
    if (breaker) {
      await breaker.reset();
    }
  }
}

// Export singleton
const circuitBreakerManager = new CircuitBreakerManager();
export default circuitBreakerManager;

// Export class for testing
export { CircuitBreaker, CircuitBreakerManager, STATES };
