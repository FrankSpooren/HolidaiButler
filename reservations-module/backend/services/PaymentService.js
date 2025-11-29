/**
 * Payment Service
 * Handles deposit sessions, payment verification, and refunds via Payment Engine
 */

const axios = require('axios');
const { getCircuitBreaker } = require('../utils/circuitBreaker');
const logger = require('../utils/logger');

class PaymentService {
  constructor() {
    this.paymentEngineUrl = process.env.PAYMENT_ENGINE_URL || 'http://localhost:3005';
    this.apiKey = process.env.PAYMENT_ENGINE_API_KEY;

    // Circuit breaker for payment engine calls
    this.circuitBreaker = getCircuitBreaker('payment-engine', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 30000,
      resetTimeout: 60000,
    });
  }

  /**
   * Create a deposit payment session
   */
  async createDepositSession({ reservationId, amount, currency = 'EUR', metadata }) {
    const payload = {
      type: 'deposit',
      reference: `RES-${reservationId}`,
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      description: `Restaurant reservation deposit - ${metadata.restaurantName}`,
      metadata: {
        reservationId,
        ...metadata,
      },
      returnUrl: `${process.env.FRONTEND_URL}/reservation/confirm/${reservationId}`,
      cancelUrl: `${process.env.FRONTEND_URL}/reservation/cancel/${reservationId}`,
      webhookUrl: `${process.env.API_URL}/api/v1/webhooks/payment`,
      expiresIn: 900, // 15 minutes
    };

    try {
      const response = await this.circuitBreaker.execute(
        () => this.makePaymentRequest('/api/v1/payments/sessions', 'POST', payload),
        () => this.fallbackCreateSession(reservationId, amount)
      );

      logger.info(`Payment session created for reservation ${reservationId}: ${response.sessionId}`);

      return {
        id: response.sessionId,
        paymentUrl: response.paymentUrl,
        expiresAt: response.expiresAt,
        amount,
        currency,
      };
    } catch (error) {
      logger.error(`Failed to create payment session for reservation ${reservationId}:`, error);
      throw error;
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(transactionId) {
    try {
      const response = await this.circuitBreaker.execute(
        () => this.makePaymentRequest(`/api/v1/payments/${transactionId}/status`, 'GET'),
        () => ({ status: 'pending' }) // Fallback: assume pending
      );

      const isPaid = ['completed', 'authorized', 'settled'].includes(response.status);

      logger.info(`Payment verification for ${transactionId}: ${response.status} (paid: ${isPaid})`);

      return isPaid;
    } catch (error) {
      logger.error(`Failed to verify payment ${transactionId}:`, error);
      return false;
    }
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(transactionId) {
    try {
      const response = await this.circuitBreaker.execute(
        () => this.makePaymentRequest(`/api/v1/payments/${transactionId}`, 'GET'),
        () => null
      );

      return response;
    } catch (error) {
      logger.error(`Failed to get payment details ${transactionId}:`, error);
      return null;
    }
  }

  /**
   * Refund deposit (full)
   */
  async refundDeposit(transactionId) {
    try {
      const response = await this.circuitBreaker.execute(
        () => this.makePaymentRequest(`/api/v1/payments/${transactionId}/refund`, 'POST', {
          type: 'full',
          reason: 'Reservation cancelled within deadline',
        }),
        () => this.fallbackRefund(transactionId)
      );

      logger.info(`Refund processed for ${transactionId}: ${response.refundId}`);

      return {
        success: true,
        refundId: response.refundId,
        status: response.status,
      };
    } catch (error) {
      logger.error(`Failed to refund payment ${transactionId}:`, error);
      throw error;
    }
  }

  /**
   * Partial refund
   */
  async partialRefund(transactionId, amount, reason) {
    try {
      const response = await this.circuitBreaker.execute(
        () => this.makePaymentRequest(`/api/v1/payments/${transactionId}/refund`, 'POST', {
          type: 'partial',
          amount: Math.round(amount * 100),
          reason,
        }),
        () => this.fallbackRefund(transactionId)
      );

      logger.info(`Partial refund processed for ${transactionId}: ${response.refundId}`);

      return {
        success: true,
        refundId: response.refundId,
        amount,
        status: response.status,
      };
    } catch (error) {
      logger.error(`Failed to partial refund payment ${transactionId}:`, error);
      throw error;
    }
  }

  /**
   * Forfeit deposit (no-show or late cancellation)
   */
  async forfeitDeposit(transactionId) {
    try {
      const response = await this.circuitBreaker.execute(
        () => this.makePaymentRequest(`/api/v1/payments/${transactionId}/capture`, 'POST', {
          type: 'full',
          reason: 'Deposit forfeited - no-show or late cancellation',
        }),
        () => ({ success: true, captured: true })
      );

      logger.info(`Deposit forfeited for ${transactionId}`);

      return {
        success: true,
        captured: response.captured,
      };
    } catch (error) {
      logger.error(`Failed to forfeit deposit ${transactionId}:`, error);
      throw error;
    }
  }

  /**
   * Charge no-show fee
   */
  async chargeNoShowFee(transactionId, amount) {
    // If deposit exists, capture it
    if (transactionId) {
      return this.forfeitDeposit(transactionId);
    }

    // Otherwise, this would require a saved payment method
    // For now, log the attempt
    logger.warn(`No-show fee of ${amount} cannot be charged - no payment method on file`);

    return {
      success: false,
      reason: 'No payment method available',
      amount,
    };
  }

  /**
   * Process webhook notification
   */
  async processWebhook(eventType, payload) {
    logger.info(`Processing payment webhook: ${eventType}`);

    switch (eventType) {
      case 'payment.completed':
        return {
          action: 'confirm_reservation',
          transactionId: payload.transactionId,
          reservationId: payload.metadata?.reservationId,
        };

      case 'payment.failed':
        return {
          action: 'release_reservation',
          transactionId: payload.transactionId,
          reservationId: payload.metadata?.reservationId,
          reason: payload.failureReason,
        };

      case 'payment.expired':
        return {
          action: 'expire_reservation',
          transactionId: payload.transactionId,
          reservationId: payload.metadata?.reservationId,
        };

      case 'refund.completed':
        return {
          action: 'refund_completed',
          transactionId: payload.transactionId,
          refundId: payload.refundId,
        };

      default:
        logger.warn(`Unknown payment webhook event: ${eventType}`);
        return { action: 'none' };
    }
  }

  /**
   * Make HTTP request to payment engine
   */
  async makePaymentRequest(endpoint, method = 'GET', data = null) {
    const config = {
      method,
      url: `${this.paymentEngineUrl}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      timeout: 30000,
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  }

  /**
   * Fallback for session creation (when payment engine unavailable)
   */
  fallbackCreateSession(reservationId, amount) {
    logger.warn(`Using fallback for payment session: ${reservationId}`);

    // Return a placeholder session - reservation will be marked for manual payment
    return {
      sessionId: `FALLBACK-${reservationId}-${Date.now()}`,
      paymentUrl: null,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      fallback: true,
    };
  }

  /**
   * Fallback for refunds (when payment engine unavailable)
   */
  fallbackRefund(transactionId) {
    logger.warn(`Refund fallback triggered for: ${transactionId}`);

    // Queue for manual processing
    return {
      refundId: `PENDING-${Date.now()}`,
      status: 'pending_manual',
      message: 'Refund queued for manual processing',
    };
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    return this.circuitBreaker.getStatus();
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.paymentEngineUrl}/health`, {
        timeout: 5000,
      });

      return {
        healthy: response.status === 200,
        service: 'payment-engine',
        status: response.data,
      };
    } catch (error) {
      return {
        healthy: false,
        service: 'payment-engine',
        error: error.message,
      };
    }
  }
}

module.exports = new PaymentService();
