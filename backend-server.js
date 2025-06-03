/**
 * HolidAIButler Backend Server
 * Mediterranean AI Travel Platform API
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Routes
const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const poiRoutes = require('./routes/poi');
const userRoutes = require('./routes/user');
const bookingRoutes = require('./routes/booking');
const weatherRoutes = require('./routes/weather');

// Middleware
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');
const loggingMiddleware = require('./middleware/logging');

// Services
const ClaudeService = require('./services/ClaudeService');
const CacheService = require('./services/CacheService');
const MonitoringService = require('./services/MonitoringService');

// Utils
const logger = require('./utils/logger');
const { validateEnvironment } = require('./utils/validation');

// Validate environment variables
validateEnvironment();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Database Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  logger.info('Connected to MongoDB Atlas');
  // Initialize services after DB connection
  initializeServices();
})
.catch((error) => {
  logger.error('MongoDB connection error:', error);
  process.exit(1);
});

// Initialize Services
async function initializeServices() {
  try {
    await CacheService.initialize();
    await ClaudeService.initialize();
    await MonitoringService.initialize();
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Service initialization failed:', error);
  }
}

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.anthropic.com"],
    },
  },
}));

// CORS Configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// AI-specific rate limiting (more restrictive)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 requests per minute
  message: {
    error: 'AI request limit exceeded. Please wait a moment.',
  },
});

app.use('/api/ai/', aiLimiter);

// Basic Middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(loggingMiddleware);

// Health Check
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        cache: await CacheService.healthCheck(),
        ai: await ClaudeService.healthCheck(),
      },
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV,
    };

    const isHealthy = health.services.database === 'connected' && 
                     health.services.cache && 
                     health.services.ai;

    res.status(isHealthy ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/poi', poiRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/booking', authMiddleware, bookingRoutes);
app.use('/api/weather', weatherRoutes);

// Socket.IO for Real-time Features
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);
  
  // Join user to their room for personalized updates
  socket.on('join-user-room', (userId) => {
    socket.join(`user:${userId}`);
    logger.debug(`User ${userId} joined room: user:${userId}`);
  });

  // Handle chat messages
  socket.on('chat-message', async (data) => {
    try {
      // Process message through AI service
      const response = await ClaudeService.processMessage(data);
      
      // Send response back to user
      socket.emit('ai-response', response);
      
      // Log interaction
      await MonitoringService.logInteraction(data.userId, 'chat-message', {
        messageLength: data.message.length,
        responseTime: response.processingTime,
      });
    } catch (error) {
      logger.error('Socket chat message error:', error);
      socket.emit('ai-error', {
        error: 'Failed to process message',
        fallbackMode: true,
      });
    }
  });

  // Handle typing indicators
  socket.on('typing-start', (data) => {
    socket.to(`user:${data.userId}`).emit('user-typing', data);
  });

  socket.on('typing-stop', (data) => {
    socket.to(`user:${data.userId}`).emit('user-stopped-typing', data);
  });

  // Handle location updates
  socket.on('location-update', async (data) => {
    try {
      // Get nearby POIs for the new location
      const nearbyPOIs = await require('./services/POIService').getNearbyPOIs(
        data.latitude, 
        data.longitude, 
        data.radius || 5000
      );
      
      socket.emit('nearby-pois', nearbyPOIs);
    } catch (error) {
      logger.error('Location update error:', error);
    }
  });

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist.`,
    availableRoutes: [
      '/api/auth',
      '/api/ai',
      '/api/poi',
      '/api/user',
      '/api/booking',
      '/api/weather',
      '/health',
    ],
  });
});

// Error Handler (must be last)
app.use(errorHandler);

// Graceful Shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Start Server
server.listen(PORT, () => {
  logger.info(`🧭 HolidAIButler Backend Server running on port ${PORT}`);
  logger.info(`🌊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🚀 API Base URL: http://localhost:${PORT}/api`);
  logger.info(`📊 Health Check: http://localhost:${PORT}/health`);
  
  // Log startup configuration
  if (process.env.NODE_ENV === 'development') {
    logger.info('🔧 Development mode - Enhanced logging enabled');
    logger.info(`🔗 CORS Origin: ${process.env.CORS_ORIGIN}`);
    logger.info(`🗄️ Database: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
    logger.info(`🤖 Claude API: ${process.env.CLAUDE_API_KEY ? 'Configured' : 'Not configured'}`);
  }
});

module.exports = { app, server, io };