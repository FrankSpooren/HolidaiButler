import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  // Booking Reference
  bookingNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  confirmationCode: {
    type: String,
    required: true,
    unique: true
  },

  // Type
  type: {
    type: String,
    enum: ['event_ticket', 'attraction_ticket', 'tour', 'reservation', 'package'],
    required: true,
    index: true
  },

  // Customer Information
  customer: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true
    },
    country: String,
    language: {
      type: String,
      default: 'en'
    }
  },

  // Items (tickets, reservations, etc.)
  items: [{
    itemType: {
      type: String,
      enum: ['ticket', 'addon', 'package', 'upgrade'],
      required: true
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    },
    poi: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'POI'
    },
    name: String,
    description: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'EUR'
    },
    ticketType: String,
    ticketIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket'
    }]
  }],

  // Pricing
  pricing: {
    subtotal: {
      type: Number,
      required: true
    },
    tax: {
      type: Number,
      default: 0
    },
    taxRate: {
      type: Number,
      default: 0
    },
    serviceFee: {
      type: Number,
      default: 0
    },
    discount: {
      amount: {
        type: Number,
        default: 0
      },
      code: String,
      description: String
    },
    total: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'EUR'
    }
  },

  // Payment Status
  payment: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
      index: true
    },
    method: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash', 'ideal', 'other']
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    paidAt: Date,
    refundedAt: Date,
    refundAmount: Number,
    refundReason: String
  },

  // Booking Status
  status: {
    type: String,
    enum: [
      'pending',        // Created but not confirmed
      'confirmed',      // Payment received and confirmed
      'completed',      // Event/service completed
      'cancelled',      // Cancelled by customer
      'refunded',       // Money refunded
      'no_show',        // Customer didn't show up
      'expired'         // Booking expired
    ],
    default: 'pending',
    index: true
  },

  // Event/Visit Details
  visitDetails: {
    date: Date,
    time: String,
    duration: Number, // in minutes
    participants: Number,
    notes: String
  },

  // Special Requests
  specialRequests: {
    accessibility: [String],
    dietary: [String],
    other: String
  },

  // Delivery/Fulfillment
  fulfillment: {
    method: {
      type: String,
      enum: ['email', 'sms', 'app', 'physical', 'pickup'],
      default: 'email'
    },
    deliveredAt: Date,
    tracking: String
  },

  // Communication
  notifications: {
    confirmation: {
      sent: Boolean,
      sentAt: Date
    },
    reminder: {
      sent: Boolean,
      sentAt: Date
    },
    followUp: {
      sent: Boolean,
      sentAt: Date
    }
  },

  // Source & Attribution
  source: {
    channel: {
      type: String,
      enum: ['web', 'mobile_app', 'partner', 'call_center', 'walk_in', 'admin'],
      default: 'web'
    },
    referrer: String,
    campaign: String,
    affiliate: String
  },

  // Review & Feedback
  review: {
    submitted: {
      type: Boolean,
      default: false
    },
    rating: Number,
    comment: String,
    submittedAt: Date
  },

  // Cancellation Policy
  cancellationPolicy: {
    allowed: {
      type: Boolean,
      default: true
    },
    deadline: Date,
    fee: Number,
    refundPercentage: Number
  },

  // Cancellation Details
  cancellation: {
    cancelledAt: Date,
    cancelledBy: {
      type: String,
      enum: ['customer', 'admin', 'system', 'provider']
    },
    reason: String,
    refundIssued: Boolean,
    refundAmount: Number
  },

  // Admin Notes
  adminNotes: [{
    note: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Metadata
  metadata: {
    ip: String,
    userAgent: String,
    locale: String,
    timezone: String
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
bookingSchema.index({ 'customer.email': 1 });
bookingSchema.index({ 'customer.userId': 1 });
bookingSchema.index({ status: 1, 'payment.status': 1 });
bookingSchema.index({ 'visitDetails.date': 1 });
bookingSchema.index({ createdAt: -1 });

// Virtuals
bookingSchema.virtual('customerFullName').get(function() {
  return `${this.customer.firstName} ${this.customer.lastName}`;
});

bookingSchema.virtual('totalItems').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

bookingSchema.virtual('isPaid').get(function() {
  return this.payment.status === 'completed';
});

bookingSchema.virtual('canCancel').get(function() {
  if (!this.cancellationPolicy.allowed) return false;
  if (!this.cancellationPolicy.deadline) return true;
  return new Date() < this.cancellationPolicy.deadline;
});

// Methods
bookingSchema.methods.generateBookingNumber = function() {
  const prefix = 'BKG';
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${date}-${random}`;
};

bookingSchema.methods.generateConfirmationCode = function() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

bookingSchema.methods.calculateTotal = function() {
  // Calculate subtotal
  this.pricing.subtotal = this.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  // Apply discount
  let total = this.pricing.subtotal;
  if (this.pricing.discount.amount > 0) {
    total -= this.pricing.discount.amount;
  }

  // Add service fee
  total += this.pricing.serviceFee;

  // Add tax
  if (this.pricing.taxRate > 0) {
    this.pricing.tax = total * (this.pricing.taxRate / 100);
    total += this.pricing.tax;
  }

  this.pricing.total = Math.round(total * 100) / 100;

  return this.pricing.total;
};

bookingSchema.methods.confirm = function(transactionId, adminUserId) {
  this.status = 'confirmed';
  this.payment.status = 'completed';
  this.payment.paidAt = new Date();
  this.payment.transactionId = transactionId;

  this.notifications.confirmation.sent = true;
  this.notifications.confirmation.sentAt = new Date();

  if (adminUserId) {
    this.updatedBy = adminUserId;
  }

  return this.save();
};

bookingSchema.methods.cancel = function(reason, cancelledBy, refundAmount, adminUserId) {
  this.status = 'cancelled';
  this.cancellation = {
    cancelledAt: new Date(),
    cancelledBy,
    reason,
    refundIssued: refundAmount > 0,
    refundAmount
  };

  if (refundAmount > 0) {
    this.payment.status = refundAmount >= this.pricing.total ? 'refunded' : 'partially_refunded';
    this.payment.refundedAt = new Date();
    this.payment.refundAmount = refundAmount;
    this.payment.refundReason = reason;
  }

  if (adminUserId) {
    this.updatedBy = adminUserId;
  }

  return this.save();
};

bookingSchema.methods.complete = function(adminUserId) {
  this.status = 'completed';

  if (adminUserId) {
    this.updatedBy = adminUserId;
  }

  return this.save();
};

bookingSchema.methods.addNote = function(note, adminUserId) {
  this.adminNotes.push({
    note,
    createdBy: adminUserId,
    createdAt: new Date()
  });

  return this.save();
};

// Static methods
bookingSchema.statics.getTodayBookings = function(filters = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.find({
    ...filters,
    'visitDetails.date': { $gte: today, $lt: tomorrow },
    status: { $nin: ['cancelled', 'refunded'] }
  }).sort({ 'visitDetails.time': 1 });
};

bookingSchema.statics.getUpcoming = function(days = 7, filters = {}) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  return this.find({
    ...filters,
    'visitDetails.date': { $gte: startDate, $lte: endDate },
    status: { $in: ['confirmed', 'pending'] }
  }).sort({ 'visitDetails.date': 1 });
};

// Pre-save middleware
bookingSchema.pre('save', function(next) {
  // Generate booking number if not exists
  if (this.isNew && !this.bookingNumber) {
    this.bookingNumber = this.generateBookingNumber();
  }

  // Generate confirmation code if not exists
  if (this.isNew && !this.confirmationCode) {
    this.confirmationCode = this.generateConfirmationCode();
  }

  // Recalculate total if items changed
  if (this.isModified('items') || this.isModified('pricing.discount') || this.isModified('pricing.serviceFee')) {
    this.calculateTotal();
  }

  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
