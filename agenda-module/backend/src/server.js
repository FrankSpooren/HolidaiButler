require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');

// Configuration
const connectDB = require('./config/database');
const logger = require('./config/logger');
const cacheService = require('./config/cache');

// Routes
const eventRoutes = require('./routes/eventRoutes');

// Middleware
const errorHandler = require('./middleware/errorHandler');
const {
  apiLimiter,
  helmetConfig,
  sanitizeMongo,
  sanitizeXSS,
  preventHPP,
  corsOptions,
  requestLogger,
  gdprCompliance,
} = require('./middleware/security');
const {
  basicHealthCheck,
  detailedHealthCheck,
  readinessCheck,
  livenessCheck,
  getMetrics,
} = require('./middleware/healthCheck');
const { circuitBreakerManager } = require('./middleware/circuitBreaker');

// Automation
const dailyEventUpdate = require('./automation/dailyEventUpdate');

/**
 * Enterprise-Level Agenda Module Server
 * Port: 5003
 *
 * Features:
 * - Security: Rate limiting, helmet, input sanitization, CSRF protection
 * - Performance: Redis caching, compression, connection pooling
 * - Reliability: Circuit breakers, health checks, graceful shutdown
 * - Monitoring: Winston logging, metrics endpoints, error tracking
 * - DevOps: Docker ready, K8s health checks, environment-based config
 */

const app = express();
const PORT = process.env.PORT || 5003;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ===========================
// Security Middleware
// ===========================

// Helmet - secure HTTP headers
app.use(helmetConfig);

// CORS with whitelist
app.use(cors(corsOptions));

// GDPR compliance headers
app.use(gdprCompliance);

// Rate limiting
app.use('/api/', apiLimiter);

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeMongo); // NoSQL injection prevention
app.use(sanitizeXSS); // XSS prevention
app.use(preventHPP); // HTTP Parameter Pollution prevention

// Response compression
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
}));

// ===========================
// Logging & Monitoring
// ===========================

// HTTP request logging
app.use(logger.httpLogger);

// Request tracking middleware
app.use(requestLogger);

// ===========================
// Health Check Endpoints
// ===========================

// Basic health check - for load balancers (fast response)
app.get('/health', basicHealthCheck);

// Detailed health check - includes all dependencies
app.get('/health/detailed', detailedHealthCheck);

// Kubernetes readiness probe
app.get('/health/ready', readinessCheck);

// Kubernetes liveness probe
app.get('/health/live', livenessCheck);

// System metrics endpoint
app.get('/metrics', getMetrics);

// Circuit breaker dashboard
app.get('/circuit-breakers', circuitBreakerManager.dashboardMiddleware());

// ===========================
// API Routes
// ===========================

// Main API routes
app.use('/api/agenda', eventRoutes);

// API documentation (future: Swagger/OpenAPI)
app.get('/api/docs', (req, res) => {
  res.json({
    service: 'HolidaiButler Agenda API',
    version: '1.0.0',
    documentation: '/api/docs/swagger',
    endpoints: {
      events: '/api/agenda/events',
      featured: '/api/agenda/events/featured',
      stats: '/api/agenda/stats',
      health: '/health',
      metrics: '/metrics',
    },
  });
});

// ===========================
// Error Handling
// ===========================

// 404 handler
app.use((req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Error logger middleware
app.use(logger.errorLogger);

// Global error handler
app.use(errorHandler);

// ===========================
// Graceful Shutdown
// ===========================

let server;

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        // Close database connection
        const mongoose = require('mongoose');
        await mongoose.connection.close();
        logger.info('Database connection closed');

        // Close Redis connection
        await cacheService.disconnect();
        logger.info('Cache connection closed');

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// ===========================
// Server Initialization
// ===========================

const startServer = async () => {
  try {
    logger.info('Starting Agenda Module Server...');
    logger.info(`Environment: ${NODE_ENV}`);

    // 1. Connect to MongoDB
    logger.info('Connecting to database...');
    await connectDB();

    // 2. Connect to Redis (optional - degrades gracefully)
    logger.info('Connecting to cache...');
    await cacheService.connect().catch(err => {
      logger.warn('Cache not available, continuing without cache:', err.message);
    });

    // 3. Warm up cache (if connected)
    if (cacheService.isConnected) {
      logger.info('Warming up cache...');
      await cacheService.warmUp().catch(err => {
        logger.warn('Cache warm-up failed:', err.message);
      });
    }

    // 4. Initialize daily automation
    logger.info('Initializing automation...');
    dailyEventUpdate.initialize();

    // 5. Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`🚀 Agenda Module server running on port ${PORT}`);
      logger.info(`📍 Health check: http://localhost:${PORT}/health`);
      logger.info(`📅 API endpoints: http://localhost:${PORT}/api/agenda`);
      logger.info(`📊 Metrics: http://localhost:${PORT}/metrics`);
      logger.info(`🔧 Circuit breakers: http://localhost:${PORT}/circuit-breakers`);
      logger.info('✅ Server started successfully');
    });

    // Set server timeout to 2 minutes
    server.setTimeout(120000);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;
