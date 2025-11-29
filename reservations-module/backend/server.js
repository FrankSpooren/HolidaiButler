require('dotenv').config();
const express = require('express');
const { sequelize } = require('./models');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const logger = require('./utils/logger');

/**
 * HolidaiButler Restaurant Reservations Module
 * Enterprise-level restaurant reservation backend service
 * Port: 3006
 */

const app = express();
const PORT = process.env.PORT || 3006;

// ========== MIDDLEWARE ==========

// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Restaurant-Id'],
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

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for booking creation
const bookingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 bookings per minute per IP
  message: {
    success: false,
    error: 'Too many booking attempts, please wait before trying again',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// ========== DATABASE CONNECTION ==========

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('MySQL database connected successfully');

    if (process.env.NODE_ENV === 'production') {
      logger.info('Production mode: Using migrations for schema management');
      logger.info('Run migrations with: npm run migrate');
    } else {
      if (process.env.DB_SYNC === 'true') {
        logger.warn('DEV MODE: Syncing database (use migrations for production)');
        await sequelize.sync({ alter: false });
        logger.info('Database models synchronized');
      } else {
        logger.info('Dev mode: Skipping sync. Run migrations: npm run migrate');
      }
    }
  } catch (error) {
    logger.error('MySQL connection error:', error);
    process.exit(1);
  }
};

// ========== ROUTES ==========

const restaurantRoutes = require('./routes/restaurants');
const reservationRoutes = require('./routes/reservations');
const tableRoutes = require('./routes/tables');
const guestRoutes = require('./routes/guests');
const waitlistRoutes = require('./routes/waitlist');
const availabilityRoutes = require('./routes/availability');
const webhookRoutes = require('./routes/webhooks');
const monitoringRoutes = require('./routes/monitoring');

// API v1 routes
app.use('/api/v1/restaurants', restaurantRoutes);
app.use('/api/v1/reservations', reservationRoutes);
app.use('/api/v1/tables', tableRoutes);
app.use('/api/v1/guests', guestRoutes);
app.use('/api/v1/waitlist', waitlistRoutes);
app.use('/api/v1/availability', availabilityRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/monitoring', monitoringRoutes);

// Apply stricter rate limit to booking endpoints
app.use('/api/v1/reservations', bookingLimiter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'HolidaiButler Restaurant Reservations Module',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      restaurants: '/api/v1/restaurants',
      reservations: '/api/v1/reservations',
      tables: '/api/v1/tables',
      guests: '/api/v1/guests',
      waitlist: '/api/v1/waitlist',
      availability: '/api/v1/availability',
      webhooks: '/api/v1/webhooks',
      monitoring: '/api/v1/monitoring',
      health: '/health',
    },
  });
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      success: true,
      service: 'reservations-module',
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      service: 'reservations-module',
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ========== SCHEDULED JOBS ==========

const setupCronJobs = () => {
  // Send reservation reminders (daily at 10:00 AM)
  cron.schedule('0 10 * * *', async () => {
    logger.info('Running scheduled job: Send reservation reminders');
    try {
      const ReservationService = require('./services/ReservationService');
      await ReservationService.sendReminders();
    } catch (error) {
      logger.error('Reminder job failed:', error);
    }
  });

  // Expire pending reservations (every 15 minutes)
  cron.schedule('*/15 * * * *', async () => {
    logger.info('Running scheduled job: Expire pending reservations');
    try {
      const AvailabilityService = require('./services/AvailabilityService');
      await AvailabilityService.expirePendingReservations();
    } catch (error) {
      logger.error('Expiry job failed:', error);
    }
  });

  // Expire waitlist entries (daily at midnight)
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running scheduled job: Expire waitlist entries');
    try {
      const WaitlistService = require('./services/WaitlistService');
      await WaitlistService.expireOldEntries();
    } catch (error) {
      logger.error('Waitlist expiry job failed:', error);
    }
  });

  // Auto-complete seated reservations (every 30 minutes)
  cron.schedule('*/30 * * * *', async () => {
    logger.info('Running scheduled job: Auto-complete reservations');
    try {
      const ReservationService = require('./services/ReservationService');
      await ReservationService.autoCompleteReservations();
    } catch (error) {
      logger.error('Auto-complete job failed:', error);
    }
  });

  logger.info('Scheduled jobs initialized');
};

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

  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details || error.message,
    });
  }

  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Database validation failed',
      details: error.errors?.map(e => e.message),
    });
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      error: 'Resource already exists',
      details: error.errors?.map(e => e.message),
    });
  }

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
    await connectDB();
    setupCronJobs();

    app.listen(PORT, () => {
      logger.info(`🍽️  Reservations Module listening on port ${PORT}`);
      logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 API Base URL: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} signal received: closing HTTP server`);

  try {
    await sequelize.close();
    logger.info('MySQL connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;
