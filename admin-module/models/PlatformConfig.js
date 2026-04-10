import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class PlatformConfig extends Model {
  // Get config (create if doesn't exist)
  static async getConfig() {
    let config = await this.findByPk('platform_config');

    if (!config) {
      config = await this.create({
        id: 'platform_config',
        settings: {
          languages: {
            available: [
              { code: 'en', name: 'English', enabled: true },
              { code: 'es', name: 'Español', enabled: true },
              { code: 'de', name: 'Deutsch', enabled: true },
              { code: 'fr', name: 'Français', enabled: true }
            ],
            default: 'en'
          },
          currency: {
            default: 'EUR',
            supported: ['EUR', 'USD', 'GBP']
          },
          timezone: 'Europe/Amsterdam',
          dateFormat: 'DD/MM/YYYY'
        }
      });
    }

    return config;
  }

  // Update specific section
  async updateSection(section, data, userId) {
    const currentValue = this[section] || {};
    this[section] = { ...currentValue, ...data };
    this.lastModifiedById = userId;
    this.lastModifiedAt = new Date();
    this.version += 1;

    return this.save();
  }
}

PlatformConfig.init({
  // Fixed ID for singleton pattern
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: 'platform_config'
  },

  // Branding
  branding: {
    type: DataTypes.JSON,
    defaultValue: {
      logo: { url: null, filename: null, uploadedAt: null },
      favicon: { url: null, filename: null, uploadedAt: null },
      colors: {
        primary: '#1976d2',
        secondary: '#dc004e',
        accent: '#9c27b0',
        background: '#ffffff',
        text: '#000000'
      },
      fonts: {
        primary: 'Roboto',
        secondary: 'Open Sans',
        heading: 'Montserrat'
      },
      images: {
        hero: { url: null, filename: null, uploadedAt: null },
        background: { url: null, filename: null, uploadedAt: null }
      }
    }
  },

  // Content (multi-language)
  content: {
    type: DataTypes.JSON,
    defaultValue: {
      about: { en: {}, es: {}, de: {}, fr: {} },
      faq: { en: [], es: [], de: [], fr: [] },
      reviews: {
        enabled: true,
        moderationRequired: true,
        featured: []
      }
    }
  },

  // Contact
  contact: {
    type: DataTypes.JSON,
    defaultValue: {
      email: { general: null, support: null, sales: null },
      phone: { main: null, support: null, international: null },
      address: { street: null, city: null, state: null, zipCode: null, country: null },
      social: {
        facebook: null,
        twitter: null,
        instagram: null,
        linkedin: null,
        youtube: null,
        tiktok: null
      },
      website: null,
      businessHours: { en: null, es: null, de: null, fr: null }
    }
  },

  // Legal
  legal: {
    type: DataTypes.JSON,
    defaultValue: {
      privacy: { en: {}, es: {}, de: {}, fr: {} },
      terms: { en: {}, es: {}, de: {}, fr: {} },
      cookies: { en: {}, es: {}, de: {}, fr: {} },
      gdpr: {
        enabled: true,
        consentRequired: true,
        dataRetentionDays: 365
      }
    }
  },

  // Settings
  settings: {
    type: DataTypes.JSON,
    defaultValue: {
      languages: {
        available: [
          { code: 'en', name: 'English', enabled: true },
          { code: 'es', name: 'Español', enabled: true },
          { code: 'de', name: 'Deutsch', enabled: true },
          { code: 'fr', name: 'Français', enabled: true }
        ],
        default: 'en'
      },
      currency: {
        default: 'EUR',
        supported: ['EUR', 'USD', 'GBP']
      },
      timezone: 'Europe/Amsterdam',
      dateFormat: 'DD/MM/YYYY',
      maintenance: {
        enabled: false,
        message: { en: null, es: null, de: null, fr: null },
        scheduledStart: null,
        scheduledEnd: null
      },
      analytics: {
        googleAnalyticsId: null,
        facebookPixelId: null,
        enabled: false
      },
      email: {
        provider: 'smtp',
        fromAddress: null,
        fromName: null
      }
    }
  },

  // Features
  features: {
    type: DataTypes.JSON,
    defaultValue: {
      chat: { enabled: true, maxMessagesPerDay: 100 },
      booking: { enabled: true, requiresApproval: false },
      reviews: { enabled: true, moderationRequired: true },
      social: { allowSharing: true, platforms: ['facebook', 'twitter', 'whatsapp'] }
    }
  },

  // Metadata
  lastModifiedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'last_modified_by_id'
  },

  lastModifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_modified_at'
  },

  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  }
}, {
  sequelize,
  modelName: 'PlatformConfig',
  tableName: 'platform_config',
  timestamps: true,
  underscored: true
});

export default PlatformConfig;
