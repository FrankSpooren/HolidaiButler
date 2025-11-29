/**
 * Input Validation Middleware
 * Enterprise-level input validation and sanitization
 */

import { body, param, query, validationResult } from 'express-validator';
import Joi from 'joi';
import logger from '../utils/logger.js';

/**
 * Validate request and return errors
 */
export function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.warn('Validation failed:', {
      errors: errors.array(),
      url: req.originalUrl,
      ip: req.ip,
    });

    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input data',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }

  next();
}

/**
 * Sanitize string input
 */
export function sanitizeString(value) {
  if (typeof value !== 'string') return value;

  // Remove potential XSS
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * POI Classification Validation Rules
 */
export const poiClassificationValidation = {
  // Classify POI
  classify: [
    param('poiId').isUUID().withMessage('Invalid POI ID'),
    body('updateData').optional().isBoolean(),
    body('sources').optional().isArray(),
    body('sources.*').optional().isIn([
      'google_places',
      'tripadvisor',
      'booking_com',
      'thefork',
      'trustpilot',
    ]),
    validate,
  ],

  // Batch classify
  batchClassify: [
    body('poiIds').isArray({ min: 1, max: 100 }).withMessage('poiIds must be array of 1-100 UUIDs'),
    body('poiIds.*').isUUID().withMessage('Each POI ID must be valid UUID'),
    body('updateData').optional().isBoolean(),
    body('sources').optional().isArray(),
    validate,
  ],

  // Discover POIs
  discover: [
    body('city').notEmpty().isString().isLength({ min: 2, max: 100 }),
    body('category').optional().isIn([
      'food_drinks',
      'museum',
      'beach',
      'historical',
      'routes',
      'healthcare',
      'shopping',
      'activities',
      'accommodation',
      'nightlife',
    ]),
    body('maxResults').optional().isInt({ min: 1, max: 100 }),
    validate,
  ],

  // Weather recommendations
  weatherRecommendations: [
    query('city').notEmpty().isString(),
    query('weather').notEmpty().isIn(['sunny', 'cloudy', 'rain', 'storm', 'snow']),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    validate,
  ],

  // Balance tiers
  balanceTiers: [
    body('tier').isInt({ min: 1, max: 4 }),
    body('city').optional().isString().isLength({ min: 2, max: 100 }),
    validate,
  ],

  // Get tier
  getTier: [
    param('tier').isInt({ min: 1, max: 4 }),
    query('city').optional().isString(),
    query('category').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 500 }),
    validate,
  ],
};

/**
 * Joi Schema for POI data
 */
export const poiSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  slug: Joi.string().pattern(/^[a-z0-9-]+$/).max(255).required(),
  description: Joi.string().max(5000).allow('', null),
  category: Joi.string().valid(
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
  ).required(),
  address: Joi.string().max(500).allow('', null),
  city: Joi.string().min(2).max(100).required(),
  region: Joi.string().max(100).allow('', null),
  country: Joi.string().min(2).max(100).default('Netherlands'),
  latitude: Joi.number().min(-90).max(90).allow(null),
  longitude: Joi.number().min(-180).max(180).allow(null),
  phone: Joi.string().pattern(/^[+\d\s()-]+$/).max(50).allow('', null),
  email: Joi.string().email().max(255).allow('', null),
  website: Joi.string().uri().max(500).allow('', null),
  verified: Joi.boolean().default(false),
  active: Joi.boolean().default(true),
});

/**
 * Validate POI data with Joi
 */
export function validatePOIData(data) {
  const { error, value } = poiSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    throw new Error(`POI validation failed: ${error.details.map(d => d.message).join(', ')}`);
  }

  return value;
}

/**
 * SQL Injection Prevention
 * Whitelist for safe column names
 */
export const safeColumns = {
  pois: ['id', 'name', 'city', 'category', 'tier', 'poi_score', 'review_count', 'average_rating', 'tourist_relevance', 'createdAt', 'updatedAt'],
  poi_data_sources: ['id', 'poi_id', 'source_name', 'rating', 'review_count', 'last_scraped_at'],
  poi_score_history: ['id', 'poi_id', 'poi_score', 'createdAt'],
};

export function validateColumnName(table, column) {
  if (!safeColumns[table] || !safeColumns[table].includes(column)) {
    throw new Error(`Invalid column name: ${column}`);
  }
  return column;
}

/**
 * Sanitize ORDER BY clause
 */
export function sanitizeOrderBy(table, column, direction = 'ASC') {
  const safeColumn = validateColumnName(table, column);
  const safeDirection = ['ASC', 'DESC'].includes(direction.toUpperCase())
    ? direction.toUpperCase()
    : 'ASC';

  return { column: safeColumn, direction: safeDirection };
}

export default {
  validate,
  sanitizeString,
  poiClassificationValidation,
  validatePOIData,
  validateColumnName,
  sanitizeOrderBy,
};
