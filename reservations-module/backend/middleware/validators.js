/**
 * Request Validation Middleware
 * Joi-based validation schemas for the Reservations Module
 */

const Joi = require('joi');

/**
 * Generic validation middleware factory
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const data = req[property];
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details,
      });
    }

    // Replace with sanitized value
    req[property] = value;
    next();
  };
};

// ========== RESERVATION SCHEMAS ==========

const createReservationSchema = Joi.object({
  restaurantId: Joi.string().uuid().required(),
  guestEmail: Joi.string().email().required(),
  date: Joi.date().iso().min('now').required(),
  time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
    .messages({ 'string.pattern.base': 'Time must be in HH:MM format' }),
  partySize: Joi.number().integer().min(1).max(50).required(),
  guestInfo: Joi.object({
    firstName: Joi.string().min(1).max(100).required(),
    lastName: Joi.string().min(1).max(100).required(),
    phone: Joi.string().pattern(/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/).allow(null, ''),
    language: Joi.string().valid('en', 'nl', 'de', 'fr', 'es', 'it').default('en'),
  }).required(),
  specialOccasion: Joi.string().valid('none', 'birthday', 'anniversary', 'date', 'business', 'other').default('none'),
  specialRequests: Joi.string().max(1000).allow(null, ''),
  dietaryRestrictions: Joi.array().items(Joi.string().valid(
    'vegetarian', 'vegan', 'gluten-free', 'lactose-free', 'nut-allergy',
    'shellfish-allergy', 'halal', 'kosher', 'other'
  )).default([]),
  seatingAreaPreference: Joi.string().valid('indoor', 'outdoor', 'bar', 'private', 'no-preference').default('no-preference'),
  source: Joi.string().valid('web', 'mobile', 'api', 'admin', 'thefork', 'google').default('web'),
  aiMessageId: Joi.string().uuid().allow(null),
});

const modifyReservationSchema = Joi.object({
  date: Joi.date().iso().min('now'),
  time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  partySize: Joi.number().integer().min(1).max(50),
  specialRequests: Joi.string().max(1000).allow(null, ''),
  dietaryRestrictions: Joi.array().items(Joi.string()),
  seatingAreaPreference: Joi.string().valid('indoor', 'outdoor', 'bar', 'private', 'no-preference'),
}).min(1);

const cancelReservationSchema = Joi.object({
  reason: Joi.string().max(500).allow(null, ''),
});

const reservationQuerySchema = Joi.object({
  date: Joi.date().iso(),
  status: Joi.string().valid(
    'pending_confirmation', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'
  ),
  seatingArea: Joi.string().valid('indoor', 'outdoor', 'bar', 'private'),
  source: Joi.string().valid('web', 'mobile', 'api', 'admin', 'thefork', 'google'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

// ========== RESTAURANT SCHEMAS ==========

const createRestaurantSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(2000).allow(null, ''),
  cuisine_type: Joi.array().items(Joi.string().max(50)).min(1).required(),
  price_range: Joi.string().valid('€', '€€', '€€€', '€€€€').required(),
  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    postal_code: Joi.string().required(),
    country: Joi.string().default('Netherlands'),
  }).required(),
  contact: Joi.object({
    phone: Joi.string().required(),
    email: Joi.string().email().required(),
    website: Joi.string().uri().allow(null, ''),
  }).required(),
  opening_hours: Joi.object().pattern(
    Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
    Joi.object({
      open: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      close: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      closed: Joi.boolean().default(false),
    })
  ),
  reservation_settings: Joi.object({
    min_party_size: Joi.number().integer().min(1).default(1),
    max_party_size: Joi.number().integer().max(100).default(20),
    default_seating_duration: Joi.number().integer().min(30).max(480).default(90),
    advance_booking_days: Joi.number().integer().min(1).max(365).default(90),
    same_day_booking_cutoff: Joi.number().integer().min(0).max(24).default(2),
    deposit_required: Joi.boolean().default(false),
    deposit_amount: Joi.number().precision(2).min(0),
    cancellation_deadline_hours: Joi.number().integer().min(0).max(168).default(24),
  }),
});

const updateRestaurantSchema = Joi.object({
  name: Joi.string().min(1).max(200),
  description: Joi.string().max(2000).allow(null, ''),
  cuisine_type: Joi.array().items(Joi.string().max(50)).min(1),
  price_range: Joi.string().valid('€', '€€', '€€€', '€€€€'),
  address: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    postal_code: Joi.string(),
    country: Joi.string(),
  }),
  contact: Joi.object({
    phone: Joi.string(),
    email: Joi.string().email(),
    website: Joi.string().uri().allow(null, ''),
  }),
  opening_hours: Joi.object().pattern(
    Joi.string(),
    Joi.object({
      open: Joi.string(),
      close: Joi.string(),
      closed: Joi.boolean(),
    })
  ),
  reservation_settings: Joi.object({
    min_party_size: Joi.number().integer().min(1),
    max_party_size: Joi.number().integer().max(100),
    default_seating_duration: Joi.number().integer().min(30).max(480),
    advance_booking_days: Joi.number().integer().min(1).max(365),
    same_day_booking_cutoff: Joi.number().integer().min(0).max(24),
    deposit_required: Joi.boolean(),
    deposit_amount: Joi.number().precision(2).min(0),
    cancellation_deadline_hours: Joi.number().integer().min(0).max(168),
  }),
  is_active: Joi.boolean(),
});

// ========== TABLE SCHEMAS ==========

const createTableSchema = Joi.object({
  restaurantId: Joi.string().uuid().required(),
  table_number: Joi.string().min(1).max(20).required(),
  min_capacity: Joi.number().integer().min(1).required(),
  max_capacity: Joi.number().integer().min(1).required(),
  table_type: Joi.string().valid('standard', 'booth', 'bar', 'outdoor', 'private', 'communal').default('standard'),
  location: Joi.string().valid('indoor', 'outdoor', 'bar', 'private', 'terrace', 'garden').default('indoor'),
  floor: Joi.number().integer().min(0).default(0),
  features: Joi.array().items(Joi.string().valid(
    'window', 'corner', 'quiet', 'accessible', 'high-chair', 'power-outlet', 'view'
  )).default([]),
  combinable_with: Joi.array().items(Joi.string().uuid()).default([]),
  priority: Joi.number().integer().min(1).max(100).default(50),
  is_active: Joi.boolean().default(true),
});

const updateTableSchema = Joi.object({
  table_number: Joi.string().min(1).max(20),
  min_capacity: Joi.number().integer().min(1),
  max_capacity: Joi.number().integer().min(1),
  table_type: Joi.string().valid('standard', 'booth', 'bar', 'outdoor', 'private', 'communal'),
  location: Joi.string().valid('indoor', 'outdoor', 'bar', 'private', 'terrace', 'garden'),
  floor: Joi.number().integer().min(0),
  features: Joi.array().items(Joi.string()),
  combinable_with: Joi.array().items(Joi.string().uuid()),
  priority: Joi.number().integer().min(1).max(100),
  is_active: Joi.boolean(),
}).min(1);

// ========== GUEST SCHEMAS ==========

const createGuestSchema = Joi.object({
  email: Joi.string().email().required(),
  first_name: Joi.string().min(1).max(100).required(),
  last_name: Joi.string().min(1).max(100).required(),
  phone: Joi.string().pattern(/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/).allow(null, ''),
  date_of_birth: Joi.date().iso().max('now').allow(null),
  preferred_language: Joi.string().valid('en', 'nl', 'de', 'fr', 'es', 'it').default('en'),
  dietary_restrictions: Joi.array().items(Joi.string()).default([]),
  seating_preferences: Joi.array().items(Joi.string().valid(
    'quiet', 'window', 'booth', 'outdoor', 'accessible', 'near-bar'
  )).default([]),
  email_notifications: Joi.boolean().default(true),
  sms_notifications: Joi.boolean().default(false),
});

const updateGuestSchema = Joi.object({
  first_name: Joi.string().min(1).max(100),
  last_name: Joi.string().min(1).max(100),
  phone: Joi.string().pattern(/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/).allow(null, ''),
  date_of_birth: Joi.date().iso().max('now').allow(null),
  preferred_language: Joi.string().valid('en', 'nl', 'de', 'fr', 'es', 'it'),
  dietary_restrictions: Joi.array().items(Joi.string()),
  seating_preferences: Joi.array().items(Joi.string()),
  email_notifications: Joi.boolean(),
  sms_notifications: Joi.boolean(),
  is_vip: Joi.boolean(),
}).min(1);

const guestNoteSchema = Joi.object({
  note_type: Joi.string().valid('preference', 'allergy', 'incident', 'vip', 'other').required(),
  content: Joi.string().min(1).max(2000).required(),
  is_alert: Joi.boolean().default(false),
  alert_message: Joi.string().max(200).when('is_alert', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});

// ========== WAITLIST SCHEMAS ==========

const createWaitlistSchema = Joi.object({
  restaurantId: Joi.string().uuid().required(),
  guestEmail: Joi.string().email().required(),
  guestInfo: Joi.object({
    firstName: Joi.string().min(1).max(100).required(),
    lastName: Joi.string().min(1).max(100).required(),
    phone: Joi.string().allow(null, ''),
  }).required(),
  preferred_date: Joi.date().iso().min('now').required(),
  preferred_time_start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  preferred_time_end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  party_size: Joi.number().integer().min(1).max(50).required(),
  flexibility: Joi.string().valid('exact', 'flexible_time', 'flexible_date', 'very_flexible').default('flexible_time'),
  notes: Joi.string().max(500).allow(null, ''),
});

// ========== AVAILABILITY SCHEMAS ==========

const checkAvailabilitySchema = Joi.object({
  restaurantId: Joi.string().uuid().required(),
  date: Joi.date().iso().min('now').required(),
  time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(null),
  partySize: Joi.number().integer().min(1).max(50).required(),
});

const availabilityRangeSchema = Joi.object({
  startDate: Joi.date().iso().min('now').required(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  partySize: Joi.number().integer().min(1).max(50).required(),
});

// ========== PARAMETER SCHEMAS ==========

const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const restaurantIdParamSchema = Joi.object({
  restaurantId: Joi.string().uuid().required(),
});

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().max(50),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

module.exports = {
  validate,

  // Reservation
  createReservationSchema,
  modifyReservationSchema,
  cancelReservationSchema,
  reservationQuerySchema,

  // Restaurant
  createRestaurantSchema,
  updateRestaurantSchema,

  // Table
  createTableSchema,
  updateTableSchema,

  // Guest
  createGuestSchema,
  updateGuestSchema,
  guestNoteSchema,

  // Waitlist
  createWaitlistSchema,

  // Availability
  checkAvailabilitySchema,
  availabilityRangeSchema,

  // Common
  uuidParamSchema,
  restaurantIdParamSchema,
  paginationSchema,
};
