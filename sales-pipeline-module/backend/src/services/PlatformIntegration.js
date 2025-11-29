/**
 * Platform Integration Service
 * Integrates Sales Pipeline Module with HolidaiButler Platform Core
 */

import axios from 'axios';
import logger from '../utils/logger.js';

const PLATFORM_CORE_URL = process.env.PLATFORM_CORE_URL || 'http://localhost:3001';

class PlatformIntegration {
  constructor() {
    this.client = axios.create({
      baseURL: PLATFORM_CORE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': 'sales-pipeline-module'
      }
    });
  }

  /**
   * Register module with platform core
   */
  async registerModule() {
    try {
      const response = await this.client.post('/api/v1/modules/register', {
        name: 'sales-pipeline',
        version: '1.0.0',
        description: 'B2B Sales Pipeline CRM Module',
        endpoints: {
          health: '/api/v1/health',
          deals: '/api/v1/deals',
          contacts: '/api/v1/contacts',
          accounts: '/api/v1/accounts'
        },
        capabilities: [
          'deal-management',
          'contact-management',
          'account-management',
          'lead-scoring',
          'pipeline-analytics',
          'email-integration',
          'whatsapp-integration'
        ]
      });
      logger.info('Module registered with platform core', response.data);
      return response.data;
    } catch (error) {
      logger.warn('Failed to register with platform core:', error.message);
      return null;
    }
  }

  /**
   * Sync user from platform core
   */
  async syncUser(userId) {
    try {
      const response = await this.client.get(`/api/v1/users/${userId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to sync user:', error.message);
      return null;
    }
  }

  /**
   * Validate OAuth token with platform core
   */
  async validateToken(token) {
    try {
      const response = await this.client.post('/api/v1/auth/validate', { token });
      return response.data;
    } catch (error) {
      logger.error('Token validation failed:', error.message);
      return null;
    }
  }

  /**
   * Send notification to platform core
   */
  async sendPlatformNotification(notification) {
    try {
      const response = await this.client.post('/api/v1/notifications', notification);
      return response.data;
    } catch (error) {
      logger.error('Failed to send platform notification:', error.message);
      return null;
    }
  }

  /**
   * Log activity to platform core
   */
  async logActivity(activity) {
    try {
      const response = await this.client.post('/api/v1/activities/log', activity);
      return response.data;
    } catch (error) {
      logger.warn('Failed to log activity to platform:', error.message);
      return null;
    }
  }

  /**
   * Get platform settings
   */
  async getSettings() {
    try {
      const response = await this.client.get('/api/v1/settings');
      return response.data;
    } catch (error) {
      logger.warn('Failed to get platform settings:', error.message);
      return null;
    }
  }

  /**
   * Health check for platform core connectivity
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return { connected: true, ...response.data };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }
}

export default new PlatformIntegration();
