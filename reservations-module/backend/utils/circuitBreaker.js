/**
 * Circuit Breaker Pattern Implementation
 * Protects against cascading failures when calling external services
 */

const logger = require('./logger');

const STATES = {
  CLOSED: 'CLOSED',     // Normal operation
  OPEN: 'OPEN',         // Failing, reject all calls
  HALF_OPEN: 'HALF_OPEN', // Testing if service recovered
};

class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'default';
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // Request timeout
    this.resetTimeout = options.resetTimeout || 30000; // Time before trying HALF_OPEN
    this.volumeThreshold = options.volumeThreshold || 10; // Min requests before opening

    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.totalCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute(fn, fallback = null) {
    // Check if circuit is OPEN
    if (this.state === STATES.OPEN) {
      if (Date.now() >= this.nextAttemptTime) {
        // Try HALF_OPEN
        this.state = STATES.HALF_OPEN;
        logger.info(`Circuit breaker [${this.name}] entering HALF_OPEN state`);
      } else {
        // Still OPEN, execute fallback or reject
        if (fallback) {
          logger.warn(`Circuit breaker [${this.name}] OPEN, using fallback`);
          return await fallback();
        }
        throw new CircuitBreakerError(`Circuit breaker [${this.name}] is OPEN`);
      }
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);

      if (fallback) {
        logger.warn(`Circuit breaker [${this.name}] failed, using fallback: ${error.message}`);
        return await fallback();
      }

      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  async executeWithTimeout(fn) {
    return new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Circuit breaker [${this.name}] timeout after ${this.timeout}ms`));
      }, this.timeout);

      try {
        const result = await fn();
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * Handle successful execution
   */
  onSuccess() {
    this.totalCount++;

    if (this.state === STATES.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.successThreshold) {
        this.reset();
        logger.info(`Circuit breaker [${this.name}] CLOSED after ${this.successCount} successful calls`);
      }
    } else {
      // Reset failure count on success in CLOSED state
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed execution
   */
  onFailure(error) {
    this.totalCount++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    logger.warn(`Circuit breaker [${this.name}] failure ${this.failureCount}/${this.failureThreshold}: ${error.message}`);

    if (this.state === STATES.HALF_OPEN) {
      // Any failure in HALF_OPEN goes back to OPEN
      this.trip();
    } else if (this.state === STATES.CLOSED) {
      // Check if we should open
      if (this.totalCount >= this.volumeThreshold && this.failureCount >= this.failureThreshold) {
        this.trip();
      }
    }
  }

  /**
   * Trip the circuit breaker (move to OPEN)
   */
  trip() {
    this.state = STATES.OPEN;
    this.nextAttemptTime = Date.now() + this.resetTimeout;
    this.successCount = 0;

    logger.error(`Circuit breaker [${this.name}] OPENED - next attempt at ${new Date(this.nextAttemptTime).toISOString()}`);
  }

  /**
   * Reset the circuit breaker (move to CLOSED)
   */
  reset() {
    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.totalCount = 0;
    this.nextAttemptTime = null;
  }

  /**
   * Force reset (for admin use)
   */
  forceReset() {
    logger.warn(`Circuit breaker [${this.name}] force reset`);
    this.reset();
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
      totalCount: this.totalCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      config: {
        failureThreshold: this.failureThreshold,
        successThreshold: this.successThreshold,
        timeout: this.timeout,
        resetTimeout: this.resetTimeout,
        volumeThreshold: this.volumeThreshold,
      },
    };
  }
}

/**
 * Custom error for circuit breaker
 */
class CircuitBreakerError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Circuit breaker registry for managing multiple breakers
 */
const circuitBreakers = new Map();

const getCircuitBreaker = (name, options = {}) => {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker({ name, ...options }));
  }
  return circuitBreakers.get(name);
};

const getAllCircuitBreakers = () => {
  const status = {};
  circuitBreakers.forEach((breaker, name) => {
    status[name] = breaker.getStatus();
  });
  return status;
};

const resetAllCircuitBreakers = () => {
  circuitBreakers.forEach((breaker) => {
    breaker.forceReset();
  });
};

module.exports = {
  CircuitBreaker,
  CircuitBreakerError,
  getCircuitBreaker,
  getAllCircuitBreakers,
  resetAllCircuitBreakers,
  STATES,
};
