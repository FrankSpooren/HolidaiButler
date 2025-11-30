// Load environment from root .env
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
// Also load local .env for overrides
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { syncDatabase, sequelize } = require('./models');
const { initAuditLog } = require('./middleware/auditLog');
const { correlationIdMiddleware } = require('./middleware/correlationId');
const CacheService = require('./services/CacheService');
const PaymentQueue = require('./queues/PaymentQueue');
const logger = require('./utils/logger');

/**
 * HolidaiButler Payment Transaction Engine
 * Enterprise payment processing with Adyen integration
 * Port: 3005
 */

const app = express();
const PORT = process.env.PORT || 3005;

// ========== SECURITY MIDDLEWARE ==========

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-Idempotency-Key'],
}));

// ========== REQUEST PARSING ==========

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ========== CORRELATION ID ==========

app.use(correlationIdMiddleware());

// ========== LOGGING ==========

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan(':method :url :status :response-time ms - :res[content-length]', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
}

// ========== RATE LIMITING ==========

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
});

const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_WEBHOOK_MAX) || 1000,
  message: '[rate_limited]',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
app.use('/api/v1/payments/webhooks/', webhookLimiter);

// ========== ROUTES ==========

const paymentRoutes = require('./routes/payments');

app.use('/api/v1/payments', paymentRoutes);

app.get('/', (req, res) => {
  res.json({
    service: 'HolidaiButler Payment Engine',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      createPayment: '/api/v1/payments',
      getPayment: '/api/v1/payments/:paymentId',
      refunds: '/api/v1/payments/:paymentId/refunds',
      webhooks: '/api/v1/webhooks/adyen',
      health: '/api/v1/payments/health',
    },
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'payment-engine',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// ========== ERROR HANDLING ==========

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);

  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
});

// ========== SERVER STARTUP ==========

const startServer = async () => {
  try {
    logger.info('Starting HolidaiButler Payment Engine...');

    // Connect to MySQL and sync models
    await syncDatabase({ alter: process.env.NODE_ENV === 'development' });
    logger.info('Database connected and synchronized');

    // Initialize audit logging
    initAuditLog(sequelize);
    logger.info('Audit logging initialized');

    // Connect to Redis cache (non-blocking)
    CacheService.connect().then(() => {
      logger.info('Redis cache connected');
    }).catch((err) => {
      logger.warn('Redis cache unavailable, continuing without cache:', err.message);
    });

    // Initialize payment queues (non-blocking)
    if (process.env.QUEUE_ENABLED !== 'false') {
      PaymentQueue.initialize().then(() => {
        logger.info('Payment queues initialized');
      }).catch((err) => {
        logger.warn('Payment queues unavailable:', err.message);
      });
    }

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Payment Engine listening on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API Base URL: http://localhost:${PORT}/api/v1/payments`);
      logger.info(`Health Check: http://localhost:${PORT}/health`);
    });

    // Configure server timeouts
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// ========== GRACEFUL SHUTDOWN ==========

const shutdown = async (signal) => {
  logger.info(`${signal} signal received: starting graceful shutdown`);

  try {
    // Close payment queues
    await PaymentQueue.close();
    logger.info('Payment queues closed');

    // Close Redis connection
    await CacheService.disconnect();
    logger.info('Redis connection closed');

    // Close database connection
    await sequelize.close();
    logger.info('Database connection closed');

    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});

if (require.main === module) {
  startServer();
}

module.exports = app;
