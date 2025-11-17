/**
 * Winston Logger Configuration
 * Centralized logging for all platform operations
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = process.env.LOG_DIR || path.join(__dirname, '../../logs');
const logLevel = process.env.LOG_LEVEL || 'info';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'platform-core' },
  transports: [
    // Console output
    new winston.transports.Console({
      format: consoleFormat,
    }),

    // Error log file
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      zippedArchive: true,
    }),

    // Combined log file
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      zippedArchive: true,
    }),

    // Integration events log
    new DailyRotateFile({
      filename: path.join(logDir, 'integration-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
  ],
});

// Add custom methods for integration logging
logger.integration = (event, data) => {
  logger.info(`[INTEGRATION] ${event}`, {
    event,
    ...data,
    timestamp: new Date().toISOString(),
  });
};

logger.workflow = (workflowName, step, data) => {
  logger.info(`[WORKFLOW] ${workflowName} - ${step}`, {
    workflow: workflowName,
    step,
    ...data,
    timestamp: new Date().toISOString(),
  });
};

logger.moduleCall = (module, endpoint, data) => {
  logger.info(`[MODULE] ${module} -> ${endpoint}`, {
    module,
    endpoint,
    ...data,
    timestamp: new Date().toISOString(),
  });
};

export default logger;
