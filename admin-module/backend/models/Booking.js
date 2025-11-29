import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Booking extends Model {
  // Generate booking number
  static generateBookingNumber() {
    const prefix = 'BKG';
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${date}-${random}`;
  }

  // Generate confirmation code
  static generateConfirmationCode() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  // Virtuals
  get customerFullName() {
    return `${this.customerFirstName} ${this.customerLastName}`;
  }

  get totalItems() {
    const items = this.items || [];
    return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }

  get isPaid() {
    return this.paymentStatus === 'completed';
  }

  get canCancel() {
    if (!this.cancellationAllowed) return false;
    if (!this.cancellationDeadline) return true;
    return new Date() < new Date(this.cancellationDeadline);
  }

  // Calculate total
  calculateTotal() {
    const items = this.items || [];
    this.pricingSubtotal = items.reduce((sum, item) => {
      return sum + ((item.price || 0) * (item.quantity || 1));
    }, 0);

    let total = this.pricingSubtotal;
    if (this.discountAmount > 0) {
      total -= this.discountAmount;
    }

    total += this.pricingServiceFee || 0;

    if (this.pricingTaxRate > 0) {
      this.pricingTax = total * (this.pricingTaxRate / 100);
      total += this.pricingTax;
    }

    this.pricingTotal = Math.round(total * 100) / 100;
    return this.pricingTotal;
  }

  // Confirm booking
  async confirm(transactionId, adminUserId) {
    this.status = 'confirmed';
    this.paymentStatus = 'completed';
    this.paymentPaidAt = new Date();
    this.paymentTransactionId = transactionId;
    this.confirmationSent = true;
    this.confirmationSentAt = new Date();

    if (adminUserId) this.updatedById = adminUserId;
    return this.save();
  }

  // Cancel booking
  async cancel(reason, cancelledBy, refundAmount, adminUserId) {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancelledBy = cancelledBy;
    this.cancellationReason = reason;
    this.refundIssued = refundAmount > 0;
    this.refundAmount = refundAmount;

    if (refundAmount > 0) {
      this.paymentStatus = refundAmount >= this.pricingTotal ? 'refunded' : 'partially_refunded';
      this.paymentRefundedAt = new Date();
    }

    if (adminUserId) this.updatedById = adminUserId;
    return this.save();
  }

  // Complete booking
  async complete(adminUserId) {
    this.status = 'completed';
    if (adminUserId) this.updatedById = adminUserId;
    return this.save();
  }

  // Add admin note
  async addNote(note, adminUserId) {
    const notes = this.adminNotes || [];
    notes.push({
      note,
      createdById: adminUserId,
      createdAt: new Date().toISOString()
    });
    this.adminNotes = notes;
    return this.save();
  }
}

Booking.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  bookingNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'booking_number'
  },

  confirmationCode: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'confirmation_code'
  },

  // Type
  type: {
    type: DataTypes.ENUM('event_ticket', 'attraction_ticket', 'tour', 'reservation', 'package'),
    allowNull: false
  },

  // Customer Information
  customerUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'customer_user_id'
  },

  customerFirstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'customer_first_name'
  },

  customerLastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'customer_last_name'
  },

  customerEmail: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'customer_email'
  },

  customerPhone: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'customer_phone'
  },

  customerCountry: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'customer_country'
  },

  customerLanguage: {
    type: DataTypes.STRING(10),
    defaultValue: 'en',
    field: 'customer_language'
  },

  // Items (stored as JSON array)
  items: {
    type: DataTypes.JSON,
    defaultValue: []
  },

  // Pricing
  pricingSubtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'pricing_subtotal'
  },

  pricingTax: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'pricing_tax'
  },

  pricingTaxRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    field: 'pricing_tax_rate'
  },

  pricingServiceFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'pricing_service_fee'
  },

  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'discount_amount'
  },

  discountCode: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'discount_code'
  },

  pricingTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'pricing_total'
  },

  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR'
  },

  // Payment
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'),
    defaultValue: 'pending',
    field: 'payment_status'
  },

  paymentMethod: {
    type: DataTypes.ENUM('credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash', 'ideal', 'other'),
    allowNull: true,
    field: 'payment_method'
  },

  paymentTransactionId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'payment_transaction_id'
  },

  paymentPaidAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'payment_paid_at'
  },

  paymentRefundedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'payment_refunded_at'
  },

  // Status
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled', 'refunded', 'no_show', 'expired'),
    defaultValue: 'pending'
  },

  // Visit Details
  visitDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'visit_date'
  },

  visitTime: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'visit_time'
  },

  visitDuration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'visit_duration'
  },

  visitParticipants: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'visit_participants'
  },

  visitNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'visit_notes'
  },

  // Special Requests
  specialRequests: {
    type: DataTypes.JSON,
    defaultValue: {
      accessibility: [],
      dietary: [],
      other: ''
    },
    field: 'special_requests'
  },

  // Delivery
  fulfillmentMethod: {
    type: DataTypes.ENUM('email', 'sms', 'app', 'physical', 'pickup'),
    defaultValue: 'email',
    field: 'fulfillment_method'
  },

  fulfillmentDeliveredAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fulfillment_delivered_at'
  },

  // Notifications
  confirmationSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'confirmation_sent'
  },

  confirmationSentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'confirmation_sent_at'
  },

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
  sourceChannel: {
    type: DataTypes.ENUM('web', 'mobile_app', 'partner', 'call_center', 'walk_in', 'admin'),
    defaultValue: 'web',
    field: 'source_channel'
  },

  sourceReferrer: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'source_referrer'
  },

  sourceCampaign: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'source_campaign'
  },

  // Review
  reviewSubmitted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'review_submitted'
  },

  reviewRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'review_rating'
  },

  reviewComment: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'review_comment'
  },

  // Cancellation Policy
  cancellationAllowed: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'cancellation_allowed'
  },

  cancellationDeadline: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'cancellation_deadline'
  },

  cancellationFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'cancellation_fee'
  },

  // Cancellation Details
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'cancelled_at'
  },

  cancelledBy: {
    type: DataTypes.ENUM('customer', 'admin', 'system', 'provider'),
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

  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'refund_amount'
  },

  // Admin Notes
  adminNotes: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'admin_notes'
  },

  // Metadata
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
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
  modelName: 'Booking',
  tableName: 'bookings',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['booking_number'], unique: true },
    { fields: ['confirmation_code'], unique: true },
    { fields: ['status'] },
    { fields: ['payment_status'] },
    { fields: ['customer_email'] },
    { fields: ['customer_user_id'] },
    { fields: ['visit_date'] },
    { fields: ['type'] }
  ],
  hooks: {
    beforeCreate: (booking) => {
      if (!booking.bookingNumber) {
        booking.bookingNumber = Booking.generateBookingNumber();
      }
      if (!booking.confirmationCode) {
        booking.confirmationCode = Booking.generateConfirmationCode();
      }
    },
    beforeSave: (booking) => {
      if (booking.changed('items') || booking.changed('discountAmount') || booking.changed('pricingServiceFee')) {
        booking.calculateTotal();
      }
    }
  }
});

export default Booking;
