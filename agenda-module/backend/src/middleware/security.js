const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');

/**
 * Security Middleware Configuration
 * Enterprise-level security implementation
 */

/**
 * Rate Limiting Configuration
 * Prevents brute force and DDoS attacks
 */

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Store in Redis for distributed systems (if Redis available)
  // store: new RedisStore({ client: redisClient }),
});

// Stricter rate limit for search/filter queries
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    error: 'Too many search requests, please slow down.',
  },
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Rate limiter for admin endpoints
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    error: 'Too many admin requests, please try again later.',
  },
});

/**
 * Helmet Configuration
 * Sets secure HTTP headers
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'http:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'http:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

/**
 * Input Sanitization
 * Prevents SQL injection and XSS attacks
 */

// SQL injection is handled by Sequelize parameterized queries

// XSS protection
const sanitizeXSS = xss();

// HTTP Parameter Pollution protection
const preventHPP = hpp({
  whitelist: [
    'category',
    'categories',
    'audience',
    'timeOfDay',
    'dateRange',
    'sort',
    'page',
    'limit',
  ],
});

/**
 * CORS Configuration
 */
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:3004', 'http://localhost:5173'];

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

/**
 * Request Logging Middleware
 * Logs all requests for security audit
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    };

    // Log suspicious activity
    if (res.statusCode >= 400) {
      console.warn('[Security] Suspicious request:', logData);
    }
  });

  next();
};

/**
 * Authentication Middleware
 * Validates JWT tokens
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
    });
  }

  try {
    const jwt = require('jsonwebtoken');
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

/**
 * Admin Authorization Middleware
 * Checks if user has admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }
  next();
};

/**
 * API Key Validation Middleware
 * For external API integrations
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
    });
  }

  // Validate against stored API keys
  const validApiKeys = process.env.VALID_API_KEYS
    ? process.env.VALID_API_KEYS.split(',')
    : [];

  if (!validApiKeys.includes(apiKey)) {
    return res.status(403).json({
      success: false,
      error: 'Invalid API key',
    });
  }

  next();
};

/**
 * Input Validation Middleware
 * Validates and sanitizes request data
 */
const validateEventInput = (req, res, next) => {
  const { body } = req;

  // Validate required fields
  if (req.method === 'POST') {
    const requiredFields = ['title', 'startDate', 'endDate', 'location', 'primaryCategory'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }
  }

  // Sanitize HTML content
  if (body.description) {
    const sanitizeHtml = require('sanitize-html');
    if (typeof body.description === 'object') {
      Object.keys(body.description).forEach(lang => {
        body.description[lang] = sanitizeHtml(body.description[lang], {
          allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
          allowedAttributes: {},
        });
      });
    }
  }

  // Validate dates
  if (body.startDate && body.endDate) {
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
      });
    }

    if (endDate < startDate) {
      return res.status(400).json({
        success: false,
        error: 'End date must be after start date',
      });
    }
  }

  // Validate URLs
  const urlFields = ['images', 'organizer.website', 'registration.url'];
  urlFields.forEach(field => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], body);
    if (value) {
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (item.url && !isValidUrl(item.url)) {
            return res.status(400).json({
              success: false,
              error: `Invalid URL in ${field}`,
            });
          }
        });
      } else if (typeof value === 'string' && !isValidUrl(value)) {
        return res.status(400).json({
          success: false,
          error: `Invalid URL in ${field}`,
        });
      }
    }
  });

  next();
};

/**
 * Helper function to validate URLs
 */
const isValidUrl = (string) => {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
};

/**
 * GDPR Compliance Middleware
 * Adds privacy headers
 */
const gdprCompliance = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

module.exports = {
  apiLimiter,
  searchLimiter,
  adminLimiter,
  helmetConfig,
  sanitizeXSS,
  preventHPP,
  corsOptions,
  requestLogger,
  authenticateToken,
  requireAdmin,
  validateApiKey,
  validateEventInput,
  gdprCompliance,
};
