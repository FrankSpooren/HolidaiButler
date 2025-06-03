/**
 * HolidAIButler - Main Server
 * Mediterranean AI Travel Platform Backend
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

// Middleware
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const corsConfig = require('./middleware/cors');

// Routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const poiRoutes = require('./routes/poi');
const userRoutes = require('./routes/user');
const bookingRoutes = require('./routes/booking');
const analyticsRoutes = require('./routes/analytics');

// Services
const ClaudeService = require('./services/ClaudeService');
const CacheService = require('./services/CacheService');

// Utils
const logger = require('./utils/logger');

const app = express();
const server = createServer(app);

// Socket.io setup for real-time chat
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Trust proxy for correct IP addresses
app.set('trust proxy', 1);

// Security middleware
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

// Compression middleware
app.use(compression());

// CORS middleware
app.use(corsConfig);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: {
    error: 'Too many requests',
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      claude: ClaudeService.getStats(),
      cache: CacheService.getStats(),
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/poi', poiRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/booking', authMiddleware, bookingRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.userId}`);

  // Join user to their personal room
  socket.join(`user_${socket.userId}`);

  // Handle chat messages
  socket.on('chat_message', async (data) => {
    try {
      const response = await ClaudeService.processMessage({
        message: data.message,
        context: data.context,
        conversation: data.conversation,
        userPreferences: socket.user.preferences,
        location: data.location,
      });

      // Emit AI response back to user
      socket.emit('ai_response', {
        messageId: data.messageId,
        response: response,
        timestamp: new Date(),
      });

      // Save conversation to database
      await saveChatMessage(socket.userId, data.message, response);

    } catch (error) {
      logger.error('Chat message error:', error);
      socket.emit('chat_error', {
        messageId: data.messageId,
        error: 'Failed to process message',
      });
    }
  });

  // Handle typing indicators
  socket.on('typing_start', () => {
    socket.broadcast.to(`user_${socket.userId}`).emit('user_typing', {
      userId: socket.userId,
      typing: true,
    });
  });

  socket.on('typing_stop', () => {
    socket.broadcast.to(`user_${socket.userId}`).emit('user_typing', {
      userId: socket.userId,
      typing: false,
    });
  });

  // Handle location updates
  socket.on('location_update', async (location) => {
    try {
      // Update user location in database
      await User.findByIdAndUpdate(socket.userId, {
        'location.current': location,
        'location.lastUpdated': new Date(),
      });

      // Get nearby POIs
      const nearbyPOIs = await POIService.getNearbyPOIs(
        location.latitude,
        location.longitude,
        5000 // 5km radius
      );

      socket.emit('nearby_pois', nearbyPOIs);
    } catch (error) {
      logger.error('Location update error:', error);
    }
  });

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.userId}`);
  });
});

// Save chat message to database
async function saveChatMessage(userId, userMessage, aiResponse) {
  try {
    const Chat = require('./models/Chat');
    
    const chat = new Chat({
      userId,
      messages: [
        {
          type: 'user',
          content: userMessage,
          timestamp: new Date(),
        },
        {
          type: 'assistant',
          content: aiResponse.text,
          timestamp: new Date(),
          metadata: {
            model: aiResponse.model,
            confidence: aiResponse.confidence,
            recommendations: aiResponse.recommendations,
          },
        },
      ],
    });

    await chat.save();
  } catch (error) {
    logger.error('Save chat error:', error);
  }
}

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'The requested resource does not exist',
  });
});

// Database connection
async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    logger.info('Connected to MongoDB Atlas');
  } catch (error) {
    logger.error('Database connection error:', error);
    process.exit(1);
  }
}

// Initialize services
async function initializeServices() {
  try {
    await ClaudeService.initialize();
    await CacheService.initialize();
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Service initialization error:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    mongoose.connection.close(false, () => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  server.close(() => {
    mongoose.connection.close(false, () => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
});

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  await connectDatabase();
  await initializeServices();
  
  server.listen(PORT, () => {
    logger.info(`🧭 HolidAIButler server running on port ${PORT}`);
    logger.info(`🌊 Mediterranean AI Travel Platform - Ready for Costa Blanca!`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = { app, io };