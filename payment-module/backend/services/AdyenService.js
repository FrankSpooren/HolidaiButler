const { Client, CheckoutAPI } = require('@adyen/api-library');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Adyen Integration Service
 * Handles all Adyen API interactions: sessions, payments, refunds, webhooks
 * Based on TICKETING_PAYMENT_MODULE_ADVISORY_REPORT.md specifications
 */
class AdyenService {
  constructor() {
    // Initialize Adyen Client
    this.client = new Client({
      apiKey: process.env.ADYEN_API_KEY,
      environment: process.env.ADYEN_ENVIRONMENT || 'test', // 'test' or 'live'
    });

    this.checkout = new CheckoutAPI(this.client);
    this.merchantAccount = process.env.ADYEN_MERCHANT_ACCOUNT;
    this.hmacKey = process.env.ADYEN_HMAC_KEY;
  }

  /**
   * Create payment session
   * @param {Object} paymentRequest - Payment request data
   * @returns {Promise<Object>} Session data
   */
  async createPaymentSession(paymentRequest) {
    try {
      const {
        amount, // in cents
        currency,
        reference,
        returnUrl,
        metadata,
        countryCode,
        shopperLocale,
      } = paymentRequest;

      logger.info(`Creating Adyen payment session for reference: ${reference}`);

      const sessionRequest = {
        merchantAccount: this.merchantAccount,
        amount: {
          value: amount,
          currency: currency || 'EUR',
        },
        reference,
        returnUrl,
        countryCode: countryCode || 'NL',
        shopperLocale: shopperLocale || 'nl-NL',
        metadata: metadata || {},

        // Enable desired payment methods
        allowedPaymentMethods: [
          'scheme', // Credit/Debit cards
          'ideal',
          'paypal',
          'applepay',
          'googlepay',
          'bcmc', // Bancontact
          'sepadirectdebit',
        ],

        // 3D Secure 2.0 configuration
        authenticationData: {
          threeDSRequestData: {
            nativeThreeDS: 'preferred',
          },
        },

        // Capture configuration (immediate vs manual)
        captureDelayHours: 0, // Immediate capture
        // Set to manual if you want authorize-then-capture flow
      };

      const response = await this.checkout.sessions(sessionRequest);

      logger.info(`Payment session created: ${response.id}`);

      return {
        sessionId: response.id,
        sessionData: response.sessionData,
        expiresAt: response.expiresAt,
      };
    } catch (error) {
      logger.error('Error creating Adyen payment session:', error);
      throw new Error(`Payment session creation failed: ${error.message}`);
    }
  }

  /**
   * Get payment details
   * @param {String} pspReference - Adyen PSP reference
   * @returns {Promise<Object>} Payment details
   */
  async getPaymentDetails(pspReference) {
    try {
      const response = await this.checkout.paymentsDetails({
        paymentData: pspReference,
      });

      return response;
    } catch (error) {
      logger.error('Error getting payment details:', error);
      throw error;
    }
  }

  /**
   * Capture authorized payment
   * @param {String} pspReference - Original PSP reference
   * @param {Number} amount - Amount to capture (in cents)
   * @param {String} currency - Currency code
   * @returns {Promise<Object>} Capture result
   */
  async capturePayment(pspReference, amount, currency) {
    try {
      logger.info(`Capturing payment: ${pspReference}, amount: ${amount} ${currency}`);

      const captureRequest = {
        merchantAccount: this.merchantAccount,
        amount: {
          value: amount,
          currency,
        },
        reference: `capture-${pspReference}`,
      };

      const response = await this.checkout.paymentsCapture(pspReference, captureRequest);

      logger.info(`Payment captured successfully: ${response.pspReference}`);

      return {
        pspReference: response.pspReference,
        status: response.status,
        amount: response.amount,
      };
    } catch (error) {
      logger.error('Error capturing payment:', error);
      throw new Error(`Payment capture failed: ${error.message}`);
    }
  }

