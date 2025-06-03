/**
 * HolidAIButler - Main Server Application
 * Mediterranean AI Travel Platform Backend
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Load environment variables
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const poiRoutes = require('./routes/poi');
const userRoutes = require('./routes/user');
const analyticsRoutes = require('./routes/analytics');

// Import middleware
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const validateRequest = require('./middleware/validateRequest');

// Import services
const ClaudeService = require('./services/ClaudeService');
const SocketService = require('./services/SocketService');

// Utils
const logger = require('./utils/logger');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Global middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.anthropic.com"]
    }
  }
}));

app.use(compression());
app.use(morgan('combined'));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      claude: ClaudeService.getStats(),
      database: mongoose.connection.readyState === 1,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    }
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/poi', poiRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'HolidAIButler API - Je persoonlijke AI-reiscompas',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `${req.method} ${req.originalUrl} not found`
  });
});

// Global error handler
app.use(errorHandler);

// Initialize socket service
SocketService.initialize(io);

// Database connection
async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Initialize services
async function initializeServices() {
  try {
    await ClaudeService.initialize();
    logger.info('Claude service initialized');
  } catch (error) {
    logger.error('Failed to initialize Claude service:', error);
    // Don't exit - can run with fallback responses
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Start server
async function startServer() {
  await connectDatabase();
  await initializeServices();
  
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    logger.info(`🧭 HolidAIButler server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`Mediterranean AI Travel Platform ready! 🌊`);
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Start the application
if (require.main === module) {
  startServer().catch(error => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = app;