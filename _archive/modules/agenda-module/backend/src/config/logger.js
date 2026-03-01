const winston = require('winston');
const path = require('path');

/**
 * Enterprise Logging Configuration
 * Winston-based logging with multiple transports
 */

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;

    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }

    return log;
  })
);

// Define transports
const transports = [
  // Console transport for development
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.printf((info) => {
        const { timestamp, level, message, ...meta } = info;
        return `${timestamp} ${level}: ${message} ${
          Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
        }`;
      })
    ),
  }),

  // Error log file
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),

  // Combined log file
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/combined.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 10,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),

  // HTTP requests log
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/http.log'),
    level: 'http',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
];

// Create logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  exitOnError: false,
});

/**
 * HTTP Request Logger Middleware
 */
logger.httpLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.http({
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
    });
  });

  next();
};

/**
 * Error Logger Middleware
 */
logger.errorLogger = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
  });

  next(err);
};

/**
 * Performance Logger
 */
logger.logPerformance = (operation, duration, metadata = {}) => {
  if (duration > 1000) {
    logger.warn(`Slow operation: ${operation} took ${duration}ms`, metadata);
  } else {
    logger.debug(`Operation: ${operation} took ${duration}ms`, metadata);
  }
};

/**
 * Database Query Logger
 */
logger.logQuery = (query, duration, results) => {
  logger.debug('Database query', {
    query,
    duration: `${duration}ms`,
    resultCount: results?.length || 0,
  });
};

/**
 * Scraper Activity Logger
 */
logger.logScraper = (scraper, action, data) => {
  logger.info(`Scraper: ${scraper}`, {
    action,
    ...data,
  });
};

/**
 * Security Event Logger
 */
logger.logSecurity = (event, severity, details) => {
  const logLevel = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';

  logger[logLevel](`Security Event: ${event}`, {
    severity,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Business Metrics Logger
 */
logger.logMetric = (metric, value, tags = {}) => {
  logger.info(`Metric: ${metric}`, {
    value,
    tags,
    timestamp: new Date().toISOString(),
  });
};

/**
 * API Call Logger (for external APIs)
 */
logger.logApiCall = (service, endpoint, status, duration, error = null) => {
  const logData = {
    service,
    endpoint,
    status,
    duration: `${duration}ms`,
  };

  if (error) {
    logger.error(`External API Error: ${service}`, { ...logData, error });
  } else {
    logger.debug(`External API Call: ${service}`, logData);
  }
};

/**
 * Create logs directory if it doesn't exist
 */
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

module.exports = logger;
