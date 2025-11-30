const mongoose = require('mongoose');

/**
 * Enhanced Booking Model for Ticketing Module
 * Extends the base booking model with ticketing-specific features
 * Based on TICKETING_PAYMENT_MODULE_ADVISORY_REPORT.md
 */
const BookingSchema = new mongoose.Schema({
  // Unique booking reference
  bookingReference: {
    type: String,
    required: true,
    unique: true,
    index: true,
    // Format: BK-YYYY-NNNNNN (e.g., BK-2025-001234)
  },

  // References
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  poiId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'POI',
    required: true,
    index: true,
  },

  // Booking status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show', 'expired'],
    default: 'pending',
    required: true,
    index: true,
  },

  // Booking details
  details: {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    time: {
      type: String,
      // Format: "HH:MM"
    },
    duration: {
      type: Number,
      // Duration in minutes
    },
    guests: {
      adults: {
        type: Number,
        required: true,
        min: 0,
      },
      children: {
        type: Number,
        default: 0,
        min: 0,
      },
      infants: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    specialRequests: {
      type: String,
    },
  },

  // Pricing information
  pricing: {
    basePrice: {
      type: Number,
      required: true,
    },
    taxes: {
      type: Number,
      default: 0,
    },
    fees: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'EUR',
      uppercase: true,
    },
    commission: {
      type: Number,
      // Platform commission amount
    },
  },

  // Payment information (links to Payment Module)
  payment: {
    status: {
      type: String,
      enum: ['pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
      index: true,
    },
    method: {
      type: String,
      // e.g., 'card', 'ideal', 'paypal'
    },
    transactionId: {
      type: String,
      index: true,
      // Reference to Payment Module transaction
    },
    paidAt: {
      type: Date,
    },
  },

  // Tickets (generated after payment confirmation)
  tickets: {
    ticketIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
    }],
    deliveryMethod: {
      type: String,
      enum: ['email', 'sms', 'app', 'wallet'],
      default: 'email',
    },
    deliveredAt: {
      type: Date,
    },
  },

  // Experience details (for tours, excursions, etc.)
  experience: {
    productType: {
      type: String,
      enum: ['ticket', 'tour', 'excursion', 'experience', 'combo'],
      required: true,
    },
    meetingPoint: {
      name: {
        type: String,
      },
      coordinates: {
        type: [Number],
        // [longitude, latitude]
      },
      instructions: {
        type: String,
      },
    },
    duration: {
      type: Number,
      // Duration in minutes
    },
    language: {
      type: String,
      default: 'en',
    },
    groupSize: {
      min: {
        type: Number,
      },
      max: {
        type: Number,
      },
    },
  },

  // Cancellation policy and status
  cancellation: {
    allowCancellation: {
      type: Boolean,
      default: true,
    },
    cancellationDeadline: {
      type: Date,
    },
    refundPolicy: {
      type: String,
      enum: ['full', 'partial', 'none'],
      default: 'full',
    },
    partialRefundPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancellationReason: {
      type: String,
    },
  },

  // Voucher/discount code
  voucher: {
    code: {
      type: String,
      uppercase: true,
    },
    discountAmount: {
      type: Number,
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
  },

  // Partner information
  partner: {
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    confirmationMethod: {
      type: String,
      enum: ['instant', 'manual', 'api'],
      default: 'instant',
    },
    confirmedAt: {
      type: Date,
    },
    externalReference: {
      type: String,
      // Partner's booking reference
    },
  },

  // AI context (integration with main HolidaiButler AI)
  aiContext: {
    generatedFromMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    recommendationScore: {
      type: Number,
      min: 0,
      max: 1,
    },
    conversationContext: {
      type: String,
    },
  },

  // Reservation lock (for pending payments)
  reservation: {
    isLocked: {
      type: Boolean,
      default: false,
    },
    lockedUntil: {
      type: Date,
    },
    lockId: {
      type: String,
      // Redis lock identifier
    },
  },

  // Guest information
  guestInfo: {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    phone: {
      type: String,
    },
    nationality: {
      type: String,
    },
  },

  // Metadata
  metadata: {
    source: {
      type: String,
      enum: ['web', 'mobile', 'api', 'admin'],
      default: 'mobile',
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
BookingSchema.index({ bookingReference: 1 });
BookingSchema.index({ userId: 1, status: 1 });
BookingSchema.index({ poiId: 1, 'details.date': 1 });
BookingSchema.index({ 'payment.transactionId': 1 });
BookingSchema.index({ status: 1, createdAt: -1 });

// Virtual for total guests
BookingSchema.virtual('totalGuests').get(function() {
  return (this.details.guests.adults || 0) +
         (this.details.guests.children || 0) +
         (this.details.guests.infants || 0);
});

// Virtual for checking if cancellation is allowed
BookingSchema.virtual('canBeCancelled').get(function() {
  if (!this.cancellation.allowCancellation) return false;
  if (this.status === 'cancelled' || this.status === 'completed') return false;

  const now = new Date();
  if (this.cancellation.cancellationDeadline && now > this.cancellation.cancellationDeadline) {
    return false;
  }

  return true;
});

// Static method to generate unique booking reference
BookingSchema.statics.generateBookingReference = async function() {
  const year = new Date().getFullYear();
  const count = await this.countDocuments({
    bookingReference: new RegExp(`^BK-${year}-`)
  });

  const sequence = (count + 1).toString().padStart(6, '0');
  return `BK-${year}-${sequence}`;
};

// Method to confirm booking
BookingSchema.methods.confirmBooking = async function(transactionId) {
  this.status = 'confirmed';
  this.payment.status = 'paid';
  this.payment.transactionId = transactionId;
  this.payment.paidAt = new Date();

  // Release reservation lock
  this.reservation.isLocked = false;
  this.reservation.lockedUntil = null;

  return await this.save();
};

// Method to cancel booking
BookingSchema.methods.cancelBooking = async function(userId, reason) {
  if (!this.canBeCancelled) {
    throw new Error('Booking cannot be cancelled');
  }

  this.status = 'cancelled';
  this.cancellation.cancelledAt = new Date();
  this.cancellation.cancelledBy = userId;
  this.cancellation.cancellationReason = reason;

  return await this.save();
};

// Pre-save hook to auto-generate booking reference
BookingSchema.pre('save', async function(next) {
  if (this.isNew && !this.bookingReference) {
    this.bookingReference = await this.constructor.generateBookingReference();
  }
  next();
});

// Pre-save hook to check reservation expiry
BookingSchema.pre('save', function(next) {
  const now = new Date();

  // Auto-expire pending bookings with expired locks
  if (this.status === 'pending' && this.reservation.lockedUntil && now > this.reservation.lockedUntil) {
    this.status = 'expired';
    this.reservation.isLocked = false;
  }

  next();
});

module.exports = mongoose.model('Booking', BookingSchema);
