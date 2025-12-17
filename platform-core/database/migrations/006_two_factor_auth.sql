-- Migration: 006_two_factor_auth.sql
-- Description: Add Two-Factor Authentication (TOTP) support to Users table
-- Date: 2025-12-17

-- Add 2FA columns to Users table
ALTER TABLE Users
ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255) NULL COMMENT 'Encrypted TOTP secret for authenticator apps',
ADD COLUMN IF NOT EXISTS totp_enabled TINYINT(1) DEFAULT 0 COMMENT 'Whether 2FA is enabled for this user',
ADD COLUMN IF NOT EXISTS totp_verified_at DATETIME NULL COMMENT 'When 2FA was first verified and enabled',
ADD COLUMN IF NOT EXISTS backup_codes TEXT NULL COMMENT 'JSON array of hashed backup codes';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_totp_enabled ON Users(totp_enabled);
