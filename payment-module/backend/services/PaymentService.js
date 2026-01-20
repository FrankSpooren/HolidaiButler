const { Transaction, Refund, PaymentMethod } = require('../models');
const AdyenService = require('./AdyenService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

/**
 * Payment Service
 * Core payment processing logic
 * Integrates with Adyen and manages transaction lifecycle
 */
class PaymentService {
  constructor() {
    this.TICKETING_MODULE_URL = process.env.TICKETING_MODULE_URL || 'http://localhost:3004';
  }

  /**
   * Create new payment
   * @param {Object} paymentData - Payment request data
   * @returns {Promise<Object>} Payment session and transaction
   */
  async createPayment(paymentData) {
    try {
      const {
        amount, // in cents
        currency,
        resourceType,
        resourceId,
        returnUrl,
        metadata,
        userId,
      } = paymentData;

      // Generate unique transaction reference
      const transactionReference = `TXN-${Date.now()}-${uuidv4().substring(0, 8)}`;

      logger.info(`Creating payment: ${transactionReference}`);

      // Create transaction record
      const transaction = await Transaction.create({
        transactionReference,
        amount: (amount / 100).toFixed(2), // Convert cents to decimal
        currency: currency || 'EUR',
        status: 'pending',
        userId,
        bookingReference: metadata?.bookingReference,
        resourceType,
        resourceId,
        merchantReference: transactionReference,
        metadata,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });

      // Create Adyen payment session
      try {
        const session = await AdyenService.createPaymentSession({
          amount,
          currency: currency || 'EUR',
          reference: transactionReference,
          returnUrl,
          metadata,
          countryCode: metadata?.countryCode || 'NL',
          shopperLocale: metadata?.shopperLocale || 'nl-NL',
        });

        // Update transaction with session info
        transaction.metadata = {
          ...transaction.metadata,
          adyenSessionId: session.sessionId,
        };
        await transaction.save();

        logger.info(`Payment created successfully: ${transaction.id}`);

        return {
          paymentId: transaction.id,
          transactionReference: transaction.transactionReference,
          sessionData: session.sessionData,
          sessionId: session.sessionId,
          expiresAt: session.expiresAt,
          redirectUrl: returnUrl,
        };
      } catch (adyenError) {
        // If Adyen session creation fails, mark transaction as failed
        transaction.status = 'failed';
        transaction.metadata = {
          ...transaction.metadata,
          error: adyenError.message,
        };
        await transaction.save();

        throw adyenError;
      }
    } catch (error) {
      logger.error('Error creating payment:', error);
      throw error;
    }
  }

  /**
   * Authorize payment (called by webhook)
   * @param {String} pspReference - Adyen PSP reference
   * @param {Object} webhookData - Data from Adyen webhook
   * @returns {Promise<Object>} Updated transaction
   */
  async authorizePayment(pspReference, webhookData) {
    try {
      const { merchantReference, amount, paymentMethod } = webhookData;

      const transaction = await Transaction.findOne({
        where: { merchantReference },
      });

      if (!transaction) {
        throw new Error(`Transaction not found for reference: ${merchantReference}`);
      }

      transaction.status = 'authorized';
      transaction.pspReference = pspReference;
      transaction.authorizedAmount = amount ? (amount.value / 100).toFixed(2) : transaction.amount;
      transaction.paymentMethod = paymentMethod;
      transaction.authorizedAt = new Date();

      await transaction.save();

      logger.info(`Payment authorized: ${transaction.transactionReference}`);

      return transaction;
    } catch (error) {
      logger.error('Error authorizing payment:', error);
      throw error;
    }
  }

  /**
   * Capture payment
   * @param {String} transactionId - Transaction ID
   * @param {Number} amount - Optional amount to capture (partial capture)
   * @returns {Promise<Object>} Capture result
   */
  async capturePayment(transactionId, amount = null) {
    try {
      const transaction = await Transaction.findByPk(transactionId);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== 'authorized') {
        throw new Error(`Cannot capture payment with status: ${transaction.status}`);
      }

      const captureAmount = amount || parseFloat(transaction.authorizedAmount) * 100; // to cents

      const result = await AdyenService.capturePayment(
        transaction.pspReference,
        Math.round(captureAmount),
        transaction.currency
      );

      transaction.status = 'captured';
      transaction.capturedAmount = (captureAmount / 100).toFixed(2);
      transaction.capturedAt = new Date();

      await transaction.save();

      // Notify ticketing module
      await this._notifyTicketingModule('payment.captured', transaction);

      logger.info(`Payment captured: ${transaction.transactionReference}`);

      return {
        transactionId: transaction.id,
        status: transaction.status,
        capturedAmount: transaction.capturedAmount,
        currency: transaction.currency,
      };
    } catch (error) {
      logger.error('Error capturing payment:', error);
      throw error;
    }
  }

  /**
   * Process payment webhook from Adyen
   * @param {Object} webhookData - Adyen notification
   * @returns {Promise<void>}
   */
  async processWebhook(webhookData) {
    try {
      const processed = await AdyenService.handleWebhook(webhookData);

      const { eventCode, success, pspReference, merchantReference } = processed;

      logger.info(`Processing webhook event: ${eventCode}, success: ${success}`);

      switch (eventCode) {
        case 'AUTHORISATION':
          if (success) {
            await this.authorizePayment(pspReference, processed);

            // Auto-capture if configured (or wait for manual capture)
            const transaction = await Transaction.findOne({
              where: { merchantReference },
            });

            if (transaction && process.env.AUTO_CAPTURE === 'true') {
              await this.capturePayment(transaction.id);
            }

            // Notify ticketing module
            await this._notifyTicketingModule('payment.authorized', transaction || { merchantReference });
          } else {
            await this._handleFailedPayment(merchantReference, processed.reason);
          }
          break;

        case 'CAPTURE':
          await this._handleCaptureWebhook(pspReference);
          break;

        case 'REFUND':
          await this._handleRefundWebhook(pspReference, processed);
          break;

        case 'CANCELLATION':
          await this._handleCancellationWebhook(pspReference);
          break;

        default:
          logger.warn(`Unhandled webhook event: ${eventCode}`);
      }
    } catch (error) {
      logger.error('Error processing webhook:', error);
      throw error;
    }
  }

  /**
   * Initiate refund
   * @param {String} transactionId - Transaction ID
   * @param {Number} amount - Optional amount to refund (partial refund)
   * @param {String} reason - Refund reason
   * @param {String} initiatedBy - User ID who initiated refund
   * @returns {Promise<Object>} Refund result
   */
  async refundPayment(transactionId, amount, reason, initiatedBy) {
    try {
      const transaction = await Transaction.findByPk(transactionId);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (!['captured', 'partially_refunded'].includes(transaction.status)) {
        throw new Error(`Cannot refund payment with status: ${transaction.status}`);
      }

      const maxRefundable = parseFloat(transaction.capturedAmount) - parseFloat(transaction.refundedAmount);
      const refundAmount = amount || maxRefundable;

      if (refundAmount > maxRefundable) {
        throw new Error(`Refund amount exceeds available amount: ${maxRefundable}`);
      }

      // Generate refund reference
      const refundReference = `REF-${Date.now()}-${uuidv4().substring(0, 8)}`;

      // Create refund record
      const refund = await Refund.create({
        refundReference,
        transactionId: transaction.id,
        originalPspReference: transaction.pspReference,
        amount: refundAmount.toFixed(2),
        currency: transaction.currency,
        reason,
        status: 'pending',
        initiatedBy,
      });

      // Process refund with Adyen
      try {
        const result = await AdyenService.initiateRefund(
          transaction.pspReference,
          Math.round(refundAmount * 100), // to cents
          transaction.currency,
          refundReference
        );

        refund.refundPspReference = result.refundPspReference;
        refund.status = 'processing';
        await refund.save();

        logger.info(`Refund initiated: ${refundReference}`);

        return {
          refundId: refund.id,
          refundReference: refund.refundReference,
          amount: refund.amount,
          currency: refund.currency,
          status: refund.status,
        };
      } catch (adyenError) {
        refund.status = 'failed';
        await refund.save();
        throw adyenError;
      }
    } catch (error) {
      logger.error('Error initiating refund:', error);
      throw error;
    }
  }

  /**
   * Get payment status
   * @param {String} transactionId - Transaction ID
   * @returns {Promise<Object>} Payment status
   */
  async getPaymentStatus(transactionId) {
    try {
      const transaction = await Transaction.findByPk(transactionId, {
        include: [{ model: Refund, as: 'refunds' }],
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      return {
        transactionId: transaction.id,
        transactionReference: transaction.transactionReference,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        paymentMethod: transaction.paymentMethod,
        authorizedAmount: transaction.authorizedAmount,
        capturedAmount: transaction.capturedAmount,
        refundedAmount: transaction.refundedAmount,
        refunds: transaction.refunds,
        createdAt: transaction.createdAt,
        authorizedAt: transaction.authorizedAt,
        capturedAt: transaction.capturedAt,
      };
    } catch (error) {
      logger.error('Error getting payment status:', error);
      throw error;
    }
  }

  /**
   * Cancel payment
   * @param {String} transactionId - Transaction ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelPayment(transactionId) {
    try {
      const transaction = await Transaction.findByPk(transactionId);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== 'authorized') {
        throw new Error(`Cannot cancel payment with status: ${transaction.status}`);
      }

      await AdyenService.cancelPayment(transaction.pspReference);

      transaction.status = 'cancelled';
      await transaction.save();

      logger.info(`Payment cancelled: ${transaction.transactionReference}`);

      return {
        transactionId: transaction.id,
        status: transaction.status,
      };
    } catch (error) {
      logger.error('Error cancelling payment:', error);
      throw error;
    }
  }

  // ========== Private Helper Methods ==========

  /**
   * Handle failed payment
   * @private
   */
  async _handleFailedPayment(merchantReference, reason) {
    try {
      const transaction = await Transaction.findOne({
        where: { merchantReference },
      });

      if (transaction) {
        transaction.status = 'failed';
        transaction.metadata = {
          ...transaction.metadata,
          failureReason: reason,
        };
        await transaction.save();

        await this._notifyTicketingModule('payment.failed', transaction);
      }
    } catch (error) {
      logger.error('Error handling failed payment:', error);
    }
  }

  /**
   * Handle capture webhook
   * @private
   */
  async _handleCaptureWebhook(pspReference) {
    try {
      const transaction = await Transaction.findOne({
        where: { pspReference },
      });

      if (transaction && transaction.status !== 'captured') {
        transaction.status = 'captured';
        transaction.capturedAt = new Date();
        transaction.capturedAmount = transaction.authorizedAmount;
        await transaction.save();

        await this._notifyTicketingModule('payment.captured', transaction);
      }
    } catch (error) {
      logger.error('Error handling capture webhook:', error);
    }
  }

  /**
   * Handle refund webhook
   * @private
   */
  async _handleRefundWebhook(pspReference, webhookData) {
    try {
      const refund = await Refund.findOne({
        where: { refundPspReference: pspReference },
      });

      if (refund) {
        refund.status = 'completed';
        refund.processedAt = new Date();
        await refund.save();

        // Update transaction
        const transaction = await Transaction.findByPk(refund.transactionId);
        if (transaction) {
          const totalRefunded = parseFloat(transaction.refundedAmount) + parseFloat(refund.amount);
          transaction.refundedAmount = totalRefunded.toFixed(2);

          if (totalRefunded >= parseFloat(transaction.capturedAmount)) {
            transaction.status = 'refunded';
          } else {
            transaction.status = 'partially_refunded';
          }

          await transaction.save();

          await this._notifyTicketingModule('payment.refunded', transaction);
        }
      }
    } catch (error) {
      logger.error('Error handling refund webhook:', error);
    }
  }

  /**
   * Handle cancellation webhook
   * @private
   */
  async _handleCancellationWebhook(pspReference) {
    try {
      const transaction = await Transaction.findOne({
        where: { pspReference },
      });

      if (transaction) {
        transaction.status = 'cancelled';
        await transaction.save();

        await this._notifyTicketingModule('payment.cancelled', transaction);
      }
    } catch (error) {
      logger.error('Error handling cancellation webhook:', error);
    }
  }

  /**
   * Notify ticketing module about payment events
   * @private
   */
  async _notifyTicketingModule(event, transaction) {
    try {
      logger.info(`Notifying ticketing module: ${event}`);

      await axios.post(`${this.TICKETING_MODULE_URL}/api/v1/webhooks/payment`, {
        event,
        paymentId: transaction.id,
        transactionId: transaction.pspReference,
        bookingReference: transaction.bookingReference,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
      }, {
        timeout: 5000,
      });
    } catch (error) {
      logger.error('Error notifying ticketing module:', error);
      // Don't throw - notification failure shouldn't break payment flow
    }
  }
}

module.exports = new PaymentService();
