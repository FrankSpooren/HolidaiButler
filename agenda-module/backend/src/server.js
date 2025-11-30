// Load environment from root .env
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
// Also load local .env for overrides
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');

// Configuration
const { connectDB, closeDB, sequelize } = require('./config/database');
const logger = require('./config/logger');
const cacheService = require('./config/cache');

// Routes
const eventRoutes = require('./routes/eventRoutes');

// Middleware
const errorHandler = require('./middleware/errorHandler');
const {
  apiLimiter,
  helmetConfig,
  sanitizeXSS,
  preventHPP,
  corsOptions,
  requestLogger,
  gdprCompliance,
} = require('./middleware/security');
const { circuitBreakerManager } = require('./middleware/circuitBreaker');

// Automation
const dailyEventUpdate = require('./automation/dailyEventUpdate');

/**
 * Enterprise-Level Agenda Module Server (MySQL/Sequelize)
 * Port: 5003
 */

const app = express();
const PORT = process.env.PORT || 5003;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ===========================
// Security Middleware
// ===========================

app.use(helmetConfig);
app.use(cors(corsOptions));
app.use(gdprCompliance);
app.use('/api/', apiLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(sanitizeXSS);
app.use(preventHPP);

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

app.use(logger.httpLogger);
app.use(requestLogger);

// ===========================
// Health Check Endpoints
// ===========================

app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      success: true,
      service: 'agenda-module',
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      service: 'agenda-module',
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/health/detailed', async (req, res) => {
  const health = {
    success: true,
    service: 'agenda-module',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  try {
    await sequelize.authenticate();
    health.checks.database = { status: 'healthy', type: 'mysql' };
  } catch (error) {
    health.checks.database = { status: 'unhealthy', error: error.message };
    health.status = 'degraded';
  }

  try {
    if (cacheService.isConnected) {
      health.checks.cache = { status: 'healthy' };
    } else {
      health.checks.cache = { status: 'not_connected' };
    }
  } catch (error) {
    health.checks.cache = { status: 'unhealthy', error: error.message };
  }

  res.json(health);
});

app.get('/health/ready', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not_ready', error: error.message });
  }
});

app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

app.get('/metrics', (req, res) => {
  const used = process.memoryUsage();
  res.json({
    uptime: process.uptime(),
    memory: {
      rss: Math.round(used.rss / 1024 / 1024) + ' MB',
      heapTotal: Math.round(used.heapTotal / 1024 / 1024) + ' MB',
      heapUsed: Math.round(used.heapUsed / 1024 / 1024) + ' MB',
    },
    cpu: process.cpuUsage(),
  });
});

app.get('/circuit-breakers', circuitBreakerManager.dashboardMiddleware());

// ===========================
// API Routes
// ===========================

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

app.use('/api/docs', swaggerUi.serve);
app.get('/api/docs', swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'HolidaiButler Agenda API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
}));

app.get('/api/docs/json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/api/agenda', eventRoutes);

app.get('/', (req, res) => {
  res.json({
    service: 'HolidaiButler Agenda Module',
    version: '1.0.0',
    database: 'MySQL/Sequelize',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      events: '/api/agenda/events',
      featured: '/api/agenda/events/featured',
      stats: '/api/agenda/stats',
      health: '/health',
      docs: '/api/docs',
    },
  });
});

// ===========================
// Error Handling
// ===========================

app.use((req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
  });
});

app.use(logger.errorLogger);
app.use(errorHandler);

// ===========================
// Graceful Shutdown
// ===========================

let server;

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await closeDB();
        logger.info('Database connection closed');

        await cacheService.disconnect();
        logger.info('Cache connection closed');

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

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
    logger.info('Database: MySQL/Sequelize');

    logger.info('Connecting to database...');
    await connectDB();

    logger.info('Connecting to cache...');
    await cacheService.connect().catch(err => {
      logger.warn('Cache not available, continuing without cache:', err.message);
    });

    if (cacheService.isConnected) {
      logger.info('Warming up cache...');
      await cacheService.warmUp().catch(err => {
        logger.warn('Cache warm-up failed:', err.message);
      });
    }

    logger.info('Initializing automation...');
    dailyEventUpdate.initialize();

    server = app.listen(PORT, () => {
      logger.info(`🚀 Agenda Module server running on port ${PORT}`);
      logger.info(`📍 Health check: http://localhost:${PORT}/health`);
      logger.info(`📅 API endpoints: http://localhost:${PORT}/api/agenda`);
      logger.info('✅ Server started successfully');
    });

    server.setTimeout(120000);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
