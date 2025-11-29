const { Sequelize, DataTypes } = require('sequelize');

/**
 * Ticketing Module Database Models (MySQL - Hetzner pxoziy_db1)
 * Ticket booking, availability management, and reservation system
 */

// Initialize Sequelize
const sequelize = new Sequelize(
  process.env.DATABASE_NAME || 'pxoziy_db1',
  process.env.DATABASE_USER || 'root',
  process.env.DATABASE_PASSWORD || '',
  {
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
    timezone: '+01:00', // Amsterdam timezone
  }
);

// ========== BOOKING MODEL ==========

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  bookingReference: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'booking_reference',
  },

  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },

  poiId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'poi_id',
  },

  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no-show', 'expired'),
    allowNull: false,
    defaultValue: 'pending',
  },

  // Booking details
  bookingDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'booking_date',
  },

  bookingTime: {
    type: DataTypes.STRING(10),
    field: 'booking_time',
  },

  duration: {
    type: DataTypes.INTEGER,
    comment: 'Duration in minutes',
  },

  adultsCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'adults_count',
  },

  childrenCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'children_count',
  },

  infantsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'infants_count',
  },

  specialRequests: {
    type: DataTypes.TEXT,
    field: 'special_requests',
  },

  // Pricing
  basePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'base_price',
  },

  taxes: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },

  fees: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },

  discount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },

  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_price',
  },

  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR',
  },

  commission: {
    type: DataTypes.DECIMAL(10, 2),
  },

  // Payment
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded'),
    defaultValue: 'pending',
    field: 'payment_status',
  },

  paymentMethod: {
    type: DataTypes.STRING(50),
    field: 'payment_method',
  },

  transactionId: {
    type: DataTypes.STRING(100),
    field: 'transaction_id',
  },

  paidAt: {
    type: DataTypes.DATE,
    field: 'paid_at',
  },

  // Tickets
  deliveryMethod: {
    type: DataTypes.ENUM('email', 'sms', 'app', 'wallet'),
    defaultValue: 'email',
    field: 'delivery_method',
  },

  deliveredAt: {
    type: DataTypes.DATE,
    field: 'delivered_at',
  },

  // Experience
  productType: {
    type: DataTypes.ENUM('ticket', 'tour', 'excursion', 'experience', 'combo'),
    allowNull: false,
    field: 'product_type',
  },

  meetingPointName: {
    type: DataTypes.STRING(200),
    field: 'meeting_point_name',
  },

  meetingPointLat: {
    type: DataTypes.DECIMAL(10, 8),
    field: 'meeting_point_lat',
  },

  meetingPointLng: {
    type: DataTypes.DECIMAL(11, 8),
    field: 'meeting_point_lng',
  },

  meetingPointInstructions: {
    type: DataTypes.TEXT,
    field: 'meeting_point_instructions',
  },

  experienceLanguage: {
    type: DataTypes.STRING(5),
    defaultValue: 'en',
    field: 'experience_language',
  },

  minGroupSize: {
    type: DataTypes.INTEGER,
    field: 'min_group_size',
  },

  maxGroupSize: {
    type: DataTypes.INTEGER,
    field: 'max_group_size',
  },

  // Cancellation
  allowCancellation: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'allow_cancellation',
  },

  cancellationDeadline: {
    type: DataTypes.DATE,
    field: 'cancellation_deadline',
  },

  refundPolicy: {
    type: DataTypes.ENUM('full', 'partial', 'none'),
    defaultValue: 'full',
    field: 'refund_policy',
  },

  partialRefundPercentage: {
    type: DataTypes.INTEGER,
    field: 'partial_refund_percentage',
  },

  cancelledAt: {
    type: DataTypes.DATE,
    field: 'cancelled_at',
  },

  cancelledBy: {
    type: DataTypes.UUID,
    field: 'cancelled_by',
  },

  cancellationReason: {
    type: DataTypes.TEXT,
    field: 'cancellation_reason',
  },

  // Voucher
  voucherCode: {
    type: DataTypes.STRING(50),
    field: 'voucher_code',
  },

  voucherDiscountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    field: 'voucher_discount_amount',
  },

  voucherDiscountPercentage: {
    type: DataTypes.INTEGER,
    field: 'voucher_discount_percentage',
  },

  // Partner
  partnerName: {
    type: DataTypes.STRING(200),
    field: 'partner_name',
  },

  partnerEmail: {
    type: DataTypes.STRING(200),
    field: 'partner_email',
  },

  partnerConfirmationMethod: {
    type: DataTypes.ENUM('instant', 'manual', 'api'),
    defaultValue: 'instant',
    field: 'partner_confirmation_method',
  },

  partnerConfirmedAt: {
    type: DataTypes.DATE,
    field: 'partner_confirmed_at',
  },

  partnerExternalReference: {
    type: DataTypes.STRING(100),
    field: 'partner_external_reference',
  },

  // Reservation lock
  isLocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_locked',
  },

  lockedUntil: {
    type: DataTypes.DATE,
    field: 'locked_until',
  },

  lockId: {
    type: DataTypes.STRING(100),
    field: 'lock_id',
  },

  // Guest info
  guestName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'guest_name',
  },

  guestEmail: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'guest_email',
  },

  guestPhone: {
    type: DataTypes.STRING(50),
    field: 'guest_phone',
  },

  guestNationality: {
    type: DataTypes.STRING(50),
    field: 'guest_nationality',
  },

  // Reminders
  reminderScheduled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'reminder_scheduled',
  },

  reminder24hScheduledFor: {
    type: DataTypes.DATE,
    field: 'reminder_24h_scheduled_for',
  },

  reminder2hScheduledFor: {
    type: DataTypes.DATE,
    field: 'reminder_2h_scheduled_for',
  },

  reminder24hSentAt: {
    type: DataTypes.DATE,
    field: 'reminder_24h_sent_at',
  },

  reminder2hSentAt: {
    type: DataTypes.DATE,
    field: 'reminder_2h_sent_at',
  },

  // Refund tracking
  refundStatus: {
    type: DataTypes.ENUM('none', 'initiated', 'processing', 'sent', 'completed', 'failed'),
    defaultValue: 'none',
    field: 'refund_status',
  },

  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    field: 'refund_amount',
  },

  refundTransactionId: {
    type: DataTypes.STRING(100),
    field: 'refund_transaction_id',
  },

  refundCompletedAt: {
    type: DataTypes.DATE,
    field: 'refund_completed_at',
  },

  // AI Context
  aiMessageId: {
    type: DataTypes.UUID,
    field: 'ai_message_id',
  },

  aiRecommendationScore: {
    type: DataTypes.DECIMAL(3, 2),
    field: 'ai_recommendation_score',
  },

  // Metadata
  source: {
    type: DataTypes.ENUM('web', 'mobile', 'api', 'admin'),
    defaultValue: 'mobile',
  },

  ipAddress: {
    type: DataTypes.STRING(45),
    field: 'ip_address',
  },

  userAgent: {
    type: DataTypes.TEXT,
    field: 'user_agent',
  },
}, {
  tableName: 'bookings',
  indexes: [
    { fields: ['booking_reference'], unique: true },
    { fields: ['user_id', 'status'] },
    { fields: ['poi_id', 'booking_date'] },
    { fields: ['transaction_id'] },
    { fields: ['status', 'created_at'] },
    { fields: ['booking_date'] },
  ],
});

