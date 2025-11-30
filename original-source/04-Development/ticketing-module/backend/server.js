require('dotenv').config();
const express = require('express');
const { initialize, testConnection, syncDatabase } = require('./models-sequelize'); // Enterprise versie met DI
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

/**
 * HolidaiButler Ticketing & Reservation Module
 * Enterprise-level ticketing backend service
 * Port: 3004
 */

const app = express();
const PORT = process.env.PORT || 3004;

// ========== MIDDLEWARE ==========

// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
}

// Rate limiting - Development vs Production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Dev: 1000, Prod: 100 requests per 15min
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// ========== DATABASE CONNECTION ==========

const connectDB = async () => {
  try {
    // Initialize enterprise models (standalone mode, geen externe User/POI models)
    const models = initialize(); // Initialiseert Sequelize instance + models
    logger.info('✅ Ticketing models initialized (standalone mode)');

    // Test database connectie
    await testConnection();

    // Sync database models (alleen in development!)
    if (process.env.NODE_ENV === 'development') {
      await syncDatabase({ alter: false });
      logger.info('✅ Database models synchronized');
    }

    return models;
  } catch (error) {
    logger.error('❌ MySQL connection error:', error);
    process.exit(1);
  }
};

// ========== ROUTES ==========
// Routes worden BINNEN startServer() geladen na database initialisatie

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'HolidaiButler Ticketing Module',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      availability: '/api/v1/tickets/availability/:poiId',
      bookings: '/api/v1/tickets/bookings',
      tickets: '/api/v1/tickets/:ticketId',
      health: '/api/v1/tickets/health',
    },
  });
});

// Health check
app.get('/health', (req, res) => {
  const { getModels } = require('./models-sequelize');
  const models = getModels();

  res.json({
    success: true,
    service: 'ticketing-module',
    status: 'healthy',
    database: models.sequelize ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// ========== ERROR HANDLING ==========

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

// Global error handler
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
    // Connect to database FIRST (initializes models)
    await connectDB();

    // THEN load routes (now models are initialized)
    const ticketRoutes = require('./routes/tickets');
    app.use('/api/v1/tickets', ticketRoutes);
    logger.info('✅ Routes loaded');

    // Start listening
    app.listen(PORT, () => {
      logger.info(`🎫 Ticketing Module listening on port ${PORT}`);
      logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 API Base URL: http://localhost:${PORT}/api/v1/tickets`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');

  try {
    const { closeConnection } = require('./models-sequelize');
    await closeConnection();
    logger.info('MySQL connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');

  try {
    const { closeConnection } = require('./models-sequelize');
    await closeConnection();
    logger.info('MySQL connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;
