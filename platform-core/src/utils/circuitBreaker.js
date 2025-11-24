/**
 * Circuit Breaker Pattern Implementation
 *
 * Enterprise-grade circuit breaker for external API calls with:
 * - Automatic failure detection
 * - Fallback strategies
 * - Health monitoring
 * - Metrics collection
 */

import winston from 'winston';
import EventEmitter from 'events';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

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
          `Circuit breaker is OPEN for ${this.name}`,
          this.name
        );
      }

      // Try half-open
      this.toHalfOpen();
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
        setTimeout(
          () => reject(new CircuitBreakerTimeoutError(`Timeout after ${this.timeout}ms`, this.name)),
          this.timeout
        )
      )
    ]);
  }

  /**
   * Execute fallback
   */
  async executeFallback(fallback) {
    try {
      logger.info('Executing fallback', { circuit: this.name });
      this.emit('fallback', { name: this.name });
      return await fallback();
    } catch (error) {
      logger.error('Fallback failed', {
        circuit: this.name,
        error: error.message
      });
      throw new CircuitBreakerError(
        `Both primary and fallback failed for ${this.name}`,
        this.name
      );
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
        this.toClosed();
      }
    }

    this.emit('success', {
      name: this.name,
      state: this.state,
      metrics: this.getMetrics()
    });
  }

  /**
   * Handle failed execution
   */
  onFailure(error) {
    this.metrics.totalFailures++;

    if (error instanceof CircuitBreakerTimeoutError) {
      this.metrics.totalTimeouts++;
    }

    this.failureCount++;
    this.lastFailureTime = Date.now();

    logger.warn('Circuit breaker failure', {
      circuit: this.name,
      state: this.state,
      failureCount: this.failureCount,
      threshold: this.failureThreshold,
      error: error.message
    });

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed during half-open, go back to open
      this.toOpen();
    } else if (
      this.state === CircuitState.CLOSED &&
      this.requestCount >= this.volumeThreshold &&
      this.failureCount >= this.failureThreshold
    ) {
      // Too many failures, open the circuit
      this.toOpen();
    }

    this.emit('failure', {
      name: this.name,
      state: this.state,
      error: error.message,
      metrics: this.getMetrics()
    });
  }

  /**
   * Transition to CLOSED state
   */
  toClosed() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.nextAttemptTime = null;

    logger.info('Circuit breaker CLOSED', {
      circuit: this.name,
      metrics: this.getMetrics()
    });

    this.emit('stateChange', {
      name: this.name,
      state: CircuitState.CLOSED,
      timestamp: Date.now()
    });
  }

  /**
   * Transition to OPEN state
   */
  toOpen() {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.resetTimeout;

    logger.warn('Circuit breaker OPEN', {
      circuit: this.name,
      nextAttempt: new Date(this.nextAttemptTime).toISOString(),
      metrics: this.getMetrics()
    });

    this.emit('stateChange', {
      name: this.name,
      state: CircuitState.OPEN,
      timestamp: Date.now(),
      nextAttemptTime: this.nextAttemptTime
    });
  }

  /**
   * Transition to HALF_OPEN state
   */
  toHalfOpen() {
    this.state = CircuitState.HALF_OPEN;
    this.successCount = 0;
    this.failureCount = 0;
    this.requestCount = 0;

    logger.info('Circuit breaker HALF_OPEN', {
      circuit: this.name
    });

    this.emit('stateChange', {
      name: this.name,
      state: CircuitState.HALF_OPEN,
      timestamp: Date.now()
    });
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    const now = Date.now();
    const duration = now - this.metrics.lastResetTime;

    return {
      ...this.metrics,
      state: this.state,
      successRate: this.metrics.totalRequests > 0
        ? (this.metrics.totalSuccesses / this.metrics.totalRequests * 100).toFixed(2)
        : 0,
      failureRate: this.metrics.totalRequests > 0
        ? (this.metrics.totalFailures / this.metrics.totalRequests * 100).toFixed(2)
        : 0,
      requestsPerSecond: duration > 0
        ? (this.metrics.totalRequests / (duration / 1000)).toFixed(2)
        : 0,
      uptime: duration
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      totalTimeouts: 0,
      totalRejected: 0,
      lastResetTime: Date.now()
    };

    logger.info('Circuit breaker metrics reset', { circuit: this.name });
  }

  /**
   * Force open circuit (for testing or manual intervention)
   */
  forceOpen() {
    this.toOpen();
    logger.warn('Circuit breaker manually forced OPEN', { circuit: this.name });
  }

  /**
   * Force close circuit
   */
  forceClose() {
    this.toClosed();
    logger.info('Circuit breaker manually forced CLOSED', { circuit: this.name });
  }

  /**
   * Get current state
   */
  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      requestCount: this.requestCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      metrics: this.getMetrics()
    };
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.emit('metrics', {
        name: this.name,
        ...this.getMetrics()
      });
    }, this.monitoringPeriod);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopMonitoring();
    this.removeAllListeners();
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
   * Create or get circuit breaker
   */
  getBreaker(name, options = {}) {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker({ name, ...options });
      this.breakers.set(name, breaker);

      // Forward events
      breaker.on('stateChange', (data) => {
        logger.info('Circuit breaker state changed', data);
      });

      breaker.on('failure', (data) => {
        logger.warn('Circuit breaker failure', data);
      });
    }

    return this.breakers.get(name);
  }

  /**
   * Get all breakers
   */
  getAllBreakers() {
    return Array.from(this.breakers.values());
  }

  /**
   * Get breaker status
   */
  getStatus() {
    const status = {};

    for (const [name, breaker] of this.breakers) {
      status[name] = breaker.getState();
    }

    return status;
  }

  /**
   * Get health status
   */
  getHealth() {
    const breakers = this.getAllBreakers();

    const healthy = breakers.filter(b => b.state === CircuitState.CLOSED).length;
    const degraded = breakers.filter(b => b.state === CircuitState.HALF_OPEN).length;
    const unhealthy = breakers.filter(b => b.state === CircuitState.OPEN).length;

    return {
      total: breakers.length,
      healthy,
      degraded,
      unhealthy,
      status: unhealthy > 0 ? 'degraded' : 'healthy',
      timestamp: Date.now()
    };
  }

  /**
   * Reset all breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.forceClose();
      breaker.resetMetrics();
    }

    logger.info('All circuit breakers reset');
  }

  /**
   * Destroy all breakers
   */
  destroyAll() {
    for (const breaker of this.breakers.values()) {
      breaker.destroy();
    }

    this.breakers.clear();
    logger.info('All circuit breakers destroyed');
  }
}

// Singleton instance
const circuitBreakerManager = new CircuitBreakerManager();

export default circuitBreakerManager;
export {
  CircuitBreaker,
  CircuitBreakerManager,
  CircuitBreakerError,
  CircuitBreakerTimeoutError,
  CircuitState
};
