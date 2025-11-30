-- ============================================================================
-- Migration 003: Unified Schema Alignment
-- ============================================================================
-- Description: Creates unified schema for HolidaiButler platform
--              Aligns ORIGINAL and NEW database structures
-- Author: HolidaiButler Development Team
-- Date: 2025-11-30
-- Dependencies: 001_poi_classification_schema.sql, 002_poi_images_schema.sql
-- ============================================================================

USE holidaibutler;

-- ============================================================================
-- SECTION 1: RBAC SYSTEM (from ORIGINAL auth middleware)
-- ============================================================================
-- Required for: requirePermission(), requireRole(), checkUserPermission()

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE COMMENT 'System roles cannot be deleted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='RBAC roles for user authorization';

-- Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE COMMENT 'Format: resource.action (e.g., poi.create)',
  display_name VARCHAR(150) NOT NULL,
  description TEXT,
  resource VARCHAR(50) NOT NULL COMMENT 'Resource type: poi, user, booking, etc.',
  action VARCHAR(50) NOT NULL COMMENT 'Action: create, read, update, delete, manage',
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_resource (resource),
  INDEX idx_resource_action (resource, action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='RBAC permissions for granular access control';

-- Role_Permissions Junction Table
CREATE TABLE IF NOT EXISTS role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  granted BOOLEAN DEFAULT TRUE COMMENT 'FALSE = explicitly denied',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_role_permission (role_id, permission_id),
  INDEX idx_role (role_id),
  INDEX idx_permission (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Maps roles to permissions';

-- ============================================================================
-- SECTION 2: USERS TABLE (from ORIGINAL backend)
-- ============================================================================
-- Note: This is for customer/user authentication, NOT admin users

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),

  -- Authentication
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,

  -- Profile
  name VARCHAR(200),
  avatar_url VARCHAR(500),
  phone VARCHAR(50),

  -- RBAC
  role_id INT DEFAULT NULL,

  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INT DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_admin BOOLEAN DEFAULT FALSE COMMENT 'Deprecated: use roles instead',
  email_verified BOOLEAN DEFAULT FALSE,

  -- Email Verification
  email_verification_token VARCHAR(255),
  email_verification_expires DATETIME,

  -- Password Reset
  password_reset_token VARCHAR(255),
  password_reset_expires DATETIME,

  -- Preferences
  preferred_language VARCHAR(5) DEFAULT 'nl',
  notification_preferences JSON DEFAULT '{"email": true, "push": true, "sms": false}',

  -- Timestamps
  last_login DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Constraints
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL,

  -- Indexes
  INDEX idx_email (email),
  INDEX idx_uuid (uuid),
  INDEX idx_role (role_id),
  INDEX idx_active (is_active),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Customer/user accounts for the platform';

-- User_Permissions Table (for individual overrides)
CREATE TABLE IF NOT EXISTS user_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  permission_id INT NOT NULL,
  granted BOOLEAN DEFAULT TRUE COMMENT 'TRUE = grant, FALSE = revoke',
  expires_at DATETIME NULL COMMENT 'NULL = permanent',
  granted_by INT COMMENT 'Admin user who granted this permission',
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_permission (user_id, permission_id),
  INDEX idx_user (user_id),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Individual user permission overrides';

-- ============================================================================
-- SECTION 3: SESSIONS TABLE (from ORIGINAL backend)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id INT NOT NULL,

  -- Token Info
  access_token_hash VARCHAR(255) NOT NULL COMMENT 'SHA256 hash of access token',
  refresh_token_hash VARCHAR(255) COMMENT 'SHA256 hash of refresh token',

  -- Expiration
  access_token_expires_at DATETIME NOT NULL,
  refresh_token_expires_at DATETIME,

  -- Device Info
  device_id VARCHAR(200),
  device_type ENUM('web', 'ios', 'android', 'api') DEFAULT 'web',
  device_name VARCHAR(200),
  user_agent TEXT,
  ip_address VARCHAR(45),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  revoked_at DATETIME,
  revoked_reason VARCHAR(200),

  -- Timestamps
  last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_active (user_id, is_active),
  INDEX idx_access_token (access_token_hash),
  INDEX idx_refresh_token (refresh_token_hash),
  INDEX idx_expires (access_token_expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User session tracking for JWT management';

-- ============================================================================
-- SECTION 4: FAVORITES TABLE (from ORIGINAL frontend context)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_favorites (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id INT NOT NULL,
  poi_id CHAR(36) NOT NULL,

  -- Metadata
  notes TEXT,
  folder VARCHAR(100) DEFAULT 'default' COMMENT 'User-created folders for organizing favorites',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_poi (user_id, poi_id),
  INDEX idx_user (user_id),
  INDEX idx_poi (poi_id),
  INDEX idx_folder (user_id, folder)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User favorite POIs (synced from localStorage)';

-- ============================================================================
-- SECTION 5: POI Q&A TABLE (for HoliBot knowledge base)
-- ============================================================================

CREATE TABLE IF NOT EXISTS poi_qa (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  poi_id CHAR(36) NOT NULL,

  -- Q&A Content
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  language VARCHAR(5) DEFAULT 'en',

  -- Classification
  category VARCHAR(50) COMMENT 'opening_hours, pricing, accessibility, parking, etc.',
  keywords JSON COMMENT 'Keywords for search matching',

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by VARCHAR(36),
  verified_at DATETIME,

  -- Source
  source ENUM('manual', 'ai_generated', 'user_submitted', 'scraped') DEFAULT 'manual',
  confidence_score DECIMAL(3, 2) COMMENT 'For AI-generated answers',

  -- Usage Stats
  view_count INT DEFAULT 0,
  helpful_count INT DEFAULT 0,
  not_helpful_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE,
  INDEX idx_poi_active (poi_id, is_active),
  INDEX idx_language (language),
  INDEX idx_category (category),
  FULLTEXT INDEX idx_search (question, answer)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Q&A pairs for POIs used by HoliBot chatbot';

-- ============================================================================
-- SECTION 6: POI REVIEWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS poi_reviews (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  poi_id CHAR(36) NOT NULL,
  user_id INT NOT NULL,

  -- Review Content
  rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(200),
  content TEXT,

  -- Ratings Breakdown
  rating_service TINYINT CHECK (rating_service >= 1 AND rating_service <= 5),
  rating_value TINYINT CHECK (rating_value >= 1 AND rating_value <= 5),
  rating_location TINYINT CHECK (rating_location >= 1 AND rating_location <= 5),
  rating_cleanliness TINYINT CHECK (rating_cleanliness >= 1 AND rating_cleanliness <= 5),

  -- Visit Info
  visit_date DATE,
  visit_type ENUM('solo', 'couple', 'family', 'friends', 'business') DEFAULT 'solo',

  -- Language
  language VARCHAR(5) DEFAULT 'en',

  -- Status
  status ENUM('pending', 'approved', 'rejected', 'flagged') DEFAULT 'pending',
  moderated_at DATETIME,
  moderated_by VARCHAR(36),
  rejection_reason TEXT,

  -- Engagement
  helpful_count INT DEFAULT 0,
  report_count INT DEFAULT 0,

  -- Response from POI owner
  owner_response TEXT,
  owner_response_at DATETIME,
  owner_id VARCHAR(36),

  -- Verification
  is_verified_visit BOOLEAN DEFAULT FALSE COMMENT 'Verified via booking',
  booking_id CHAR(36),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_poi_status (poi_id, status),
  INDEX idx_user (user_id),
  INDEX idx_rating (poi_id, rating),
  INDEX idx_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User reviews for POIs';

-- ============================================================================
-- SECTION 7: INSERT DEFAULT ROLES AND PERMISSIONS
-- ============================================================================

-- Insert Default Roles
INSERT INTO roles (name, display_name, description, is_system) VALUES
  ('super_admin', 'Super Administrator', 'Full system access - can do everything', TRUE),
  ('admin', 'Administrator', 'Platform administration access', TRUE),
  ('moderator', 'Moderator', 'Content moderation access', TRUE),
  ('poi_owner', 'POI Owner', 'Business owner managing their POI(s)', FALSE),
  ('user', 'User', 'Standard registered user', TRUE),
  ('guest', 'Guest', 'Unregistered visitor', TRUE)
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

-- Insert Default Permissions
INSERT INTO permissions (name, display_name, resource, action, is_system) VALUES
  -- POI Permissions
  ('poi.create', 'Create POI', 'poi', 'create', TRUE),
  ('poi.read', 'View POI', 'poi', 'read', TRUE),
  ('poi.update', 'Update POI', 'poi', 'update', TRUE),
  ('poi.delete', 'Delete POI', 'poi', 'delete', TRUE),
  ('poi.verify', 'Verify POI', 'poi', 'verify', TRUE),
  ('poi.moderate', 'Moderate POI Content', 'poi', 'moderate', TRUE),
  ('poi.manage_all', 'Manage All POIs', 'poi', 'manage_all', TRUE),

  -- User Permissions
  ('user.create', 'Create User', 'user', 'create', TRUE),
  ('user.read', 'View User', 'user', 'read', TRUE),
  ('user.update', 'Update User', 'user', 'update', TRUE),
  ('user.delete', 'Delete User', 'user', 'delete', TRUE),
  ('user.manage_all', 'Manage All Users', 'user', 'manage_all', TRUE),

  -- Booking Permissions
  ('booking.create', 'Create Booking', 'booking', 'create', TRUE),
  ('booking.read', 'View Booking', 'booking', 'read', TRUE),
  ('booking.update', 'Update Booking', 'booking', 'update', TRUE),
  ('booking.cancel', 'Cancel Booking', 'booking', 'cancel', TRUE),
  ('booking.refund', 'Process Refund', 'booking', 'refund', TRUE),
  ('booking.manage_all', 'Manage All Bookings', 'booking', 'manage_all', TRUE),

  -- Review Permissions
  ('review.create', 'Create Review', 'review', 'create', TRUE),
  ('review.read', 'View Review', 'review', 'read', TRUE),
  ('review.moderate', 'Moderate Reviews', 'review', 'moderate', TRUE),
  ('review.delete', 'Delete Review', 'review', 'delete', TRUE),

  -- Content Permissions
  ('content.create', 'Create Content', 'content', 'create', TRUE),
  ('content.update', 'Update Content', 'content', 'update', TRUE),
  ('content.publish', 'Publish Content', 'content', 'publish', TRUE),

  -- Analytics Permissions
  ('analytics.view', 'View Analytics', 'analytics', 'view', TRUE),
  ('analytics.export', 'Export Analytics', 'analytics', 'export', TRUE),

  -- System Permissions
  ('system.config', 'System Configuration', 'system', 'config', TRUE),
  ('system.audit', 'View Audit Logs', 'system', 'audit', TRUE),
  ('system.manage_roles', 'Manage Roles', 'system', 'manage_roles', TRUE)
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

-- Assign Permissions to Roles
-- Super Admin: All permissions
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT
  (SELECT id FROM roles WHERE name = 'super_admin'),
  id,
  TRUE
FROM permissions
ON DUPLICATE KEY UPDATE granted = TRUE;

-- Admin: Most permissions except system config
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT
  (SELECT id FROM roles WHERE name = 'admin'),
  id,
  TRUE
FROM permissions
WHERE name NOT IN ('system.config', 'system.manage_roles')
ON DUPLICATE KEY UPDATE granted = TRUE;

-- Moderator: Content moderation
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT
  (SELECT id FROM roles WHERE name = 'moderator'),
  id,
  TRUE
FROM permissions
WHERE name IN (
  'poi.read', 'poi.moderate', 'poi.verify',
  'review.read', 'review.moderate', 'review.delete',
  'content.update', 'content.publish',
  'user.read'
)
ON DUPLICATE KEY UPDATE granted = TRUE;

-- POI Owner: Manage own POI
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT
  (SELECT id FROM roles WHERE name = 'poi_owner'),
  id,
  TRUE
FROM permissions
WHERE name IN (
  'poi.read', 'poi.update',
  'review.read',
  'booking.read',
  'analytics.view'
)
ON DUPLICATE KEY UPDATE granted = TRUE;

-- User: Basic permissions
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT
  (SELECT id FROM roles WHERE name = 'user'),
  id,
  TRUE
FROM permissions
WHERE name IN (
  'poi.read',
  'booking.create', 'booking.read', 'booking.cancel',
  'review.create', 'review.read'
)
ON DUPLICATE KEY UPDATE granted = TRUE;

-- Guest: Read-only
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT
  (SELECT id FROM roles WHERE name = 'guest'),
  id,
  TRUE
FROM permissions
WHERE name IN ('poi.read', 'review.read')
ON DUPLICATE KEY UPDATE granted = TRUE;

-- ============================================================================
-- SECTION 8: AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),

  -- Who
  user_id INT,
  user_email VARCHAR(255),
  user_role VARCHAR(50),

  -- What
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(36),

  -- Details
  old_values JSON,
  new_values JSON,
  changes JSON COMMENT 'Summary of what changed',

  -- Context
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_id VARCHAR(36),

  -- Status
  status ENUM('success', 'failure', 'warning') DEFAULT 'success',
  error_message TEXT,

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Audit trail for security and compliance';

-- ============================================================================
-- SECTION 9: API KEYS TABLE (for external integrations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),

  -- Key Info
  name VARCHAR(100) NOT NULL,
  description TEXT,
  key_hash VARCHAR(255) NOT NULL UNIQUE COMMENT 'SHA256 hash of API key',
  key_prefix VARCHAR(10) NOT NULL COMMENT 'First 10 chars for identification',

  -- Owner
  user_id INT,
  organization VARCHAR(200),

  -- Permissions
  scopes JSON DEFAULT '["read"]' COMMENT 'Array of allowed scopes',
  rate_limit_per_hour INT DEFAULT 1000,
  rate_limit_per_day INT DEFAULT 10000,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  expires_at DATETIME,
  last_used_at DATETIME,

  -- Usage Stats
  request_count INT DEFAULT 0,
  last_ip_address VARCHAR(45),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  revoked_at DATETIME,
  revoked_by INT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_key_prefix (key_prefix),
  INDEX idx_active (is_active),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='API keys for external service integrations';

-- ============================================================================
-- SECTION 10: NOTIFICATION PREFERENCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_settings (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id INT NOT NULL UNIQUE,

  -- Email Notifications
  email_marketing BOOLEAN DEFAULT TRUE,
  email_booking_confirmation BOOLEAN DEFAULT TRUE,
  email_booking_reminder BOOLEAN DEFAULT TRUE,
  email_booking_cancelled BOOLEAN DEFAULT TRUE,
  email_review_response BOOLEAN DEFAULT TRUE,
  email_newsletter BOOLEAN DEFAULT TRUE,
  email_special_offers BOOLEAN DEFAULT TRUE,

  -- Push Notifications
  push_enabled BOOLEAN DEFAULT TRUE,
  push_booking_updates BOOLEAN DEFAULT TRUE,
  push_chat_messages BOOLEAN DEFAULT TRUE,
  push_recommendations BOOLEAN DEFAULT TRUE,

  -- SMS Notifications
  sms_enabled BOOLEAN DEFAULT FALSE,
  sms_booking_confirmation BOOLEAN DEFAULT FALSE,
  sms_booking_reminder BOOLEAN DEFAULT FALSE,

  -- Frequency
  digest_frequency ENUM('realtime', 'daily', 'weekly', 'never') DEFAULT 'realtime',
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User notification preferences';

-- ============================================================================
-- Migration Complete
-- ============================================================================

SELECT 'Migration 003: Unified Schema Alignment - COMPLETED' AS status;
SELECT COUNT(*) AS roles_count FROM roles;
SELECT COUNT(*) AS permissions_count FROM permissions;
SELECT COUNT(*) AS role_permissions_count FROM role_permissions;
