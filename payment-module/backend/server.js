require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { syncDatabase } = require('./models');
const logger = require('./utils/logger');

/**
 * HolidaiButler Payment Transaction Engine
 * Enterprise payment processing with Adyen integration
 * Port: 3005
 */

const app = express();
const PORT = process.env.PORT || 3005;

// ========== MIDDLEWARE ==========

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(compression());

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
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

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
    // Connect to PostgreSQL and sync models
    await syncDatabase({ alter: process.env.NODE_ENV === 'development' });

    app.listen(PORT, () => {
      logger.info(`💳 Payment Engine listening on port ${PORT}`);
      logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 API Base URL: http://localhost:${PORT}/api/v1/payments`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

module.exports = app;
