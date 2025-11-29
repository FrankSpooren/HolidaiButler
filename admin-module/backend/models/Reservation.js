import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  // Reservation Details
  reservationNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Restaurant/POI Reference
  poi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'POI',
    required: true,
    index: true
  },

  // Guest Information
  guest: {
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // Reservation Date & Time
  date: {
    type: Date,
    required: true,
    index: true
  },

  time: {
    type: String,
    required: true
  },

  // Party Information
  partySize: {
    type: Number,
    required: true,
    min: 1,
    max: 50
  },

  // Table Assignment
  table: {
    tableNumber: String,
    tableName: String,
    section: String,
    capacity: Number
  },

  // Special Requests
  specialRequests: {
    dietary: [String], // 'vegetarian', 'vegan', 'gluten-free', etc.
    occasion: {
      type: String,
      enum: ['birthday', 'anniversary', 'business', 'date', 'celebration', 'none'],
      default: 'none'
    },
    notes: String,
    preferences: String
  },

  // Status & Lifecycle
  status: {
    type: String,
    enum: [
      'pending',        // Initial booking
      'confirmed',      // Restaurant confirmed
      'seated',         // Guest arrived and seated
      'completed',      // Meal finished
      'cancelled',      // Cancelled by guest
      'no_show',        // Guest didn't arrive
      'rejected'        // Restaurant rejected
    ],
    default: 'pending',
    index: true
  },

  // Payment Information
  deposit: {
    required: {
      type: Boolean,
      default: false
    },
    amount: Number,
    currency: {
      type: String,
      default: 'EUR'
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'failed'],
      default: 'pending'
    },
    paymentId: String,
    paidAt: Date,
    refundedAt: Date
  },

  // Cancellation
  cancellation: {
    cancelledAt: Date,
    cancelledBy: {
      type: String,
      enum: ['guest', 'restaurant', 'system', 'admin']
    },
    reason: String,
    refundIssued: {
      type: Boolean,
      default: false
    },
    fee: Number
  },

  // Confirmation & Communication
  confirmation: {
    code: String,
    sentAt: Date,
    confirmedAt: Date
  },

  reminder: {
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date
  },

  // Channel Information
  source: {
    type: String,
    enum: ['web', 'mobile', 'phone', 'walk-in', 'third-party', 'admin'],
    default: 'web'
  },

  thirdParty: {
    platform: {
      type: String,
      enum: ['thefork', 'google', 'tripadvisor', 'opentable']
    },
    externalId: String,
    commission: Number
  },

  // Arrival & Departure
  arrival: {
    arrivedAt: Date,
    lateMinutes: Number
  },

  departure: {
    leftAt: Date,
    duration: Number // in minutes
  },

  // Restaurant Notes
  restaurantNotes: {
    vip: {
      type: Boolean,
      default: false
    },
    returnGuest: {
      type: Boolean,
      default: false
    },
    previousVisits: {
      type: Number,
      default: 0
    },
    privateNotes: String,
    preferences: [String]
  },

  // Revenue (optional, filled after completion)
  revenue: {
    foodBeverage: Number,
    tax: Number,
    tip: Number,
    total: Number,
    currency: {
      type: String,
      default: 'EUR'
    }
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
reservationSchema.index({ date: 1, time: 1 });
reservationSchema.index({ 'guest.email': 1 });
reservationSchema.index({ 'guest.phone': 1 });
reservationSchema.index({ status: 1, date: 1 });
reservationSchema.index({ poi: 1, date: 1 });
reservationSchema.index({ createdAt: -1 });

// Virtual for guest full name
reservationSchema.virtual('guestFullName').get(function() {
  return `${this.guest.firstName} ${this.guest.lastName}`;
});

// Virtual for checking if reservation is upcoming
reservationSchema.virtual('isUpcoming').get(function() {
  const reservationDateTime = new Date(`${this.date.toISOString().split('T')[0]}T${this.time}`);
  return reservationDateTime > new Date() && ['pending', 'confirmed'].includes(this.status);
});

// Virtual for checking if late
reservationSchema.virtual('isLate').get(function() {
  if (!this.arrival?.arrivedAt) return false;
  return this.arrival.lateMinutes > 15;
});

// Methods
reservationSchema.methods.generateReservationNumber = function() {
  const prefix = 'RSV';
  const date = this.date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${date}-${random}`;
};

reservationSchema.methods.generateConfirmationCode = function() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

reservationSchema.methods.confirm = function(adminUserId) {
  this.status = 'confirmed';
  this.confirmation.confirmedAt = new Date();
  this.updatedBy = adminUserId;
  return this.save();
};

reservationSchema.methods.cancel = function(reason, cancelledBy, adminUserId) {
  this.status = 'cancelled';
  this.cancellation = {
    cancelledAt: new Date(),
    cancelledBy,
    reason,
    refundIssued: this.deposit?.status === 'paid'
  };
  this.updatedBy = adminUserId;
  return this.save();
};

reservationSchema.methods.markNoShow = function(adminUserId) {
  this.status = 'no_show';
  this.updatedBy = adminUserId;
  return this.save();
};

reservationSchema.methods.seat = function(tableInfo, adminUserId) {
  this.status = 'seated';
  this.arrival.arrivedAt = new Date();

  const reservationDateTime = new Date(`${this.date.toISOString().split('T')[0]}T${this.time}`);
  const minutesLate = Math.floor((this.arrival.arrivedAt - reservationDateTime) / 60000);
  this.arrival.lateMinutes = minutesLate > 0 ? minutesLate : 0;

  if (tableInfo) {
    this.table = tableInfo;
  }

  this.updatedBy = adminUserId;
  return this.save();
};

reservationSchema.methods.complete = function(revenueData, adminUserId) {
  this.status = 'completed';
  this.departure.leftAt = new Date();

  if (this.arrival?.arrivedAt) {
    const duration = Math.floor((this.departure.leftAt - this.arrival.arrivedAt) / 60000);
    this.departure.duration = duration;
  }

  if (revenueData) {
    this.revenue = revenueData;
  }

  this.updatedBy = adminUserId;
  return this.save();
};

// Static methods
reservationSchema.statics.getUpcoming = function(poiId, days = 7) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  return this.find({
    poi: poiId,
    date: { $gte: startDate, $lte: endDate },
    status: { $in: ['pending', 'confirmed'] }
  }).sort({ date: 1, time: 1 });
};

reservationSchema.statics.getTodayReservations = function(poiId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.find({
    poi: poiId,
    date: { $gte: today, $lt: tomorrow },
    status: { $nin: ['cancelled', 'no_show'] }
  }).sort({ time: 1 });
};

// Pre-save middleware
reservationSchema.pre('save', function(next) {
  // Generate reservation number if not exists
  if (this.isNew && !this.reservationNumber) {
    this.reservationNumber = this.generateReservationNumber();
  }

  // Generate confirmation code if not exists
  if (this.isNew && !this.confirmation?.code) {
    if (!this.confirmation) this.confirmation = {};
    this.confirmation.code = this.generateConfirmationCode();
    this.confirmation.sentAt = new Date();
  }

  next();
});

const Reservation = mongoose.model('Reservation', reservationSchema);

export default Reservation;