// ========== TICKET MODEL ==========

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  ticketNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'ticket_number',
  },

  bookingId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'booking_id',
  },

  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },

  poiId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'poi_id',
  },

  type: {
    type: DataTypes.ENUM('single', 'multi-day', 'group', 'guided-tour', 'experience', 'combo'),
    allowNull: false,
  },

  // Validity
  validFrom: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'valid_from',
  },

  validUntil: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'valid_until',
  },

  timeslot: {
    type: DataTypes.STRING(20),
  },

  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'Europe/Amsterdam',
  },

  // QR Code
  qrCodeData: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'qr_code_data',
  },

  qrCodeImageUrl: {
    type: DataTypes.STRING(500),
    field: 'qr_code_image_url',
  },

  qrCodeFormat: {
    type: DataTypes.ENUM('QR', 'Barcode128'),
    defaultValue: 'QR',
    field: 'qr_code_format',
  },

  // Holder
  holderName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'holder_name',
  },

  holderEmail: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'holder_email',
  },

  holderPhone: {
    type: DataTypes.STRING(50),
    field: 'holder_phone',
  },

  // Product details
  productName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'product_name',
  },

  productDescription: {
    type: DataTypes.TEXT,
    field: 'product_description',
  },

  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },

  language: {
    type: DataTypes.STRING(5),
    defaultValue: 'en',
  },

  specialRequirements: {
    type: DataTypes.TEXT,
    field: 'special_requirements',
  },

  // Validation
  isValidated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_validated',
  },

  validatedAt: {
    type: DataTypes.DATE,
    field: 'validated_at',
  },

  validatedBy: {
    type: DataTypes.STRING(100),
    field: 'validated_by',
  },

  validationLocation: {
    type: DataTypes.STRING(200),
    field: 'validation_location',
  },

  // Status
  status: {
    type: DataTypes.ENUM('active', 'used', 'expired', 'cancelled', 'refunded'),
    defaultValue: 'active',
    allowNull: false,
  },

  // Wallet
  appleWalletUrl: {
    type: DataTypes.STRING(500),
    field: 'apple_wallet_url',
  },

  googlePayUrl: {
    type: DataTypes.STRING(500),
    field: 'google_pay_url',
  },

  // Metadata
  source: {
    type: DataTypes.ENUM('web', 'mobile', 'api', 'admin'),
    defaultValue: 'mobile',
  },

  isTransferred: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_transferred',
  },

  originalHolder: {
    type: DataTypes.STRING(200),
    field: 'original_holder',
  },

  transferredAt: {
    type: DataTypes.DATE,
    field: 'transferred_at',
  },

  holderFirstName: {
    type: DataTypes.STRING(100),
    field: 'holder_first_name',
  },

  holderLastName: {
    type: DataTypes.STRING(100),
    field: 'holder_last_name',
  },

  validationCode: {
    type: DataTypes.STRING(50),
    field: 'validation_code',
  },

  isUsed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_used',
  },
}, {
  tableName: 'tickets',
  indexes: [
    { fields: ['ticket_number'], unique: true },
    { fields: ['booking_id'] },
    { fields: ['user_id', 'status'] },
    { fields: ['poi_id', 'valid_from'] },
    { fields: ['qr_code_data'] },
    { fields: ['status', 'valid_until'] },
  ],
});

