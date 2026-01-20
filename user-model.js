import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  authProvider: { 
    type: String, 
    enum: ['google', 'facebook', 'apple', 'email'], 
    required: true 
  },
  authId: { 
    type: String, 
    required: true 
  },
  profile: {
    name: { 
      type: String, 
      required: true,
      trim: true
    },
    avatar: String,
    preferences: {
      language: { 
        type: String, 
        enum: ['en', 'es', 'de', 'nl', 'fr'], 
        default: 'en' 
      },
      budget: { 
        type: Number, 
        default: 0 
      },
      interests: [{ 
        type: String, 
        enum: ['beaches', 'restaurants', 'nightlife', 'culture', 'adventure', 'family', 'romantic', 'shopping', 'nature', 'history'],
        default: []
      }],
      holidayType: { 
        type: String, 
        enum: ['family', 'romantic', 'adventure', 'cultural', 'relaxation'], 
        default: 'family' 
      },
      groupSize: { 
        type: Number, 
        min: 1, 
        max: 20, 
        default: 2 
      }
    }
  },
  subscription: {
    type: { 
      type: String, 
      enum: ['free', 'premium'], 
      default: 'free' 
    },
    expiresAt: Date,
    stripeCustomerId: String
  },
  stats: {
    conversationsCount: { 
      type: Number, 
      default: 0 
    },
    bookingsCount: { 
      type: Number, 
      default: 0 
    },
    lastActive: { 
      type: Date, 
      default: Date.now 
    }
  }
}, { 
  timestamps: true 
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ authProvider: 1, authId: 1 });
userSchema.index({ 'subscription.type': 1 });
userSchema.index({ 'stats.lastActive': 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.profile.name;
});

// Method to check if user is premium
userSchema.methods.isPremium = function() {
  return this.subscription.type === 'premium' && 
         this.subscription.expiresAt && 
         this.subscription.expiresAt > new Date();
};

// Method to update last active
userSchema.methods.updateLastActive = function() {
  this.stats.lastActive = new Date();
  return this.save();
};

// Method to increment conversation count
userSchema.methods.incrementConversations = function() {
  this.stats.conversationsCount += 1;
  return this.save();
};

// Method to increment booking count
userSchema.methods.incrementBookings = function() {
  this.stats.bookingsCount += 1;
  return this.save();
};

// Pre-save middleware to hash passwords (if using email auth)
userSchema.pre('save', async function(next) {
  // Only hash password if it exists and is modified
  if (this.password && this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Transform JSON output (remove sensitive data)
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.authId;
  delete userObject.subscription.stripeCustomerId;
  return userObject;
};

// Static method to find by auth provider
userSchema.statics.findByAuth = function(provider, authId) {
  return this.findOne({ authProvider: provider, authId: authId });
};

// Static method to find premium users
userSchema.statics.findPremiumUsers = function() {
  return this.find({
    'subscription.type': 'premium',
    'subscription.expiresAt': { $gt: new Date() }
  });
};

export default mongoose.model('User', userSchema);