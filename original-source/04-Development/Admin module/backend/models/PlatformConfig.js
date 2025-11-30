// PlatformConfig Model - MySQL Version
// Converted from MongoDB/Mongoose to MySQL2
// This is a singleton model (only one config record)

import db from '../config/database.js';

class PlatformConfig {
  // Get config (create if doesn't exist)
  static async getConfig() {
    const [rows] = await db.execute(
      'SELECT * FROM PlatformConfig WHERE id = ?',
      ['platform_config']
    );

    if (rows.length === 0) {
      // Create default config
      await this.createDefault();
      return this.getConfig();
    }

    return this.formatConfig(rows[0]);
  }

  // Create default config
  static async createDefault() {
    const defaultColors = {
      primary: '#1976d2',
      secondary: '#dc004e',
      accent: '#9c27b0',
      background: '#ffffff',
      text: '#000000'
    };

    const defaultFonts = {
      primary: 'Roboto',
      secondary: 'Open Sans',
      heading: 'Montserrat'
    };

    const defaultLanguages = [
      { code: 'en', name: 'English', enabled: true },
      { code: 'es', name: 'Español', enabled: true },
      { code: 'de', name: 'Deutsch', enabled: true },
      { code: 'fr', name: 'Français', enabled: true }
    ];

    await db.execute(
      `INSERT IGNORE INTO PlatformConfig
       (id, branding_colors, branding_fonts, settings_languages_available)
       VALUES (?, ?, ?, ?)`,
      [
        'platform_config',
        JSON.stringify(defaultColors),
        JSON.stringify(defaultFonts),
        JSON.stringify(defaultLanguages)
      ]
    );

    return true;
  }

  // Update branding section
  static async updateBranding(data, userId) {
    const updateFields = [];
    const params = [];

    const allowedFields = {
      logo_url: 'branding_logo_url',
      logo_filename: 'branding_logo_filename',
      logo_uploaded_at: 'branding_logo_uploaded_at',
      favicon_url: 'branding_favicon_url',
      favicon_filename: 'branding_favicon_filename',
      favicon_uploaded_at: 'branding_favicon_uploaded_at',
      colors: 'branding_colors',
      fonts: 'branding_fonts',
      hero_url: 'branding_hero_url',
      hero_filename: 'branding_hero_filename',
      hero_uploaded_at: 'branding_hero_uploaded_at',
      background_url: 'branding_background_url',
      background_filename: 'branding_background_filename',
      background_uploaded_at: 'branding_background_uploaded_at'
    };

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields[key]) {
        updateFields.push(`${allowedFields[key]} = ?`);
        params.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }

    if (updateFields.length > 0) {
      updateFields.push('metadata_last_modified_by = ?', 'metadata_last_modified_at = NOW()', 'metadata_version = metadata_version + 1');
      params.push(userId);
      params.push('platform_config');

      await db.execute(
        `UPDATE PlatformConfig SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );
    }

    return this.getConfig();
  }

  // Update content section
  static async updateContent(data, userId) {
    const updateFields = [];
    const params = [];

    if (data.about) {
      updateFields.push('content_about = ?');
      params.push(JSON.stringify(data.about));
    }

    if (data.faq) {
      updateFields.push('content_faq = ?');
      params.push(JSON.stringify(data.faq));
    }

    if (data.reviews !== undefined) {
      if (data.reviews.enabled !== undefined) {
        updateFields.push('content_reviews_enabled = ?');
        params.push(data.reviews.enabled);
      }
      if (data.reviews.moderationRequired !== undefined) {
        updateFields.push('content_reviews_moderation_required = ?');
        params.push(data.reviews.moderationRequired);
      }
      if (data.reviews.featured) {
        updateFields.push('content_reviews_featured = ?');
        params.push(JSON.stringify(data.reviews.featured));
      }
    }

    if (updateFields.length > 0) {
      updateFields.push('metadata_last_modified_by = ?', 'metadata_last_modified_at = NOW()', 'metadata_version = metadata_version + 1');
      params.push(userId);
      params.push('platform_config');

      await db.execute(
        `UPDATE PlatformConfig SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );
    }

