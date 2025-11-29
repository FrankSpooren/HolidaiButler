import mongoose from 'mongoose';
import crypto from 'crypto';

const ticketSchema = new mongoose.Schema({
  // Ticket Information
  ticketNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  qrCode: {
    type: String,
    required: true,
    unique: true
  },

  // Event/Attraction Reference
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  },

  poi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'POI'
  },

  // Ticket Type
  ticketType: {
    name: {
      type: String,
      required: true
    },
    description: String,
    category: {
      type: String,
      enum: ['general', 'vip', 'earlybird', 'student', 'senior', 'child', 'group', 'season'],
      default: 'general'
    }
  },

  // Booking Reference
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true
  },

  // Holder Information
  holder: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // Validity
  validity: {
    validFrom: {
      type: Date,
      required: true
    },
    validUntil: {
      type: Date,
      required: true
    },
    dateSpecific: {
      type: Boolean,
      default: true
    },
    scheduledDate: Date,
    scheduledTime: String
  },

  // Pricing
  price: {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'EUR'
    },
    originalPrice: Number,
    discount: {
      amount: Number,
      percentage: Number,
      code: String,
      reason: String
    }
  },

  // Status
  status: {
    type: String,
    enum: [
      'active',         // Valid and unused
      'used',           // Scanned and used
      'expired',        // Past validity date
      'cancelled',      // Cancelled/refunded
      'transferred',    // Transferred to another person
      'pending',        // Awaiting payment confirmation
      'invalid'         // Marked as invalid
    ],
    default: 'pending',
    index: true
  },

  // Usage Tracking
  usage: {
    scannedAt: Date,
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser'
    },
    scanLocation: String,
    scanDevice: String,
    entryGate: String
  },

  // Transfer Information
  transfer: {
    transferredAt: Date,
    transferredTo: {
      firstName: String,
      lastName: String,
      email: String
    },
    transferredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String
  },

  // Cancellation
  cancellation: {
    cancelledAt: Date,
    cancelledBy: {
      type: String,
      enum: ['customer', 'admin', 'system']
    },
    reason: String,
    refunded: {
      type: Boolean,
      default: false
    },
    refundAmount: Number,
    refundedAt: Date
  },

  // Add-ons/Extras (for attractions)
  addOns: [{
    name: String,
    description: String,
    price: Number,
    quantity: {
      type: Number,
      default: 1
    }
  }],

  // Special Access/Features
  features: {
    fastPass: {
      type: Boolean,
      default: false
    },
    vipAccess: {
      type: Boolean,
      default: false
    },
    photoPackage: {
      type: Boolean,
      default: false
    },
    merchandise: {
      type: Boolean,
      default: false
    },
    customFeatures: [String]
  },

  // Digital Delivery
  delivery: {
    method: {
      type: String,
      enum: ['email', 'sms', 'app', 'physical', 'wallet'],
      default: 'email'
    },
    sentAt: Date,
    deliveredAt: Date,
    walletPassUrl: String,
    downloadUrl: String
  },

  // Seat Assignment (for events with seating)
  seating: {
    section: String,
    row: String,
    seat: String,
    accessible: {
      type: Boolean,
      default: false
    }
  },

  // Group Ticket Info
  group: {
    isGroupTicket: {
      type: Boolean,
      default: false
    },
    groupSize: Number,
    groupName: String,
    leadContact: String
  },

  // Notes & Tags
  notes: {
    customer: String,
    admin: String,
    internal: String
  },

  tags: [String],

  // Integration Data
  externalId: String,
  externalPlatform: String,

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
ticketSchema.index({ status: 1 });
ticketSchema.index({ 'validity.validFrom': 1, 'validity.validUntil': 1 });
ticketSchema.index({ 'holder.email': 1 });
ticketSchema.index({ event: 1, status: 1 });
ticketSchema.index({ poi: 1, status: 1 });
ticketSchema.index({ createdAt: -1 });

// Virtual for checking if ticket is valid
ticketSchema.virtual('isValid').get(function() {
  const now = new Date();
  return (
    this.status === 'active' &&
    this.validity.validFrom <= now &&
    this.validity.validUntil >= now
  );
});

// Virtual for checking if expired
ticketSchema.virtual('isExpired').get(function() {
  return this.validity.validUntil < new Date();
});

// Virtual for holder full name
ticketSchema.virtual('holderFullName').get(function() {
  if (!this.holder?.firstName) return null;
  return `${this.holder.firstName} ${this.holder.lastName}`;
});

// Methods
ticketSchema.methods.generateTicketNumber = function() {
  const prefix = 'TKT';
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${date}-${random}`;
};

ticketSchema.methods.generateQRCode = function() {
  return crypto.randomBytes(32).toString('hex');
};

ticketSchema.methods.use = function(adminUserId, scanInfo = {}) {
  if (!this.isValid) {
    throw new Error('Ticket is not valid');
  }

  this.status = 'used';
  this.usage = {
    scannedAt: new Date(),
    scannedBy: adminUserId,
    scanLocation: scanInfo.location,
    scanDevice: scanInfo.device,
    entryGate: scanInfo.gate
  };

  return this.save();
};

ticketSchema.methods.cancel = function(reason, cancelledBy, refund = false) {
  this.status = 'cancelled';
  this.cancellation = {
    cancelledAt: new Date(),
    cancelledBy,
    reason,
    refunded: refund
  };

  if (refund) {
    this.cancellation.refundAmount = this.price.amount;
    this.cancellation.refundedAt = new Date();
  }

  return this.save();
};

ticketSchema.methods.transfer = function(newHolder, transferredBy, reason) {
  this.status = 'transferred';
  this.transfer = {
    transferredAt: new Date(),
    transferredTo: {
      firstName: newHolder.firstName,
      lastName: newHolder.lastName,
      email: newHolder.email
    },
    transferredBy,
    reason
  };

  // Update holder info
  this.holder = newHolder;

  return this.save();
};

ticketSchema.methods.markAsExpired = function() {
  this.status = 'expired';
  return this.save();
};

// Static methods
ticketSchema.statics.getActiveTickets = function(filter = {}) {
  return this.find({
    ...filter,
    status: 'active',
    'validity.validFrom': { $lte: new Date() },
    'validity.validUntil': { $gte: new Date() }
  });
};

ticketSchema.statics.getUsedTickets = function(eventId, startDate, endDate) {
  const query = {
    status: 'used',
    'usage.scannedAt': {
      $gte: startDate,
      $lte: endDate
    }
  };

  if (eventId) {
    query.event = eventId;
  }

  return this.find(query).sort({ 'usage.scannedAt': -1 });
};

ticketSchema.statics.checkAvailability = function(eventId, ticketTypeId, quantity) {
  // This would check against event capacity
  // Implementation depends on Event/TicketType models
  return true;
};

// Pre-save middleware
ticketSchema.pre('save', function(next) {
  // Generate ticket number if not exists
  if (this.isNew && !this.ticketNumber) {
    this.ticketNumber = this.generateTicketNumber();
  }

  // Generate QR code if not exists
  if (this.isNew && !this.qrCode) {
    this.qrCode = this.generateQRCode();
  }

  // Auto-expire if past validity date
  if (this.isExpired && this.status === 'active') {
    this.status = 'expired';
  }

  next();
});

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;
