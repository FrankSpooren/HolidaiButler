import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import bcrypt from 'bcryptjs';

/**
 * User Model - Customer Portal Users
 * Maps to the 'users' table in the Hetzner MySQL database
 * This is separate from AdminUser which is for admin module users
 */
const User = sequelize.define('User', {
  id: {
    type: DataTypes.CHAR(36),
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  avatar: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  phone_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  language: {
    type: DataTypes.ENUM('en', 'es', 'de', 'fr', 'nl'),
    defaultValue: 'nl'
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  subscription_type: {
    type: DataTypes.ENUM('free', 'premium', 'enterprise'),
    defaultValue: 'free'
  },
  subscription_ends_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  stripe_customer_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'pending', 'deleted'),
    defaultValue: 'active'
  },
  email_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reset_password_token: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  reset_password_expires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  login_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lock_until: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  preferences: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('preferences');
      return rawValue ? JSON.parse(rawValue) : null;
    },
    set(value) {
      this.setDataValue('preferences', value ? JSON.stringify(value) : null);
    }
  },
  stats: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('stats');
      return rawValue ? JSON.parse(rawValue) : null;
    },
    set(value) {
      this.setDataValue('stats', value ? JSON.stringify(value) : null);
    }
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',
  timestamps: false, // We handle timestamps manually
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['status'] },
    { fields: ['subscription_type'] }
  ]
});

// Instance method to compare password
User.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Static method to hash password
User.hashPassword = async function(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Hook to hash password before create
User.beforeCreate(async (user) => {
  if (user.password && !user.password.startsWith('$2')) {
    user.password = await User.hashPassword(user.password);
  }
});

// Hook to hash password before update if changed
User.beforeUpdate(async (user) => {
  if (user.changed('password') && !user.password.startsWith('$2')) {
    user.password = await User.hashPassword(user.password);
  }
});

export default User;