// ========== AVAILABILITY MODEL ==========

const Availability = sequelize.define('Availability', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  poiId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'poi_id',
  },

  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },

  timeslot: {
    type: DataTypes.STRING(20),
    comment: 'Format: HH:MM-HH:MM',
  },

  // Capacity
  totalCapacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'total_capacity',
  },

  bookedCapacity: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'booked_capacity',
  },

  reservedCapacity: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'reserved_capacity',
  },

  availableCapacity: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'available_capacity',
  },

  // Pricing
  basePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'base_price',
  },

  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR',
  },

  dynamicPriceMultiplier: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 1.0,
    field: 'dynamic_price_multiplier',
  },

  finalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    field: 'final_price',
  },

  // Restrictions
  minBooking: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'min_booking',
  },

  maxBooking: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    field: 'max_booking',
  },

  cutoffHours: {
    type: DataTypes.INTEGER,
    defaultValue: 2,
    field: 'cutoff_hours',
  },

  // Status
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },

  isSoldOut: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_sold_out',
  },

  // Partner sync
  lastSyncedAt: {
    type: DataTypes.DATE,
    field: 'last_synced_at',
  },

  externalInventoryId: {
    type: DataTypes.STRING(100),
    field: 'external_inventory_id',
  },

  syncEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'sync_enabled',
  },

  // Metadata
  createdBy: {
    type: DataTypes.STRING(50),
    defaultValue: 'system',
    field: 'created_by',
  },

  notes: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'availability',
  indexes: [
    { fields: ['poi_id', 'date', 'timeslot'], unique: true },
    { fields: ['date', 'is_active'] },
    { fields: ['poi_id', 'date', 'is_sold_out'] },
  ],
});

// ========== TICKET TRANSFER MODEL ==========

const TicketTransfer = sequelize.define('TicketTransfer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  ticketId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'ticket_id',
  },

  fromUserId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'from_user_id',
  },

  fromName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'from_name',
  },

  fromEmail: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'from_email',
  },

  toUserId: {
    type: DataTypes.UUID,
    field: 'to_user_id',
  },

  toName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'to_name',
  },

  toEmail: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'to_email',
  },

  transferredAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'transferred_at',
  },

  status: {
    type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
    defaultValue: 'completed',
  },

  transferReason: {
    type: DataTypes.TEXT,
    field: 'transfer_reason',
  },
}, {
  tableName: 'ticket_transfers',
  indexes: [
    { fields: ['ticket_id'] },
    { fields: ['from_user_id'] },
    { fields: ['to_email'] },
    { fields: ['transferred_at'] },
  ],
});

