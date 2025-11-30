-- Create PlatformConfig table for HolidaiButler Admin Module
-- Converted from MongoDB PlatformConfig schema to MySQL
-- This is a singleton table (only one row)

CREATE TABLE IF NOT EXISTS PlatformConfig (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'platform_config',

  -- Branding
  branding_logo_url VARCHAR(500) DEFAULT NULL,
  branding_logo_filename VARCHAR(255) DEFAULT NULL,
  branding_logo_uploaded_at DATETIME DEFAULT NULL,
  branding_favicon_url VARCHAR(500) DEFAULT NULL,
  branding_favicon_filename VARCHAR(255) DEFAULT NULL,
  branding_favicon_uploaded_at DATETIME DEFAULT NULL,

  -- Colors (JSON for flexibility)
  branding_colors JSON DEFAULT NULL COMMENT '{primary, secondary, accent, background, text}',

  -- Fonts (JSON)
  branding_fonts JSON DEFAULT NULL COMMENT '{primary, secondary, heading}',

  -- Images
  branding_hero_url VARCHAR(500) DEFAULT NULL,
  branding_hero_filename VARCHAR(255) DEFAULT NULL,
  branding_hero_uploaded_at DATETIME DEFAULT NULL,
  branding_background_url VARCHAR(500) DEFAULT NULL,
  branding_background_filename VARCHAR(255) DEFAULT NULL,
  branding_background_uploaded_at DATETIME DEFAULT NULL,

  -- Content - About (multilingual, stored as JSON)
  content_about JSON DEFAULT NULL COMMENT 'About content in all languages: {en, es, de, fr}',

  -- Content - FAQ (multilingual, stored as JSON arrays)
  content_faq JSON DEFAULT NULL COMMENT 'FAQ items in all languages: {en, es, de, fr}',

  -- Content - Reviews settings
  content_reviews_enabled BOOLEAN DEFAULT TRUE,
  content_reviews_moderation_required BOOLEAN DEFAULT TRUE,
  content_reviews_featured JSON DEFAULT NULL COMMENT 'Featured reviews array',

  -- Contact information
  contact_email_general VARCHAR(255) DEFAULT NULL,
  contact_email_support VARCHAR(255) DEFAULT NULL,
  contact_email_sales VARCHAR(255) DEFAULT NULL,
  contact_phone_main VARCHAR(50) DEFAULT NULL,
  contact_phone_support VARCHAR(50) DEFAULT NULL,
  contact_phone_international VARCHAR(50) DEFAULT NULL,

  -- Contact - Address
  contact_address_street VARCHAR(255) DEFAULT NULL,
  contact_address_city VARCHAR(100) DEFAULT NULL,
  contact_address_state VARCHAR(100) DEFAULT NULL,
  contact_address_zip_code VARCHAR(20) DEFAULT NULL,
  contact_address_country VARCHAR(100) DEFAULT NULL,

  -- Contact - Social media
  contact_social_facebook VARCHAR(255) DEFAULT NULL,
  contact_social_twitter VARCHAR(255) DEFAULT NULL,
  contact_social_instagram VARCHAR(255) DEFAULT NULL,
  contact_social_linkedin VARCHAR(255) DEFAULT NULL,
  contact_social_youtube VARCHAR(255) DEFAULT NULL,
  contact_social_tiktok VARCHAR(255) DEFAULT NULL,
  contact_website VARCHAR(255) DEFAULT NULL,

  -- Contact - Business hours (multilingual JSON)
  contact_business_hours JSON DEFAULT NULL COMMENT 'Business hours in all languages: {en, es, de, fr}',

  -- Legal documents (multilingual, stored as JSON)
  legal_privacy JSON DEFAULT NULL COMMENT 'Privacy policy in all languages: {en, es, de, fr}',
  legal_terms JSON DEFAULT NULL COMMENT 'Terms of service in all languages: {en, es, de, fr}',
  legal_cookies JSON DEFAULT NULL COMMENT 'Cookie policy in all languages: {en, es, de, fr}',

  -- Legal - GDPR settings
  legal_gdpr_enabled BOOLEAN DEFAULT TRUE,
  legal_gdpr_consent_required BOOLEAN DEFAULT TRUE,
  legal_gdpr_data_retention_days INT DEFAULT 365,

  -- Settings - Languages
  settings_languages_available JSON DEFAULT NULL COMMENT 'Available languages: [{code, name, enabled}]',
  settings_languages_default VARCHAR(10) DEFAULT 'en',

  -- Settings - Currency
  settings_currency_default VARCHAR(10) DEFAULT 'EUR',
  settings_currency_supported JSON DEFAULT NULL COMMENT 'Array of supported currency codes',

  -- Settings - General
  settings_timezone VARCHAR(100) DEFAULT 'Europe/Amsterdam',
  settings_date_format VARCHAR(50) DEFAULT 'DD/MM/YYYY',

  -- Settings - Maintenance mode
  settings_maintenance_enabled BOOLEAN DEFAULT FALSE,
  settings_maintenance_message JSON DEFAULT NULL COMMENT 'Maintenance message in all languages',
  settings_maintenance_scheduled_start DATETIME DEFAULT NULL,
  settings_maintenance_scheduled_end DATETIME DEFAULT NULL,

  -- Settings - Analytics
  settings_analytics_google_id VARCHAR(100) DEFAULT NULL,
  settings_analytics_facebook_pixel_id VARCHAR(100) DEFAULT NULL,
  settings_analytics_enabled BOOLEAN DEFAULT FALSE,

  -- Settings - Email
  settings_email_provider ENUM('sendgrid', 'mailgun', 'smtp') DEFAULT 'smtp',
  settings_email_from_address VARCHAR(255) DEFAULT NULL,
  settings_email_from_name VARCHAR(255) DEFAULT NULL,

  -- Features - Chat
  features_chat_enabled BOOLEAN DEFAULT TRUE,
  features_chat_max_messages_per_day INT DEFAULT NULL,

  -- Features - Booking
  features_booking_enabled BOOLEAN DEFAULT TRUE,
  features_booking_requires_approval BOOLEAN DEFAULT FALSE,

  -- Features - Reviews
  features_reviews_enabled BOOLEAN DEFAULT TRUE,
  features_reviews_moderation_required BOOLEAN DEFAULT TRUE,

  -- Features - Social
  features_social_allow_sharing BOOLEAN DEFAULT TRUE,
  features_social_platforms JSON DEFAULT NULL COMMENT 'Array of enabled social platforms',

  -- Metadata
  metadata_last_modified_by INT DEFAULT NULL,
  metadata_last_modified_at DATETIME DEFAULT NULL,
  metadata_version INT DEFAULT 1,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign key
  FOREIGN KEY (metadata_last_modified_by) REFERENCES AdminUsers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default platform config
INSERT INTO PlatformConfig (id, branding_colors, branding_fonts, settings_languages_available)
VALUES (
  'platform_config',
  JSON_OBJECT(
    'primary', '#1976d2',
    'secondary', '#dc004e',
    'accent', '#9c27b0',
    'background', '#ffffff',
    'text', '#000000'
  ),
  JSON_OBJECT(
    'primary', 'Roboto',
    'secondary', 'Open Sans',
    'heading', 'Montserrat'
  ),
  JSON_ARRAY(
    JSON_OBJECT('code', 'en', 'name', 'English', 'enabled', TRUE),
    JSON_OBJECT('code', 'es', 'name', 'Español', 'enabled', TRUE),
    JSON_OBJECT('code', 'de', 'name', 'Deutsch', 'enabled', TRUE),
    JSON_OBJECT('code', 'fr', 'name', 'Français', 'enabled', TRUE)
  )
) ON DUPLICATE KEY UPDATE id=id;
