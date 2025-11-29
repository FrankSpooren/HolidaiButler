/**
 * Input Validation Middleware
 * Joi-based request validation for enterprise-grade data integrity
 */

import Joi from 'joi';
import logger from '../utils/logger.js';

/**
 * Validate request against Joi schema
 */
export function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown fields
      convert: true, // Type conversion
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));

      logger.warn('Validation failed', {
        url: req.originalUrl,
        method: req.method,
        errors,
        body: req.body,
      });

      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Request validation failed',
        errors,
      });
    }

    // Replace req.body with validated & sanitized value
    req.body = value;
    next();
  };
}

/**
 * Validate query parameters
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: 'Query Validation Error',
        errors,
      });
    }

    req.query = value;
    next();
  };
}

/**
 * Validate URL parameters
 */
export function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: 'Parameter Validation Error',
        errors,
      });
    }

    req.params = value;
    next();
  };
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // UUID validation
  uuid: Joi.string().uuid({ version: 'uuidv4' }).required(),

  // Pagination
  pagination: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
    page: Joi.number().integer().min(1),
  }),

  // Coordinates
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180),

  // Common strings
  nonEmptyString: Joi.string().trim().min(1).max(500),
  url: Joi.string().uri().max(2000),
  email: Joi.string().email().max(255),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).max(20),

  // Arrays
  categories: Joi.array().items(
    Joi.string().valid(
      'food_drinks',
      'museum',
      'beach',
      'historical',
      'routes',
      'healthcare',
      'shopping',
      'activities',
      'accommodation',
      'nightlife'
    )
  ).min(1).max(10),

  // Boolean
  boolean: Joi.boolean().default(true),
};

/**
 * POI Discovery validation schemas
 */
export const discoverySchemas = {
  // POST /destination
  destination: Joi.object({
    destination: Joi.string().trim().min(3).max(255).required()
      .messages({
        'string.empty': 'Destination is required',
        'string.min': 'Destination must be at least 3 characters',
        'string.max': 'Destination cannot exceed 255 characters',
      }),

    categories: commonSchemas.categories.optional(),

    criteria: Joi.object({
      minReviews: Joi.number().integer().min(0).max(10000).default(10),
      minRating: Joi.number().min(0).max(5).default(3.5),
      maxRating: Joi.number().min(0).max(5).default(5),
      priceLevel: Joi.array().items(Joi.number().integer().min(1).max(4)).min(1).max(4).default([1,2,3,4]),
      radius: Joi.number().integer().min(100).max(50000).default(5000),
    }).optional().default(),

    sources: Joi.array().items(
      Joi.string().valid('google_places', 'tripadvisor', 'osm', 'openstreetmap')
    ).min(1).max(5).default(['google_places']),

    maxPOIsPerCategory: Joi.number().integer().min(1).max(500).default(50),
    autoClassify: commonSchemas.boolean,
    autoEnrich: commonSchemas.boolean,
    configId: commonSchemas.uuid.optional(),
  }),

  // POST /configs
  config: Joi.object({
    name: Joi.string().trim().min(3).max(255).required(),
    description: Joi.string().trim().max(2000).optional().allow(''),
    categories: commonSchemas.categories.required(),
    criteria: Joi.object({
      minReviews: Joi.number().integer().min(0).max(10000),
      minRating: Joi.number().min(0).max(5),
      maxRating: Joi.number().min(0).max(5),
      priceLevel: Joi.array().items(Joi.number().integer().min(1).max(4)),
      radius: Joi.number().integer().min(100).max(50000),
    }).required(),
    sources: Joi.array().items(
      Joi.string().valid('google_places', 'tripadvisor', 'osm', 'openstreetmap')
    ).min(1).max(5).required(),
    maxPOIsPerCategory: Joi.number().integer().min(1).max(500).default(50),
    autoClassify: commonSchemas.boolean,
    autoEnrich: commonSchemas.boolean,
    tags: Joi.array().items(Joi.string().trim().max(50)).max(10).default([]),
  }),

  // PUT /configs/:id
  configUpdate: Joi.object({
    name: Joi.string().trim().min(3).max(255).optional(),
    description: Joi.string().trim().max(2000).optional().allow(''),
    categories: commonSchemas.categories.optional(),
    criteria: Joi.object({
      minReviews: Joi.number().integer().min(0).max(10000),
      minRating: Joi.number().min(0).max(5),
      maxRating: Joi.number().min(0).max(5),
      priceLevel: Joi.array().items(Joi.number().integer().min(1).max(4)),
      radius: Joi.number().integer().min(100).max(50000),
    }).optional(),
    sources: Joi.array().items(
      Joi.string().valid('google_places', 'tripadvisor', 'osm', 'openstreetmap')
    ).min(1).optional(),
    maxPOIsPerCategory: Joi.number().integer().min(1).max(500).optional(),
    autoClassify: commonSchemas.boolean.optional(),
    autoEnrich: commonSchemas.boolean.optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).max(10).optional(),
    active: commonSchemas.boolean.optional(),
  }).min(1), // At least one field must be updated

  // Query params
  runQuery: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    destination: Joi.string().trim().max(255).optional(),
  }),

  configQuery: Joi.object({
    active: Joi.string().valid('true', 'false').default('true'),
  }),
};

export default {
  validate,
  validateQuery,
  validateParams,
  commonSchemas,
  discoverySchemas,
};
