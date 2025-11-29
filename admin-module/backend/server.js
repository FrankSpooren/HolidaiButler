import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import database and models
import { sequelize, AdminUser, Booking, Event, PlatformConfig, Reservation, Ticket, Transaction } from './models/index.js';
import { testConnection, syncDatabase } from './config/database.js';

// Import routes
import adminAuthRoutes from './routes/adminAuth.js';
import adminPOIRoutes from './routes/adminPOI.js';
import adminUploadRoutes from './routes/adminUpload.js';
import adminPlatformRoutes from './routes/adminPlatform.js';
import adminUsersRoutes from './routes/adminUsers.js';
import adminEventsRoutes from './routes/adminEvents.js';
import adminReservationsRoutes from './routes/adminReservations.js';
import adminTicketsRoutes from './routes/adminTickets.js';
import adminBookingsRoutes from './routes/adminBookings.js';
import adminTransactionsRoutes from './routes/adminTransactions.js';
import monitoringRoutes from './routes/monitoring.js';

// Import enterprise services
import cacheService from './services/cache.js';
import metricsService from './services/metrics.js';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();

// Initialize services
async function initializeServices() {
  try {
    // Connect to MySQL Database
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ MySQL database connection failed');
      process.exit(1);
    }

    // Sync database in development mode
    if (process.env.NODE_ENV === 'development') {
      await syncDatabase(false); // Set to true to force recreate tables
      console.log('✅ Database synchronized');
    }

    // Connect to Redis cache (optional)
    try {
      const cacheConnected = await cacheService.connect();
      if (cacheConnected) {
        console.log('✅ Redis cache initialized');
      } else {
        console.warn('⚠️  Redis cache not available (performance may be degraded)');
      }
    } catch (redisError) {
      console.warn('⚠️  Redis cache not available:', redisError.message);
    }

    console.log('✅ All services initialized');
  } catch (error) {
    console.error('❌ Service initialization error:', error);
    process.exit(1);
  }
}

initializeServices();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); // Security headers
app.use(cors({
  origin: process.env.ADMIN_FRONTEND_URL || 'http://localhost:5174',
  credentials: true
})); // CORS
app.use(morgan('dev')); // Logging
app.use(express.json({ limit: '10mb' })); // Body parser
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root health check endpoint
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      success: true,
      service: 'admin-module',
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      service: 'admin-module',
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// API Routes
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/pois', adminPOIRoutes);
app.use('/api/admin/upload', adminUploadRoutes);
app.use('/api/admin/platform', adminPlatformRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/events', adminEventsRoutes);
app.use('/api/admin/reservations', adminReservationsRoutes);
app.use('/api/admin/tickets', adminTicketsRoutes);
app.use('/api/admin/bookings', adminBookingsRoutes);
app.use('/api/admin/transactions', adminTransactionsRoutes);

// Enterprise monitoring routes
app.use('/api/admin/monitoring', monitoringRoutes);

// Health check endpoint
app.get('/api/admin/health', async (req, res) => {
  try {
    // Check database connection
    await sequelize.authenticate();

    res.json({
      success: true,
      message: 'Admin API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'MySQL connected',
      version: '2.0.0'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Admin API degraded',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Database info endpoint (development only)
if (process.env.NODE_ENV === 'development') {
  app.get('/api/admin/db-info', async (req, res) => {
    try {
      const models = Object.keys(sequelize.models);
      res.json({
        success: true,
        database: 'MySQL',
        models,
        dialect: sequelize.getDialect()
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors
    });
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const fields = err.errors.map(e => e.path);
    return res.status(400).json({
      success: false,
      message: `${fields.join(', ')} already exists`
    });
  }

  // Sequelize database error
  if (err.name === 'SequelizeDatabaseError') {
    return res.status(500).json({
      success: false,
      message: 'Database error',
      ...(process.env.NODE_ENV === 'development' && { detail: err.message })
    });
  }

  // Sequelize foreign key constraint error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Referenced record does not exist or cannot be deleted due to dependencies'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.ADMIN_PORT || 3003;

const server = app.listen(PORT, () => {
  console.log(`🚀 Admin API server running on port ${PORT}`);
  console.log(`🌐 Admin API: http://localhost:${PORT}/api/admin`);
  console.log(`📁 Uploads: http://localhost:${PORT}/uploads`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Database: MySQL/Sequelize`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    try {
      await sequelize.close();
      console.log('MySQL connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    try {
      await sequelize.close();
      console.log('MySQL connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
    process.exit(0);
  });
});

export default app;
