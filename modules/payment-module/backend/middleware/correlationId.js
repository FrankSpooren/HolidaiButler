const { v4: uuidv4 } = require('uuid');

/**
 * Correlation ID Middleware
 * Adds unique request IDs for tracing requests across services
 * Essential for debugging and audit trails
 */

const CORRELATION_ID_HEADER = 'X-Correlation-ID';
const REQUEST_ID_HEADER = 'X-Request-ID';

/**
 * Generates or extracts correlation ID for request tracing
 * @returns {Function} Express middleware
 */
const correlationIdMiddleware = () => {
  return (req, res, next) => {
    // Check for existing correlation ID from upstream service
    const existingCorrelationId = req.headers[CORRELATION_ID_HEADER.toLowerCase()]
      || req.headers['x-correlation-id']
      || req.headers['x-request-id'];

    // Generate new request ID for this specific request
    const requestId = uuidv4();

    // Use existing correlation ID or create new one
    const correlationId = existingCorrelationId || uuidv4();

    // Attach to request object
    req.correlationId = correlationId;
    req.requestId = requestId;

    // Add timing info
    req.startTime = Date.now();

    // Set response headers for client-side tracing
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    res.setHeader(REQUEST_ID_HEADER, requestId);

    // Add to response locals for template rendering
    res.locals.correlationId = correlationId;
    res.locals.requestId = requestId;

    // Capture timing on response finish
    res.on('finish', () => {
      req.responseTime = Date.now() - req.startTime;
    });

    next();
  };
};

/**
 * Get correlation context for logging
 * @param {Object} req - Express request
 * @returns {Object} - Correlation context
 */
const getCorrelationContext = (req) => {
  return {
    correlationId: req.correlationId,
    requestId: req.requestId,
    userId: req.user?.id,
    ip: req.ip,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
  };
};

/**
 * Create child context for sub-operations
 * @param {Object} parentContext - Parent correlation context
 * @param {string} operation - Operation name
 * @returns {Object} - Child context
 */
const createChildContext = (parentContext, operation) => {
  return {
    ...parentContext,
    operationId: uuidv4(),
    operation,
    parentRequestId: parentContext.requestId,
  };
};

module.exports = {
  correlationIdMiddleware,
  getCorrelationContext,
  createChildContext,
  CORRELATION_ID_HEADER,
  REQUEST_ID_HEADER,
};
