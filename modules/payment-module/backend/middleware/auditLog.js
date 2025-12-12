const { Sequelize, DataTypes } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Audit Log Middleware
 * PCI-DSS compliant audit logging for payment operations
 * Records all payment-related actions with tamper-evident logging
 */

// ========== AUDIT LOG MODEL ==========

let AuditLog = null;
let sequelize = null;

/**
 * Initialize Audit Log model
 * Called during app startup
 */
const initAuditLog = (sequelizeInstance) => {
  sequelize = sequelizeInstance;

  AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // Request Context
    correlationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'correlation_id',
    },

    requestId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'request_id',
    },

    // Action Details
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      // 'payment.create', 'payment.capture', 'refund.initiate', etc.
    },

    resource: {
      type: DataTypes.STRING(50),
      allowNull: false,
      // 'payment', 'refund', 'transaction', 'webhook'
    },

    resourceId: {
      type: DataTypes.UUID,
      field: 'resource_id',
    },

    // Actor Information
    userId: {
      type: DataTypes.UUID,
      field: 'user_id',
    },

    userEmail: {
      type: DataTypes.STRING(255),
      field: 'user_email',
    },

    userRole: {
      type: DataTypes.STRING(50),
      field: 'user_role',
    },

    // Request Details
    method: {
      type: DataTypes.STRING(10),
    },

    path: {
      type: DataTypes.STRING(500),
    },

    ipAddress: {
      type: DataTypes.STRING(45),
      field: 'ip_address',
    },

    userAgent: {
      type: DataTypes.TEXT,
      field: 'user_agent',
    },

    // Request/Response Data (sanitized - no sensitive data)
    requestBody: {
      type: DataTypes.JSON,
      field: 'request_body',
    },

    responseStatus: {
      type: DataTypes.INTEGER,
      field: 'response_status',
    },

    responseBody: {
      type: DataTypes.JSON,
      field: 'response_body',
    },

    // Result
    success: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    errorMessage: {
      type: DataTypes.TEXT,
      field: 'error_message',
    },

    // Timing
    durationMs: {
      type: DataTypes.INTEGER,
      field: 'duration_ms',
    },

    // Additional Context
    metadata: {
      type: DataTypes.JSON,
    },

    // Integrity
    checksum: {
      type: DataTypes.STRING(64),
      // SHA-256 hash of log entry for tamper detection
    },
  }, {
    tableName: 'audit_logs',
    indexes: [
      { fields: ['correlation_id'] },
      { fields: ['user_id', 'created_at'] },
      { fields: ['action', 'created_at'] },
      { fields: ['resource', 'resource_id'] },
      { fields: ['created_at'] },
      { fields: ['success'] },
    ],
    // Disable updates and deletes for audit integrity
    hooks: {
      beforeUpdate: () => {
        throw new Error('Audit logs cannot be modified');
      },
      beforeDestroy: () => {
        throw new Error('Audit logs cannot be deleted');
      },
    },
  });

  return AuditLog;
};

// ========== SENSITIVE DATA SANITIZATION ==========

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'secret',
  'authorization',
  'cardNumber',
  'cvv',
  'cvc',
  'pin',
  'accountNumber',
  'routingNumber',
  'iban',
  'ssn',
  'socialSecurityNumber',
  'creditCard',
  'sessionData',
  'hmacSignature',
];

