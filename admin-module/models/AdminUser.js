import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database.js';

class AdminUser extends Model {
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
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && new Date(this.lockUntil) < new Date()) {
      this.loginAttempts = 1;
      this.lockUntil = null;
      return this.save();
    }

    // Otherwise increment
    this.loginAttempts += 1;

    // Lock account after 5 attempts for 2 hours
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

  // Check if user has permission
  hasPermission(resource, action) {
    if (this.role === 'platform_admin') return true;

    const permissions = this.permissions || {};
    const parts = resource.split('.');
    let perm = permissions;

    for (const part of parts) {
      perm = perm[part];
      if (perm === undefined) return false;
    }

    if (typeof perm === 'object' && action) {
      return perm[action] === true;
    }

    return perm === true;
  }

  // Check if user can manage specific POI
  canManagePOI(poiId) {
    if (this.role === 'platform_admin' || this.role === 'editor') return true;
    if (this.role === 'poi_owner') {
      const ownedPOIs = this.ownedPOIs || [];
      return ownedPOIs.includes(poiId);
    }
    return false;
  }

  // Log activity
  async logActivity(action, resource, resourceId, req) {
    const activityLog = this.activityLog || [];
    activityLog.push({
      action,
      resource,
      resourceId,
      timestamp: new Date().toISOString(),
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get?.('user-agent')
    });

    // Keep only last 100 activities
    if (activityLog.length > 100) {
      this.activityLog = activityLog.slice(-100);
    } else {
      this.activityLog = activityLog;
    }

    return this.save();
  }

  // Get default permissions based on role
  static getDefaultPermissions(role) {
    const permissionSets = {
      platform_admin: {
        pois: { create: true, read: true, update: true, delete: true, approve: true },
        platform: { branding: true, content: true, settings: true },
        users: { view: true, manage: true },
        media: { upload: true, delete: true },
        events: { view: true, create: true, edit: true, delete: true },
        reservations: { view: true, create: true, edit: true, delete: true },
        tickets: { view: true, create: true, edit: true, delete: true },
        bookings: { view: true, create: true, edit: true, delete: true },
        transactions: { view: true, create: true, edit: true, delete: true }
      },
      poi_owner: {
        pois: { create: true, read: true, update: true, delete: false, approve: false },
        platform: { branding: false, content: false, settings: false },
        users: { view: false, manage: false },
        media: { upload: true, delete: false },
        events: { view: true, create: true, edit: true, delete: false },
        reservations: { view: true, create: true, edit: true, delete: false },
        tickets: { view: true, create: true, edit: true, delete: false },
        bookings: { view: true, create: true, edit: true, delete: false },
        transactions: { view: true, create: false, edit: false, delete: false }
      },
      editor: {
        pois: { create: true, read: true, update: true, delete: false, approve: false },
        platform: { branding: false, content: true, settings: false },
        users: { view: false, manage: false },
        media: { upload: true, delete: false },
        events: { view: true, create: true, edit: true, delete: false },
        reservations: { view: true, create: true, edit: true, delete: false },
        tickets: { view: true, create: true, edit: true, delete: false },
        bookings: { view: true, create: true, edit: true, delete: false },
        transactions: { view: true, create: false, edit: false, delete: false }
      },
      reviewer: {
        pois: { create: false, read: true, update: false, delete: false, approve: true },
        platform: { branding: false, content: false, settings: false },
        users: { view: false, manage: false },
        media: { upload: false, delete: false },
        events: { view: true, create: false, edit: false, delete: false },
        reservations: { view: true, create: false, edit: false, delete: false },
        tickets: { view: true, create: false, edit: false, delete: false },
        bookings: { view: true, create: false, edit: false, delete: false },
        transactions: { view: true, create: false, edit: false, delete: false }
      }
    };

    return permissionSets[role] || permissionSets.reviewer;
  }

  // Safe JSON output (exclude sensitive fields)
  toSafeJSON() {
    const values = this.toJSON();
    delete values.password;
    delete values.verificationToken;
    delete values.resetPasswordToken;
    delete values.twoFactorSecret;
    return values;
  }
}

AdminUser.init({
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
    defaultValue: 'en'
  },

  // Role & Permissions
  role: {
    type: DataTypes.ENUM('platform_admin', 'poi_owner', 'editor', 'reviewer'),
    allowNull: false,
    defaultValue: 'editor'
  },

  permissions: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {}
  },

  ownedPOIs: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'owned_pois'
  },

  // Status
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'pending'),
    defaultValue: 'pending'
  },

  // Security
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'email_verified'
  },

  verificationToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'verification_token'
  },

  verificationExpires: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'verification_expires'
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

  twoFactorEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'two_factor_enabled'
  },

  twoFactorSecret: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'two_factor_secret'
  },

  // Activity Log (stored as JSON array)
  activityLog: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'activity_log'
  },

  // Preferences
  preferences: {
    type: DataTypes.JSON,
    defaultValue: {
      emailNotifications: true,
      dashboardLayout: 'default'
    }
  },

  // Created by reference (stored as UUID)
  createdById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by_id'
  }
}, {
  sequelize,
  modelName: 'AdminUser',
  tableName: 'admin_users',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['role'] },
    { fields: ['status'] }
  ],
  hooks: {
    // Hash password before save
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
      // Set default permissions based on role
      if (!user.permissions || Object.keys(user.permissions).length === 0) {
        user.permissions = AdminUser.getDefaultPermissions(user.role);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
      // Update permissions if role changed
      if (user.changed('role')) {
        user.permissions = AdminUser.getDefaultPermissions(user.role);
      }
    }
  },
  defaultScope: {
    attributes: { exclude: ['password', 'verificationToken', 'resetPasswordToken', 'twoFactorSecret'] }
  },
  scopes: {
    withPassword: {
      attributes: { include: ['password'] }
    },
    withSecurityTokens: {
      attributes: { include: ['verificationToken', 'resetPasswordToken'] }
    }
  }
});

export default AdminUser;
