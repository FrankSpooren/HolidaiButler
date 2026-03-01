const { Sequelize, DataTypes } = require('sequelize');

/**
 * Payment Engine Database Models (MySQL - Hetzner pxoziy_db1)
 * ACID-compliant financial data storage
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

// ========== TRANSACTION MODEL ==========

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  transactionReference: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'transaction_reference',
  },

  // Payment Details
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },

  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'EUR',
  },

  paymentMethod: {
    type: DataTypes.STRING(50),
    field: 'payment_method',
  },

  // Status
  status: {
    type: DataTypes.ENUM(
      'pending',
      'authorized',
      'captured',
      'failed',
      'cancelled',
      'refunded',
      'partially_refunded'
    ),
    allowNull: false,
    defaultValue: 'pending',
  },

  // Adyen References
  pspReference: {
    type: DataTypes.STRING(100),
    unique: true,
    field: 'psp_reference',
  },

  merchantReference: {
    type: DataTypes.STRING(100),
    field: 'merchant_reference',
  },

  // User & Resource Context
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },

  bookingReference: {
    type: DataTypes.STRING(100),
    field: 'booking_reference',
  },

  resourceType: {
    type: DataTypes.STRING(50),
    field: 'resource_type',
    // 'ticket', 'restaurant', 'hotel', etc.
  },

  resourceId: {
    type: DataTypes.UUID,
    field: 'resource_id',
  },

  // Financial Details
  authorizedAmount: {
    type: DataTypes.DECIMAL(10, 2),
    field: 'authorized_amount',
  },

  capturedAmount: {
    type: DataTypes.DECIMAL(10, 2),
    field: 'captured_amount',
  },

  refundedAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    field: 'refunded_amount',
  },

  // Metadata
  metadata: {
    type: DataTypes.JSON,
  },

  ipAddress: {
    type: DataTypes.STRING(45), // IPv6 max length = 45 characters
    field: 'ip_address',
  },

  userAgent: {
    type: DataTypes.TEXT,
    field: 'user_agent',
  },

  // Risk Assessment
  riskScore: {
    type: DataTypes.DECIMAL(3, 2),
    field: 'risk_score',
  },

  fraudCheckResult: {
    type: DataTypes.STRING(20),
    field: 'fraud_check_result',
  },

  // Timestamps
  authorizedAt: {
    type: DataTypes.DATE,
    field: 'authorized_at',
  },

  capturedAt: {
    type: DataTypes.DATE,
    field: 'captured_at',
  },
}, {
  tableName: 'transactions',
  indexes: [
    { fields: ['user_id', 'created_at'] },
    { fields: ['status'] },
    { fields: ['booking_reference'] },
    { fields: ['psp_reference'], unique: true },
    { fields: ['created_at'] },
  ],
});

// ========== REFUND MODEL ==========

const Refund = sequelize.define('Refund', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  refundReference: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'refund_reference',
  },

  // Original Transaction
  transactionId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'transaction_id',
    references: {
      model: 'transactions',
      key: 'id',
    },
  },

  originalPspReference: {
    type: DataTypes.STRING(100),
    field: 'original_psp_reference',
  },

  // Refund Details
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },

  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
  },

  reason: {
    type: DataTypes.STRING(500),
  },

  // Status
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'pending',
  },

  // Adyen Reference
  refundPspReference: {
    type: DataTypes.STRING(100),
    field: 'refund_psp_reference',
  },

  // Metadata
  initiatedBy: {
    type: DataTypes.UUID,
    field: 'initiated_by',
  },

  processedAt: {
    type: DataTypes.DATE,
    field: 'processed_at',
  },
}, {
  tableName: 'refunds',
  indexes: [
    { fields: ['transaction_id'] },
    { fields: ['status'] },
    { fields: ['created_at'] },
  ],
});

// ========== PAYMENT METHODS MODEL ==========

const PaymentMethod = sequelize.define('PaymentMethod', {
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

  // Tokenized Card Data (Adyen tokens - NO PAN!)
  paymentToken: {
    type: DataTypes.STRING(200),
    allowNull: false,
    unique: true,
    field: 'payment_token',
  },

  paymentType: {
    type: DataTypes.STRING(50),
    field: 'payment_type',
    // 'card', 'ideal', 'paypal', etc.
  },

  // Card Display Info (NO sensitive data!)
  cardBrand: {
    type: DataTypes.STRING(50),
    field: 'card_brand',
    // 'visa', 'mastercard', 'amex'
  },

  lastFour: {
    type: DataTypes.STRING(4),
    field: 'last_four',
  },

  expiryMonth: {
    type: DataTypes.INTEGER,
    field: 'expiry_month',
  },

  expiryYear: {
    type: DataTypes.INTEGER,
    field: 'expiry_year',
  },

  holderName: {
    type: DataTypes.STRING(200),
    field: 'holder_name',
  },

  // Status
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_default',
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
  tableName: 'stored_payment_methods',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['payment_token'], unique: true },
  ],
});

// ========== ASSOCIATIONS ==========

Transaction.hasMany(Refund, {
  foreignKey: 'transactionId',
  as: 'refunds',
});

Refund.belongsTo(Transaction, {
  foreignKey: 'transactionId',
  as: 'transaction',
});

// ========== SYNC DATABASE ==========

const syncDatabase = async (options = {}) => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL (Hetzner pxoziy_db1) connection established successfully');

    if (options.force) {
      console.log('⚠️  Forcing database sync (DROP existing tables)');
    }

    await sequelize.sync(options);
    console.log('✅ Database models synchronized');

    return true;
  } catch (error) {
    console.error('❌ Unable to connect to MySQL:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  Transaction,
  Refund,
  PaymentMethod,
  syncDatabase,
};
