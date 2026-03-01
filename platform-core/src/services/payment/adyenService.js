/**
 * Adyen Integration Service (Fase III — Blok A)
 *
 * Handles all Adyen API interactions: sessions, captures, refunds, webhooks.
 * Ported from payment-module/backend/services/AdyenService.js (CommonJS → ESM).
 *
 * PCI DSS SAQ-A compliant: no card data touches our servers.
 * All amounts in CENTS (integers, never floats).
 */

import { Client, CheckoutAPI } from '@adyen/api-library';
import crypto from 'crypto';
import logger from '../../utils/logger.js';

class AdyenService {
  constructor() {
    this.client = null;
    this.checkout = null;
    this.merchantAccount = process.env.ADYEN_MERCHANT_ACCOUNT;
    this.hmacKey = process.env.ADYEN_HMAC_KEY;
    this.clientKey = process.env.ADYEN_CLIENT_KEY;
    this.environment = process.env.ADYEN_ENVIRONMENT || 'TEST';
  }

  /**
   * Lazy initialization — only connects to Adyen when first needed.
   * Prevents startup failures if ADYEN_API_KEY is not yet configured.
   */
  _ensureInitialized() {
    if (this.checkout) return;

    if (!process.env.ADYEN_API_KEY) {
      throw new Error('ADYEN_API_KEY not configured in .env');
    }

    this.client = new Client({
      apiKey: process.env.ADYEN_API_KEY,
      environment: this.environment.toLowerCase() === 'live' ? 'LIVE' : 'TEST',
    });

    this.checkout = new CheckoutAPI(this.client);
    logger.info('Adyen SDK initialized', { environment: this.environment });
  }

  /**
   * Create payment session (Sessions flow — recommended by Adyen).
   *
   * @param {Object} params
   * @param {number} params.amountCents - Amount in cents
   * @param {string} params.currency - ISO 4217 (default: EUR)
   * @param {string} params.reference - Merchant reference (unique per transaction)
   * @param {string} params.returnUrl - Redirect URL after 3DS/iDEAL
   * @param {string} [params.countryCode] - ISO country code (NL, ES, BE)
   * @param {string} [params.shopperLocale] - Shopper locale (nl-NL, es-ES, etc.)
   * @param {Object} [params.metadata] - Additional metadata
   * @returns {Promise<{id: string, sessionData: string, expiresAt: string}>}
   */
  async createPaymentSession({
    amountCents,
    currency = 'EUR',
    reference,
    returnUrl,
    countryCode = 'NL',
    shopperLocale = 'nl-NL',
    metadata = {},
  }) {
    this._ensureInitialized();

    logger.info('Creating Adyen payment session', { reference, amountCents, currency });

    const sessionRequest = {
      merchantAccount: this.merchantAccount,
      amount: {
        value: amountCents,
        currency,
      },
      reference,
      returnUrl,
      countryCode,
      shopperLocale,
      metadata,

      // Allowed payment methods per destination
      allowedPaymentMethods: [
        'scheme',   // Credit/Debit cards
        'ideal',    // NL
        'bcmc',     // Bancontact (BE)
        'paypal',
      ],

      // 3D Secure 2.0
      authenticationData: {
        threeDSRequestData: {
          nativeThreeDS: 'preferred',
        },
      },

      // Immediate capture (no separate capture step needed)
      captureDelayHours: 0,
    };

    const response = await this.checkout.sessions(sessionRequest);

    logger.info('Payment session created', { sessionId: response.id, reference });

    return {
      id: response.id,
      sessionData: response.sessionData,
      expiresAt: response.expiresAt,
    };
  }

  /**
   * Capture an authorized payment.
   *
   * @param {string} pspReference - Adyen PSP reference
   * @param {number} amountCents - Amount to capture in cents
   * @param {string} currency - Currency code
   * @returns {Promise<{pspReference: string, status: string}>}
   */
  async capturePayment(pspReference, amountCents, currency = 'EUR') {
    this._ensureInitialized();

    logger.info('Capturing payment', { pspReference, amountCents, currency });

    const response = await this.checkout.paymentsCapture(pspReference, {
      merchantAccount: this.merchantAccount,
      amount: { value: amountCents, currency },
      reference: `capture-${pspReference}`,
    });

    logger.info('Payment captured', { pspReference: response.pspReference, status: response.status });

    return {
      pspReference: response.pspReference,
      status: response.status,
    };
  }

