import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Reservation extends Model {
  // Generate reservation number
  static generateReservationNumber(date) {
    const prefix = 'RSV';
    const dateStr = (date || new Date()).toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${dateStr}-${random}`;
  }

  // Generate confirmation code
  static generateConfirmationCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Virtuals
  get guestFullName() {
    return `${this.guestFirstName} ${this.guestLastName}`;
  }

  get isUpcoming() {
    const reservationDateTime = new Date(`${this.date}T${this.time}`);
    return reservationDateTime > new Date() && ['pending', 'confirmed'].includes(this.status);
  }

  get isLate() {
    if (!this.arrivedAt) return false;
    return this.lateMinutes > 15;
  }

  // Confirm reservation
  async confirm(adminUserId) {
    this.status = 'confirmed';
    this.confirmedAt = new Date();
    if (adminUserId) this.updatedById = adminUserId;
    return this.save();
  }

  // Cancel reservation
  async cancel(reason, cancelledBy, adminUserId) {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancelledBy = cancelledBy;
    this.cancellationReason = reason;
    this.refundIssued = this.depositStatus === 'paid';
    if (adminUserId) this.updatedById = adminUserId;
    return this.save();
  }

  // Mark as no-show
  async markNoShow(adminUserId) {
    this.status = 'no_show';
    if (adminUserId) this.updatedById = adminUserId;
    return this.save();
  }

  // Seat guest
  async seat(tableInfo, adminUserId) {
    this.status = 'seated';
    this.arrivedAt = new Date();

    const reservationDateTime = new Date(`${this.date}T${this.time}`);
    const minutesLate = Math.floor((this.arrivedAt - reservationDateTime) / 60000);
    this.lateMinutes = minutesLate > 0 ? minutesLate : 0;

    if (tableInfo) {
      this.tableNumber = tableInfo.tableNumber;
      this.tableName = tableInfo.tableName;
      this.tableSection = tableInfo.section;
      this.tableCapacity = tableInfo.capacity;
    }

    if (adminUserId) this.updatedById = adminUserId;
    return this.save();
  }

  // Complete reservation
  async complete(revenueData, adminUserId) {
    this.status = 'completed';
    this.leftAt = new Date();

    if (this.arrivedAt) {
      const duration = Math.floor((this.leftAt - new Date(this.arrivedAt)) / 60000);
      this.duration = duration;
    }

    if (revenueData) {
      this.revenueFoodBeverage = revenueData.foodBeverage;
      this.revenueTax = revenueData.tax;
      this.revenueTip = revenueData.tip;
      this.revenueTotal = revenueData.total;
    }

    if (adminUserId) this.updatedById = adminUserId;
    return this.save();
  }
}

Reservation.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  reservationNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'reservation_number'
  },

  // POI Reference
  poiId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'poi_id'
  },

  // Guest Information
  guestFirstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'guest_first_name'
  },

  guestLastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'guest_last_name'
  },

  guestEmail: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'guest_email'
  },

  guestPhone: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'guest_phone'
  },

  guestUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'guest_user_id'
  },

  // Date & Time
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },

  time: {
    type: DataTypes.STRING(10),
    allowNull: false
  },

  // Party
  partySize: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 50 },
    field: 'party_size'
  },

  // Table
  tableNumber: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'table_number'
  },

  tableName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'table_name'
  },

  tableSection: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'table_section'
  },

  tableCapacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'table_capacity'
  },

  // Special Requests
  dietaryRequests: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'dietary_requests'
  },

  occasion: {
    type: DataTypes.ENUM('birthday', 'anniversary', 'business', 'date', 'celebration', 'none'),
    defaultValue: 'none'
  },

  requestNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'request_notes'
  },

  guestPreferences: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'guest_preferences'
  },

  // Status
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show', 'rejected'),
    defaultValue: 'pending'
  },

  // Deposit
  depositRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'deposit_required'
  },

  depositAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'deposit_amount'
  },

  depositCurrency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR',
    field: 'deposit_currency'
  },

  depositStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'refunded', 'failed'),
    defaultValue: 'pending',
    field: 'deposit_status'
  },

  depositPaymentId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'deposit_payment_id'
  },

  depositPaidAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deposit_paid_at'
  },

  // Cancellation
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'cancelled_at'
  },

  cancelledBy: {
    type: DataTypes.ENUM('guest', 'restaurant', 'system', 'admin'),
    allowNull: true,
    field: 'cancelled_by'
  },

  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'cancellation_reason'
  },

  refundIssued: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'refund_issued'
  },

  cancellationFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'cancellation_fee'
  },

  // Confirmation
  confirmationCode: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'confirmation_code'
  },

  confirmationSentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'confirmation_sent_at'
  },

  confirmedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'confirmed_at'
  },

  // Reminder
  reminderSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'reminder_sent'
  },

  reminderSentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reminder_sent_at'
  },

  // Source
  source: {
    type: DataTypes.ENUM('web', 'mobile', 'phone', 'walk-in', 'third-party', 'admin'),
    defaultValue: 'web'
  },

  thirdPartyPlatform: {
    type: DataTypes.ENUM('thefork', 'google', 'tripadvisor', 'opentable'),
    allowNull: true,
    field: 'third_party_platform'
  },

  thirdPartyExternalId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'third_party_external_id'
  },

  thirdPartyCommission: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'third_party_commission'
  },

  // Arrival & Departure
  arrivedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'arrived_at'
  },

  lateMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'late_minutes'
  },

  leftAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'left_at'
  },

  duration: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  // Restaurant Notes
  isVip: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_vip'
  },

  isReturnGuest: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_return_guest'
  },

  previousVisits: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'previous_visits'
  },

  privateNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'private_notes'
  },

  restaurantPreferences: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'restaurant_preferences'
  },

  // Revenue
  revenueFoodBeverage: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'revenue_food_beverage'
  },

  revenueTax: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'revenue_tax'
  },

  revenueTip: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'revenue_tip'
  },

  revenueTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'revenue_total'
  },

  revenueCurrency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR',
    field: 'revenue_currency'
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
  modelName: 'Reservation',
  tableName: 'reservations',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['reservation_number'], unique: true },
    { fields: ['status'] },
    { fields: ['date', 'time'] },
    { fields: ['poi_id', 'date'] },
    { fields: ['guest_email'] },
    { fields: ['guest_phone'] }
  ],
  hooks: {
    beforeCreate: (reservation) => {
      if (!reservation.reservationNumber) {
        reservation.reservationNumber = Reservation.generateReservationNumber(reservation.date);
      }
      if (!reservation.confirmationCode) {
        reservation.confirmationCode = Reservation.generateConfirmationCode();
        reservation.confirmationSentAt = new Date();
      }
    }
  }
});

export default Reservation;
