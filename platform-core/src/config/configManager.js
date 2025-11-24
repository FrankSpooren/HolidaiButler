/**
 * Configuration Management with Validation
 *
 * Enterprise-grade configuration management with:
 * - Environment variable validation
 * - Type checking
 * - Default values
 * - Secrets masking in logs
 */

import Joi from 'joi';
import winston from 'winston';

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

// Configuration schema with validation
const configSchema = Joi.object({
  // Application
  nodeEnv: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),
  port: Joi.number()
    .port()
    .default(3000),
  logLevel: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'trace')
    .default('info'),

  // Database
  dbHost: Joi.string().required(),
  dbPort: Joi.number().port().default(3306),
  dbName: Joi.string().required(),
  dbUser: Joi.string().required(),
  dbPassword: Joi.string().required(),
  dbPoolMin: Joi.number().min(1).default(5),
  dbPoolMax: Joi.number().min(5).default(20),

  // Redis
  redisUrl: Joi.string().uri().required(),
  redisPassword: Joi.string().allow('').optional(),
  redisTtl: Joi.number().default(3600), // 1 hour

  // Flickr API
  flickrApiKey: Joi.string().required(),
  flickrApiSecret: Joi.string().required(),
  flickrRateLimit: Joi.number().default(3600),

  // Unsplash API
  unsplashAccessKey: Joi.string().required(),
  unsplashSecretKey: Joi.string().required(),
  unsplashRateLimit: Joi.number().default(50),

  // Image Discovery
  enableImageCron: Joi.boolean().default(false),
  imageMinQualityScore: Joi.number().min(0).max(10).default(6.0),
  imageAutoApproveThreshold: Joi.number().min(0).max(10).default(8.0),
  imageMaxGeoDistance: Joi.number().default(500), // meters
  imageMinResolutionWidth: Joi.number().default(1280),
  imageMinResolutionHeight: Joi.number().default(720),

  // Queue Processing
  queueBatchSize: Joi.number().min(1).max(100).default(10),
  queueMaxRetries: Joi.number().min(1).max(10).default(3),
  queueProcessingTimeout: Joi.number().default(300000), // 5 minutes

  // API Security
  jwtSecret: Joi.string().min(32).required(),
  jwtExpiresIn: Joi.string().default('24h'),
  apiRateLimitWindow: Joi.number().default(900000), // 15 minutes
  apiRateLimitMax: Joi.number().default(100),

  // Monitoring
  sentryDsn: Joi.string().uri().optional(),
  enableMetrics: Joi.boolean().default(true),

  // Feature Flags
  enableCircuitBreaker: Joi.boolean().default(true),
  circuitBreakerThreshold: Joi.number().default(5),
  circuitBreakerTimeout: Joi.number().default(60000), // 1 minute

}).required();

class ConfigurationManager {
  constructor() {
    this.config = null;
    this.validated = false;
  }

  /**
   * Load and validate configuration
   */
  load() {
    const rawConfig = {
      // Application
      nodeEnv: process.env.NODE_ENV,
      port: parseInt(process.env.PORT || '3000'),
      logLevel: process.env.LOG_LEVEL,

      // Database
      dbHost: process.env.DB_HOST,
      dbPort: parseInt(process.env.DB_PORT || '3306'),
      dbName: process.env.DB_NAME,
      dbUser: process.env.DB_USER,
      dbPassword: process.env.DB_PASSWORD,
      dbPoolMin: parseInt(process.env.DB_POOL_MIN || '5'),
      dbPoolMax: parseInt(process.env.DB_POOL_MAX || '20'),

      // Redis
      redisUrl: process.env.REDIS_URL,
      redisPassword: process.env.REDIS_PASSWORD,
      redisTtl: parseInt(process.env.REDIS_TTL || '3600'),

      // Flickr
      flickrApiKey: process.env.FLICKR_API_KEY,
      flickrApiSecret: process.env.FLICKR_API_SECRET,
      flickrRateLimit: parseInt(process.env.FLICKR_RATE_LIMIT || '3600'),

      // Unsplash
      unsplashAccessKey: process.env.UNSPLASH_ACCESS_KEY,
      unsplashSecretKey: process.env.UNSPLASH_SECRET_KEY,
      unsplashRateLimit: parseInt(process.env.UNSPLASH_RATE_LIMIT || '50'),

      // Image Discovery
      enableImageCron: process.env.ENABLE_IMAGE_CRON === 'true',
      imageMinQualityScore: parseFloat(process.env.IMAGE_MIN_QUALITY_SCORE || '6.0'),
      imageAutoApproveThreshold: parseFloat(process.env.IMAGE_AUTO_APPROVE_THRESHOLD || '8.0'),
      imageMaxGeoDistance: parseInt(process.env.IMAGE_MAX_GEO_DISTANCE || '500'),
      imageMinResolutionWidth: parseInt(process.env.IMAGE_MIN_RESOLUTION_WIDTH || '1280'),
      imageMinResolutionHeight: parseInt(process.env.IMAGE_MIN_RESOLUTION_HEIGHT || '720'),

      // Queue
      queueBatchSize: parseInt(process.env.QUEUE_BATCH_SIZE || '10'),
      queueMaxRetries: parseInt(process.env.QUEUE_MAX_RETRIES || '3'),
      queueProcessingTimeout: parseInt(process.env.QUEUE_PROCESSING_TIMEOUT || '300000'),

      // Security
      jwtSecret: process.env.JWT_SECRET,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
      apiRateLimitWindow: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '900000'),
      apiRateLimitMax: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS || '100'),

