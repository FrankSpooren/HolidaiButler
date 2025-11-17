/**
 * Admin Module Integration
 * Connects platform-core with admin-module
 */

import axios from 'axios';
import logger from '../utils/logger.js';
import eventBus from '../services/eventBus.js';

const ADMIN_MODULE_URL = process.env.ADMIN_MODULE_URL || 'http://localhost:3003';

class AdminModuleIntegration {
  constructor() {
    this.baseURL = ADMIN_MODULE_URL;
    this.client = axios.create({
      baseURL: `${this.baseURL}/api/admin`,
      timeout: 10000,
    });

    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for POI updates
    eventBus.on('poi.created', async (data) => {
      logger.integration('admin.poi.created', data);
    });

    eventBus.on('poi.updated', async (data) => {
      logger.integration('admin.poi.updated', data);
    });

    eventBus.on('poi.deleted', async (data) => {
      logger.integration('admin.poi.deleted', data);
    });
  }

  /**
   * Get all POIs
   */
  async getPOIs(params = {}) {
    try {
      const response = await this.client.get('/pois', { params });
      return response.data;
    } catch (error) {
      logger.error('Admin module: Failed to get POIs:', error.message);
      throw error;
    }
  }

  /**
   * Get POI by ID
   */
  async getPOI(poiId) {
    try {
      const response = await this.client.get(`/pois/${poiId}`);
      return response.data;
    } catch (error) {
      logger.error(`Admin module: Failed to get POI ${poiId}:`, error.message);
      throw error;
    }
  }

  /**
   * Create POI
   */
  async createPOI(poiData, token) {
    try {
      const response = await this.client.post('/pois', poiData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Publish event
      await eventBus.publish('poi.created', {
        poiId: response.data._id,
        name: response.data.name,
        data: response.data,
      });

      return response.data;
    } catch (error) {
      logger.error('Admin module: Failed to create POI:', error.message);
      throw error;
    }
  }

  /**
   * Update POI
   */
  async updatePOI(poiId, updates, token) {
    try {
      const response = await this.client.put(`/pois/${poiId}`, updates, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Publish event
      await eventBus.publish('poi.updated', {
        poiId,
        updates,
        data: response.data,
      });

      return response.data;
    } catch (error) {
      logger.error(`Admin module: Failed to update POI ${poiId}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete POI
   */
  async deletePOI(poiId, token) {
    try {
      const response = await this.client.delete(`/pois/${poiId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Publish event
      await eventBus.publish('poi.deleted', { poiId });

      return response.data;
    } catch (error) {
      logger.error(`Admin module: Failed to delete POI ${poiId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get platform configuration
   */
  async getPlatformConfig(token) {
    try {
      const response = await this.client.get('/platform', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      logger.error('Admin module: Failed to get platform config:', error.message);
      throw error;
    }
  }

  /**
   * Update platform configuration
   */
  async updatePlatformConfig(section, updates, token) {
    try {
      const response = await this.client.put(`/platform/${section}`, updates, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      logger.error('Admin module: Failed to update platform config:', error.message);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseURL}/health`, { timeout: 3000 });
      return response.status === 200;
    } catch (error) {
      logger.error('Admin module health check failed:', error.message);
      return false;
    }
  }
}

// Export singleton instance
const adminModuleIntegration = new AdminModuleIntegration();
export default adminModuleIntegration;
