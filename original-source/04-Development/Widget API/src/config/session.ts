// Session storage configuration (no Redis required)
export const sessionConfig = {
  // In-memory session storage by default
  storage: 'memory',
  
  // Optional Redis configuration (when USE_REDIS=true)
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    enabled: process.env.USE_REDIS === 'true'
  },
  
  // Session settings
  sessionTimeout: 86400000, // 24 hours
  maxHistoryLength: 50,
  cleanupInterval: 3600000 // 1 hour
};
