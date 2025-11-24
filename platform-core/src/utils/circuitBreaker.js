/**
 * Circuit Breaker Pattern
 * Enterprise-level fault tolerance for external API calls
 */

import logger from './logger.js';

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 10000;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute

    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      timeoutCalls: 0,
      rejectedCalls: 0,
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute(fn, fallback = null) {
    this.stats.totalCalls++;

    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        this.stats.rejectedCalls++;
        logger.warn(`Circuit breaker ${this.name} is OPEN, rejecting call`);

        if (fallback) {
          return await fallback();
        }

        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }

      // Try to recover
      this.state = 'HALF_OPEN';
      this.successCount = 0;
      logger.info(`Circuit breaker ${this.name} entering HALF_OPEN state`);
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn);

      // Success
      this.onSuccess();
      return result;
    } catch (error) {
      // Failure
      this.onFailure(error);

      if (fallback) {
        logger.info(`Circuit breaker ${this.name} using fallback`);
        return await fallback();
      }

      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  async executeWithTimeout(fn) {
    return Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => {
          this.stats.timeoutCalls++;
          reject(new Error('Circuit breaker timeout'));
        }, this.timeout)
      ),
    ]);
  }

  /**
   * Handle successful call
   */
  onSuccess() {
    this.stats.successfulCalls++;
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;

      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        logger.info(`Circuit breaker ${this.name} recovered to CLOSED state`);
      }
    }
  }

  /**
   * Handle failed call
   */
  onFailure(error) {
    this.stats.failedCalls++;
    this.failureCount++;

    logger.error(`Circuit breaker ${this.name} failure:`, {
      error: error.message,
      failureCount: this.failureCount,
      state: this.state,
    });

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;

      logger.error(`Circuit breaker ${this.name} opened until ${new Date(this.nextAttempt).toISOString()}`);
    }
  }

  /**
   * Get circuit breaker statistics
   */
  getStats() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt).toISOString() : null,
      stats: this.stats,
      successRate: this.stats.totalCalls > 0
        ? (this.stats.successfulCalls / this.stats.totalCalls * 100).toFixed(2) + '%'
        : '0%',
    };
  }

  /**
   * Reset circuit breaker
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    logger.info(`Circuit breaker ${this.name} manually reset`);
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
   * Execute with circuit breaker
   */
  async execute(name, fn, fallback = null, options = {}) {
    const breaker = this.getBreaker(name, options);
    return await breaker.execute(fn, fallback);
  }

  /**
   * Get all breakers statistics
   */
  getAllStats() {
    const stats = {};
    for (const [name, breaker] of this.breakers.entries()) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  /**
   * Reset all breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Health check
   */
  healthCheck() {
    const openBreakers = [];
    for (const [name, breaker] of this.breakers.entries()) {
      if (breaker.state === 'OPEN') {
        openBreakers.push(name);
      }
    }

    return {
      healthy: openBreakers.length === 0,
      openBreakers,
      totalBreakers: this.breakers.size,
    };
  }
}

// Export singleton
const circuitBreakerManager = new CircuitBreakerManager();
export default circuitBreakerManager;