      // Monitoring
      sentryDsn: process.env.SENTRY_DSN,
      enableMetrics: process.env.ENABLE_METRICS !== 'false',

      // Feature Flags
      enableCircuitBreaker: process.env.ENABLE_CIRCUIT_BREAKER !== 'false',
      circuitBreakerThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5'),
      circuitBreakerTimeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000'),
    };

    // Validate configuration
    const { error, value } = configSchema.validate(rawConfig, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(d => `${d.path.join('.')}: ${d.message}`).join(', ');
      logger.error('Configuration validation failed', { errors: errorDetails });
      throw new Error(`Configuration validation failed: ${errorDetails}`);
    }

    this.config = value;
    this.validated = true;

    // Log configuration (mask secrets)
    logger.info('Configuration loaded successfully', {
      nodeEnv: this.config.nodeEnv,
      dbHost: this.config.dbHost,
      enableImageCron: this.config.enableImageCron,
      enableCircuitBreaker: this.config.enableCircuitBreaker
    });

    return this.config;
  }

  /**
   * Get configuration value
   */
  get(key) {
    if (!this.validated) {
      throw new Error('Configuration not loaded. Call load() first.');
    }

    if (!(key in this.config)) {
      throw new Error(`Configuration key '${key}' not found`);
    }

    return this.config[key];
  }

  /**
   * Get all configuration (masked secrets)
   */
  getAll(includeSensitive = false) {
    if (!this.validated) {
      throw new Error('Configuration not loaded. Call load() first.');
    }

    if (includeSensitive) {
      return { ...this.config };
    }

    // Mask sensitive fields
    const masked = { ...this.config };
    const sensitiveKeys = [
      'dbPassword',
      'flickrApiSecret',
      'unsplashSecretKey',
      'jwtSecret',
      'redisPassword'
    ];

    sensitiveKeys.forEach(key => {
      if (masked[key]) {
        masked[key] = '***MASKED***';
      }
    });

    return masked;
  }

  /**
   * Check if running in production
   */
  isProduction() {
    return this.get('nodeEnv') === 'production';
  }

  /**
   * Check if running in development
   */
  isDevelopment() {
    return this.get('nodeEnv') === 'development';
  }

  /**
   * Check if feature flag is enabled
   */
  isFeatureEnabled(feature) {
    const featureMap = {
      imageCron: 'enableImageCron',
      circuitBreaker: 'enableCircuitBreaker',
      metrics: 'enableMetrics'
    };

    const configKey = featureMap[feature];
    if (!configKey) {
      throw new Error(`Unknown feature flag: ${feature}`);
    }

    return this.get(configKey);
  }

  /**
   * Validate database connection settings
   */
  async validateDatabase() {
    // Import here to avoid circular dependency
    const { mysqlSequelize } = await import('../config/database.js');

    try {
      await mysqlSequelize.authenticate();
      logger.info('Database connection validated successfully');
      return true;
    } catch (error) {
      logger.error('Database connection validation failed', { error: error.message });
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  /**
   * Validate Redis connection
   */
  async validateRedis() {
    const Redis = (await import('ioredis')).default;
    const redis = new Redis(this.get('redisUrl'), {
      password: this.get('redisPassword') || undefined,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
      }
    });

    try {
      await redis.ping();
      logger.info('Redis connection validated successfully');
      await redis.quit();
      return true;
    } catch (error) {
      logger.error('Redis connection validation failed', { error: error.message });
      await redis.quit();
      throw new Error(`Redis connection failed: ${error.message}`);
    }
  }

  /**
   * Validate external API keys
   */
  async validateAPIKeys() {
    const errors = [];

    // Test Flickr
    try {
      const FlickrService = (await import('../services/flickr.js')).default;
      const flickr = new FlickrService();

      // Simple test call
      await flickr.request('flickr.test.echo', { test: 'validation' });
      logger.info('Flickr API key validated successfully');
    } catch (error) {
      errors.push(`Flickr: ${error.message}`);
    }

    // Test Unsplash
    try {
      const UnsplashService = (await import('../services/unsplash.js')).default;
      const unsplash = new UnsplashService();

      // Simple test call
      await unsplash.request('/photos', { page: 1, per_page: 1 });
      logger.info('Unsplash API key validated successfully');
    } catch (error) {
      errors.push(`Unsplash: ${error.message}`);
    }

    if (errors.length > 0) {
      throw new Error(`API key validation failed: ${errors.join(', ')}`);
    }

    return true;
  }

  /**
   * Run all validations
   */
  async validateAll() {
    logger.info('Running all configuration validations...');

    const validations = [
      { name: 'Database', fn: () => this.validateDatabase() },
      { name: 'Redis', fn: () => this.validateRedis() },
      { name: 'API Keys', fn: () => this.validateAPIKeys() }
    ];

    const results = [];

    for (const validation of validations) {
      try {
        await validation.fn();
        results.push({ name: validation.name, success: true });
      } catch (error) {
        results.push({
          name: validation.name,
          success: false,
          error: error.message
        });
      }
    }

    const failed = results.filter(r => !r.success);

    if (failed.length > 0) {
      logger.error('Configuration validation failed', { failed });
      throw new Error(`Validation failed for: ${failed.map(f => f.name).join(', ')}`);
    }

    logger.info('All configuration validations passed');
    return results;
  }
}

// Singleton instance
const config = new ConfigurationManager();

export default config;
export { ConfigurationManager };
