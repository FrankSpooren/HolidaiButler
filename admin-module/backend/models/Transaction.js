import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Transaction extends Model {
  // Generate transaction number
  static generateTransactionNumber() {
    const prefix = 'TXN';
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `${prefix}-${date}-${random}`;
  }

  // Virtuals
  get isCompleted() {
    return this.status === 'completed';
  }

  get isPending() {
    return ['pending', 'processing', 'authorized'].includes(this.status);
  }

  get isFailed() {
    return ['failed', 'cancelled'].includes(this.status);
  }

  get isRefunded() {
    return ['refunded', 'partially_refunded'].includes(this.status);
  }

  get netAmount() {
    let net = parseFloat(this.totalAmount) || 0;
    if (this.refundAmount) {
      net -= parseFloat(this.refundAmount);
    }
    return net;
  }

  // Methods
  async authorize(authorizationData, adminUserId) {
    this.status = 'authorized';
    this.authorizedAt = new Date();

    if (authorizationData.authorizationCode) {
      const metadata = this.providerMetadata || {};
      metadata.authorizationCode = authorizationData.authorizationCode;
      this.providerMetadata = metadata;
    }

    if (adminUserId) this.updatedById = adminUserId;
    return this.save();
  }

  async capture(adminUserId) {
    if (this.status !== 'authorized') {
      throw new Error('Transaction must be authorized before capture');
    }

    this.status = 'processing';
    this.capturedAt = new Date();
    if (adminUserId) this.updatedById = adminUserId;
    return this.save();
  }

  async complete(completionData, adminUserId) {
    this.status = 'completed';
    this.completedAt = new Date();

    if (completionData.receiptUrl) {
      this.receiptUrl = completionData.receiptUrl;
      this.receiptSentAt = new Date();
    }

    if (adminUserId) this.updatedById = adminUserId;
    return this.save();
  }

  async fail(errorInfo, adminUserId) {
    this.status = 'failed';
    this.failedAt = new Date();
    this.errorCode = errorInfo.code || 'PAYMENT_FAILED';
    this.errorMessage = errorInfo.message || 'Payment failed';
    this.errorDetails = errorInfo.details || {};

    if (adminUserId) this.updatedById = adminUserId;
    return this.save();
  }

  async refundTransaction(refundData, adminUserId) {
    const refundAmount = refundData.amount || this.totalAmount;
    const isPartial = refundAmount < this.totalAmount;

    this.status = isPartial ? 'partially_refunded' : 'refunded';
    this.refundedAt = new Date();
    this.refundAmount = refundAmount;
    this.refundReason = refundData.reason;
    this.refundTransactionId = refundData.refundTransactionId;
    this.refundInitiatedById = adminUserId;

    if (adminUserId) this.updatedById = adminUserId;
    return this.save();
  }

  async addNote(note, adminUserId, isInternal = true) {
    const notes = this.notes || [];
    notes.push({
      note,
      createdById: adminUserId,
      createdAt: new Date().toISOString(),
      isInternal
    });
    this.notes = notes;
    return this.save();
  }
}

