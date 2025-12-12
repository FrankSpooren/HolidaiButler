const logger = require('./logger');

/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures when external services (Adyen) are down
 * States: CLOSED -> OPEN -> HALF_OPEN -> CLOSED
 */

const CircuitState = {
  CLOSED: 'CLOSED', // Normal operation
  OPEN: 'OPEN', // Failing, reject all requests
  HALF_OPEN: 'HALF_OPEN', // Testing if service recovered
};

class CircuitBreaker {
  /**
   * @param {Object} options - Configuration options
   * @param {string} options.name - Name of the circuit (for logging)
   * @param {number} options.failureThreshold - Failures before opening (default: 5)
   * @param {number} options.successThreshold - Successes in half-open before closing (default: 2)
   * @param {number} options.timeout - Time in ms before trying half-open (default: 30000)
   * @param {number} options.monitorInterval - Interval to check circuit state (default: 5000)
   */
  constructor(options = {}) {
    this.name = options.name || 'default';
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 30000;
    this.monitorInterval = options.monitorInterval || 5000;

    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;

    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      lastStateChange: new Date(),
      stateChanges: [],
    };

    logger.info(`Circuit breaker "${this.name}" initialized`, {
      failureThreshold: this.failureThreshold,
      successThreshold: this.successThreshold,
      timeout: this.timeout,
    });
  }

  /**
   * Execute a function with circuit breaker protection
   * @param {Function} fn - Async function to execute
   * @returns {Promise<any>} - Result of the function
   */
  async execute(fn) {
    this.stats.totalRequests++;

    if (this.state === CircuitState.OPEN) {
      if (this._shouldAttemptReset()) {
        this._transitionTo(CircuitState.HALF_OPEN);
      } else {
        this.stats.rejectedRequests++;
        throw new CircuitOpenError(
          `Circuit "${this.name}" is OPEN. Retry after ${this._getRetryAfterMs()}ms`,
          this._getRetryAfterMs()
        );
      }
    }

    try {
      const result = await fn();
      this._handleSuccess();
      return result;
    } catch (error) {
      this._handleFailure(error);
      throw error;
    }
  }

  /**
   * Handle successful execution
   * @private
   */
  _handleSuccess() {
    this.stats.successfulRequests++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      logger.debug(`Circuit "${this.name}" half-open success: ${this.successCount}/${this.successThreshold}`);

      if (this.successCount >= this.successThreshold) {
        this._transitionTo(CircuitState.CLOSED);
      }
    } else {
      // Reset failure count on success in CLOSED state
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed execution
   * @private
   */
  _handleFailure(error) {
    this.stats.failedRequests++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    logger.warn(`Circuit "${this.name}" failure: ${this.failureCount}/${this.failureThreshold}`, {
      error: error.message,
      state: this.state,
    });

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open reopens the circuit
      this._transitionTo(CircuitState.OPEN);
    } else if (this.failureCount >= this.failureThreshold) {
      this._transitionTo(CircuitState.OPEN);
    }
  }

  /**
   * Transition to new state
   * @private
   */
  _transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;

    this.stats.lastStateChange = new Date();
    this.stats.stateChanges.push({
      from: oldState,
      to: newState,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 100 state changes
    if (this.stats.stateChanges.length > 100) {
      this.stats.stateChanges = this.stats.stateChanges.slice(-100);
    }

    logger.info(`Circuit "${this.name}" state change: ${oldState} -> ${newState}`);

    switch (newState) {
      case CircuitState.OPEN:
        this.nextAttemptTime = Date.now() + this.timeout;
        this.successCount = 0;
        break;

      case CircuitState.HALF_OPEN:
        this.successCount = 0;
        break;

      case CircuitState.CLOSED:
        this.failureCount = 0;
        this.successCount = 0;
        this.nextAttemptTime = null;
        break;
    }
  }

  /**
   * Check if we should attempt to reset the circuit
   * @private
   */
  _shouldAttemptReset() {
    return Date.now() >= this.nextAttemptTime;
  }

  /**
   * Get ms until retry is allowed
   * @private
   */
  _getRetryAfterMs() {
    if (!this.nextAttemptTime) return 0;
    return Math.max(0, this.nextAttemptTime - Date.now());
  }

  /**
   * Get current circuit state and stats
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      failureThreshold: this.failureThreshold,
      successThreshold: this.successThreshold,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
      nextAttemptTime: this.nextAttemptTime ? new Date(this.nextAttemptTime).toISOString() : null,
      retryAfterMs: this._getRetryAfterMs(),
      stats: this.stats,
    };
  }

  /**
   * Manually reset the circuit (for admin/testing)
   */
  reset() {
    logger.info(`Circuit "${this.name}" manually reset`);
    this._transitionTo(CircuitState.CLOSED);
    this.failureCount = 0;
    this.successCount = 0;
  }

  /**
   * Force the circuit open (for maintenance)
   */
  forceOpen() {
    logger.info(`Circuit "${this.name}" forced open`);
    this._transitionTo(CircuitState.OPEN);
  }
}

