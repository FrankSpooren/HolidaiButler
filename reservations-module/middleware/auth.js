/**
 * Authentication Middleware
 * JWT-based authentication and authorization for the Reservations Module
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Verify JWT token and attach user to request
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header required',
      });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: 'Invalid authorization format. Use: Bearer <token>',
      });
    }

    const token = parts[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.userId || decoded.id || decoded.sub,
      email: decoded.email,
      role: decoded.role || 'user',
      restaurantId: decoded.restaurantId, // For restaurant staff
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
    }

    logger.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

/**
 * Optional authentication - continues if no token provided
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      req.user = null;
      return next();
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      req.user = null;
      return next();
    }

    const token = parts[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.userId || decoded.id || decoded.sub,
      email: decoded.email,
      role: decoded.role || 'user',
      restaurantId: decoded.restaurantId,
    };

    next();
  } catch (error) {
    // Silently continue without user
    req.user = null;
    next();
  }
};

/**
 * Require admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }

  next();
};

/**
 * Require restaurant staff role (staff, manager, or admin)
 */
const requireRestaurantStaff = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const allowedRoles = ['staff', 'manager', 'admin'];

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Restaurant staff access required',
    });
  }

  next();
};

/**
 * Require restaurant manager role (manager or admin)
 */
const requireRestaurantManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const allowedRoles = ['manager', 'admin'];

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Restaurant manager access required',
    });
  }

  next();
};

/**
 * Verify user owns the resource or is admin
 */
const requireOwnerOrAdmin = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

    if (req.user.role === 'admin' || req.user.id === resourceUserId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Access denied',
    });
  };
};

/**
 * Verify restaurant access (user must be staff of the restaurant)
 */
const requireRestaurantAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const restaurantId = req.params.restaurantId || req.body.restaurantId || req.headers['x-restaurant-id'];

  if (req.user.role === 'admin') {
    return next();
  }

  if (!req.user.restaurantId || req.user.restaurantId !== restaurantId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied to this restaurant',
    });
  }

  next();
};

/**
 * API Key authentication (for external integrations)
 */
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
    });
  }

  // Validate API key (in production, check against database)
  if (apiKey !== process.env.API_KEY_SECRET) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key',
    });
  }

  req.isApiKeyAuth = true;
  next();
};

/**
 * Webhook signature verification (for TheFork, Google, etc.)
 */
const verifyWebhookSignature = (provider) => {
  return (req, res, next) => {
    const signature = req.headers['x-webhook-signature'] || req.headers['x-hub-signature-256'];

    if (!signature) {
      logger.warn(`Webhook ${provider}: Missing signature`);
      return res.status(401).json({
        success: false,
        error: 'Webhook signature required',
      });
    }

    // Get the appropriate secret based on provider
    let secret;
    switch (provider) {
      case 'thefork':
        secret = process.env.THEFORK_WEBHOOK_SECRET;
        break;
      case 'google':
        secret = process.env.GOOGLE_WEBHOOK_SECRET;
        break;
      case 'adyen':
        secret = process.env.ADYEN_WEBHOOK_SECRET;
        break;
      default:
        secret = process.env.WEBHOOK_SECRET;
    }

    if (!secret) {
      logger.error(`Webhook ${provider}: Secret not configured`);
      return res.status(500).json({
        success: false,
        error: 'Webhook secret not configured',
      });
    }

    // Verify signature using HMAC
    const crypto = require('crypto');
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const signatureToCompare = signature.replace('sha256=', '');

    if (!crypto.timingSafeEqual(Buffer.from(signatureToCompare), Buffer.from(expectedSignature))) {
      logger.warn(`Webhook ${provider}: Invalid signature`);
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook signature',
      });
    }

    req.webhookProvider = provider;
    next();
  };
};

/**
 * Generate JWT token (helper function)
 */
const generateToken = (payload, expiresIn = '24h') => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

/**
 * Verify and decode token without throwing (helper function)
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  authenticate,
  optionalAuth,
  requireAdmin,
  requireRestaurantStaff,
  requireRestaurantManager,
  requireOwnerOrAdmin,
  requireRestaurantAccess,
  apiKeyAuth,
  verifyWebhookSignature,
  generateToken,
  verifyToken,
};
