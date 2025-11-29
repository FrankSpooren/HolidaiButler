import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  // Transaction Reference
  transactionNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  externalTransactionId: {
    type: String,
    index: true
  },

  // Related Entities
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    index: true
  },

  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  },

  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation'
  },

  // Customer Information
  customer: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    name: {
      type: String,
      required: true
    },
    phone: String
  },

  // Transaction Type
  type: {
    type: String,
    enum: ['payment', 'refund', 'chargeback', 'adjustment', 'fee'],
    required: true,
    index: true
  },

  // Payment Method
  paymentMethod: {
    type: String,
    enum: [
      'credit_card',
      'debit_card',
      'paypal',
      'bank_transfer',
      'ideal',
      'sepa',
      'cash',
      'voucher',
      'wallet',
      'other'
    ],
    required: true,
    index: true
  },

  // Payment Provider
  provider: {
    name: {
      type: String,
      enum: ['stripe', 'adyen', 'paypal', 'manual', 'other'],
      default: 'stripe'
    },
    paymentIntentId: String,
    chargeId: String,
    customerId: String,
    metadata: mongoose.Schema.Types.Mixed
  },

  // Amount Details
  amount: {
    subtotal: {
      type: Number,
      required: true
    },
    tax: {
      type: Number,
      default: 0
    },
    taxRate: Number,
    serviceFee: {
      type: Number,
      default: 0
    },
    processingFee: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true,
      index: true
    },
    currency: {
      type: String,
      default: 'EUR',
      uppercase: true
    },
    exchangeRate: Number
  },

  // Status
  status: {
    type: String,
    enum: [
      'pending',
      'processing',
      'authorized',
      'completed',
      'failed',
      'cancelled',
      'refunded',
      'partially_refunded',
      'disputed',
      'expired'
    ],
    default: 'pending',
    required: true,
    index: true
  },

  // Payment Card Info (tokenized)
  card: {
    last4: String,
    brand: {
      type: String,
      enum: ['visa', 'mastercard', 'amex', 'discover', 'other']
    },
    country: String,
    fingerprint: String
  },

  // Bank Transfer Info
  bankTransfer: {
    iban: String,
    bic: String,
    accountHolder: String,
    reference: String
  },

  // Timeline
  timestamps: {
    initiated: {
      type: Date,
      default: Date.now
    },
    authorized: Date,
    captured: Date,
    completed: Date,
    failed: Date,
    refunded: Date,
    disputed: Date
  },

  // Refund Information
  refund: {
    amount: Number,
    reason: String,
    refundedAt: Date,
    refundTransactionId: String,
    refundMethod: String,
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser'
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed']
    }
  },

  // Dispute/Chargeback
  dispute: {
    isDisputed: {
      type: Boolean,
      default: false
    },
    disputedAt: Date,
    reason: String,
    status: {
      type: String,
      enum: ['open', 'under_review', 'won', 'lost', 'closed']
    },
    evidence: [{
      type: String,
      description: String,
      uploadedAt: Date
    }],
    resolvedAt: Date,
    resolution: String
  },

  // Fraud Detection
  fraudCheck: {
    riskScore: {
      type: Number,
      min: 0,
      max: 100
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    flags: [String],
    ipAddress: String,
    deviceFingerprint: String,
    requiresReview: {
      type: Boolean,
      default: false
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser'
    },
    reviewedAt: Date,
    reviewNotes: String
  },

  // Billing Address
  billingAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },

  // Error Information
  error: {
    code: String,
    message: String,
    details: mongoose.Schema.Types.Mixed,
    occurredAt: Date
  },

  // Receipt & Invoice
  receipt: {
    number: String,
    url: String,
    sentAt: Date,
    downloadedAt: Date
  },

  invoice: {
    number: String,
    url: String,
    issuedAt: Date,
    dueAt: Date,
    paidAt: Date
  },

  // Description & Notes
  description: String,

  notes: [{
    note: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isInternal: {
      type: Boolean,
      default: true
    }
  }],

  // Metadata
  metadata: {
    ip: String,
    userAgent: String,
    locale: String,
    source: {
      type: String,
      enum: ['web', 'mobile_app', 'admin', 'api', 'recurring'],
      default: 'web'
    },
    channel: String,
    campaign: String
  },

  // Reconciliation
  reconciliation: {
    isReconciled: {
      type: Boolean,
      default: false
    },
    reconciledAt: Date,
    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser'
    },
    batchId: String,
    settlementDate: Date
  },

  // Admin Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser'
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser'
  }

}, {
  timestamps: true
});