/**
 * Custom error for open circuit
 */
class CircuitOpenError extends Error {
  constructor(message, retryAfterMs) {
    super(message);
    this.name = 'CircuitOpenError';
    this.retryAfterMs = retryAfterMs;
    this.isCircuitOpen = true;
  }
}

// ========== RETRY WITH BACKOFF ==========

/**
 * Retry configuration
 */
const RetryConfig = {
  DEFAULT_ATTEMPTS: 3,
  DEFAULT_DELAY_MS: 1000,
  DEFAULT_MAX_DELAY_MS: 30000,
  DEFAULT_BACKOFF_FACTOR: 2,
};

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise<any>} - Result of the function
 */
const retryWithBackoff = async (fn, options = {}) => {
  const {
    attempts = RetryConfig.DEFAULT_ATTEMPTS,
    delayMs = RetryConfig.DEFAULT_DELAY_MS,
    maxDelayMs = RetryConfig.DEFAULT_MAX_DELAY_MS,
    backoffFactor = RetryConfig.DEFAULT_BACKOFF_FACTOR,
    shouldRetry = (error) => true, // Function to determine if error is retryable
    onRetry = null, // Callback on retry
  } = options;

  let lastError;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if circuit is open
      if (error.isCircuitOpen) {
        throw error;
      }

      // Check if error is retryable
      if (!shouldRetry(error)) {
        throw error;
      }

      // Don't wait after last attempt
      if (attempt === attempts) {
        break;
      }

      logger.warn(`Retry attempt ${attempt}/${attempts} failed`, {
        error: error.message,
        nextDelayMs: currentDelay,
      });

      if (onRetry) {
        onRetry(error, attempt);
      }

      // Wait before retry
      await sleep(currentDelay);

      // Increase delay with jitter
      const jitter = Math.random() * 0.3 * currentDelay;
      currentDelay = Math.min(currentDelay * backoffFactor + jitter, maxDelayMs);
    }
  }

  logger.error(`All ${attempts} retry attempts failed`);
  throw lastError;
};

/**
 * Sleep utility
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Determine if an error is retryable
 * @param {Error} error - The error to check
 * @returns {boolean} - Whether to retry
 */
const isRetryableError = (error) => {
  // Don't retry validation or authentication errors
  if (error.statusCode === 400 || error.statusCode === 401 || error.statusCode === 403) {
    return false;
  }

  // Retry network and server errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }

  // Retry 5xx errors
  if (error.statusCode >= 500 && error.statusCode < 600) {
    return true;
  }

  // Retry rate limit errors (with backoff)
  if (error.statusCode === 429) {
    return true;
  }

  return false;
};

// ========== CIRCUIT BREAKER REGISTRY ==========

const circuitBreakers = new Map();

/**
 * Get or create a circuit breaker
 * @param {string} name - Circuit breaker name
 * @param {Object} options - Circuit breaker options
 * @returns {CircuitBreaker} - Circuit breaker instance
 */
const getCircuitBreaker = (name, options = {}) => {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker({ name, ...options }));
  }
  return circuitBreakers.get(name);
};

/**
 * Get all circuit breaker statuses
 * @returns {Object} - Map of circuit names to statuses
 */
const getAllCircuitStatuses = () => {
  const statuses = {};
  for (const [name, breaker] of circuitBreakers) {
    statuses[name] = breaker.getStatus();
  }
  return statuses;
};

module.exports = {
  CircuitBreaker,
  CircuitState,
  CircuitOpenError,
  retryWithBackoff,
  isRetryableError,
  getCircuitBreaker,
  getAllCircuitStatuses,
  RetryConfig,
};
