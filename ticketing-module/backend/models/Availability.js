const mongoose = require('mongoose');

/**
 * Availability Model
 * Manages inventory and capacity for POIs by date and timeslot
 * Cached in Redis for real-time checks, persisted in MongoDB for durability
 */
const AvailabilitySchema = new mongoose.Schema({
  // POI reference
  poiId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'POI',
    required: true,
    index: true,
  },

  // Date (YYYY-MM-DD)
  date: {
    type: Date,
    required: true,
    index: true,
  },

  // Optional timeslot (for timed entry tickets)
  timeslot: {
    type: String,
    // Format: "HH:MM-HH:MM" (e.g., "09:00-10:00")
    // null for all-day tickets
  },

  // Capacity management
  capacity: {
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    booked: {
      type: Number,
      default: 0,
      min: 0,
    },
    reserved: {
      type: Number,
      default: 0,
      min: 0,
      // Pending payments (locked for 15 minutes)
    },
    available: {
      type: Number,
      default: 0,
      min: 0,
      // Computed: total - booked - reserved
    },
  },

  // Dynamic pricing
  pricing: {
    basePrice: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'EUR',
      uppercase: true,
    },
    dynamicPriceMultiplier: {
      type: Number,
      default: 1.0,
      min: 0.5,
      max: 3.0,
      // Multiplier based on demand, season, day of week
    },
    finalPrice: {
      type: Number,
      // Computed: basePrice * dynamicPriceMultiplier
    },
  },

  // Booking restrictions
  restrictions: {
    minBooking: {
      type: Number,
      default: 1,
      min: 1,
    },
    maxBooking: {
      type: Number,
      default: 10,
    },
    cutoffHours: {
      type: Number,
      default: 2,
      // Hours before event when booking closes
    },
  },

  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },

  isSoldOut: {
    type: Boolean,
    default: false,
    index: true,
  },

  // Partner sync
  partnerSync: {
    lastSyncedAt: {
      type: Date,
    },
    externalInventoryId: {
      type: String,
    },
    syncEnabled: {
      type: Boolean,
      default: false,
    },
  },

  // Metadata
  metadata: {
    createdBy: {
      type: String,
      // 'system', 'admin', or 'partner-sync'
      default: 'system',
    },
    notes: {
      type: String,
    },
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
AvailabilitySchema.index({ poiId: 1, date: 1, timeslot: 1 }, { unique: true });
AvailabilitySchema.index({ date: 1, isActive: 1 });
AvailabilitySchema.index({ poiId: 1, date: 1, isSoldOut: 1 });

// Virtual for checking if bookable
AvailabilitySchema.virtual('isBookable').get(function() {
  const now = new Date();
  const cutoffTime = new Date(this.date.getTime() - (this.restrictions.cutoffHours * 60 * 60 * 1000));

  return (
    this.isActive &&
    !this.isSoldOut &&
    this.capacity.available > 0 &&
    now < cutoffTime
  );
});

// Method to check if quantity is available
AvailabilitySchema.methods.hasAvailability = function(quantity) {
  if (!this.isActive || this.isSoldOut) return false;
  if (quantity < this.restrictions.minBooking || quantity > this.restrictions.maxBooking) return false;
  if (this.capacity.available < quantity) return false;

  const now = new Date();
  const cutoffTime = new Date(this.date.getTime() - (this.restrictions.cutoffHours * 60 * 60 * 1000));
  if (now >= cutoffTime) return false;

  return true;
};

// Method to reserve capacity (for pending bookings)
AvailabilitySchema.methods.reserveCapacity = async function(quantity, lockDuration = 900) {
  if (!this.hasAvailability(quantity)) {
    throw new Error('Insufficient availability');
  }

  this.capacity.reserved += quantity;
  this.capacity.available = this.capacity.total - this.capacity.booked - this.capacity.reserved;

  if (this.capacity.available <= 0) {
    this.isSoldOut = true;
  }

  await this.save();

  // Return lock expiry time (default 15 minutes)
  return new Date(Date.now() + lockDuration * 1000);
};

// Method to confirm booking (convert reservation to booked)
AvailabilitySchema.methods.confirmBooking = async function(quantity) {
  this.capacity.reserved -= quantity;
  this.capacity.booked += quantity;
  this.capacity.available = this.capacity.total - this.capacity.booked - this.capacity.reserved;

  if (this.capacity.available <= 0) {
    this.isSoldOut = true;
  } else {
    this.isSoldOut = false;
  }

  return await this.save();
};

// Method to release reservation (e.g., payment timeout)
AvailabilitySchema.methods.releaseReservation = async function(quantity) {
  this.capacity.reserved = Math.max(0, this.capacity.reserved - quantity);
  this.capacity.available = this.capacity.total - this.capacity.booked - this.capacity.reserved;

  if (this.capacity.available > 0) {
    this.isSoldOut = false;
  }

  return await this.save();
};

// Method to cancel booking (return booked capacity)
AvailabilitySchema.methods.cancelBooking = async function(quantity) {
  this.capacity.booked = Math.max(0, this.capacity.booked - quantity);
  this.capacity.available = this.capacity.total - this.capacity.booked - this.capacity.reserved;

  if (this.capacity.available > 0) {
    this.isSoldOut = false;
  }

  return await this.save();
};

// Static method to get availability for a date range
AvailabilitySchema.statics.getAvailabilityRange = async function(poiId, startDate, endDate) {
  return await this.find({
    poiId,
    date: { $gte: startDate, $lte: endDate },
    isActive: true,
  }).sort({ date: 1, timeslot: 1 });
};

// Pre-save hook to compute available capacity and final price
AvailabilitySchema.pre('save', function(next) {
  // Compute available capacity
  this.capacity.available = Math.max(
    0,
    this.capacity.total - this.capacity.booked - this.capacity.reserved
  );

  // Compute final price
  this.pricing.finalPrice = Math.round(
    this.pricing.basePrice * this.pricing.dynamicPriceMultiplier * 100
  ) / 100;

  // Update sold out status
  if (this.capacity.available <= 0) {
    this.isSoldOut = true;
  } else {
    this.isSoldOut = false;
  }

  next();
});

module.exports = mongoose.model('Availability', AvailabilitySchema);
