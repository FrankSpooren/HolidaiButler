const Joi = require('joi');

/**
 * Configuration Management Module
 * Validates and provides type-safe access to environment variables
 * Fails fast on invalid configuration
 */

// ========== ENVIRONMENT SCHEMA ==========

const envSchema = Joi.object({
  // Server
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3005),

  // Database (MySQL - Hetzner)
  DATABASE_HOST: Joi.string().hostname().required(),
  DATABASE_PORT: Joi.number().port().default(3306),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().allow('').required(),
  DATABASE_POOL_MAX: Joi.number().min(5).max(100).default(20),
  DATABASE_POOL_MIN: Joi.number().min(1).max(10).default(5),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().min(0).max(15).default(2),
  REDIS_TLS: Joi.boolean().default(false),

  // Authentication
  JWT_SECRET: Joi.string().min(32).required()
    .description('Must be at least 32 characters for security'),
  JWT_EXPIRY: Joi.string().default('24h'),
  API_KEY_HEADER: Joi.string().default('X-API-Key'),

  // Adyen Configuration
  ADYEN_API_KEY: Joi.string().required(),
  ADYEN_ENVIRONMENT: Joi.string().valid('test', 'live').default('test'),
  ADYEN_MERCHANT_ACCOUNT: Joi.string().required(),
  ADYEN_HMAC_KEY: Joi.string().required(),
  ADYEN_CLIENT_KEY: Joi.string().required(),
  ADYEN_LIVE_ENDPOINT_PREFIX: Joi.string().when('ADYEN_ENVIRONMENT', {
    is: 'live',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // Payment Settings
  AUTO_CAPTURE: Joi.boolean().default(true),
  CAPTURE_DELAY_HOURS: Joi.number().min(0).max(168).default(0),
  DEFAULT_CURRENCY: Joi.string().length(3).default('EUR'),
  DEFAULT_COUNTRY: Joi.string().length(2).default('NL'),
  DEFAULT_LOCALE: Joi.string().pattern(/^[a-z]{2}-[A-Z]{2}$/).default('nl-NL'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  RATE_LIMIT_WEBHOOK_MAX: Joi.number().default(1000),

  // Integration URLs
  TICKETING_MODULE_URL: Joi.string().uri().default('http://localhost:3004'),
  MAIN_API_URL: Joi.string().uri().default('http://localhost:3000'),

  // CORS
  CORS_ORIGIN: Joi.alternatives()
    .try(Joi.string(), Joi.array().items(Joi.string()))
    .default('*'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'simple').default('json'),

  // Security
  ENCRYPTION_KEY: Joi.string().length(64).when('NODE_ENV', {
    is: Joi.valid('staging', 'production'),
    then: Joi.required(),
    otherwise: Joi.optional().default('0'.repeat(64)),
  }),

  // Queue (Bull)
  QUEUE_ENABLED: Joi.boolean().default(true),
  QUEUE_CONCURRENCY: Joi.number().min(1).max(50).default(5),

  // Retry Configuration
  ADYEN_RETRY_ATTEMPTS: Joi.number().min(0).max(10).default(3),
  ADYEN_RETRY_DELAY_MS: Joi.number().min(100).max(60000).default(1000),
  CIRCUIT_BREAKER_THRESHOLD: Joi.number().min(1).max(100).default(5),
  CIRCUIT_BREAKER_TIMEOUT_MS: Joi.number().min(1000).max(300000).default(30000),

  // Idempotency
  IDEMPOTENCY_TTL_SECONDS: Joi.number().min(60).max(86400).default(86400), // 24h

  // Audit
  AUDIT_LOG_ENABLED: Joi.boolean().default(true),
  AUDIT_LOG_RETENTION_DAYS: Joi.number().min(30).max(2555).default(365),
}).unknown(true);

// ========== VALIDATE AND EXPORT ==========

const { error, value: envVars } = envSchema.validate(process.env, {
  abortEarly: false,
  convert: true,
});

if (error) {
  const missingVars = error.details.map(d => `  - ${d.message}`).join('\n');
  console.error('❌ Configuration validation failed:');
  console.error(missingVars);
  console.error('\nPlease check your .env file or environment variables.');

  // In production, fail immediately
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// ========== CONFIGURATION OBJECT ==========

const config = {
  env: envVars.NODE_ENV,
  isProduction: envVars.NODE_ENV === 'production',
  isTest: envVars.NODE_ENV === 'test',
  isDevelopment: envVars.NODE_ENV === 'development',

  server: {
    port: envVars.PORT,
    corsOrigin: envVars.CORS_ORIGIN,
  },

  database: {
    host: envVars.DATABASE_HOST,
    port: envVars.DATABASE_PORT,
    name: envVars.DATABASE_NAME,
    user: envVars.DATABASE_USER,
    password: envVars.DATABASE_PASSWORD,
    pool: {
      max: envVars.DATABASE_POOL_MAX,
      min: envVars.DATABASE_POOL_MIN,
      acquire: 30000,
      idle: 10000,
    },
    get connectionString() {
      return `mysql://${this.user}:${this.password}@${this.host}:${this.port}/${this.name}`;
    },
  },

  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD,
    db: envVars.REDIS_DB,
    tls: envVars.REDIS_TLS,
    get connectionString() {
      const auth = this.password ? `:${this.password}@` : '';
      return `redis://${auth}${this.host}:${this.port}/${this.db}`;
    },
  },

  auth: {
    jwtSecret: envVars.JWT_SECRET,
    jwtExpiry: envVars.JWT_EXPIRY,
    apiKeyHeader: envVars.API_KEY_HEADER,
  },

  adyen: {
    apiKey: envVars.ADYEN_API_KEY,
    environment: envVars.ADYEN_ENVIRONMENT,
    merchantAccount: envVars.ADYEN_MERCHANT_ACCOUNT,
    hmacKey: envVars.ADYEN_HMAC_KEY,
    clientKey: envVars.ADYEN_CLIENT_KEY,
    liveEndpointPrefix: envVars.ADYEN_LIVE_ENDPOINT_PREFIX,
    retry: {
      attempts: envVars.ADYEN_RETRY_ATTEMPTS,
      delayMs: envVars.ADYEN_RETRY_DELAY_MS,
    },
  },

  payment: {
    autoCapture: envVars.AUTO_CAPTURE,
    captureDelayHours: envVars.CAPTURE_DELAY_HOURS,
    defaultCurrency: envVars.DEFAULT_CURRENCY,
    defaultCountry: envVars.DEFAULT_COUNTRY,
    defaultLocale: envVars.DEFAULT_LOCALE,
  },

  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
    webhookMax: envVars.RATE_LIMIT_WEBHOOK_MAX,
  },

  integrations: {
    ticketingModuleUrl: envVars.TICKETING_MODULE_URL,
    mainApiUrl: envVars.MAIN_API_URL,
  },

  logging: {
    level: envVars.LOG_LEVEL,
    format: envVars.LOG_FORMAT,
  },

  security: {
    encryptionKey: envVars.ENCRYPTION_KEY,
  },

  queue: {
    enabled: envVars.QUEUE_ENABLED,
    concurrency: envVars.QUEUE_CONCURRENCY,
  },

  circuitBreaker: {
    threshold: envVars.CIRCUIT_BREAKER_THRESHOLD,
    timeoutMs: envVars.CIRCUIT_BREAKER_TIMEOUT_MS,
  },

  idempotency: {
    ttlSeconds: envVars.IDEMPOTENCY_TTL_SECONDS,
  },

  audit: {
    enabled: envVars.AUDIT_LOG_ENABLED,
    retentionDays: envVars.AUDIT_LOG_RETENTION_DAYS,
  },
};

// ========== FREEZE CONFIGURATION ==========

const deepFreeze = (obj) => {
  Object.getOwnPropertyNames(obj).forEach(prop => {
    const value = obj[prop];
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  });
  return Object.freeze(obj);
};

// Freeze in production to prevent accidental modifications
if (config.isProduction) {
  deepFreeze(config);
}

module.exports = config;
