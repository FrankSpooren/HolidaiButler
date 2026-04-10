import { DataTypes, Model } from 'sequelize';
import crypto from 'crypto';
import sequelize from '../config/database.js';

class Ticket extends Model {
  // Generate ticket number
  static generateTicketNumber() {
    const prefix = 'TKT';
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}-${date}-${random}`;
  }

  // Generate QR code
  static generateQRCode() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Check if ticket is valid
  get isValid() {
    const now = new Date();
    return (
      this.status === 'active' &&
      new Date(this.validFrom) <= now &&
      new Date(this.validUntil) >= now
    );
  }

  // Check if expired
  get isExpired() {
    return new Date(this.validUntil) < new Date();
  }

  // Use ticket
  async use(adminUserId, scanInfo = {}) {
    if (!this.isValid) {
      throw new Error('Ticket is not valid');
    }

    this.status = 'used';
    this.scannedAt = new Date();
    this.scannedById = adminUserId;
    this.scanLocation = scanInfo.location;
    this.scanDevice = scanInfo.device;
    this.entryGate = scanInfo.gate;

    return this.save();
  }

  // Cancel ticket
  async cancel(reason, cancelledBy, refund = false) {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancelledBy = cancelledBy;
    this.cancellationReason = reason;
    this.refunded = refund;

    if (refund) {
      this.refundAmount = this.priceAmount;
      this.refundedAt = new Date();
    }

    return this.save();
  }

  // Transfer ticket
  async transfer(newHolder, transferredBy, reason) {
    this.status = 'transferred';
    this.transferredAt = new Date();
    this.transferredTo = newHolder;
    this.transferredById = transferredBy;
    this.transferReason = reason;

    // Update holder info
    this.holderFirstName = newHolder.firstName;
    this.holderLastName = newHolder.lastName;
    this.holderEmail = newHolder.email;

    return this.save();
  }
}

Ticket.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  ticketNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'ticket_number'
  },

  qrCode: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'qr_code'
  },

  // References (stored as UUIDs)
  eventId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'event_id'
  },

  poiId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'poi_id'
  },

  bookingId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'booking_id'
  },

  // Ticket Type
  ticketTypeName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'ticket_type_name'
  },

  ticketTypeDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'ticket_type_description'
  },

  ticketCategory: {
    type: DataTypes.ENUM('general', 'vip', 'earlybird', 'student', 'senior', 'child', 'group', 'season'),
    defaultValue: 'general',
    field: 'ticket_category'
  },

  // Holder Information
  holderFirstName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'holder_first_name'
  },

  holderLastName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'holder_last_name'
  },

  holderEmail: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'holder_email'
  },

  holderPhone: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'holder_phone'
  },

  holderUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'holder_user_id'
  },

  // Validity
  validFrom: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'valid_from'
  },

  validUntil: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'valid_until'
  },

  dateSpecific: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'date_specific'
  },

  scheduledDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'scheduled_date'
  },

  scheduledTime: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'scheduled_time'
  },

  // Pricing
  priceAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'price_amount'
  },

  priceCurrency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR',
    field: 'price_currency'
  },

  originalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'original_price'
  },

  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'discount_amount'
  },

  discountCode: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'discount_code'
  },

  // Status
  status: {
    type: DataTypes.ENUM('active', 'used', 'expired', 'cancelled', 'transferred', 'pending', 'invalid'),
    defaultValue: 'pending'
  },

  // Usage Tracking
  scannedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'scanned_at'
  },

  scannedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'scanned_by_id'
  },

  scanLocation: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'scan_location'
  },

  scanDevice: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'scan_device'
  },

  entryGate: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'entry_gate'
  },

  // Transfer Information
  transferredAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'transferred_at'
  },

  transferredTo: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'transferred_to'
  },

  transferredById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'transferred_by_id'
  },

  transferReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'transfer_reason'
  },

  // Cancellation
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'cancelled_at'
  },

  cancelledBy: {
    type: DataTypes.ENUM('customer', 'admin', 'system'),
    allowNull: true,
    field: 'cancelled_by'
  },

  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'cancellation_reason'
  },

  refunded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },

  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'refund_amount'
  },

  refundedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'refunded_at'
  },

  // Add-ons
  addOns: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'add_ons'
  },

  // Features
  features: {
    type: DataTypes.JSON,
    defaultValue: {
      fastPass: false,
      vipAccess: false,
      photoPackage: false,
      merchandise: false
    }
  },

  // Delivery
  deliveryMethod: {
    type: DataTypes.ENUM('email', 'sms', 'app', 'physical', 'wallet'),
    defaultValue: 'email',
    field: 'delivery_method'
  },

  deliverySentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'delivery_sent_at'
  },

  walletPassUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'wallet_pass_url'
  },

  // Seating
  seating: {
    type: DataTypes.JSON,
    allowNull: true
  },

  // Group Info
  isGroupTicket: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_group_ticket'
  },

  groupSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'group_size'
  },

  // Notes
  notes: {
    type: DataTypes.JSON,
    defaultValue: {}
  },

  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },

  // External Integration
  externalId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'external_id'
  },

  externalPlatform: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'external_platform'
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
  modelName: 'Ticket',
  tableName: 'tickets',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['ticket_number'], unique: true },
    { fields: ['qr_code'], unique: true },
    { fields: ['status'] },
    { fields: ['booking_id'] },
    { fields: ['event_id'] },
    { fields: ['holder_email'] },
    { fields: ['valid_from', 'valid_until'] }
  ],
  hooks: {
    beforeCreate: (ticket) => {
      if (!ticket.ticketNumber) {
        ticket.ticketNumber = Ticket.generateTicketNumber();
      }
      if (!ticket.qrCode) {
        ticket.qrCode = Ticket.generateQRCode();
      }
    },
    beforeUpdate: (ticket) => {
      // Auto-expire if past validity date
      if (ticket.isExpired && ticket.status === 'active') {
        ticket.status = 'expired';
      }
    }
  }
});

export default Ticket;