/**
 * Sanitize object by removing sensitive fields
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 */
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if field is sensitive
    if (SENSITIVE_FIELDS.some(f => lowerKey.includes(f.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

// ========== CHECKSUM GENERATION ==========

const crypto = require('crypto');

/**
 * Generate tamper-evident checksum
 * @param {Object} logEntry - Log entry data
 * @returns {string} - SHA-256 checksum
 */
const generateChecksum = (logEntry) => {
  const data = JSON.stringify({
    correlationId: logEntry.correlationId,
    action: logEntry.action,
    resource: logEntry.resource,
    resourceId: logEntry.resourceId,
    userId: logEntry.userId,
    timestamp: logEntry.createdAt || new Date().toISOString(),
  });

  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
};

// ========== AUDIT ACTIONS ==========

const AuditActions = {
  // Payment Operations
  PAYMENT_CREATE: 'payment.create',
  PAYMENT_AUTHORIZE: 'payment.authorize',
  PAYMENT_CAPTURE: 'payment.capture',
  PAYMENT_CANCEL: 'payment.cancel',
  PAYMENT_FAIL: 'payment.fail',

  // Refund Operations
  REFUND_INITIATE: 'refund.initiate',
  REFUND_PROCESS: 'refund.process',
  REFUND_COMPLETE: 'refund.complete',
  REFUND_FAIL: 'refund.fail',

  // Webhook Operations
  WEBHOOK_RECEIVE: 'webhook.receive',
  WEBHOOK_PROCESS: 'webhook.process',
  WEBHOOK_VERIFY: 'webhook.verify',

  // Admin Operations
  ADMIN_VIEW: 'admin.view',
  ADMIN_SEARCH: 'admin.search',
  ADMIN_EXPORT: 'admin.export',

  // Authentication
  AUTH_SUCCESS: 'auth.success',
  AUTH_FAILURE: 'auth.failure',
  AUTH_TOKEN_EXPIRED: 'auth.token_expired',
};

// ========== AUDIT MIDDLEWARE ==========

/**
 * Audit logging middleware
 * Records all payment-related operations
 */
const auditLogMiddleware = (options = {}) => {
  const { action, resource } = options;

  return async (req, res, next) => {
    // Capture request start time
    const startTime = Date.now();

    // Store original end function
    const originalEnd = res.end;
    let responseBody = null;

    // Intercept response
    res.end = function(chunk, encoding) {
      if (chunk) {
        try {
          responseBody = JSON.parse(chunk.toString());
        } catch (e) {
          responseBody = chunk.toString();
        }
      }
      return originalEnd.call(this, chunk, encoding);
    };

    // Continue to route handler
    res.on('finish', async () => {
      try {
        if (!AuditLog) {
          logger.warn('Audit log not initialized');
          return;
        }

        const durationMs = Date.now() - startTime;
        const success = res.statusCode >= 200 && res.statusCode < 400;

        const logEntry = {
          correlationId: req.correlationId || require('uuid').v4(),
          requestId: req.requestId || require('uuid').v4(),
          action: action || determineAction(req),
          resource: resource || determineResource(req.path),
          resourceId: extractResourceId(req),
          userId: req.user?.id,
          userEmail: req.user?.email,
          userRole: req.user?.role,
          method: req.method,
          path: req.path,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          requestBody: sanitizeObject(req.body),
          responseStatus: res.statusCode,
          responseBody: sanitizeObject(responseBody),
          success,
          errorMessage: !success && responseBody?.error ? responseBody.error : null,
          durationMs,
          metadata: {
            idempotencyKey: req.idempotencyKey,
            contentLength: req.headers['content-length'],
          },
        };

        // Generate integrity checksum
        logEntry.checksum = generateChecksum(logEntry);

        // Save asynchronously to not block response
        await AuditLog.create(logEntry);

        logger.debug('Audit log created', {
          correlationId: logEntry.correlationId,
          action: logEntry.action,
          success: logEntry.success,
        });
      } catch (error) {
        logger.error('Failed to create audit log:', error);
        // Don't fail the request if audit logging fails
      }
    });

    next();
  };
};

/**
 * Determine action from request
 */
const determineAction = (req) => {
  const method = req.method;
  const path = req.path.toLowerCase();

  if (path.includes('/webhook')) return AuditActions.WEBHOOK_RECEIVE;
  if (path.includes('/refund')) {
    return method === 'POST' ? AuditActions.REFUND_INITIATE : 'refund.view';
  }
  if (path.includes('/capture')) return AuditActions.PAYMENT_CAPTURE;
  if (path.includes('/cancel')) return AuditActions.PAYMENT_CANCEL;
  if (path.includes('/admin')) return AuditActions.ADMIN_VIEW;

  switch (method) {
    case 'POST': return AuditActions.PAYMENT_CREATE;
    case 'GET': return 'payment.view';
    case 'DELETE': return AuditActions.PAYMENT_CANCEL;
    default: return 'payment.unknown';
  }
};

/**
 * Determine resource from path
 */
const determineResource = (path) => {
  if (path.includes('/webhook')) return 'webhook';
  if (path.includes('/refund')) return 'refund';
  if (path.includes('/payment-methods')) return 'payment_method';
  if (path.includes('/admin')) return 'admin';
  return 'transaction';
};

/**
 * Extract resource ID from request
 */
const extractResourceId = (req) => {
  // Try params first
  if (req.params.paymentId) return req.params.paymentId;
  if (req.params.transactionId) return req.params.transactionId;
  if (req.params.refundId) return req.params.refundId;

  // Try body
  if (req.body?.resourceId) return req.body.resourceId;

  return null;
};

// ========== MANUAL AUDIT LOGGING ==========

/**
 * Create audit log entry manually
 * @param {Object} data - Audit log data
 */
const createAuditLog = async (data) => {
  if (!AuditLog) {
    logger.warn('Audit log not initialized');
    return null;
  }

  const logEntry = {
    correlationId: data.correlationId || require('uuid').v4(),
    requestId: data.requestId || require('uuid').v4(),
    ...data,
  };

  logEntry.checksum = generateChecksum(logEntry);

  return AuditLog.create(logEntry);
};

/**
 * Query audit logs
 * @param {Object} filters - Query filters
 * @returns {Promise<Array>} - Audit log entries
 */
const queryAuditLogs = async (filters = {}) => {
  if (!AuditLog) {
    throw new Error('Audit log not initialized');
  }

  const { Op } = Sequelize;
  const where = {};

  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  if (filters.resource) where.resource = filters.resource;
  if (filters.success !== undefined) where.success = filters.success;
  if (filters.correlationId) where.correlationId = filters.correlationId;

  if (filters.from && filters.to) {
    where.createdAt = {
      [Op.between]: [new Date(filters.from), new Date(filters.to)],
    };
  }

  return AuditLog.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: filters.limit || 100,
    offset: filters.offset || 0,
  });
};

module.exports = {
  initAuditLog,
  auditLogMiddleware,
  createAuditLog,
  queryAuditLogs,
  AuditActions,
  sanitizeObject,
};