  /**
   * Initiate a refund.
   *
   * @param {string} pspReference - Original payment PSP reference
   * @param {number} amountCents - Amount to refund in cents
   * @param {string} currency - Currency code
   * @param {string} reference - Refund reference
   * @returns {Promise<{pspReference: string, status: string}>}
   */
  async initiateRefund(pspReference, amountCents, currency = 'EUR', reference = '') {
    this._ensureInitialized();

    logger.info('Initiating refund', { pspReference, amountCents, currency });

    const response = await this.checkout.paymentsRefund(pspReference, {
      merchantAccount: this.merchantAccount,
      amount: { value: amountCents, currency },
      reference: reference || `refund-${pspReference}-${Date.now()}`,
    });

    logger.info('Refund initiated', { refundPspReference: response.pspReference });

    return {
      pspReference: response.pspReference,
      status: response.status,
    };
  }

  /**
   * Cancel an authorized (not yet captured) payment.
   *
   * @param {string} pspReference - Adyen PSP reference
   * @returns {Promise<{pspReference: string, status: string}>}
   */
  async cancelPayment(pspReference) {
    this._ensureInitialized();

    logger.info('Cancelling payment', { pspReference });

    const response = await this.checkout.paymentsCancel(pspReference, {
      merchantAccount: this.merchantAccount,
      reference: `cancel-${pspReference}`,
    });

    return {
      pspReference: response.pspReference,
      status: response.status,
    };
  }

  /**
   * Verify HMAC signature on webhook notification.
   * Uses timing-safe comparison to prevent timing attacks.
   *
   * @param {Object} notificationItem - Adyen notification item
   * @param {string} hmacSignature - HMAC signature from additionalData
   * @returns {boolean}
   */
  verifyHMACSignature(notificationItem, hmacSignature) {
    if (!this.hmacKey) {
      logger.error('ADYEN_HMAC_KEY not configured');
      return false;
    }

    try {
      const signingString = this._buildSigningString(notificationItem);

      const expectedHmac = crypto
        .createHmac('sha256', Buffer.from(this.hmacKey, 'hex'))
        .update(signingString)
        .digest('base64');

      // Timing-safe comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedHmac),
        Buffer.from(hmacSignature),
      );

      if (!isValid) {
        logger.warn('HMAC signature verification failed', {
          expected: expectedHmac.substring(0, 8) + '...',
        });
      }

      return isValid;
    } catch (error) {
      logger.error('HMAC verification error', { error: error.message });
      return false;
    }
  }

  /**
   * Build signing string for HMAC verification.
   * Order: pspReference:originalReference:merchantAccountCode:merchantReference:value:currency:eventCode:success
   *
   * @private
   */
  _buildSigningString(notification) {
    const {
      pspReference,
      originalReference,
      merchantAccountCode,
      merchantReference,
      amount,
      eventCode,
      success,
    } = notification;

    return [
      pspReference || '',
      originalReference || '',
      merchantAccountCode || '',
      merchantReference || '',
      amount?.value || '',
      amount?.currency || '',
      eventCode || '',
      success || '',
    ].join(':');
  }

  /**
   * Test Adyen API connection.
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      this._ensureInitialized();
      // Attempt a lightweight API call
      await this.checkout.paymentMethods({
        merchantAccount: this.merchantAccount,
        countryCode: 'NL',
        amount: { value: 1000, currency: 'EUR' },
      });
      logger.info('Adyen connection test successful');
      return true;
    } catch (error) {
      logger.error('Adyen connection test failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get client-side configuration for Drop-in.
   * Safe to expose to frontend (client key only, no API key).
   */
  getClientConfig() {
    return {
      clientKey: this.clientKey,
      environment: this.environment.toLowerCase() === 'live' ? 'live' : 'test',
    };
  }
}

// Singleton export
const adyenService = new AdyenService();
export default adyenService;
