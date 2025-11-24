/**
 * Input Validation and Sanitization Utilities
 *
 * Enterprise-grade input validation with:
 * - SQL injection prevention
 * - XSS prevention
 * - Type validation
 * - Sanitization
 */

import Joi from 'joi';
import validator from 'validator';
import sanitizeHtml from 'sanitize-html';

/**
 * Validation schemas for common inputs
 */
export const schemas = {
  // UUIDs
  uuid: Joi.string().uuid({ version: 'uuidv4' }).required(),
  uuidOptional: Joi.string().uuid({ version: 'uuidv4' }).optional(),

  // Pagination
  pagination: Joi.object({
    limit: Joi.number().integer().min(1).max(1000).default(50),
    offset: Joi.number().integer().min(0).default(0),
    page: Joi.number().integer().min(1).optional(),
    perPage: Joi.number().integer().min(1).max(100).optional()
  }),

  // POI Image Discovery
  imageDiscovery: Joi.object({
    sources: Joi.array()
      .items(Joi.string().valid('flickr', 'unsplash', 'google_places'))
      .default(['flickr', 'unsplash']),
    maxImages: Joi.number().integer().min(1).max(100).default(10)
  }),

  // Image Status
  imageStatus: Joi.string()
    .valid('pending', 'approved', 'rejected', 'flagged', 'archived')
    .optional(),

  // POI Tiers
  tiers: Joi.array()
    .items(Joi.number().integer().min(1).max(4))
    .min(1)
    .max(4)
    .default([1, 2, 3, 4]),

  // Queue Configuration
  queueConfig: Joi.object({
    tiers: Joi.array().items(Joi.number().integer().min(1).max(4)),
    maxPOIs: Joi.number().integer().min(1).max(10000).default(100),
    forceReprocess: Joi.boolean().default(false)
  }),

  // Queue Processing
  queueProcessing: Joi.object({
    batchSize: Joi.number().integer().min(1).max(100).default(10),
    maxProcessingTime: Joi.number().integer().min(10000).max(3600000).default(300000)
  }),

  // Moderation
  moderation: Joi.object({
    moderatorId: Joi.string().uuid().optional(),
    reason: Joi.string().max(1000).optional(),
    setPrimary: Joi.boolean().default(false)
  }),

  // Coordinates
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  }),

  // Quality Score
  qualityScore: Joi.number().min(0).max(10).precision(2)
};

/**
 * Validate input against schema
 */
export function validate(data, schema, options = {}) {
  const defaultOptions = {
    abortEarly: false,
    stripUnknown: true,
    ...options
  };

  const { error, value } = schema.validate(data, defaultOptions);

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      type: detail.type
    }));

    throw new ValidationError('Validation failed', errors);
  }

  return value;
}

/**
 * Custom validation error
 */
export class ValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
    this.statusCode = 400;
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      errors: this.errors
    };
  }
}

/**
 * Sanitize string input
 */
export function sanitizeString(input, maxLength = 1000) {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Escape special characters
  sanitized = validator.escape(sanitized);

  return sanitized;
}

/**
 * Sanitize HTML input
 */
export function sanitizeHtmlInput(input, options = {}) {
  if (typeof input !== 'string') {
    return '';
  }

  const defaultOptions = {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
    ...options
  };

  return sanitizeHtml(input, defaultOptions);
}

/**
 * Sanitize object for SQL safe usage
 */
export function sanitizeForSQL(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    // Validate key name (alphanumeric + underscore only)
    if (!/^[a-zA-Z0-9_]+$/.test(key)) {
      throw new ValidationError(`Invalid key name: ${key}`);
    }

    // Sanitize value based on type
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'number') {
      sanitized[key] = value;
    } else if (typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (value === null) {
      sanitized[key] = null;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(v => sanitizeForSQL(v));
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeForSQL(value);
    } else {
      // Skip unknown types
      continue;
    }
  }

  return sanitized;
}

/**
 * Validate UUID
 */
export function isValidUUID(uuid) {
  return validator.isUUID(uuid, 4);
}

/**
 * Validate URL
 */
export function isValidURL(url, options = {}) {
  const defaultOptions = {
    protocols: ['http', 'https'],
    require_protocol: true,
    ...options
  };

  return validator.isURL(url, defaultOptions);
}

/**
 * Validate email
 */
export function isValidEmail(email) {
  return validator.isEmail(email);
}

/**
 * Validate coordinates
 */
