/**
 * Payment Module Integration
 * Connects platform-core with payment-module
 */

import axios from 'axios';
import logger from '../utils/logger.js';
import eventBus from '../services/eventBus.js';

const PAYMENT_MODULE_URL = process.env.PAYMENT_MODULE_URL || 'http://localhost:3005';

class PaymentModuleIntegration {
  constructor() {
    this.baseURL = PAYMENT_MODULE_URL;
    this.client = axios.create({
      baseURL: `${this.baseURL}/api/v1/payments`,
      timeout: 15000,
    });

    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for payment events
    eventBus.on('payment.created', async (data) => {
      logger.integration('payment.created', data);
    });

    eventBus.on('payment.completed', async (data) => {
      logger.integration('payment.completed', data);
      // Trigger ticket delivery workflow
      const workflowManager = (await import('../automation/workflowManager.js')).default;
      await workflowManager.execute('ticket-delivery', data);
    });

    eventBus.on('payment.failed', async (data) => {
      logger.integration('payment.failed', data);
      // Trigger payment recovery workflow
      const workflowManager = (await import('../automation/workflowManager.js')).default;
      await workflowManager.execute('payment-recovery', data);
    });
  }

  /**
   * Create payment session
   */
  async createPayment(paymentData, token) {
    try {
      const response = await this.client.post('/', paymentData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      // Publish event
      await eventBus.publish('payment.created', {
        paymentId: response.data.id,
        bookingId: paymentData.bookingReference,
        amount: paymentData.amount,
      });

      return response.data;
    } catch (error) {
      logger.error('Payment module: Failed to create payment:', error.message);
      throw error;
    }
  }

  /**
   * Get payment status
   */
  async getPayment(paymentId, token) {
    try {
      const response = await this.client.get(`/${paymentId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data;
    } catch (error) {
      logger.error(`Payment module: Failed to get payment ${paymentId}:`, error.message);
      throw error;
    }
  }

  /**
   * Capture payment
   */
  async capturePayment(paymentId, data, token) {
    try {
      const response = await this.client.post(`/${paymentId}/capture`, data, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      // Publish event
      await eventBus.publish('payment.captured', {
        paymentId,
        amount: data.amount,
      });

      return response.data;
    } catch (error) {
      logger.error(`Payment module: Failed to capture payment ${paymentId}:`, error.message);
      throw error;
    }
  }

  /**
   * Cancel payment
   */
  async cancelPayment(paymentId, token) {
    try {
      const response = await this.client.post(`/${paymentId}/cancel`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      // Publish event
      await eventBus.publish('payment.cancelled', { paymentId });

      return response.data;
    } catch (error) {
      logger.error(`Payment module: Failed to cancel payment ${paymentId}:`, error.message);
      throw error;
    }
  }

  /**
   * Create refund
   */
  async createRefund(paymentId, refundData, token) {
    try {
      const response = await this.client.post(`/${paymentId}/refunds`, refundData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Publish event
      await eventBus.publish('refund.created', {
        paymentId,
        refundId: response.data.id,
        amount: refundData.amount,
      });

      return response.data;
    } catch (error) {
      logger.error(`Payment module: Failed to create refund for ${paymentId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get refunds
   */
  async getRefunds(paymentId, token) {
    try {
      const response = await this.client.get(`/${paymentId}/refunds`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      logger.error(`Payment module: Failed to get refunds for ${paymentId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get available payment methods
   */
  async getPaymentMethods(params = {}) {
    try {
      const response = await this.client.get('/payment-methods/available', { params });
      return response.data;
    } catch (error) {
      logger.error('Payment module: Failed to get payment methods:', error.message);
      throw error;
    }
  }

  /**
   * Get transactions (admin)
   */
  async getTransactions(params = {}, token) {
    try {
      const response = await this.client.get('/admin/transactions', {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      logger.error('Payment module: Failed to get transactions:', error.message);
      throw error;
    }
  }

  /**
   * Handle Adyen webhook (internal use)
   */
  async handleAdyenWebhook(webhookData) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/v1/webhooks/adyen`,
        webhookData
      );

      // Extract event type from webhook
      const eventCode = webhookData.eventCode;

      if (eventCode === 'AUTHORISATION' && webhookData.success) {
        await eventBus.publish('payment.completed', {
          paymentId: webhookData.merchantReference,
          pspReference: webhookData.pspReference,
        });
      } else if (eventCode === 'AUTHORISATION' && !webhookData.success) {
        await eventBus.publish('payment.failed', {
          paymentId: webhookData.merchantReference,
          reason: webhookData.reason,
        });
      } else if (eventCode === 'REFUND') {
        await eventBus.publish('refund.completed', {
          paymentId: webhookData.originalReference,
          pspReference: webhookData.pspReference,
        });
      }

      return response.data;
    } catch (error) {
      logger.error('Payment module: Failed to handle Adyen webhook:', error.message);
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
      logger.error('Payment module health check failed:', error.message);
      return false;
    }
  }
}

// Export singleton instance
const paymentModuleIntegration = new PaymentModuleIntegration();
export default paymentModuleIntegration;
