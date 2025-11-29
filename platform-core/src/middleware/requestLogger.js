/**
 * Request Logger Middleware
 */

import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export function requestLogger(req, res, next) {
  const requestId = uuidv4();
  req.id = requestId;

  const startTime = Date.now();

  // Log request
  logger.info('Incoming Request', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info('Request Completed', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
}

export default requestLogger;
