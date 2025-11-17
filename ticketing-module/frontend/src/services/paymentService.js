import api from './api';

export const paymentService = {
  // Payment sessions
  async createPaymentSession(paymentData) {
    const response = await api.post('/api/payment/sessions', paymentData);
    return response.data;
  },

  async getPaymentSession(sessionId) {
    const response = await api.get(`/api/payment/sessions/${sessionId}`);
    return response.data;
  },

  // Payment methods
  async getPaymentMethods(amount, currency = 'EUR', countryCode = 'NL') {
    const response = await api.post('/api/payment/methods', {
      amount,
      currency,
      countryCode,
    });
    return response.data;
  },

  // Payments
  async submitPayment(paymentData) {
    const response = await api.post('/api/payment/payments', paymentData);
    return response.data;
  },

  async submitPaymentDetails(paymentId, details) {
    const response = await api.post(`/api/payment/payments/${paymentId}/details`, {
      details,
    });
    return response.data;
  },

  async getPaymentStatus(paymentId) {
    const response = await api.get(`/api/payment/payments/${paymentId}/status`);
    return response.data;
  },

  async getPaymentByReference(reference) {
    const response = await api.get(`/api/payment/payments/reference/${reference}`);
    return response.data;
  },

  // Refunds
  async createRefund(paymentId, refundData) {
    const response = await api.post(`/api/payment/payments/${paymentId}/refunds`, refundData);
    return response.data;
  },

  async getRefundStatus(refundId) {
    const response = await api.get(`/api/payment/refunds/${refundId}/status`);
    return response.data;
  },

  // Webhooks (for testing)
  async testWebhook(webhookData) {
    const response = await api.post('/api/payment/webhooks/test', webhookData);
    return response.data;
  },
};

export default paymentService;
