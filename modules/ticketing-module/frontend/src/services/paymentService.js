/**
 * Payment Service
 * Client for HolidaiButler Payment Module API
 * Backend: payment-module (port 3005)
 * Gateway: platform-core (port 3001) -> /api/v1/payments
 */

import api from './api';

// API base path - routed through platform-core gateway
const PAYMENT_API = '/payments';

export const paymentService = {
  /**
   * Create a new payment session
   * Creates an Adyen session for Drop-in checkout
   * @param {Object} paymentData - Payment session data
   * @param {number} paymentData.amount - Amount in cents
   * @param {string} paymentData.currency - ISO currency code (EUR, USD, etc.)
   * @param {string} paymentData.bookingReference - Reference to the booking
   * @param {string} paymentData.resourceType - Type of resource (ticket, restaurant, etc.)
   * @param {string} paymentData.resourceId - ID of the resource
   * @param {Object} paymentData.customerInfo - Customer details
   */
  async createPaymentSession(paymentData) {
    const response = await api.post(PAYMENT_API, paymentData);
    return response.data;
  },

  /**
   * Get payment status by ID
   * @param {string} paymentId - Transaction ID or PSP reference
   */
  async getPaymentStatus(paymentId) {
    const response = await api.get(`${PAYMENT_API}/${paymentId}`);
    return response.data;
  },

  /**
   * Capture an authorized payment (admin only)
   * @param {string} paymentId - Transaction ID
   * @param {Object} captureData - Capture details
   * @param {number} captureData.amount - Amount to capture (optional, defaults to full amount)
   */
  async capturePayment(paymentId, captureData = {}) {
    const response = await api.post(`${PAYMENT_API}/${paymentId}/capture`, captureData);
    return response.data;
  },

  /**
   * Cancel an authorized payment
   * @param {string} paymentId - Transaction ID
   */
  async cancelPayment(paymentId) {
    const response = await api.post(`${PAYMENT_API}/${paymentId}/cancel`);
    return response.data;
  },

  /**
   * Get available payment methods
   * @param {Object} params - Query parameters
   * @param {string} params.countryCode - ISO country code (NL, BE, DE, etc.)
   * @param {string} params.currency - ISO currency code
   * @param {number} params.amount - Amount in cents
   */
  async getPaymentMethods(params = {}) {
    const response = await api.get(`${PAYMENT_API}/payment-methods/available`, { params });
    return response.data;
  },

  /**
   * Create a refund for a payment
   * @param {string} paymentId - Transaction ID
   * @param {Object} refundData - Refund details
   * @param {number} refundData.amount - Amount to refund in cents
   * @param {string} refundData.reason - Refund reason
   */
  async createRefund(paymentId, refundData) {
    const response = await api.post(`${PAYMENT_API}/${paymentId}/refunds`, refundData);
    return response.data;
  },

  /**
   * Get refunds for a payment
   * @param {string} paymentId - Transaction ID
   */
  async getRefunds(paymentId) {
    const response = await api.get(`${PAYMENT_API}/${paymentId}/refunds`);
    return response.data;
  },

  /**
   * Get all transactions (admin only)
   * @param {Object} params - Query parameters
   * @param {string} params.status - Filter by status
   * @param {string} params.startDate - Filter by start date
   * @param {string} params.endDate - Filter by end date
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   */
  async getTransactions(params = {}) {
    const response = await api.get(`${PAYMENT_API}/admin/transactions`, { params });
    return response.data;
  },

  /**
   * Check payment module health
   */
  async healthCheck() {
    try {
      const response = await api.get(`${PAYMENT_API}/health`);
      return response.data;
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  },
};

export default paymentService;
