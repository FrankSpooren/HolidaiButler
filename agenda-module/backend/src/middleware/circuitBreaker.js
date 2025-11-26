const logger = require('../config/logger');

/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures from external service dependencies
 *
 * States:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Too many failures, reject requests immediately
 * - HALF_OPEN: Testing if service recovered
 */

const CircuitState = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'default';
    this.failureThreshold = options.failureThreshold || 5; // Failures before opening
    this.successThreshold = options.successThreshold || 2; // Successes to close from half-open
    this.timeout = options.timeout || 60000; // Time before attempting half-open (ms)
    this.monitoringPeriod = options.monitoringPeriod || 10000; // Rolling window for failures (ms)

    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.successes = 0;
    this.nextAttempt = Date.now();
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute(fn, fallback = null) {
    this.stats.totalRequests++;

    // Check current state
    if (this.state === CircuitState.OPEN) {
      // Check if timeout period has passed
      if (Date.now() >= this.nextAttempt) {
        logger.info(`Circuit breaker ${this.name}: Attempting recovery (HALF_OPEN)`);
        this.state = CircuitState.HALF_OPEN;
        this.successes = 0;
      } else {
        // Circuit is open, reject immediately
        this.stats.rejectedRequests++;
        logger.warn(`Circuit breaker ${this.name}: Request rejected (OPEN)`);

        if (fallback) {
          return await fallback();
        }

        throw new Error(`Circuit breaker ${this.name} is OPEN - service unavailable`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();

      // If circuit is now open and fallback exists, use fallback
      if (this.state === CircuitState.OPEN && fallback) {
        logger.info(`Circuit breaker ${this.name}: Using fallback`);
        return await fallback();
      }

      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  onSuccess() {
    this.stats.successfulRequests++;
    this.removeOldFailures();

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      logger.debug(`Circuit breaker ${this.name}: Success in HALF_OPEN (${this.successes}/${this.successThreshold})`);

      if (this.successes >= this.successThreshold) {
        this.close();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failures on success
      this.failures = [];
    }
  }

  /**
   * Handle failed execution
   */
  onFailure() {
    this.stats.failedRequests++;
    this.failures.push(Date.now());
    this.removeOldFailures();

    const recentFailures = this.failures.length;
    logger.warn(`Circuit breaker ${this.name}: Failure recorded (${recentFailures}/${this.failureThreshold})`);

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in HALF_OPEN reopens circuit
      this.open();
    } else if (this.state === CircuitState.CLOSED && recentFailures >= this.failureThreshold) {
      this.open();
    }
  }

  /**
   * Open the circuit
   */
  open() {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.timeout;
    this.successes = 0;

    logger.error(`Circuit breaker ${this.name}: OPENED due to failures`, {
      failureCount: this.failures.length,
      nextAttempt: new Date(this.nextAttempt).toISOString(),
    });

    // Emit metric
    logger.logMetric('circuit_breaker_opened', 1, { circuit: this.name });
  }

  /**
   * Close the circuit
   */
  close() {
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.successes = 0;

    logger.info(`Circuit breaker ${this.name}: CLOSED - service recovered`);

    // Emit metric
    logger.logMetric('circuit_breaker_closed', 1, { circuit: this.name });
  }

  /**
   * Remove old failures outside monitoring period
   */
  removeOldFailures() {
    const cutoff = Date.now() - this.monitoringPeriod;
    this.failures = this.failures.filter(timestamp => timestamp > cutoff);
  }

  /**
   * Get current state
   */
  getState() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures.length,
      successes: this.successes,
      stats: this.stats,
      nextAttempt: this.state === CircuitState.OPEN
        ? new Date(this.nextAttempt).toISOString()
        : null,
    };
  }

  /**
   * Force open the circuit (for testing/maintenance)
   */
  forceOpen() {
    this.open();
  }

  /**
   * Force close the circuit (for testing/maintenance)
   */
  forceClose() {
    this.close();
  }

  /**
   * Reset all state and statistics
   */
  reset() {
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.successes = 0;
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
    };
    logger.info(`Circuit breaker ${this.name}: Reset`);
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
      this.breakers.set(name, new CircuitBreaker({ ...options, name }));
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
   * Get all circuit breaker states
   */
  getAllStates() {
    const states = {};
    for (const [name, breaker] of this.breakers.entries()) {
      states[name] = breaker.getState();
    }
    return states;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    logger.info('All circuit breakers reset');
  }

  /**
   * Express middleware for circuit breaker dashboard
   */
  dashboardMiddleware() {
    return (req, res) => {
      const states = this.getAllStates();
      res.json({
        timestamp: new Date().toISOString(),
        circuitBreakers: states,
      });
    };
  }
}

// Create singleton instance
const circuitBreakerManager = new CircuitBreakerManager();

/**
 * Pre-configured circuit breakers for common services
 */

// Translation service circuit breaker
const translationBreaker = circuitBreakerManager.getBreaker('translation-service', {
  failureThreshold: 3,
  timeout: 30000,
  monitoringPeriod: 60000,
});

// External scraper circuit breaker
const scraperBreaker = circuitBreakerManager.getBreaker('event-scraper', {
  failureThreshold: 5,
  timeout: 120000, // 2 minutes
  monitoringPeriod: 300000, // 5 minutes
});

// Database circuit breaker
const databaseBreaker = circuitBreakerManager.getBreaker('database', {
  failureThreshold: 10,
  timeout: 10000,
  monitoringPeriod: 30000,
});

// Cache circuit breaker
const cacheBreaker = circuitBreakerManager.getBreaker('cache', {
  failureThreshold: 3,
  timeout: 5000,
  monitoringPeriod: 10000,
});

module.exports = {
  CircuitBreaker,
  circuitBreakerManager,
  translationBreaker,
  scraperBreaker,
  databaseBreaker,
  cacheBreaker,
};