// ========== DEVICE TOKEN MODEL (Firebase Push Notifications) ==========

const DeviceToken = sequelize.define('DeviceToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },

  token: {
    type: DataTypes.STRING(500),
    allowNull: false,
    unique: true,
  },

  platform: {
    type: DataTypes.ENUM('web', 'android', 'ios'),
    allowNull: false,
    defaultValue: 'web',
  },

  deviceId: {
    type: DataTypes.STRING(200),
    field: 'device_id',
  },

  appVersion: {
    type: DataTypes.STRING(20),
    field: 'app_version',
  },

  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },

  lastUsedAt: {
    type: DataTypes.DATE,
    field: 'last_used_at',
  },
}, {
  tableName: 'device_tokens',
  indexes: [
    { fields: ['user_id', 'is_active'] },
    { fields: ['token'], unique: true },
    { fields: ['platform'] },
  ],
});

// ========== ASSOCIATIONS ==========

Booking.hasMany(Ticket, {
  foreignKey: 'booking_id',
  as: 'tickets',
});

Ticket.belongsTo(Booking, {
  foreignKey: 'booking_id',
  as: 'booking',
});

Ticket.hasMany(TicketTransfer, {
  foreignKey: 'ticket_id',
  as: 'transfers',
});

TicketTransfer.belongsTo(Ticket, {
  foreignKey: 'ticket_id',
  as: 'ticket',
});

// ========== STATIC METHODS ==========

// Generate booking reference
Booking.generateBookingReference = async function() {
  const year = new Date().getFullYear();
  const count = await this.count({
    where: sequelize.where(
      sequelize.fn('YEAR', sequelize.col('created_at')),
      year
    ),
  });
  const sequence = (count + 1).toString().padStart(6, '0');
  return `BK-${year}-${sequence}`;
};

// Generate ticket number
Ticket.generateTicketNumber = async function() {
  const year = new Date().getFullYear();
  const count = await this.count({
    where: sequelize.where(
      sequelize.fn('YEAR', sequelize.col('created_at')),
      year
    ),
  });
  const sequence = (count + 1).toString().padStart(6, '0');
  return `HB-${year}-${sequence}`;
};

// ========== HOOKS ==========

// Auto-generate booking reference
Booking.beforeCreate(async (booking) => {
  if (!booking.bookingReference) {
    booking.bookingReference = await Booking.generateBookingReference();
  }
});

// Auto-generate ticket number
Ticket.beforeCreate(async (ticket) => {
  if (!ticket.ticketNumber) {
    ticket.ticketNumber = await Ticket.generateTicketNumber();
  }
});

// Auto-calculate availability
Availability.beforeSave(async (availability) => {
  availability.availableCapacity = Math.max(
    0,
    availability.totalCapacity - availability.bookedCapacity - availability.reservedCapacity
  );
  availability.finalPrice = Math.round(
    availability.basePrice * availability.dynamicPriceMultiplier * 100
  ) / 100;
  availability.isSoldOut = availability.availableCapacity <= 0;
});

// ========== DATABASE CONNECTION ==========

/**
 * Test database connection without syncing tables.
 * Use migrations for schema changes: npm run migrate
 */
const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL (Hetzner pxoziy_db1) connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to MySQL:', error);
    throw error;
  }
};

/**
 * @deprecated Use migrations instead: npm run migrate
 * Sync database schema directly (ONLY for development/testing)
 *
 * WARNING: Never use in production! Use migrations instead.
 */
const syncDatabase = async (options = {}) => {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ CRITICAL: sequelize.sync() is disabled in production!');
    console.error('   Use migrations instead: npm run migrate');
    throw new Error('Database sync is disabled in production. Use migrations.');
  }

  console.warn('⚠️  WARNING: Using sync() is deprecated. Use migrations: npm run migrate');

  try {
    await sequelize.authenticate();
    console.log('✅ MySQL connection established');

    if (options.force) {
      console.warn('⚠️  DANGER: Forcing database sync (DROP existing tables)');
    }

    await sequelize.sync(options);
    console.log('✅ Database models synchronized (dev mode)');

    return true;
  } catch (error) {
    console.error('❌ Unable to connect to MySQL:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  Booking,
  Ticket,
  Availability,
  TicketTransfer,
  DeviceToken,
  connectDatabase,
  syncDatabase, // @deprecated - use migrations instead
};
