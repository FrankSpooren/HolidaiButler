/**
 * HolidAIButler - Main Server Entry Point
 * Mediterranean AI Travel Platform Backend
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Services
const ClaudeService = require('./services/ClaudeService');
const logger = require('./utils/logger');

// Routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const poiRoutes = require('./routes/poi');
const userRoutes = require('./routes/user');
const bookingRoutes = require('./routes/booking');
const analyticsRoutes = require('./routes/analytics');

// Middleware
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// Security Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
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
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests',
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// Body Parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      claude: 'available', // Will be checked by ClaudeService
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/poi', poiRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/booking', authMiddleware, bookingRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);

// Socket.IO for Real-time Features
io.use((socket, next) => {
  // Socket authentication middleware
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }

  // Verify JWT token (implement verification logic)
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.userId}`);
  
  socket.join(`user_${socket.userId}`);

  socket.on('chat_message', async (data) => {
    try {
      // Process chat message with Claude
      const response = await ClaudeService.processMessage({
        message: data.message,
        context: data.context,
        conversation: data.conversation,
        userPreferences: data.userPreferences,
        location: data.location,
      });

      // Emit response back to user
      socket.emit('ai_response', {
        messageId: data.messageId,
        response: response,
        timestamp: new Date(),
      });

    } catch (error) {
      logger.error('Socket chat error:', error);
      socket.emit('error', {
        messageId: data.messageId,
        error: 'Failed to process message',
        fallback: true,
      });
    }
  });

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

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.userId}`);
  });
});

// Error Handler (must be last)
app.use(errorHandler);

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'The requested endpoint does not exist',
  });
});

// Database Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  logger.info('Connected to MongoDB');
})
.catch((err) => {
  logger.error('MongoDB connection error:', err);
  process.exit(1);
});

// Initialize Services
async function initializeServices() {
  try {
    await ClaudeService.initialize();
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Service initialization failed:', error);
    process.exit(1);
  }
}

// Graceful Shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Start Server
server.listen(PORT, async () => {
  logger.info(`🚀 HolidAIButler server running on port ${PORT}`);
  logger.info(`🌊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🧭 Mediterranean AI Travel Platform - Je persoonlijke AI-reiscompas`);
  
  await initializeServices();
});

module.exports = { app, server, io };