Transaction.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  transactionNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'transaction_number'
  },

  externalTransactionId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'external_transaction_id'
  },

  // Related Entities
  bookingId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'booking_id'
  },

  ticketId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'ticket_id'
  },

  reservationId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'reservation_id'
  },

  // Customer
  customerUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'customer_user_id'
  },

  customerEmail: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'customer_email'
  },

  customerName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'customer_name'
  },

  customerPhone: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'customer_phone'
  },

  // Transaction Type
  type: {
    type: DataTypes.ENUM('payment', 'refund', 'chargeback', 'adjustment', 'fee'),
    allowNull: false
  },

  // Payment Method
  paymentMethod: {
    type: DataTypes.ENUM('credit_card', 'debit_card', 'paypal', 'bank_transfer', 'ideal', 'sepa', 'cash', 'voucher', 'wallet', 'other'),
    allowNull: false,
    field: 'payment_method'
  },

  // Provider
  providerName: {
    type: DataTypes.ENUM('stripe', 'adyen', 'paypal', 'manual', 'other'),
    defaultValue: 'stripe',
    field: 'provider_name'
  },

  providerPaymentIntentId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'provider_payment_intent_id'
  },

  providerChargeId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'provider_charge_id'
  },

  providerCustomerId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'provider_customer_id'
  },

  providerMetadata: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'provider_metadata'
  },

  // Amount
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },

  tax: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },

  taxRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    field: 'tax_rate'
  },

  serviceFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'service_fee'
  },

  processingFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'processing_fee'
  },

  discount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },

  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_amount'
  },

  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR'
  },

  // Status
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'authorized', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded', 'disputed', 'expired'),
    defaultValue: 'pending'
  },

  // Card Info
  cardLast4: {
    type: DataTypes.STRING(4),
    allowNull: true,
    field: 'card_last4'
  },

  cardBrand: {
    type: DataTypes.ENUM('visa', 'mastercard', 'amex', 'discover', 'other'),
    allowNull: true,
    field: 'card_brand'
  },

  // Timestamps
  initiatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'initiated_at'
  },

  authorizedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'authorized_at'
  },

  capturedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'captured_at'
  },

  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  },

  failedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'failed_at'
  },

  refundedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'refunded_at'
  },

  // Refund
  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'refund_amount'
  },

  refundReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'refund_reason'
  },

  refundTransactionId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'refund_transaction_id'
  },

  refundInitiatedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'refund_initiated_by_id'
  },

  // Dispute
  isDisputed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_disputed'
  },

  disputedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'disputed_at'
  },

  disputeReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'dispute_reason'
  },

  disputeStatus: {
    type: DataTypes.ENUM('open', 'under_review', 'won', 'lost', 'closed'),
    allowNull: true,
    field: 'dispute_status'
  },

  // Fraud
  fraudRiskScore: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'fraud_risk_score'
  },

  fraudRiskLevel: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: true,
    field: 'fraud_risk_level'
  },

  fraudRequiresReview: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'fraud_requires_review'
  },

  // Error
  errorCode: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'error_code'
  },

  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message'
  },

  errorDetails: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'error_details'
  },

  // Receipt
  receiptNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'receipt_number'
  },

  receiptUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'receipt_url'
  },

  receiptSentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'receipt_sent_at'
  },

  // Billing Address
  billingAddress: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'billing_address'
  },

  // Notes
  notes: {
    type: DataTypes.JSON,
    defaultValue: []
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // Metadata
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  },

  // Reconciliation
  isReconciled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_reconciled'
  },

  reconciledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reconciled_at'
  },

  reconciledById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'reconciled_by_id'
  },

  // Admin
  createdById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by_id'
  },

  updatedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'updated_by_id'
  }
}, {
  sequelize,
  modelName: 'Transaction',
  tableName: 'transactions',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['transaction_number'], unique: true },
    { fields: ['status'] },
    { fields: ['type'] },
    { fields: ['payment_method'] },
    { fields: ['customer_email'] },
    { fields: ['booking_id'] },
    { fields: ['completed_at'] },
    { fields: ['is_reconciled'] }
  ],
  hooks: {
    beforeCreate: (transaction) => {
      if (!transaction.transactionNumber) {
        transaction.transactionNumber = Transaction.generateTransactionNumber();
      }
    },
    beforeUpdate: (transaction) => {
      // Calculate risk level based on score
      if (transaction.fraudRiskScore !== undefined && transaction.fraudRiskScore !== null) {
        if (transaction.fraudRiskScore >= 75) {
          transaction.fraudRiskLevel = 'critical';
          transaction.fraudRequiresReview = true;
        } else if (transaction.fraudRiskScore >= 50) {
          transaction.fraudRiskLevel = 'high';
          transaction.fraudRequiresReview = true;
        } else if (transaction.fraudRiskScore >= 25) {
          transaction.fraudRiskLevel = 'medium';
        } else {
          transaction.fraudRiskLevel = 'low';
        }
      }
    }
  }
});

export default Transaction;
