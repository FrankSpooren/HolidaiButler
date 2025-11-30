/**
 * HolidaiButler Backend API - Main Server File
 * ============================================
 * Express server with middleware, routes, and error handling
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// Import configuration
const { testDatabaseConnection } = require('./config/database');
const logger = require('./utils/logger');

// Import routes
const routes = require('./routes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// ==============================================
// MIDDLEWARE
// ==============================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development, configure for production
  crossOriginEmbedderPolicy: false
}));

// CORS configuration - Allow multiple frontend origins
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // Allow localhost on any port for development
    if (origin.match(/^http:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }

    // Allow ngrok URLs for development/testing
    if (origin.match(/^https:\/\/[\w-]+\.ngrok-free\.dev$/)) {
      return callback(null, true);
    }

    // Allow configured CORS origin
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : [];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser(process.env.COOKIE_SECRET));

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
  }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

app.use('/api/', limiter);

// ==============================================
// ROUTES
// ==============================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: '1.0.0'
    }
  });
});

// API routes
app.use('/api/v1', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`
    }
  });
});

// Error handler (must be last)
app.use(errorHandler);

// ==============================================
// SERVER STARTUP
// ==============================================

async function startServer() {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    await testDatabaseConnection();
    logger.info('Database connection successful');

    // Start server
    app.listen(PORT, () => {
      logger.info('='.repeat(50));
      logger.info('HolidaiButler API Server Started');
      logger.info('='.repeat(50));
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Server running on: http://localhost:${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API Base: http://localhost:${PORT}/api/v1`);
      logger.info('='.repeat(50));
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', err => {
  logger.error('UNHANDLED REJECTION! Shutting down...');
  logger.error(err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', err => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...');
  logger.error(err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

module.exports = app; // Export for testing