    return this.getConfig();
  }

  // Update contact section
  static async updateContact(data, userId) {
    const updateFields = [];
    const params = [];

    const fieldMap = {
      'email.general': 'contact_email_general',
      'email.support': 'contact_email_support',
      'email.sales': 'contact_email_sales',
      'phone.main': 'contact_phone_main',
      'phone.support': 'contact_phone_support',
      'phone.international': 'contact_phone_international',
      'address.street': 'contact_address_street',
      'address.city': 'contact_address_city',
      'address.state': 'contact_address_state',
      'address.zipCode': 'contact_address_zip_code',
      'address.country': 'contact_address_country',
      'social.facebook': 'contact_social_facebook',
      'social.twitter': 'contact_social_twitter',
      'social.instagram': 'contact_social_instagram',
      'social.linkedin': 'contact_social_linkedin',
      'social.youtube': 'contact_social_youtube',
      'social.tiktok': 'contact_social_tiktok',
      'website': 'contact_website'
    };

    const flattenObject = (obj, prefix = '') => {
      const flat = {};
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          Object.assign(flat, flattenObject(value, newKey));
        } else {
          flat[newKey] = value;
        }
      }
      return flat;
    };

    const flatData = flattenObject(data);

    for (const [key, value] of Object.entries(flatData)) {
      if (fieldMap[key]) {
        updateFields.push(`${fieldMap[key]} = ?`);
        params.push(value);
      }
    }

    if (data.businessHours) {
      updateFields.push('contact_business_hours = ?');
      params.push(JSON.stringify(data.businessHours));
    }

    if (updateFields.length > 0) {
      updateFields.push('metadata_last_modified_by = ?', 'metadata_last_modified_at = NOW()', 'metadata_version = metadata_version + 1');
      params.push(userId);
      params.push('platform_config');

      await db.execute(
        `UPDATE PlatformConfig SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );
    }

    return this.getConfig();
  }

  // Update legal section
  static async updateLegal(data, userId) {
    const updateFields = [];
    const params = [];

    if (data.privacy) {
      updateFields.push('legal_privacy = ?');
      params.push(JSON.stringify(data.privacy));
    }

    if (data.terms) {
      updateFields.push('legal_terms = ?');
      params.push(JSON.stringify(data.terms));
    }

    if (data.cookies) {
      updateFields.push('legal_cookies = ?');
      params.push(JSON.stringify(data.cookies));
    }

    if (data.gdpr !== undefined) {
      if (data.gdpr.enabled !== undefined) {
        updateFields.push('legal_gdpr_enabled = ?');
        params.push(data.gdpr.enabled);
      }
      if (data.gdpr.consentRequired !== undefined) {
        updateFields.push('legal_gdpr_consent_required = ?');
        params.push(data.gdpr.consentRequired);
      }
      if (data.gdpr.dataRetentionDays !== undefined) {
        updateFields.push('legal_gdpr_data_retention_days = ?');
        params.push(data.gdpr.dataRetentionDays);
      }
    }

    if (updateFields.length > 0) {
      updateFields.push('metadata_last_modified_by = ?', 'metadata_last_modified_at = NOW()', 'metadata_version = metadata_version + 1');
      params.push(userId);
      params.push('platform_config');

      await db.execute(
        `UPDATE PlatformConfig SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );
    }

    return this.getConfig();
  }

  // Update settings section
  static async updateSettings(data, userId) {
    const updateFields = [];
    const params = [];

    if (data.languages) {
      if (data.languages.available) {
        updateFields.push('settings_languages_available = ?');
        params.push(JSON.stringify(data.languages.available));
      }
      if (data.languages.default) {
        updateFields.push('settings_languages_default = ?');
        params.push(data.languages.default);
      }
    }

    if (data.currency) {
      if (data.currency.default) {
        updateFields.push('settings_currency_default = ?');
        params.push(data.currency.default);
      }
      if (data.currency.supported) {
        updateFields.push('settings_currency_supported = ?');
        params.push(JSON.stringify(data.currency.supported));
      }
    }

    if (data.timezone) {
      updateFields.push('settings_timezone = ?');
      params.push(data.timezone);
    }

    if (data.dateFormat) {
      updateFields.push('settings_date_format = ?');
      params.push(data.dateFormat);
    }

    if (data.maintenance !== undefined) {
      if (data.maintenance.enabled !== undefined) {
        updateFields.push('settings_maintenance_enabled = ?');
        params.push(data.maintenance.enabled);
      }
      if (data.maintenance.message) {
        updateFields.push('settings_maintenance_message = ?');
        params.push(JSON.stringify(data.maintenance.message));
      }
      if (data.maintenance.scheduledStart) {
        updateFields.push('settings_maintenance_scheduled_start = ?');
        params.push(data.maintenance.scheduledStart);
      }
      if (data.maintenance.scheduledEnd) {
        updateFields.push('settings_maintenance_scheduled_end = ?');
        params.push(data.maintenance.scheduledEnd);
      }
    }

    if (data.analytics !== undefined) {
      if (data.analytics.googleAnalyticsId !== undefined) {
        updateFields.push('settings_analytics_google_id = ?');
        params.push(data.analytics.googleAnalyticsId);
      }
      if (data.analytics.facebookPixelId !== undefined) {
        updateFields.push('settings_analytics_facebook_pixel_id = ?');
        params.push(data.analytics.facebookPixelId);
      }
      if (data.analytics.enabled !== undefined) {
        updateFields.push('settings_analytics_enabled = ?');
        params.push(data.analytics.enabled);
      }
    }

    if (data.email !== undefined) {
      if (data.email.provider) {
        updateFields.push('settings_email_provider = ?');
        params.push(data.email.provider);
      }
      if (data.email.fromAddress) {
        updateFields.push('settings_email_from_address = ?');
        params.push(data.email.fromAddress);
      }
      if (data.email.fromName) {
        updateFields.push('settings_email_from_name = ?');
        params.push(data.email.fromName);
      }
    }

    if (updateFields.length > 0) {
      updateFields.push('metadata_last_modified_by = ?', 'metadata_last_modified_at = NOW()', 'metadata_version = metadata_version + 1');
      params.push(userId);
      params.push('platform_config');

      await db.execute(
        `UPDATE PlatformConfig SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );
    }

    return this.getConfig();
  }

  // Update features section
  static async updateFeatures(data, userId) {
    const updateFields = [];
    const params = [];

    if (data.chat !== undefined) {
      if (data.chat.enabled !== undefined) {
        updateFields.push('features_chat_enabled = ?');
        params.push(data.chat.enabled);
      }
      if (data.chat.maxMessagesPerDay !== undefined) {
        updateFields.push('features_chat_max_messages_per_day = ?');
        params.push(data.chat.maxMessagesPerDay);
      }
    }

    if (data.booking !== undefined) {
      if (data.booking.enabled !== undefined) {
        updateFields.push('features_booking_enabled = ?');
        params.push(data.booking.enabled);
      }
      if (data.booking.requiresApproval !== undefined) {
        updateFields.push('features_booking_requires_approval = ?');
        params.push(data.booking.requiresApproval);
      }
    }

    if (data.reviews !== undefined) {
      if (data.reviews.enabled !== undefined) {
        updateFields.push('features_reviews_enabled = ?');
        params.push(data.reviews.enabled);
      }
      if (data.reviews.moderationRequired !== undefined) {
        updateFields.push('features_reviews_moderation_required = ?');
        params.push(data.reviews.moderationRequired);
      }
    }

    if (data.social !== undefined) {
      if (data.social.allowSharing !== undefined) {
        updateFields.push('features_social_allow_sharing = ?');
        params.push(data.social.allowSharing);
      }
      if (data.social.platforms) {
        updateFields.push('features_social_platforms = ?');
        params.push(JSON.stringify(data.social.platforms));
      }
    }

    if (updateFields.length > 0) {
      updateFields.push('metadata_last_modified_by = ?', 'metadata_last_modified_at = NOW()', 'metadata_version = metadata_version + 1');
      params.push(userId);
      params.push('platform_config');

      await db.execute(
        `UPDATE PlatformConfig SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );
    }

    return this.getConfig();
  }

  // Format config object from database row
  static formatConfig(row) {
    if (!row) return null;

    return {
      id: row.id,
      branding: {
        logo: {
          url: row.branding_logo_url,
          filename: row.branding_logo_filename,
          uploadedAt: row.branding_logo_uploaded_at
        },
        favicon: {
          url: row.branding_favicon_url,
          filename: row.branding_favicon_filename,
          uploadedAt: row.branding_favicon_uploaded_at
        },
        colors: row.branding_colors ? JSON.parse(row.branding_colors) : null,
        fonts: row.branding_fonts ? JSON.parse(row.branding_fonts) : null,
        images: {
          hero: {
            url: row.branding_hero_url,
            filename: row.branding_hero_filename,
            uploadedAt: row.branding_hero_uploaded_at
          },
          background: {
            url: row.branding_background_url,
            filename: row.branding_background_filename,
            uploadedAt: row.branding_background_uploaded_at
          }
        }
      },
      content: {
        about: row.content_about ? JSON.parse(row.content_about) : null,
        faq: row.content_faq ? JSON.parse(row.content_faq) : null,
        reviews: {
          enabled: row.content_reviews_enabled,
          moderationRequired: row.content_reviews_moderation_required,
          featured: row.content_reviews_featured ? JSON.parse(row.content_reviews_featured) : []
        }
      },
      contact: {
        email: {
          general: row.contact_email_general,
          support: row.contact_email_support,
          sales: row.contact_email_sales
        },
        phone: {
          main: row.contact_phone_main,
          support: row.contact_phone_support,
          international: row.contact_phone_international
        },
        address: {
          street: row.contact_address_street,
          city: row.contact_address_city,
          state: row.contact_address_state,
          zipCode: row.contact_address_zip_code,
          country: row.contact_address_country
        },
        social: {
          facebook: row.contact_social_facebook,
          twitter: row.contact_social_twitter,
          instagram: row.contact_social_instagram,
          linkedin: row.contact_social_linkedin,
          youtube: row.contact_social_youtube,
          tiktok: row.contact_social_tiktok
        },
        website: row.contact_website,
        businessHours: row.contact_business_hours ? JSON.parse(row.contact_business_hours) : null
      },
      legal: {
        privacy: row.legal_privacy ? JSON.parse(row.legal_privacy) : null,
        terms: row.legal_terms ? JSON.parse(row.legal_terms) : null,
        cookies: row.legal_cookies ? JSON.parse(row.legal_cookies) : null,
        gdpr: {
          enabled: row.legal_gdpr_enabled,
          consentRequired: row.legal_gdpr_consent_required,
          dataRetentionDays: row.legal_gdpr_data_retention_days
        }
      },
      settings: {
        languages: {
          available: row.settings_languages_available ? JSON.parse(row.settings_languages_available) : [],
          default: row.settings_languages_default
        },
        currency: {
          default: row.settings_currency_default,
          supported: row.settings_currency_supported ? JSON.parse(row.settings_currency_supported) : []
        },
        timezone: row.settings_timezone,
        dateFormat: row.settings_date_format,
        maintenance: {
          enabled: row.settings_maintenance_enabled,
          message: row.settings_maintenance_message ? JSON.parse(row.settings_maintenance_message) : null,
          scheduledStart: row.settings_maintenance_scheduled_start,
          scheduledEnd: row.settings_maintenance_scheduled_end
        },
        analytics: {
          googleAnalyticsId: row.settings_analytics_google_id,
          facebookPixelId: row.settings_analytics_facebook_pixel_id,
          enabled: row.settings_analytics_enabled
        },
        email: {
          provider: row.settings_email_provider,
          fromAddress: row.settings_email_from_address,
          fromName: row.settings_email_from_name
        }
      },
      features: {
        chat: {
          enabled: row.features_chat_enabled,
          maxMessagesPerDay: row.features_chat_max_messages_per_day
        },
        booking: {
          enabled: row.features_booking_enabled,
          requiresApproval: row.features_booking_requires_approval
        },
        reviews: {
          enabled: row.features_reviews_enabled,
          moderationRequired: row.features_reviews_moderation_required
        },
        social: {
          allowSharing: row.features_social_allow_sharing,
          platforms: row.features_social_platforms ? JSON.parse(row.features_social_platforms) : []
        }
      },
      metadata: {
        lastModifiedBy: row.metadata_last_modified_by,
        lastModifiedAt: row.metadata_last_modified_at,
        version: row.metadata_version
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export default PlatformConfig;