// Indexes
transactionSchema.index({ 'customer.email': 1 });
transactionSchema.index({ 'customer.userId': 1 });
transactionSchema.index({ status: 1, type: 1 });
transactionSchema.index({ 'timestamps.completed': -1 });
transactionSchema.index({ 'provider.name': 1, 'provider.paymentIntentId': 1 });
transactionSchema.index({ 'fraudCheck.requiresReview': 1 });
transactionSchema.index({ 'reconciliation.isReconciled': 1 });
transactionSchema.index({ createdAt: -1 });

// Virtuals
transactionSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

transactionSchema.virtual('isPending').get(function() {
  return ['pending', 'processing', 'authorized'].includes(this.status);
});

transactionSchema.virtual('isFailed').get(function() {
  return ['failed', 'cancelled'].includes(this.status);
});

transactionSchema.virtual('isRefunded').get(function() {
  return ['refunded', 'partially_refunded'].includes(this.status);
});

transactionSchema.virtual('netAmount').get(function() {
  let net = this.amount.total;
  if (this.refund && this.refund.amount) {
    net -= this.refund.amount;
  }
  return net;
});

transactionSchema.virtual('processingTime').get(function() {
  if (this.timestamps.completed && this.timestamps.initiated) {
    return this.timestamps.completed - this.timestamps.initiated;
  }
  return null;
});

