import rateLimit from 'express-rate-limit';

export const createRateLimit = (windowMs: number, max: number) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        details: `Rate limit: ${max} requests per ${windowMs / 1000} seconds`
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

export const searchRateLimit = createRateLimit(3600000, 100); // 100 requests per hour
export const contextRateLimit = createRateLimit(3600000, 200); // 200 requests per hour
export const healthRateLimit = createRateLimit(60000, 10); // 10 requests per minute