  /**
   * Initiate refund
   * @param {String} pspReference - Original PSP reference
   * @param {Number} amount - Amount to refund (in cents)
   * @param {String} currency - Currency code
   * @param {String} reference - Refund reference
   * @returns {Promise<Object>} Refund result
   */
  async initiateRefund(pspReference, amount, currency, reference) {
    try {
      logger.info(`Initiating refund: ${pspReference}, amount: ${amount} ${currency}`);

      const refundRequest = {
        merchantAccount: this.merchantAccount,
        amount: {
          value: amount,
          currency,
        },
        reference,
      };

      const response = await this.checkout.paymentsRefund(pspReference, refundRequest);

      logger.info(`Refund initiated successfully: ${response.pspReference}`);

      return {
        refundPspReference: response.pspReference,
        status: response.status,
      };
    } catch (error) {
      logger.error('Error initiating refund:', error);
      throw new Error(`Refund initiation failed: ${error.message}`);
    }
  }

  /**
   * Cancel authorized payment
   * @param {String} pspReference - Original PSP reference
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelPayment(pspReference) {
    try {
      logger.info(`Cancelling payment: ${pspReference}`);

      const cancelRequest = {
        merchantAccount: this.merchantAccount,
        reference: `cancel-${pspReference}`,
      };

      const response = await this.checkout.paymentsCancel(pspReference, cancelRequest);

      logger.info(`Payment cancelled successfully: ${response.pspReference}`);

      return {
        pspReference: response.pspReference,
        status: response.status,
      };
    } catch (error) {
      logger.error('Error cancelling payment:', error);
      throw new Error(`Payment cancellation failed: ${error.message}`);
    }
  }

  /**
   * Get available payment methods for country/currency
   * @param {String} countryCode - ISO country code
   * @param {String} currency - Currency code
   * @returns {Promise<Array>} Available payment methods
   */
  async getPaymentMethods(countryCode, currency) {
    try {
      const request = {
        merchantAccount: this.merchantAccount,
        countryCode,
        amount: {
          value: 1000, // Example amount (10.00)
          currency,
        },
      };

      const response = await this.checkout.paymentMethods(request);

      return response.paymentMethods || [];
    } catch (error) {
      logger.error('Error getting payment methods:', error);
      throw error;
    }
  }

  /**
   * Handle Adyen webhook notification
   * @param {Object} notification - Adyen notification payload
   * @returns {Promise<Object>} Processed notification data
   */
  async handleWebhook(notification) {
    try {
      const {
        eventCode,
        success,
        pspReference,
        merchantReference,
        amount,
        reason,
        paymentMethod,
      } = notification;

      logger.info(`Processing Adyen webhook: ${eventCode} for ${pspReference}`);

      // Extract additional data
      const processedData = {
        eventCode,
        success: success === 'true',
        pspReference,
        merchantReference,
        amount: amount ? {
          value: amount.value,
          currency: amount.currency,
        } : null,
        reason,
        paymentMethod,
        processedAt: new Date(),
      };

      return processedData;
    } catch (error) {
      logger.error('Error handling webhook:', error);
      throw error;
    }
  }

  /**
   * Verify HMAC signature for webhook
   * @param {Object} notification - Notification payload
   * @param {String} signature - HMAC signature from header
   * @returns {Boolean} Valid or not
   */
  verifyHMACSignature(notification, signature) {
    try {
      // Build the signing string
      const signingString = this._buildSigningString(notification);

      // Calculate HMAC
      const hmac = crypto
        .createHmac('sha256', Buffer.from(this.hmacKey, 'hex'))
        .update(signingString)
        .digest('base64');

      const isValid = hmac === signature;

      if (!isValid) {
        logger.warn('HMAC signature verification failed');
      }

      return isValid;
    } catch (error) {
      logger.error('Error verifying HMAC signature:', error);
      return false;
    }
  }

  /**
   * Build signing string for HMAC verification
   * @private
   */
  _buildSigningString(notification) {
    const {
      pspReference,
      originalReference,
      merchantAccountCode,
      merchantReference,
      value,
      currency,
      eventCode,
      success,
    } = notification;

    const signingString = [
      pspReference || '',
      originalReference || '',
      merchantAccountCode || '',
      merchantReference || '',
      value || '',
      currency || '',
      eventCode || '',
      success || '',
    ].join(':');

    return signingString;
  }

  /**
   * Test Adyen connection
   * @returns {Promise<Boolean>} Connection status
   */
  async testConnection() {
    try {
      // Try to get payment methods as a connection test
      await this.getPaymentMethods('NL', 'EUR');
      logger.info('Adyen connection test successful');
      return true;
    } catch (error) {
      logger.error('Adyen connection test failed:', error);
      return false;
    }
  }
}

module.exports = new AdyenService();
