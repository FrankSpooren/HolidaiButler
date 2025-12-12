/**
 * Circuit Breaker Pattern for Ticketing Module
 * Enterprise-grade fault tolerance for external API calls
 */

import logger from './logger.js';
import EventEmitter from 'events';

const CircuitState = {
  CLOSED: 'CLOSED',     // Normal operation
  OPEN: 'OPEN',         // Failing, reject requests
  HALF_OPEN: 'HALF_OPEN' // Testing if service recovered
};

class CircuitBreaker extends EventEmitter {
  constructor(options = {}) {
    super();

    this.name = options.name || 'default';
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 1 minute
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.monitoringPeriod = options.monitoringPeriod || 60000; // 1 minute
    this.volumeThreshold = options.volumeThreshold || 10; // Min requests before opening

    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;

    // Metrics
    this.metrics = {
      totalRequests: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      totalTimeouts: 0,
      totalRejected: 0,
      lastResetTime: Date.now()
    };

    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute(fn, fallback = null) {
    this.requestCount++;
    this.metrics.totalRequests++;

    // Check circuit state
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        // Circuit still open, reject request
        this.metrics.totalRejected++;
        this.emit('reject', { name: this.name, state: this.state });

        logger.debug('Circuit breaker OPEN, request rejected', {
          circuit: this.name,
          nextAttempt: new Date(this.nextAttemptTime).toISOString()
        });

        if (fallback) {
          return await this.executeFallback(fallback);
        }

        throw new CircuitBreakerError(
          `Circuit breaker ${this.name} is OPEN. Service temporarily unavailable.`,
          this.name
        );
      }

      // Try to transition to HALF_OPEN
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
      this.emit('half_open', { name: this.name });
      logger.info('Circuit breaker transitioning to HALF_OPEN', { circuit: this.name });
    }

    // Execute the function
    try {
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);

      if (fallback) {
        return await this.executeFallback(fallback);
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
          this.metrics.totalTimeouts++;
          reject(new CircuitBreakerTimeoutError(
            `Circuit breaker ${this.name} timeout after ${this.timeout}ms`,
            this.name
          ));
        }, this.timeout)
      )
    ]);
  }

  /**
   * Execute fallback function
   */
  async executeFallback(fallback) {
    try {
      logger.debug('Executing fallback', { circuit: this.name });
      return await fallback();
    } catch (error) {
      logger.error('Fallback execution failed', {
        circuit: this.name,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  onSuccess() {
    this.metrics.totalSuccesses++;
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.requestCount = 0;
        this.emit('close', { name: this.name });
        logger.info('Circuit breaker CLOSED after recovery', { circuit: this.name });
      }
    }
  }

  /**
   * Handle failed execution
   */
  onFailure(error) {
    this.metrics.totalFailures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    logger.warn('Circuit breaker recorded failure', {
      circuit: this.name,
      failureCount: this.failureCount,
      threshold: this.failureThreshold,
      error: error.message
    });

    if (this.state === CircuitState.HALF_OPEN) {
      // Immediately open on failure in HALF_OPEN state
      this.open();
    } else if (
      this.state === CircuitState.CLOSED &&
      this.failureCount >= this.failureThreshold &&
      this.requestCount >= this.volumeThreshold
    ) {
      // Open circuit if failure threshold exceeded with sufficient volume
      this.open();
    }

    this.emit('failure', {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      error: error.message
    });
  }

  /**
   * Open the circuit
   */
  open() {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.resetTimeout;
    this.emit('open', {
      name: this.name,
      nextAttempt: new Date(this.nextAttemptTime).toISOString()
    });

    logger.error('Circuit breaker OPENED', {
      circuit: this.name,
      failureCount: this.failureCount,
      nextAttempt: new Date(this.nextAttemptTime).toISOString()
    });
  }

  /**
   * Manually reset circuit breaker
   */
  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.emit('reset', { name: this.name });

    logger.info('Circuit breaker manually reset', { circuit: this.name });
  }

  /**
   * Start monitoring with periodic resets
   */
  startMonitoring() {
    setInterval(() => {
      if (this.state === CircuitState.CLOSED) {
        // Reset counters periodically in closed state
        this.requestCount = 0;
        this.failureCount = 0;
      }

      // Reset metrics
      this.metrics = {
        ...this.metrics,
        totalRequests: 0,
        totalSuccesses: 0,
        totalFailures: 0,
        totalTimeouts: 0,
        totalRejected: 0,
        lastResetTime: Date.now()
      };
    }, this.monitoringPeriod);
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      requestCount: this.requestCount,
      metrics: this.metrics,
      lastFailureTime: this.lastFailureTime
        ? new Date(this.lastFailureTime).toISOString()
        : null,
      nextAttemptTime: this.nextAttemptTime
        ? new Date(this.nextAttemptTime).toISOString()
        : null
    };
  }
}

/**
 * Circuit Breaker Error
 */
class CircuitBreakerError extends Error {
  constructor(message, circuitName) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.circuitName = circuitName;
  }
}

/**
 * Circuit Breaker Timeout Error
 */
class CircuitBreakerTimeoutError extends Error {
  constructor(message, circuitName) {
    super(message);
    this.name = 'CircuitBreakerTimeoutError';
    this.circuitName = circuitName;
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
   * Get or create a circuit breaker
   */
  getBreaker(name, options = {}) {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker({ name, ...options }));
    }
    return this.breakers.get(name);
  }

  /**
   * Get all breaker statuses
   */
  getAllStatuses() {
    const statuses = {};
    for (const [name, breaker] of this.breakers.entries()) {
      statuses[name] = breaker.getStatus();
    }
    return statuses;
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
   * Reset specific breaker
   */
  reset(name) {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.reset();
    }
  }
}

// Export singleton instance
const circuitBreakerManager = new CircuitBreakerManager();

export default circuitBreakerManager;
export {
  CircuitBreaker,
  CircuitBreakerError,
  CircuitBreakerTimeoutError,
  CircuitBreakerManager,
  CircuitState
};
