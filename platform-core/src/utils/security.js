/**
 * Security Utilities
 * Centralized security configuration and validation
 */

import logger from './logger.js';

/**
 * Get JWT Secret - MUST be configured via environment variable
 * Throws error if not configured in production
 */
export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('CRITICAL: JWT_SECRET not configured in production');
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    logger.warn('WARNING: JWT_SECRET not configured, using development fallback');
    return 'dev-jwt-secret-DO-NOT-USE-IN-PRODUCTION';
  }

  // Validate secret strength
  if (secret.length < 32) {
    logger.warn('WARNING: JWT_SECRET should be at least 32 characters for security');
  }

  return secret;
};

/**
 * Get Admin JWT Secret
 */
export const getAdminJwtSecret = () => {
  const secret = process.env.JWT_ADMIN_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('CRITICAL: JWT_ADMIN_SECRET not configured in production');
      throw new Error('JWT_ADMIN_SECRET environment variable is required in production');
    }
    logger.warn('WARNING: JWT_ADMIN_SECRET not configured, using development fallback');
    return 'dev-admin-jwt-secret-DO-NOT-USE-IN-PRODUCTION';
  }

  return secret;
};

/**
 * Get Refresh Token Secret
 */
export const getRefreshTokenSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('CRITICAL: JWT_REFRESH_SECRET not configured in production');
      throw new Error('JWT_REFRESH_SECRET environment variable is required in production');
    }
    logger.warn('WARNING: JWT_REFRESH_SECRET not configured, using development fallback');
    return 'dev-refresh-jwt-secret-DO-NOT-USE-IN-PRODUCTION';
  }

  return secret;
};

/**
 * Validate required security configuration at startup
 */
export const validateSecurityConfig = () => {
  const issues = [];

  // Check JWT secrets
  if (!process.env.JWT_SECRET) {
    issues.push('JWT_SECRET not configured');
  } else if (process.env.JWT_SECRET.length < 32) {
    issues.push('JWT_SECRET is too short (minimum 32 characters)');
  }

  if (!process.env.JWT_ADMIN_SECRET) {
    issues.push('JWT_ADMIN_SECRET not configured');
  }

  if (!process.env.JWT_REFRESH_SECRET) {
    issues.push('JWT_REFRESH_SECRET not configured');
  }

  // Check CORS configuration
  if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN === '*') {
    if (process.env.NODE_ENV === 'production') {
      issues.push('CORS_ORIGIN should be explicitly configured (not wildcard)');
    }
  }

  // Check database credentials
  if (process.env.DATABASE_USER === 'root') {
    issues.push('Using root database user - create a limited user instead');
  }

  // Log results
  if (issues.length > 0) {
    logger.warn('Security configuration issues detected:');
    issues.forEach((issue, index) => {
      logger.warn(`  ${index + 1}. ${issue}`);
    });

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Security configuration validation failed: ${issues.length} issues found`);
    }
  } else {
    logger.info('Security configuration validated successfully');
  }

  return issues;
};

/**
 * Password Strength Validator
 * Follows NIST guidelines
 */
export const validatePasswordStrength = (password) => {
  const errors = [];

  if (!password || password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common passwords (simplified)
  const commonPasswords = [
    'password', '123456', 'qwerty', 'admin', 'letmein',
    'welcome', 'monkey', 'dragon', 'master', 'login'
  ];

  if (commonPasswords.some(cp => password.toLowerCase().includes(cp))) {
    errors.push('Password contains common patterns');
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: errors.length === 0 ? 'strong' :
              errors.length <= 2 ? 'medium' : 'weak'
  };
};

/**
 * Input Sanitization
 */
export const sanitizeInput = (input, options = {}) => {
  if (typeof input !== 'string') return input;

  let sanitized = input;

  // Trim whitespace
  sanitized = sanitized.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Escape SQL special characters for LIKE queries
  if (options.sqlLike) {
    sanitized = sanitized.replace(/[%_]/g, '\\$&');
  }

  // Escape HTML entities
  if (options.html) {
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  // Limit length
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized;
};

/**
 * Mask sensitive data for logging
 */
export const maskSensitiveData = (data, sensitiveFields = []) => {
  if (!data || typeof data !== 'object') return data;

  const defaultSensitiveFields = [
    'password', 'token', 'secret', 'apiKey', 'api_key',
    'authorization', 'cookie', 'refreshToken', 'accessToken',
    'creditCard', 'ssn', 'cardNumber', 'cvv', 'pin'
  ];

  const fieldsToMask = [...defaultSensitiveFields, ...sensitiveFields];
  const masked = { ...data };

  const maskValue = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        maskValue(obj[key]);
      } else if (fieldsToMask.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
        obj[key] = '***REDACTED***';
      }
    }
  };

  maskValue(masked);
  return masked;
};

/**
 * Rate Limiter Configuration
 */
export const rateLimitConfigs = {
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: 'Too many authentication attempts, please try again later'
  },

  // Password reset
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts
    message: 'Too many password reset requests, please try again later'
  },

  // API general
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests
    message: 'Too many requests, please slow down'
  },

  // Admin operations
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests
    message: 'Rate limit exceeded for admin operations'
  },

  // Payment operations
  payment: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 payment attempts per hour
    message: 'Too many payment attempts, please try again later'
  }
};

/**
 * Security Headers Configuration
 */
export const securityHeadersConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.API_URL || 'http://localhost:3001'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
};

export default {
  getJwtSecret,
  getAdminJwtSecret,
  getRefreshTokenSecret,
  validateSecurityConfig,
  validatePasswordStrength,
  sanitizeInput,
  maskSensitiveData,
  rateLimitConfigs,
  securityHeadersConfig
};
