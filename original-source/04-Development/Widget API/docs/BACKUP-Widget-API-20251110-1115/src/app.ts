import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { searchRoutes } from './routes/search';
import { contextRoutes } from './routes/context';
import { healthRoutes } from './routes/health';
import { optionalAuth } from './middleware/authMiddleware';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Authentication middleware (optional)
app.use(optionalAuth);

// API routes
app.use('/api/search', searchRoutes);
app.use('/api/context', contextRoutes);
app.use('/api/health', healthRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Context-Aware Chat API',
    version: '1.0.0',
    endpoints: {
      search: '/api/search',
      context: '/api/context',
      health: '/api/health'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      details: `The requested endpoint ${req.originalUrl} does not exist`
    }
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }
  });
});

export default app;
