/**
 * HolidaiButler Shared Configuration
 * Settings that apply to ALL destinations
 * 
 * @version 1.0.0
 * @lastUpdated 2026-01-28
 */

export default {
  platform: {
    name: 'HolidaiButler',
    version: '3.1.1',
    supportEmail: 'support@holidaibutler.com',
    ownerEmail: 'info@holidaibutler.com'
  },
  
  api: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // requests per window
    },
    timeout: 30000 // 30 seconds
  },
  
  database: {
    pool: {
      min: 2,
      max: 10,
      acquire: 30000,
      idle: 10000
    }
  },
  
  redis: {
    host: 'localhost',
    port: 6379,
    keyPrefix: 'hb:'
  },
  
  agents: {
    schedulerEnabled: true,
    maxConcurrentJobs: 5,
    defaultTimeout: 300000, // 5 minutes
    totalJobs: 35
  },
  
  security: {
    bcryptRounds: 12,
    jwtExpiresIn: '7d',
    sessionTimeout: 3600000 // 1 hour
  },
  
  gdpr: {
    deletionDeadlineHours: 72,
    dataRetentionDays: 730, // 2 years
    consentCategories: ['essential', 'analytics', 'personalization', 'marketing']
  },
  
  mailerlite: {
    apiUrl: 'https://connect.mailerlite.com/api',
    defaultFromName: 'HolidaiButler',
    dualGroupRotation: true,
    alertGroups: [
      { id: '176972381290498029', name: 'System Alerts Owner' },
      { id: '177755949282362712', name: 'System Alerts Owner 2' }
    ]
  },
  
  apify: {
    monthlyBudgetEur: 50,
    maxConcurrentRuns: 3
  },
  
  mistralai: {
    model: 'mistral-large-latest',
    embeddingModel: 'mistral-embed',
    maxTokens: 4096,
    temperature: 0.7
  },
  
  chromadb: {
    collections: {
      pois: 'holidaibutler_pois',
      qas: 'holidaibutler_qas'
    }
  },
  
  costController: {
    monthlyBudgetEur: 515,
    warningThreshold: 80,
    criticalThreshold: 95
  }
};
