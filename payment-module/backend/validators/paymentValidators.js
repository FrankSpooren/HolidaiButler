const Joi = require('joi');

/**
 * Payment Module Validators
 * Enterprise-grade input validation schemas
 * PCI-DSS compliant - no sensitive card data passes through
 */

// ========== COMMON SCHEMAS ==========

const uuidSchema = Joi.string()
  .uuid({ version: 'uuidv4' })
  .required();

const currencySchema = Joi.string()
  .uppercase()
  .length(3)
  .valid('EUR', 'USD', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK')
  .default('EUR');

const countryCodeSchema = Joi.string()
  .uppercase()
  .length(2)
  .valid(
    'NL', 'BE', 'DE', 'FR', 'ES', 'IT', 'PT', 'AT', 'CH',
    'GB', 'IE', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'US'
  )
  .default('NL');

const localeSchema = Joi.string()
  .pattern(/^[a-z]{2}-[A-Z]{2}$/)
  .default('nl-NL');

const amountSchema = Joi.number()
  .integer()
  .min(1) // Minimum 1 cent
  .max(999999999) // Max ~10M EUR
  .required();

// ========== PAYMENT CREATION SCHEMA ==========

const createPaymentSchema = Joi.object({
  amount: amountSchema.description('Amount in cents (e.g., 1000 = €10.00)'),

  currency: currencySchema,

  resourceType: Joi.string()
    .valid('ticket', 'restaurant', 'hotel', 'activity', 'experience', 'bundle')
    .required()
    .description('Type of resource being purchased'),

  resourceId: uuidSchema.description('ID of the resource being purchased'),

  returnUrl: Joi.string()
    .uri({ scheme: ['https'] })
    .required()
    .description('URL to redirect after payment (HTTPS only)'),

  metadata: Joi.object({
    bookingReference: Joi.string().max(100),
    customerEmail: Joi.string().email(),
    customerName: Joi.string().max(200),
    customerPhone: Joi.string().pattern(/^\+?[0-9\s\-]{8,20}$/),
    countryCode: countryCodeSchema,
    shopperLocale: localeSchema,
    lineItems: Joi.array().items(
      Joi.object({
        description: Joi.string().max(500),
        quantity: Joi.number().integer().min(1).max(100),
        unitPrice: Joi.number().integer().min(0),
        totalPrice: Joi.number().integer().min(0),
      })
    ).max(50),
    notes: Joi.string().max(1000),
  }).default({}),

  idempotencyKey: Joi.string()
    .min(16)
    .max(64)
    .pattern(/^[a-zA-Z0-9\-_]+$/)
    .description('Unique key to prevent duplicate payments'),
}).options({ stripUnknown: true });

// ========== CAPTURE PAYMENT SCHEMA ==========

const capturePaymentSchema = Joi.object({
  amount: Joi.number()
    .integer()
    .min(1)
    .max(999999999)
    .description('Partial capture amount in cents (optional, defaults to full amount)'),
}).options({ stripUnknown: true });

// ========== REFUND SCHEMA ==========

const refundPaymentSchema = Joi.object({
  amount: Joi.number()
    .integer()
    .min(1)
    .max(999999999)
    .description('Refund amount in cents (optional, defaults to full captured amount)'),

  reason: Joi.string()
    .valid(
      'customer_request',
      'duplicate_payment',
      'fraudulent',
      'order_cancelled',
      'product_not_delivered',
      'product_defective',
      'other'
    )
    .required()
    .description('Reason for refund'),

  reasonDetails: Joi.string()
    .max(500)
    .when('reason', {
      is: 'other',
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .description('Additional details for "other" reason'),

  notifyCustomer: Joi.boolean()
    .default(true)
    .description('Send notification to customer about refund'),
}).options({ stripUnknown: true });

// ========== PAYMENT METHODS QUERY SCHEMA ==========

const paymentMethodsQuerySchema = Joi.object({
  country: countryCodeSchema.required(),
  currency: currencySchema.required(),
  amount: Joi.number().integer().min(100).default(10000),
}).options({ stripUnknown: true });

// ========== ADMIN TRANSACTIONS QUERY SCHEMA ==========

const adminTransactionsQuerySchema = Joi.object({
  from: Joi.date().iso(),
  to: Joi.date().iso().min(Joi.ref('from')),
  status: Joi.string().valid(
    'pending', 'authorized', 'captured', 'failed',
    'cancelled', 'refunded', 'partially_refunded'
  ),
  userId: Joi.string().uuid(),
  resourceType: Joi.string().valid('ticket', 'restaurant', 'hotel', 'activity', 'experience', 'bundle'),
  limit: Joi.number().integer().min(1).max(500).default(100),
  offset: Joi.number().integer().min(0).default(0),
  sortBy: Joi.string().valid('createdAt', 'amount', 'status').default('createdAt'),
  sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
}).options({ stripUnknown: true });

// ========== WEBHOOK SCHEMA ==========

const adyenWebhookSchema = Joi.object({
  notificationItems: Joi.array()
    .items(
      Joi.object({
        NotificationRequestItem: Joi.object({
          eventCode: Joi.string().required(),
          success: Joi.string().valid('true', 'false').required(),
          pspReference: Joi.string().required(),
          merchantReference: Joi.string(),
          merchantAccountCode: Joi.string(),
          amount: Joi.object({
            value: Joi.number().integer(),
            currency: Joi.string().length(3),
          }),
          paymentMethod: Joi.string(),
          reason: Joi.string().allow('', null),
          additionalData: Joi.object().unknown(true),
          eventDate: Joi.string(),
          operations: Joi.array().items(Joi.string()),
        }).required(),
      })
    )
    .min(1)
    .required(),
  live: Joi.string().valid('true', 'false'),
}).options({ stripUnknown: false }); // Keep all data for HMAC verification

// ========== STORED PAYMENT METHOD SCHEMA ==========

const storePaymentMethodSchema = Joi.object({
  paymentToken: Joi.string()
    .min(10)
    .max(200)
    .required()
    .description('Adyen recurring token'),

  paymentType: Joi.string()
    .valid('card', 'ideal', 'paypal', 'sepadirectdebit', 'bcmc')
    .required(),

  cardBrand: Joi.string()
    .valid('visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'maestro')
    .when('paymentType', {
      is: 'card',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),

  lastFour: Joi.string()
    .length(4)
    .pattern(/^[0-9]{4}$/)
    .when('paymentType', {
      is: 'card',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),

  expiryMonth: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .when('paymentType', {
      is: 'card',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),

  expiryYear: Joi.number()
    .integer()
    .min(new Date().getFullYear())
    .max(new Date().getFullYear() + 20)
    .when('paymentType', {
      is: 'card',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),

  holderName: Joi.string()
    .max(200)
    .pattern(/^[a-zA-Z\s\-'.]+$/)
    .when('paymentType', {
      is: 'card',
      then: Joi.optional(),
      otherwise: Joi.forbidden(),
    }),

  isDefault: Joi.boolean().default(false),
}).options({ stripUnknown: true });

// ========== VALIDATION MIDDLEWARE FACTORY ==========

/**
 * Creates a validation middleware for the given schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} source - 'body', 'query', or 'params'
 * @returns {Function} Express middleware
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all errors, not just the first
      convert: true, // Type coercion
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    // Replace with validated/sanitized values
    req[source] = value;
    next();
  };
};

module.exports = {
  // Schemas
  createPaymentSchema,
  capturePaymentSchema,
  refundPaymentSchema,
  paymentMethodsQuerySchema,
  adminTransactionsQuerySchema,
  adyenWebhookSchema,
  storePaymentMethodSchema,

  // Middleware factory
  validate,

  // Common schemas for reuse
  uuidSchema,
  currencySchema,
  countryCodeSchema,
  amountSchema,
};
