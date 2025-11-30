-- Create AdminUsers table for HolidaiButler Admin Module
-- Converted from MongoDB AdminUser schema to MySQL

CREATE TABLE IF NOT EXISTS AdminUsers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,

  -- Profile information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  avatar VARCHAR(255) DEFAULT NULL,
  phone_number VARCHAR(50) DEFAULT NULL,
  language ENUM('en', 'es', 'de', 'fr') DEFAULT 'en',

  -- Role and status
  role ENUM('platform_admin', 'poi_owner', 'editor', 'reviewer') NOT NULL DEFAULT 'editor',
  status ENUM('active', 'suspended', 'pending') DEFAULT 'pending',

  -- Permissions (stored as JSON for flexibility)
  permissions_pois JSON DEFAULT NULL COMMENT 'POI permissions: {create, read, update, delete, approve}',
  permissions_platform JSON DEFAULT NULL COMMENT 'Platform permissions: {branding, content, settings}',
  permissions_users JSON DEFAULT NULL COMMENT 'User permissions: {view, manage}',
  permissions_media JSON DEFAULT NULL COMMENT 'Media permissions: {upload, delete}',

  -- Security fields
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255) DEFAULT NULL,
  verification_expires DATETIME DEFAULT NULL,
  reset_password_token VARCHAR(255) DEFAULT NULL,
  reset_password_expires DATETIME DEFAULT NULL,
  login_attempts INT DEFAULT 0,
  lock_until DATETIME DEFAULT NULL,
  last_login DATETIME DEFAULT NULL,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(255) DEFAULT NULL,

  -- Preferences (stored as JSON)
  preferences JSON DEFAULT NULL COMMENT '{emailNotifications, dashboardLayout}',

  -- Metadata
  created_by INT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),

  -- Foreign key
  FOREIGN KEY (created_by) REFERENCES AdminUsers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create separate table for AdminUser OwnedPOIs (many-to-many relationship)
CREATE TABLE IF NOT EXISTS AdminUser_OwnedPOIs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_user_id INT NOT NULL,
  poi_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY unique_admin_poi (admin_user_id, poi_id),
  INDEX idx_admin_user (admin_user_id),
  INDEX idx_poi (poi_id),

  FOREIGN KEY (admin_user_id) REFERENCES AdminUsers(id) ON DELETE CASCADE,
  FOREIGN KEY (poi_id) REFERENCES POI(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create separate table for AdminUser ActivityLog
CREATE TABLE IF NOT EXISTS AdminUser_ActivityLog (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_user_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) DEFAULT NULL,
  resource_id INT DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_admin_user (admin_user_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_action (action),

  FOREIGN KEY (admin_user_id) REFERENCES AdminUsers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