export function isValidCoordinates(lat, lon) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  return (
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Validate image source
 */
export function isValidImageSource(source) {
  const validSources = ['flickr', 'unsplash', 'google_places', 'manual', 'user_upload'];
  return validSources.includes(source);
}

/**
 * Validate image status
 */
export function isValidImageStatus(status) {
  const validStatuses = ['pending', 'approved', 'rejected', 'flagged', 'archived'];
  return validStatuses.includes(status);
}

/**
 * Validate POI tier
 */
export function isValidTier(tier) {
  const t = parseInt(tier);
  return !isNaN(t) && t >= 1 && t <= 4;
}

/**
 * Rate limit key validation
 */
export function isValidRateLimitKey(key) {
  // Allow alphanumeric, underscore, hyphen, dot, colon
  return /^[a-zA-Z0-9_\-.:]+$/.test(key);
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename) {
  if (typeof filename !== 'string') {
    return '';
  }

  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '');

  // Remove special characters except dot, hyphen, underscore
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop();
    const name = sanitized.substring(0, 255 - ext.length - 1);
    sanitized = `${name}.${ext}`;
  }

  return sanitized;
}

/**
 * Validate and sanitize search query
 */
export function sanitizeSearchQuery(query, maxLength = 200) {
  if (typeof query !== 'string') {
    return '';
  }

  // Remove SQL injection attempts
  let sanitized = query
    .replace(/('|(--|;|\/\*|\*\/|xp_|sp_|exec|execute|union|select|insert|update|delete|drop|create|alter|script))/gi, '');

  // Trim and limit length
  sanitized = sanitized.trim();
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validate JSON string
 */
export function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize JSON input
 */
export function sanitizeJSON(input, maxDepth = 5) {
  if (typeof input === 'string') {
    if (!isValidJSON(input)) {
      throw new ValidationError('Invalid JSON string');
    }
    input = JSON.parse(input);
  }

  function sanitizeValue(value, depth = 0) {
    if (depth > maxDepth) {
      throw new ValidationError('JSON depth exceeds maximum allowed');
    }

    if (value === null) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return sanitizeString(value);

    if (Array.isArray(value)) {
      return value.map(v => sanitizeValue(v, depth + 1));
    }

    if (typeof value === 'object') {
      const sanitized = {};
      for (const [key, val] of Object.entries(value)) {
        const sanitizedKey = sanitizeString(key, 100);
        sanitized[sanitizedKey] = sanitizeValue(val, depth + 1);
      }
      return sanitized;
    }

    return null;
  }

  return sanitizeValue(input);
}

/**
 * Express middleware for request validation
 */
export function validateRequest(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const data = req[source];
      req.validated = validate(data, schema);
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json(error.toJSON());
      }
      next(error);
    }
  };
}

/**
 * Express middleware for UUID parameter validation
 */
export function validateUUIDParam(paramName = 'id') {
  return (req, res, next) => {
    const uuid = req.params[paramName];

    if (!uuid) {
      return res.status(400).json({
        error: 'ValidationError',
        message: `Missing required parameter: ${paramName}`
      });
    }

    if (!isValidUUID(uuid)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: `Invalid UUID format for parameter: ${paramName}`,
        value: uuid
      });
    }

    next();
  };
}

/**
 * Validate and sanitize sort parameters
 */
export function sanitizeSortParams(sortBy, sortOrder = 'asc') {
  // Whitelist of allowed sort fields
  const allowedFields = [
    'created_at',
    'updated_at',
    'quality_score',
    'resolution_score',
    'geo_accuracy_score',
    'tag_relevance_score',
    'source_type',
    'status',
    'is_primary'
  ];

  const sanitizedSortBy = String(sortBy || 'created_at');
  const sanitizedOrder = String(sortOrder || 'asc').toLowerCase();

  if (!allowedFields.includes(sanitizedSortBy)) {
    throw new ValidationError(`Invalid sort field: ${sanitizedSortBy}`);
  }

  if (!['asc', 'desc'].includes(sanitizedOrder)) {
    throw new ValidationError(`Invalid sort order: ${sanitizedOrder}`);
  }

  return {
    sortBy: sanitizedSortBy,
    sortOrder: sanitizedOrder
  };
}

export default {
  validate,
  schemas,
  ValidationError,
  sanitizeString,
  sanitizeHtmlInput,
  sanitizeForSQL,
  sanitizeSearchQuery,
  sanitizeFilename,
  sanitizeJSON,
  isValidUUID,
  isValidURL,
  isValidEmail,
  isValidCoordinates,
  isValidImageSource,
  isValidImageStatus,
  isValidTier,
  isValidJSON,
  validateRequest,
  validateUUIDParam,
  sanitizeSortParams
};
