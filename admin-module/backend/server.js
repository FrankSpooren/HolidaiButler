import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import routes
import adminAuthRoutes from './routes/adminAuth.js';
import adminPOIRoutes from './routes/adminPOI.js';
import adminUploadRoutes from './routes/adminUpload.js';
import adminPlatformRoutes from './routes/adminPlatform.js';
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

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/holidaibutler';

// Initialize services
async function initializeServices() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected successfully');

    // Connect to Redis cache
    const cacheConnected = await cacheService.connect();
    if (cacheConnected) {
      console.log('✅ Redis cache initialized');
    } else {
      console.warn('⚠️  Redis cache not available (performance may be degraded)');
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

// API Routes
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/pois', adminPOIRoutes);
app.use('/api/admin/upload', adminUploadRoutes);
app.use('/api/admin/platform', adminPlatformRoutes);

// Enterprise monitoring routes
app.use('/api/admin/monitoring', monitoringRoutes);

// Health check endpoint
app.get('/api/admin/health', (req, res) => {
  res.json({
    success: true,
    message: 'Admin API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

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

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  // Duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
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

app.listen(PORT, () => {
  console.log(`🚀 Admin API server running on port ${PORT}`);
  console.log(`🌐 Admin API: http://localhost:${PORT}/api/admin`);
  console.log(`📁 Uploads: http://localhost:${PORT}/uploads`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

export default app;
