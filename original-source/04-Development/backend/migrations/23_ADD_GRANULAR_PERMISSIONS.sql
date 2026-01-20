-- =====================================================
-- Granular Permission System
-- =====================================================
-- Purpose: Implement enterprise-grade RBAC with granular permissions
-- Date: 2025-11-03
-- Author: Enterprise Backend Team
-- Impact: Enables fine-grained access control beyond admin/user roles
-- =====================================================

USE pxoziy_db1;

-- =====================================================
-- 1. Permissions Table
-- =====================================================
-- Stores all available permissions in the system
CREATE TABLE IF NOT EXISTS Permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE COMMENT 'Permission identifier (e.g., poi.create, poi.update)',
  description TEXT COMMENT 'Human-readable description of what this permission allows',
  resource VARCHAR(50) NOT NULL COMMENT 'Resource type (e.g., poi, user, booking)',
  action VARCHAR(50) NOT NULL COMMENT 'Action type (e.g., create, read, update, delete)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_resource (resource),
  INDEX idx_action (action),
  INDEX idx_resource_action (resource, action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Granular permissions for RBAC system';

-- =====================================================
-- 2. Roles Table (Update existing or create)
-- =====================================================
-- Note: We're using the existing role field in Users table,
-- but adding a Roles reference table for extensibility
CREATE TABLE IF NOT EXISTS Roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE COMMENT 'Role name (admin, moderator, user)',
  description TEXT COMMENT 'Role description',
  level INT NOT NULL DEFAULT 0 COMMENT 'Role hierarchy level (higher = more permissions)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_name (name),
  INDEX idx_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User roles for RBAC system';

-- =====================================================
-- 3. Role_Permissions Junction Table
-- =====================================================
-- Maps which permissions each role has
CREATE TABLE IF NOT EXISTS Role_Permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  granted BOOLEAN DEFAULT TRUE COMMENT 'TRUE = grant, FALSE = explicit deny',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT COMMENT 'Admin user who granted this permission',

  FOREIGN KEY (role_id) REFERENCES Roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES Permissions(id) ON DELETE CASCADE,

  UNIQUE KEY unique_role_permission (role_id, permission_id),
  INDEX idx_role_id (role_id),
  INDEX idx_permission_id (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Maps permissions to roles';

-- =====================================================
-- 4. User_Permissions Table (Optional: User-specific overrides)
-- =====================================================
-- Allows granting/denying specific permissions to individual users
CREATE TABLE IF NOT EXISTS User_Permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  permission_id INT NOT NULL,
  granted BOOLEAN DEFAULT TRUE COMMENT 'TRUE = grant, FALSE = deny',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by INT COMMENT 'Admin user who granted this permission',
  expires_at TIMESTAMP NULL COMMENT 'Optional expiration for temporary permissions',

  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES Permissions(id) ON DELETE CASCADE,

  UNIQUE KEY unique_user_permission (user_id, permission_id),
  INDEX idx_user_id (user_id),
  INDEX idx_permission_id (permission_id),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User-specific permission overrides';

-- =====================================================
-- 5. Seed Default Roles
-- =====================================================
INSERT INTO Roles (name, description, level) VALUES
  ('admin', 'Full system access with all permissions', 100),
  ('moderator', 'Content moderation and user management', 50),
  ('partner', 'Business partner with POI management access', 30),
  ('user', 'Standard user with basic access', 10)
ON DUPLICATE KEY UPDATE description=VALUES(description), level=VALUES(level);

-- =====================================================
-- 6. Seed Default Permissions
-- =====================================================
-- POI Permissions
INSERT INTO Permissions (name, description, resource, action) VALUES
  ('poi.create', 'Create new POIs', 'poi', 'create'),
  ('poi.read', 'View POI details', 'poi', 'read'),
  ('poi.update', 'Update existing POIs', 'poi', 'update'),
  ('poi.delete', 'Delete POIs', 'poi', 'delete'),
  ('poi.verify', 'Verify POI authenticity', 'poi', 'verify'),
  ('poi.feature', 'Mark POIs as featured', 'poi', 'feature')
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- User Permissions
INSERT INTO Permissions (name, description, resource, action) VALUES
  ('user.create', 'Create new users', 'user', 'create'),
  ('user.read', 'View user profiles', 'user', 'read'),
  ('user.update', 'Update user information', 'user', 'update'),
  ('user.delete', 'Delete user accounts', 'user', 'delete'),
  ('user.manage_roles', 'Assign roles to users', 'user', 'manage_roles'),
  ('user.manage_permissions', 'Grant/revoke permissions', 'user', 'manage_permissions')
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- Booking Permissions
INSERT INTO Permissions (name, description, resource, action) VALUES
  ('booking.create', 'Create bookings', 'booking', 'create'),
  ('booking.read', 'View bookings', 'booking', 'read'),
  ('booking.update', 'Update bookings', 'booking', 'update'),
  ('booking.cancel', 'Cancel bookings', 'booking', 'cancel'),
  ('booking.manage_all', 'Manage all user bookings', 'booking', 'manage_all')
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- Content Moderation Permissions
INSERT INTO Permissions (name, description, resource, action) VALUES
  ('review.moderate', 'Moderate user reviews', 'review', 'moderate'),
  ('review.delete', 'Delete inappropriate reviews', 'review', 'delete'),
  ('report.view', 'View user reports', 'report', 'view'),
  ('report.resolve', 'Resolve user reports', 'report', 'resolve')
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- =====================================================
-- 7. Assign Permissions to Roles
-- =====================================================
-- Admin: All permissions
INSERT INTO Role_Permissions (role_id, permission_id, granted)
SELECT
  (SELECT id FROM Roles WHERE name = 'admin'),
  id,
  TRUE
FROM Permissions
ON DUPLICATE KEY UPDATE granted=VALUES(granted);

-- Moderator: Content and user management
INSERT INTO Role_Permissions (role_id, permission_id, granted)
SELECT
  (SELECT id FROM Roles WHERE name = 'moderator'),
  id,
  TRUE
FROM Permissions
WHERE name IN (
  'poi.read', 'poi.update', 'poi.verify',
  'user.read', 'user.update',
  'booking.read', 'booking.update', 'booking.manage_all',
  'review.moderate', 'review.delete',
  'report.view', 'report.resolve'
)
ON DUPLICATE KEY UPDATE granted=VALUES(granted);

-- Partner: POI management
INSERT INTO Role_Permissions (role_id, permission_id, granted)
SELECT
  (SELECT id FROM Roles WHERE name = 'partner'),
  id,
  TRUE
FROM Permissions
WHERE name IN (
  'poi.create', 'poi.read', 'poi.update',
  'booking.read', 'booking.update'
)
ON DUPLICATE KEY UPDATE granted=VALUES(granted);

-- User: Basic permissions
INSERT INTO Role_Permissions (role_id, permission_id, granted)
SELECT
  (SELECT id FROM Roles WHERE name = 'user'),
  id,
  TRUE
FROM Permissions
WHERE name IN (
  'poi.read',
  'booking.create', 'booking.read', 'booking.update', 'booking.cancel'
)
ON DUPLICATE KEY UPDATE granted=VALUES(granted);

-- =====================================================
-- 8. Add role_id to Users table (if not exists)
-- =====================================================
-- Add foreign key reference to Roles table
ALTER TABLE Users
ADD COLUMN IF NOT EXISTS role_id INT DEFAULT NULL COMMENT 'Foreign key to Roles table',
ADD INDEX IF NOT EXISTS idx_role_id (role_id);

-- =====================================================
-- IMPORTANT: Role Migration
-- =====================================================
-- If the Users table has an existing 'role' VARCHAR column, run:
--   UPDATE Users u JOIN Roles r ON LOWER(u.role) = LOWER(r.name)
--   SET u.role_id = r.id WHERE u.role_id IS NULL;
--
-- Otherwise, this will set all users to 'user' role by default:

-- Set default role for users without role_id (safe default)
UPDATE Users
SET role_id = (SELECT id FROM Roles WHERE name = 'user')
WHERE role_id IS NULL;

-- =====================================================
-- VERIFICATION: Check Permissions Setup
-- =====================================================
SELECT
  'Permissions system initialized' AS status,
  (SELECT COUNT(*) FROM Permissions) as total_permissions,
  (SELECT COUNT(*) FROM Roles) as total_roles,
  (SELECT COUNT(*) FROM Role_Permissions) as total_role_permissions;

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================
-- Check if user has permission:
-- SELECT EXISTS(
--   SELECT 1 FROM Users u
--   JOIN Roles r ON u.role_id = r.id
--   JOIN Role_Permissions rp ON r.id = rp.role_id
--   JOIN Permissions p ON rp.permission_id = p.id
--   WHERE u.id = ? AND p.name = ? AND rp.granted = TRUE
-- ) as has_permission;

-- Get all permissions for a user:
-- SELECT DISTINCT p.name, p.description, p.resource, p.action
-- FROM Users u
-- JOIN Roles r ON u.role_id = r.id
-- JOIN Role_Permissions rp ON r.id = rp.role_id
-- JOIN Permissions p ON rp.permission_id = p.id
-- WHERE u.id = ? AND rp.granted = TRUE;

-- =====================================================
