import mongoose from 'mongoose';

const platformConfigSchema = new mongoose.Schema({
  // There should only be one config document
  _id: {
    type: String,
    default: 'platform_config'
  },

  branding: {
    logo: {
      url: String,
      filename: String,
      uploadedAt: Date
    },
    favicon: {
      url: String,
      filename: String,
      uploadedAt: Date
    },
    colors: {
      primary: {
        type: String,
        default: '#1976d2'
      },
      secondary: {
        type: String,
        default: '#dc004e'
      },
      accent: {
        type: String,
        default: '#9c27b0'
      },
      background: {
        type: String,
        default: '#ffffff'
      },
      text: {
        type: String,
        default: '#000000'
      }
    },
    fonts: {
      primary: {
        type: String,
        default: 'Roboto'
      },
      secondary: {
        type: String,
        default: 'Open Sans'
      },
      heading: {
        type: String,
        default: 'Montserrat'
      }
    },
    images: {
      hero: {
        url: String,
        filename: String,
        uploadedAt: Date
      },
      background: {
        url: String,
        filename: String,
        uploadedAt: Date
      }
    }
  },

  content: {
    about: {
      en: {
        title: String,
        description: String,
        content: String
      },
      es: {
        title: String,
        description: String,
        content: String
      },
      de: {
        title: String,
        description: String,
        content: String
      },
      fr: {
        title: String,
        description: String,
        content: String
      }
    },
    faq: {
      en: [{
        question: String,
        answer: String,
        order: Number
      }],
      es: [{
        question: String,
        answer: String,
        order: Number
      }],
      de: [{
        question: String,
        answer: String,
        order: Number
      }],
      fr: [{
        question: String,
        answer: String,
        order: Number
      }]
    },
    reviews: {
      enabled: {
        type: Boolean,
        default: true
      },
      moderationRequired: {
        type: Boolean,
        default: true
      },
      featured: [{
        author: String,
        rating: Number,
        comment: String,
        language: String,
        order: Number
      }]
    }
  },

  contact: {
    email: {
      general: String,
      support: String,
      sales: String
    },
    phone: {
      main: String,
      support: String,
      international: String
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    social: {
      facebook: String,
      twitter: String,
      instagram: String,
      linkedin: String,
      youtube: String,
      tiktok: String
    },
    website: String,
    businessHours: {
      en: String,
      es: String,
      de: String,
      fr: String
    }
  },

  legal: {
    privacy: {
      en: {
        title: String,
        content: String,
        lastUpdated: Date
      },
      es: {
        title: String,
        content: String,
        lastUpdated: Date
      },
      de: {
        title: String,
        content: String,
        lastUpdated: Date
      },
      fr: {
        title: String,
        content: String,
        lastUpdated: Date
      }
    },
    terms: {
      en: {
        title: String,
        content: String,
        lastUpdated: Date
      },
      es: {
        title: String,
        content: String,
        lastUpdated: Date
      },
      de: {
        title: String,
        content: String,
        lastUpdated: Date
      },
      fr: {
        title: String,
        content: String,
        lastUpdated: Date
      }
    },
    cookies: {
      en: {
        title: String,
        content: String,
        lastUpdated: Date
      },
      es: {
        title: String,
        content: String,
        lastUpdated: Date
      },
      de: {
        title: String,
        content: String,
        lastUpdated: Date
      },
      fr: {
        title: String,
        content: String,
        lastUpdated: Date
      }
    },
    gdpr: {
      enabled: {
        type: Boolean,
        default: true
      },
      consentRequired: {
        type: Boolean,
        default: true
      },
      dataRetentionDays: {
        type: Number,
        default: 365
      }
    }
  },

  settings: {
    languages: {
      available: [{
        code: String,
        name: String,
        enabled: Boolean
      }],
      default: {
        type: String,
        default: 'en'
      }
    },
    currency: {
      default: {
        type: String,
        default: 'EUR'
      },
      supported: [String]
    },
    timezone: {
      type: String,
      default: 'Europe/Amsterdam'
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY'
    },
    maintenance: {
      enabled: {
        type: Boolean,
        default: false
      },
      message: {
        en: String,
        es: String,
        de: String,
        fr: String
      },
      scheduledStart: Date,
      scheduledEnd: Date
    },
    analytics: {
      googleAnalyticsId: String,
      facebookPixelId: String,
      enabled: {
        type: Boolean,
        default: false
      }
    },
    email: {
      provider: {
        type: String,
        enum: ['sendgrid', 'mailgun', 'smtp'],
        default: 'smtp'
      },
      fromAddress: String,
      fromName: String
    }
  },

  features: {
    chat: {
      enabled: {
        type: Boolean,
        default: true
      },
      maxMessagesPerDay: Number
    },
    booking: {
      enabled: {
        type: Boolean,
        default: true
      },
      requiresApproval: {
        type: Boolean,
        default: false
      }
    },
    reviews: {
      enabled: {
        type: Boolean,
        default: true
      },
      moderationRequired: {
        type: Boolean,
        default: true
      }
    },
    social: {
      allowSharing: {
        type: Boolean,
        default: true
      },
      platforms: [String]
    }
  },

  metadata: {
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser'
    },
    lastModifiedAt: Date,
    version: {
      type: Number,
      default: 1
    }
  }
}, {
  timestamps: true
});

// Initialize default languages
platformConfigSchema.pre('save', function(next) {
  if (this.isNew && (!this.settings.languages.available || this.settings.languages.available.length === 0)) {
    this.settings.languages.available = [
      { code: 'en', name: 'English', enabled: true },
      { code: 'es', name: 'Español', enabled: true },
      { code: 'de', name: 'Deutsch', enabled: true },
      { code: 'fr', name: 'Français', enabled: true }
    ];
  }
  next();
});

// Static method to get config (create if doesn't exist)
platformConfigSchema.statics.getConfig = async function() {
  let config = await this.findById('platform_config');

  if (!config) {
    config = await this.create({ _id: 'platform_config' });
  }

  return config;
};

// Method to update specific section
platformConfigSchema.methods.updateSection = async function(section, data, userId) {
  this[section] = { ...this[section], ...data };
  this.metadata.lastModifiedBy = userId;
  this.metadata.lastModifiedAt = new Date();
  this.metadata.version += 1;

  return await this.save();
};

const PlatformConfig = mongoose.model('PlatformConfig', platformConfigSchema);

export default PlatformConfig;
