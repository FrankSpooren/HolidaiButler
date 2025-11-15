const mongoose = require('mongoose');

/**
 * Ticket Model
 * Represents a digital ticket for POI entry, tours, experiences
 * Based on TICKETING_PAYMENT_MODULE_ADVISORY_REPORT.md specifications
 */
const TicketSchema = new mongoose.Schema({
  // Unique ticket identifier
  ticketNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
    // Format: HB-YYYY-NNNNNN (e.g., HB-2025-001234)
  },

  // References
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true,
  },

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

  // Ticket type
  type: {
    type: String,
    enum: ['single', 'multi-day', 'group', 'guided-tour', 'experience', 'combo'],
    required: true,
  },

  // Validity period
  validity: {
    validFrom: {
      type: Date,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    timeslot: {
      type: String,
      // Format: "HH:MM-HH:MM" (e.g., "14:00-15:00")
    },
    timezone: {
      type: String,
      default: 'Europe/Amsterdam',
    },
  },

  // QR Code data for validation
  qrCode: {
    data: {
      type: String,
      required: true,
      // Encrypted payload containing ticket verification data
    },
    imageUrl: {
      type: String,
      // S3/CloudFront URL to QR code image
    },
    format: {
      type: String,
      enum: ['QR', 'Barcode128'],
      default: 'QR',
    },
  },

  // Ticket holder information
  holder: {
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
  },

  // Product details
  details: {
    productName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    language: {
      type: String,
      default: 'en',
      // ISO 639-1 codes: en, es, de, nl, fr
    },
    specialRequirements: {
      type: String,
      // Accessibility needs, dietary restrictions, etc.
    },
  },

  // Validation status
  validation: {
    isValidated: {
      type: Boolean,
      default: false,
      index: true,
    },
    validatedAt: {
      type: Date,
    },
    validatedBy: {
      type: String,
      // Staff member ID or device ID
    },
    validationLocation: {
      type: String,
      // GPS coordinates or location identifier
    },
  },

  // Ticket status
  status: {
    type: String,
    enum: ['active', 'used', 'expired', 'cancelled', 'refunded'],
    default: 'active',
    required: true,
    index: true,
  },

  // Mobile wallet integration
  wallet: {
    appleWalletUrl: {
      type: String,
    },
    googlePayUrl: {
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
    isTransferred: {
      type: Boolean,
      default: false,
    },
    originalHolder: {
      type: String,
      // Email of original ticket purchaser if transferred
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for performance
TicketSchema.index({ ticketNumber: 1 });
TicketSchema.index({ bookingId: 1 });
TicketSchema.index({ userId: 1, status: 1 });
TicketSchema.index({ poiId: 1, 'validity.validFrom': 1 });
TicketSchema.index({ 'qrCode.data': 1 });
TicketSchema.index({ status: 1, 'validity.validUntil': 1 });

// Virtual for checking if ticket is currently valid
TicketSchema.virtual('isCurrentlyValid').get(function() {
  const now = new Date();
  return (
    this.status === 'active' &&
    this.validity.validFrom <= now &&
    this.validity.validUntil >= now &&
    !this.validation.isValidated
  );
});

// Method to validate ticket
TicketSchema.methods.validateTicket = async function(validatorId, location) {
  if (this.validation.isValidated) {
    throw new Error('Ticket already validated');
  }

  if (this.status !== 'active') {
    throw new Error(`Cannot validate ticket with status: ${this.status}`);
  }

  const now = new Date();
  if (now < this.validity.validFrom || now > this.validity.validUntil) {
    throw new Error('Ticket is not valid at this time');
  }

  this.validation.isValidated = true;
  this.validation.validatedAt = now;
  this.validation.validatedBy = validatorId;
  this.validation.validationLocation = location;
  this.status = 'used';

  return await this.save();
};

// Method to cancel/refund ticket
TicketSchema.methods.cancelTicket = async function(reason) {
  if (this.validation.isValidated) {
    throw new Error('Cannot cancel a validated ticket');
  }

  this.status = 'cancelled';
  this.metadata.cancellationReason = reason;
  return await this.save();
};

// Static method to generate unique ticket number
TicketSchema.statics.generateTicketNumber = async function() {
  const year = new Date().getFullYear();
  const count = await this.countDocuments({
    ticketNumber: new RegExp(`^HB-${year}-`)
  });

  const sequence = (count + 1).toString().padStart(6, '0');
  return `HB-${year}-${sequence}`;
};

// Pre-save hook to auto-generate ticket number
TicketSchema.pre('save', async function(next) {
  if (this.isNew && !this.ticketNumber) {
    this.ticketNumber = await this.constructor.generateTicketNumber();
  }
  next();
});

// Pre-save hook to check expiry and update status
TicketSchema.pre('save', function(next) {
  const now = new Date();
  if (this.status === 'active' && now > this.validity.validUntil) {
    this.status = 'expired';
  }
  next();
});

module.exports = mongoose.model('Ticket', TicketSchema);
