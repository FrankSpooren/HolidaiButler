/**
 * Sales Pipeline Module - Main Server
 * Enterprise B2B CRM Platform
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for env loading
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment from root .env first
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
// Also load local .env for overrides
dotenv.config();

import { sequelize, initializeDatabase } from './models/index.js';
import { checkConnection as checkRedis, closeRedis, pubsub } from './config/redis.js';
import routes from './routes/index.js';
import logger from './utils/logger.js';

const app = express();
const server = createServer(app);
const io = new SocketIO(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5175',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3006;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================
// MIDDLEWARE
// ============================================

// Request ID
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Security headers
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production',
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5175', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Session-ID', 'X-Device-Type']
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Max requests per window
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
    code: 'RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    logger[level](`${req.method} ${req.path}`, {
      requestId: req.id,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.userId
    });
  });

  next();
});

// ============================================
// ROUTES
// ============================================

app.use('/api/v1', routes);

// Static files for exports
app.use('/exports', express.static(process.env.EXPORT_DIR || './exports'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Sales Pipeline Module',
    version: '1.0.0',
    status: 'running',
    environment: NODE_ENV
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'NOT_FOUND'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    requestId: req.id,
    path: req.path
  });

  res.status(err.status || 500).json({
    success: false,
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: err.code || 'INTERNAL_ERROR',
    requestId: req.id
  });
});

// ============================================
// WEBSOCKET
// ============================================

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  // Token verification handled in socket connection
  next();
});

io.on('connection', (socket) => {
  logger.info('WebSocket client connected', { socketId: socket.id });

  // Join user's room for notifications
  socket.on('join', (userId) => {
    socket.join(`user:${userId}`);
    logger.debug(`User ${userId} joined socket room`);
  });

  // Subscribe to real-time updates
  socket.on('subscribe:pipeline', (pipelineId) => {
    socket.join(`pipeline:${pipelineId}`);
  });

  socket.on('subscribe:deal', (dealId) => {
    socket.join(`deal:${dealId}`);
  });

  socket.on('disconnect', () => {
    logger.info('WebSocket client disconnected', { socketId: socket.id });
  });
});

// Forward pub/sub events to sockets
const setupPubSubForwarding = async () => {
  try {
    await pubsub.subscribe('deal:*', (message) => {
      io.to(`pipeline:${message.pipelineId}`).emit('deal:update', message);
    });

    await pubsub.subscribe('notifications:*', (message) => {
      const channel = message.channel || '';
      const userId = channel.split(':')[1];
      if (userId) {
        io.to(`user:${userId}`).emit('notification', message);
      }
    });
  } catch (error) {
    logger.error('PubSub forwarding setup error:', error);
  }
};

// ============================================
// SCHEDULED JOBS
// ============================================

const startScheduledJobs = async () => {
  const cron = await import('node-cron');
  const ReminderService = (await import('./services/ReminderService.js')).default;

  // Task reminders - every 15 minutes
  cron.default.schedule('*/15 * * * *', async () => {
    try {
      await ReminderService.processTaskReminders();
    } catch (error) {
      logger.error('Task reminder job error:', error);
    }
  });

  // Follow-up reminders - every hour
  cron.default.schedule('0 * * * *', async () => {
    try {
      await ReminderService.processFollowUpReminders();
    } catch (error) {
      logger.error('Follow-up reminder job error:', error);
    }
  });

  // Stale deal alerts - daily at 9am
  cron.default.schedule('0 9 * * *', async () => {
    try {
      await ReminderService.processStaleDealAlerts();
    } catch (error) {
      logger.error('Stale deal alert job error:', error);
    }
  });

  // Meeting reminders - every 5 minutes
  cron.default.schedule('*/5 * * * *', async () => {
    try {
      await ReminderService.processMeetingReminders();
    } catch (error) {
      logger.error('Meeting reminder job error:', error);
    }
  });

  logger.info('Scheduled jobs started');
};

// ============================================
// STARTUP
// ============================================

const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase({
      alter: NODE_ENV === 'development',
      seed: true
    });

    // Check Redis
    await checkRedis();

    // Setup pub/sub
    await setupPubSubForwarding();

    // Start scheduled jobs
    if (process.env.ENABLE_CRON_JOBS !== 'false') {
      await startScheduledJobs();
    }

    // Start server
    server.listen(PORT, () => {
      logger.info(`
        =========================================
        Sales Pipeline Module Started
        =========================================
        Environment: ${NODE_ENV}
        Port: ${PORT}
        API: http://localhost:${PORT}/api/v1
        Health: http://localhost:${PORT}/api/v1/health
        =========================================
      `);
    });
  } catch (error) {
    logger.error('Server startup failed:', error);
    process.exit(1);
  }
};

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close database connection
      await sequelize.close();
      logger.info('Database connection closed');

      // Close Redis
      await closeRedis();
      logger.info('Redis connection closed');

      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force exit after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection:', { reason, promise });
});

// Start the server
startServer();

export { app, io };