// Methods
transactionSchema.methods.generateTransactionNumber = function() {
  const prefix = 'TXN';
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${prefix}-${date}-${random}`;
};

transactionSchema.methods.authorize = function(authorizationData, adminUserId) {
  this.status = 'authorized';
  this.timestamps.authorized = new Date();

  if (authorizationData.authorizationCode) {
    this.provider.metadata = {
      ...this.provider.metadata,
      authorizationCode: authorizationData.authorizationCode
    };
  }

  if (adminUserId) {
    this.updatedBy = adminUserId;
  }

  return this.save();
};

transactionSchema.methods.capture = function(adminUserId) {
  if (this.status !== 'authorized') {
    throw new Error('Transaction must be authorized before capture');
  }

  this.status = 'processing';
  this.timestamps.captured = new Date();

  if (adminUserId) {
    this.updatedBy = adminUserId;
  }

  return this.save();
};

transactionSchema.methods.complete = function(completionData, adminUserId) {
  this.status = 'completed';
  this.timestamps.completed = new Date();

  if (completionData.receiptUrl) {
    this.receipt.url = completionData.receiptUrl;
    this.receipt.sentAt = new Date();
  }

  if (adminUserId) {
    this.updatedBy = adminUserId;
  }

  return this.save();
};

transactionSchema.methods.fail = function(errorInfo, adminUserId) {
  this.status = 'failed';
  this.timestamps.failed = new Date();

  this.error = {
    code: errorInfo.code || 'PAYMENT_FAILED',
    message: errorInfo.message || 'Payment failed',
    details: errorInfo.details || {},
    occurredAt: new Date()
  };

  if (adminUserId) {
    this.updatedBy = adminUserId;
  }

  return this.save();
};

transactionSchema.methods.refundTransaction = function(refundData, adminUserId) {
  const refundAmount = refundData.amount || this.amount.total;
  const isPartial = refundAmount < this.amount.total;

  this.status = isPartial ? 'partially_refunded' : 'refunded';
  this.timestamps.refunded = new Date();

  this.refund = {
    amount: refundAmount,
    reason: refundData.reason,
    refundedAt: new Date(),
    refundTransactionId: refundData.refundTransactionId,
    refundMethod: refundData.refundMethod || this.paymentMethod,
    initiatedBy: adminUserId,
    status: 'completed'
  };

  if (adminUserId) {
    this.updatedBy = adminUserId;
  }

  return this.save();
};

transactionSchema.methods.initiateDispute = function(disputeData, adminUserId) {
  this.status = 'disputed';
  this.dispute = {
    isDisputed: true,
    disputedAt: new Date(),
    reason: disputeData.reason,
    status: 'open',
    evidence: disputeData.evidence || []
  };

  if (adminUserId) {
    this.updatedBy = adminUserId;
  }

  return this.save();
};

transactionSchema.methods.resolveDispute = function(resolution, won, adminUserId) {
  this.dispute.status = won ? 'won' : 'lost';
  this.dispute.resolvedAt = new Date();
  this.dispute.resolution = resolution;

  if (!won) {
    this.status = 'refunded';
  }

  if (adminUserId) {
    this.updatedBy = adminUserId;
  }

  return this.save();
};

transactionSchema.methods.flagForReview = function(reason, adminUserId) {
  this.fraudCheck.requiresReview = true;

  if (!this.fraudCheck.flags) {
    this.fraudCheck.flags = [];
  }
  this.fraudCheck.flags.push(reason);

  if (adminUserId) {
    this.updatedBy = adminUserId;
  }

  return this.save();
};

transactionSchema.methods.approveAfterReview = function(notes, adminUserId) {
  this.fraudCheck.requiresReview = false;
  this.fraudCheck.reviewedBy = adminUserId;
  this.fraudCheck.reviewedAt = new Date();
  this.fraudCheck.reviewNotes = notes;

  if (adminUserId) {
    this.updatedBy = adminUserId;
  }

  return this.save();
};

transactionSchema.methods.reconcile = function(reconciliationData, adminUserId) {
  this.reconciliation = {
    isReconciled: true,
    reconciledAt: new Date(),
    reconciledBy: adminUserId,
    batchId: reconciliationData.batchId,
    settlementDate: reconciliationData.settlementDate
  };

  if (adminUserId) {
    this.updatedBy = adminUserId;
  }

  return this.save();
};

transactionSchema.methods.addNote = function(note, adminUserId, isInternal = true) {
  this.notes.push({
    note,
    createdBy: adminUserId,
    createdAt: new Date(),
    isInternal
  });

  return this.save();
};

// Static methods
transactionSchema.statics.getTodayTransactions = function(filters = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.find({
    ...filters,
    createdAt: { $gte: today, $lt: tomorrow }
  }).sort({ createdAt: -1 });
};

transactionSchema.statics.getRevenueByDateRange = async function(startDate, endDate, filters = {}) {
  return this.aggregate([
    {
      $match: {
        ...filters,
        status: 'completed',
        'timestamps.completed': { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$timestamps.completed' }
        },
        totalRevenue: { $sum: '$amount.total' },
        transactionCount: { $sum: 1 },
        avgTransaction: { $avg: '$amount.total' }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);
};

transactionSchema.statics.getPendingReviews = function() {
  return this.find({
    'fraudCheck.requiresReview': true,
    status: { $nin: ['failed', 'cancelled'] }
  }).sort({ createdAt: -1 });
};

transactionSchema.statics.getUnreconciledTransactions = function(beforeDate) {
  return this.find({
    status: 'completed',
    'reconciliation.isReconciled': false,
    'timestamps.completed': { $lt: beforeDate }
  }).sort({ 'timestamps.completed': 1 });
};

// Pre-save middleware
transactionSchema.pre('save', function(next) {
  // Generate transaction number if not exists
  if (this.isNew && !this.transactionNumber) {
    this.transactionNumber = this.generateTransactionNumber();
  }

  // Set completed timestamp
  if (this.isModified('status') && this.status === 'completed' && !this.timestamps.completed) {
    this.timestamps.completed = new Date();
  }

  // Calculate risk level based on risk score
  if (this.fraudCheck && this.fraudCheck.riskScore !== undefined) {
    if (this.fraudCheck.riskScore >= 75) {
      this.fraudCheck.riskLevel = 'critical';
      this.fraudCheck.requiresReview = true;
    } else if (this.fraudCheck.riskScore >= 50) {
      this.fraudCheck.riskLevel = 'high';
      this.fraudCheck.requiresReview = true;
    } else if (this.fraudCheck.riskScore >= 25) {
      this.fraudCheck.riskLevel = 'medium';
    } else {
      this.fraudCheck.riskLevel = 'low';
    }
  }

  next();
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
