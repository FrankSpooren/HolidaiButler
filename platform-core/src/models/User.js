/**
 * User Model - Customer Portal Users
 * For end-users of the HolidaiButler platform
 */

import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcryptjs';
import { mysqlSequelize as sequelize } from '../config/database.js';

class User extends Model {
  // Instance method to compare password
  async comparePassword(candidatePassword) {
    try {
      return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
      throw new Error('Password comparison failed');
    }
  }

  // Check if account is locked
  get isLocked() {
    return !!(this.lockUntil && new Date(this.lockUntil) > new Date());
  }

  // Increment login attempts
  async incLoginAttempts() {
    if (this.lockUntil && new Date(this.lockUntil) < new Date()) {
      this.loginAttempts = 1;
      this.lockUntil = null;
      return this.save();
    }

    this.loginAttempts += 1;

    const maxAttempts = 5;
    const lockTime = 2 * 60 * 60 * 1000; // 2 hours

    if (this.loginAttempts >= maxAttempts && !this.isLocked) {
      this.lockUntil = new Date(Date.now() + lockTime);
    }

    return this.save();
  }

  // Reset login attempts
  async resetLoginAttempts() {
    this.loginAttempts = 0;
    this.lockUntil = null;
    return this.save();
  }

  // Safe JSON output (exclude sensitive fields)
  toSafeJSON() {
    const values = this.toJSON();
    delete values.password;
    delete values.resetPasswordToken;
    delete values.resetPasswordExpires;
    return values;
  }
}

User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  // Basic Info
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    },
    set(value) {
      this.setDataValue('email', value?.toLowerCase()?.trim());
    }
  },

  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [8, 255]
    }
  },

  // Profile
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'first_name'
  },

  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'last_name'
  },

  avatar: {
    type: DataTypes.STRING(500),
    allowNull: true
  },

  phoneNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'phone_number'
  },

  language: {
    type: DataTypes.ENUM('en', 'es', 'de', 'fr', 'nl'),
    defaultValue: 'nl'
  },

  country: {
    type: DataTypes.STRING(100),
    allowNull: true
  },

  // Subscription
  subscriptionType: {
    type: DataTypes.ENUM('free', 'premium', 'enterprise'),
    defaultValue: 'free',
    field: 'subscription_type'
  },

  subscriptionEndsAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'subscription_ends_at'
  },

  stripeCustomerId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'stripe_customer_id'
  },

  // Status
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'pending', 'deleted'),
    defaultValue: 'active'
  },

  // Security
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'email_verified'
  },

  resetPasswordToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'reset_password_token'
  },

  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reset_password_expires'
  },

  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'login_attempts'
  },

  lockUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'lock_until'
  },

  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login'
  },

  // Preferences
  preferences: {
    type: DataTypes.JSON,
    defaultValue: {
      interests: ['beaches', 'restaurants', 'cultural'],
      budget: 'moderate',
      groupSize: 2,
      notifications: true
    }
  },

  // Stats
  stats: {
    type: DataTypes.JSON,
    defaultValue: {
      conversationsCount: 0,
      bookingsCount: 0,
      favoritesCount: 0
    }
  }

}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['status'] },
    { fields: ['subscription_type'] }
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  },
  defaultScope: {
    attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] }
  },
  scopes: {
    withPassword: {
      attributes: { include: ['password'] }
    }
  }
});

export default User;
