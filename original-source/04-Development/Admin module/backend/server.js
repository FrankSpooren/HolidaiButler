import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import database config
import { testDatabaseConnection, closePool } from './config/database.js';

// Import routes
import adminAuthRoutes from './routes/adminAuth.js';
import adminPOIRoutes from './routes/adminPOI.js';
import adminUploadRoutes from './routes/adminUpload.js';
import adminPlatformRoutes from './routes/adminPlatform.js';
import adminReportsRoutes from './routes/adminReports.js';
import adminAnalyticsRoutes from './routes/adminAnalytics.js';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();

// MySQL connection test
testDatabaseConnection()
  .then(() => {
    console.log('✅ MySQL database connected successfully');
  })
  .catch((error) => {
    console.error('❌ MySQL database connection error:', error);
    console.error('Please check your .env file and database configuration');
    process.exit(1);
  });

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); // Security headers
app.use(cors({
  origin: function (origin, callback) {
    // Allow multiple frontend ports (Vite tries 5174, 5175, 5176, etc.)
    const allowedOrigins = [
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      process.env.ADMIN_FRONTEND_URL
    ].filter(Boolean);

    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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
app.use('/api/admin/reports', adminReportsRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);

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

  // MySQL duplicate entry error
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry - this record already exists'
    });
  }

  // MySQL foreign key constraint error
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete/update record due to existing references'
    });
  }

  // MySQL data too long error
  if (err.code === 'ER_DATA_TOO_LONG') {
    return res.status(400).json({
      success: false,
      message: 'Data too long for one or more fields'
    });
  }

  // MySQL connection errors
  if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      message: 'Database connection error - please try again'
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
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await closePool();
    console.log('MySQL connection pool closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await closePool();
    console.log('MySQL connection pool closed');
    process.exit(0);
  });
});

export default app;
