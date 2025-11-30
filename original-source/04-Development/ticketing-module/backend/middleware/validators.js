const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Request Validation Middleware
 * Uses Joi schemas to validate incoming requests
 */

// Booking creation schema
const createBookingSchema = Joi.object({
  poiId: Joi.string().required(),
  date: Joi.date().required(),
  timeslot: Joi.string().allow(null, ''),
  quantity: Joi.number().integer().min(1).max(20).required(),
  guestInfo: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().allow(null, ''),
  }).required(),
  voucherCode: Joi.string().allow(null, ''),
  productType: Joi.string().valid('ticket', 'tour', 'excursion', 'experience', 'combo'),
  language: Joi.string().valid('en', 'es', 'de', 'nl', 'fr'),
  source: Joi.string().valid('web', 'mobile', 'api'),
});

// Availability check schema
const checkAvailabilitySchema = Joi.object({
  poiId: Joi.string().required(),
  date: Joi.date().required(),
  timeslot: Joi.string().allow(null, ''),
  quantity: Joi.number().integer().min(1).max(20),
});

// Ticket validation schema
const validateTicketSchema = Joi.object({
  qrCode: Joi.string().required(),
  poiId: Joi.string().required(),
  validatorDeviceId: Joi.string().required(),
});

/**
 * Generic validation middleware factory
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Validation error:', errors);

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    // Replace req.body with validated and sanitized value
    req.body = value;
    next();
  };
};

module.exports = {
  validate,
  createBookingSchema,
  checkAvailabilitySchema,
  validateTicketSchema,
};
