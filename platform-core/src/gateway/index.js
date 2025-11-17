/**
 * API Gateway
 * Routes requests to appropriate microservices
 */

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import logger from '../utils/logger.js';
import { authenticate } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all gateway routes
router.use(limiter);

/**
 * Proxy configuration for each module
 */
const proxyOptions = {
  changeOrigin: true,
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  onProxyReq: (proxyReq, req, res) => {
    // Log outgoing requests
    logger.moduleCall(
      req.originalUrl.split('/')[3], // Extract module name
      req.method + ' ' + req.path,
      { userId: req.user?.id }
    );

    // Forward authentication headers
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }

    // Add platform correlation ID
    proxyReq.setHeader('X-Platform-Request-Id', req.id || Date.now().toString());
  },
  onProxyRes: (proxyRes, req, res) => {
    // Add platform headers to response
    proxyRes.headers['X-Powered-By'] = 'HolidaiButler-Platform';
  },
  onError: (err, req, res) => {
    logger.error('Proxy Error:', {
      url: req.originalUrl,
      error: err.message,
    });

    res.status(503).json({
      error: 'Service Temporarily Unavailable',
      message: 'The requested service is currently unavailable. Please try again later.',
    });
  },
};

/**
 * Admin Module Routes
 * Proxies to admin-module (port 3003)
 */
router.use(
  '/admin',
  createProxyMiddleware({
    ...proxyOptions,
    target: process.env.ADMIN_MODULE_URL || 'http://localhost:3003',
    pathRewrite: {
      '^/api/v1/admin': '/api/admin',
    },
  })
);

/**
 * Ticketing Module Routes
 * Proxies to ticketing-module (port 3004)
 */
router.use(
  '/tickets',
  createProxyMiddleware({
    ...proxyOptions,
    target: process.env.TICKETING_MODULE_URL || 'http://localhost:3004',
    pathRewrite: {
      '^/api/v1/tickets': '/api/v1/tickets',
    },
  })
);

/**
 * Payment Module Routes
 * Proxies to payment-module (port 3005)
 */
router.use(
  '/payments',
  createProxyMiddleware({
    ...proxyOptions,
    target: process.env.PAYMENT_MODULE_URL || 'http://localhost:3005',
    pathRewrite: {
      '^/api/v1/payments': '/api/v1/payments',
    },
  })
);

/**
 * Platform Frontend Routes
 * Proxies to main platform (port 3002)
 */
router.use(
  '/platform',
  createProxyMiddleware({
    ...proxyOptions,
    target: process.env.PLATFORM_FRONTEND_URL || 'http://localhost:3002',
    pathRewrite: {
      '^/api/v1/platform': '/api',
    },
  })
);

/**
 * Health check for all services
 */
router.get('/health/all', async (req, res) => {
  const axios = (await import('axios')).default;

  const services = {
    admin: process.env.ADMIN_MODULE_URL || 'http://localhost:3003',
    ticketing: process.env.TICKETING_MODULE_URL || 'http://localhost:3004',
    payment: process.env.PAYMENT_MODULE_URL || 'http://localhost:3005',
  };

  const results = {};

  for (const [name, url] of Object.entries(services)) {
    try {
      const response = await axios.get(`${url}/health`, { timeout: 3000 });
      results[name] = {
        status: 'healthy',
        responseTime: response.headers['x-response-time'] || 'N/A',
      };
    } catch (error) {
      results[name] = {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  const allHealthy = Object.values(results).every(r => r.status === 'healthy');

  res.status(allHealthy ? 200 : 503).json({
    platform: 'HolidaiButler',
    gateway: 'healthy',
    services: results,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Service discovery endpoint
 */
router.get('/services', (req, res) => {
  res.json({
    services: [
      {
        name: 'admin',
        url: process.env.ADMIN_MODULE_URL || 'http://localhost:3003',
        endpoints: ['/api/admin/auth', '/api/admin/pois', '/api/admin/platform'],
        status: 'active',
      },
      {
        name: 'ticketing',
        url: process.env.TICKETING_MODULE_URL || 'http://localhost:3004',
        endpoints: ['/api/v1/tickets/bookings', '/api/v1/tickets/availability'],
        status: 'active',
      },
      {
        name: 'payment',
        url: process.env.PAYMENT_MODULE_URL || 'http://localhost:3005',
        endpoints: ['/api/v1/payments', '/api/v1/webhooks/adyen'],
        status: 'active',
      },
    ],
    timestamp: new Date().toISOString(),
  });
});

export default router;
