/**
 * Enterprise Logger Configuration
 * Structured logging with rotation and multiple transports
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = process.env.LOG_DIR || path.join(__dirname, '../../logs');

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  winston.format.printf(({ timestamp, level, message, metadata }) => {
    let log = `${timestamp} [${level.toUpperCase()}] ${message}`;
    if (Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }
    return log;
  })
);

// JSON format for production
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let log = `${timestamp} ${level}: ${message}`;
    if (Object.keys(metadata).length > 0 && metadata.metadata) {
      const meta = metadata.metadata;
      if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta)}`;
      }
    }
    return log;
  })
);

// Create transports
const transports = [];

// Console transport (always)
transports.push(
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? jsonFormat : consoleFormat,
    level: process.env.LOG_LEVEL || 'debug'
  })
);

// File transports for non-development
if (process.env.NODE_ENV !== 'test') {
  // Combined logs
  transports.push(
    new DailyRotateFile({
      dirname: logDir,
      filename: 'sales-pipeline-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '50m',
      maxFiles: '30d',
      format: process.env.NODE_ENV === 'production' ? jsonFormat : logFormat
    })
  );

  // Error logs
  transports.push(
    new DailyRotateFile({
      dirname: logDir,
      filename: 'sales-pipeline-error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '50m',
      maxFiles: '90d',
      level: 'error',
      format: process.env.NODE_ENV === 'production' ? jsonFormat : logFormat
    })
  );

  // Audit logs (for compliance)
  transports.push(
    new DailyRotateFile({
      dirname: logDir,
      filename: 'sales-pipeline-audit-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxFiles: '365d',
      level: 'info',
      format: jsonFormat
    })
  );
}

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  defaultMeta: {
    service: 'sales-pipeline-module',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports,
  exceptionHandlers: [
    new winston.transports.Console(),
    new DailyRotateFile({
      dirname: logDir,
      filename: 'sales-pipeline-exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d'
    })
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
    new DailyRotateFile({
      dirname: logDir,
      filename: 'sales-pipeline-rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d'
    })
  ]
});

// Add request logging helper
logger.request = (req, message, data = {}) => {
  logger.info(message, {
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.user?.id,
    ...data
  });
};

// Add audit logging helper
logger.audit = (action, userId, resourceType, resourceId, details = {}) => {
  logger.info(`AUDIT: ${action}`, {
    audit: true,
    action,
    userId,
    resourceType,
    resourceId,
    details,
    timestamp: new Date().toISOString()
  });
};

// Add performance logging helper
logger.performance = (operation, durationMs, details = {}) => {
  const level = durationMs > 5000 ? 'warn' : durationMs > 1000 ? 'info' : 'debug';
  logger.log(level, `PERF: ${operation} completed in ${durationMs}ms`, {
    performance: true,
    operation,
    durationMs,
    ...details
  });
};

// Add security logging helper
logger.security = (event, details = {}) => {
  logger.warn(`SECURITY: ${event}`, {
    security: true,
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Stream for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

export default logger;
