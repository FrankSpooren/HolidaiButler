-- Migration: Add OAuth Support for Facebook and Apple ID
-- Description: Add fields to Users table to support social authentication
-- Date: 2025-11-04

-- Add OAuth fields to Users table
ALTER TABLE Users
ADD COLUMN oauth_provider ENUM('email', 'facebook', 'apple') DEFAULT 'email' COMMENT 'Authentication provider',
ADD COLUMN oauth_id VARCHAR(255) NULL COMMENT 'OAuth provider user ID (Facebook ID or Apple ID)',
ADD COLUMN oauth_profile JSON NULL COMMENT 'OAuth profile data from provider',
ADD COLUMN auth_method ENUM('email', 'oauth', 'both') DEFAULT 'email' COMMENT 'Primary authentication method';

-- Add indexes for OAuth fields
CREATE INDEX idx_users_oauth_provider_id ON Users(oauth_provider, oauth_id);

-- Make password_hash nullable for OAuth-only users
ALTER TABLE Users
MODIFY COLUMN password_hash VARCHAR(255) NULL COMMENT 'Bcrypt hashed password (NULL for OAuth-only users)';

-- Add unique constraint for oauth_provider + oauth_id combination
ALTER TABLE Users
ADD CONSTRAINT unique_oauth_provider_id UNIQUE (oauth_provider, oauth_id);

-- Migration completed
SELECT 'Migration 24_ADD_OAUTH_SUPPORT.sql completed successfully' as status;
