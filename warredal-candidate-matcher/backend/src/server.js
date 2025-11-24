import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { testConnection, syncDatabase } from './config/database.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

// Import routes
import authRoutes from './api/auth.routes.js';
import vacancyRoutes from './api/vacancy.routes.js';
import candidateRoutes from './api/candidate.routes.js';
import messagingRoutes from './api/messaging.routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ==================== Middleware ====================

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - ${req.ip}`);
  next();
});

// ==================== Routes ====================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Warredal Candidate Matcher API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      vacancies: '/api/vacancies',
      candidates: '/api/candidates',
      messaging: '/api/messages'
    }
  });
});

// Health check
app.get('/health', async (req, res) => {
  const dbConnected = await testConnection();

  res.json({
    success: true,
    status: 'healthy',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/vacancies', vacancyRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/messages', messagingRoutes);

// ==================== Error Handling ====================

app.use(notFoundHandler);
app.use(errorHandler);

// ==================== Start Server ====================

const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();

    if (!dbConnected) {
      logger.error('❌ Failed to connect to database');
      process.exit(1);
    }

    // Sync database (in development)
    if (process.env.NODE_ENV === 'development') {
      await syncDatabase(false); // Set true to drop all tables
    }

    // Start listening
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 API URL: http://localhost:${PORT}`);
      logger.info(`💾 Database: ${process.env.DB_NAME}`);
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('👋 SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Start the server
startServer();

export default app;
