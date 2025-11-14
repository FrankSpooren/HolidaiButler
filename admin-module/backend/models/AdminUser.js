import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },

  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },

  profile: {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    avatar: {
      type: String,
      default: null
    },
    phoneNumber: {
      type: String,
      default: null
    },
    language: {
      type: String,
      enum: ['en', 'es', 'de', 'fr'],
      default: 'en'
    }
  },

  role: {
    type: String,
    enum: ['platform_admin', 'poi_owner', 'editor', 'reviewer'],
    required: [true, 'Role is required'],
    default: 'editor'
  },

  permissions: {
    pois: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      approve: { type: Boolean, default: false }
    },
    platform: {
      branding: { type: Boolean, default: false },
      content: { type: Boolean, default: false },
      settings: { type: Boolean, default: false }
    },
    users: {
      view: { type: Boolean, default: false },
      manage: { type: Boolean, default: false }
    },
    media: {
      upload: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    }
  },

  ownedPOIs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'POI'
  }],

  status: {
    type: String,
    enum: ['active', 'suspended', 'pending'],
    default: 'pending'
  },

  security: {
    emailVerified: {
      type: Boolean,
      default: false
    },
    verificationToken: String,
    verificationExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: Date,
    lastLogin: Date,
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: String
  },

  activityLog: [{
    action: String,
    resource: String,
    resourceId: mongoose.Schema.Types.ObjectId,
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }],

  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    dashboardLayout: {
      type: String,
      default: 'default'
    }
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser'
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
adminUserSchema.index({ email: 1 });
adminUserSchema.index({ role: 1 });
adminUserSchema.index({ status: 1 });

// Virtual for account locked
adminUserSchema.virtual('isLocked').get(function() {
  return !!(this.security.lockUntil && this.security.lockUntil > Date.now());
});

// Pre-save middleware to hash password
adminUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to set default permissions based on role
adminUserSchema.pre('save', function(next) {
  if (!this.isModified('role')) return next();

  switch(this.role) {
    case 'platform_admin':
      this.permissions = {
        pois: { create: true, read: true, update: true, delete: true, approve: true },
        platform: { branding: true, content: true, settings: true },
        users: { view: true, manage: true },
        media: { upload: true, delete: true }
      };
      break;

    case 'poi_owner':
      this.permissions = {
        pois: { create: true, read: true, update: true, delete: false, approve: false },
        platform: { branding: false, content: false, settings: false },
        users: { view: false, manage: false },
        media: { upload: true, delete: false }
      };
      break;

    case 'editor':
      this.permissions = {
        pois: { create: true, read: true, update: true, delete: false, approve: false },
        platform: { branding: false, content: true, settings: false },
        users: { view: false, manage: false },
        media: { upload: true, delete: false }
      };
      break;

    case 'reviewer':
      this.permissions = {
        pois: { create: false, read: true, update: false, delete: false, approve: true },
        platform: { branding: false, content: false, settings: false },
        users: { view: false, manage: false },
        media: { upload: false, delete: false }
      };
      break;
  }

  next();
});

// Method to compare password
adminUserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Method to increment login attempts
adminUserSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.security.lockUntil && this.security.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { 'security.loginAttempts': 1 },
      $unset: { 'security.lockUntil': 1 }
    });
  }

  // Otherwise increment
  const updates = { $inc: { 'security.loginAttempts': 1 } };

  // Lock account after 5 attempts for 2 hours
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours

  if (this.security.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { 'security.lockUntil': Date.now() + lockTime };
  }

  return this.updateOne(updates);
};

// Method to reset login attempts
adminUserSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { 'security.loginAttempts': 0 },
    $unset: { 'security.lockUntil': 1 }
  });
};

// Method to log activity
adminUserSchema.methods.logActivity = function(action, resource, resourceId, req) {
  this.activityLog.push({
    action,
    resource,
    resourceId,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent')
  });

  // Keep only last 100 activities
  if (this.activityLog.length > 100) {
    this.activityLog = this.activityLog.slice(-100);
  }

  return this.save();
};

// Method to check if user has permission
adminUserSchema.methods.hasPermission = function(resource, action) {
  if (this.role === 'platform_admin') return true;

  const parts = resource.split('.');
  let perm = this.permissions;

  for (const part of parts) {
    perm = perm[part];
    if (perm === undefined) return false;
  }

  if (typeof perm === 'object' && action) {
    return perm[action] === true;
  }

  return perm === true;
};

// Method to check if user can manage specific POI
adminUserSchema.methods.canManagePOI = function(poiId) {
  if (this.role === 'platform_admin' || this.role === 'editor') return true;
  if (this.role === 'poi_owner') {
    return this.ownedPOIs.some(id => id.toString() === poiId.toString());
  }
  return false;
};

const AdminUser = mongoose.model('AdminUser', adminUserSchema);

export default AdminUser;
