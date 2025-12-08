-- =====================================================
-- Email Verification Schema Update
-- =====================================================
-- Purpose: Add email verification capability to Users table
-- Compliance: GDPR Article 5 (Data accuracy), EU AI Act
-- Date: 2025-11-03
-- Author: Enterprise Backend Team
-- =====================================================

USE pxoziy_db1;

-- Add email verification columns to Users table
ALTER TABLE Users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE COMMENT 'Email verification status',
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255) DEFAULT NULL COMMENT 'Hashed email verification token',
ADD COLUMN IF NOT EXISTS verification_token_expires DATETIME DEFAULT NULL COMMENT 'Token expiry (24h)',
ADD COLUMN IF NOT EXISTS verification_sent_count INT DEFAULT 0 COMMENT 'Rate limiting counter',
ADD COLUMN IF NOT EXISTS verification_sent_at DATETIME DEFAULT NULL COMMENT 'Last verification email sent',
ADD COLUMN IF NOT EXISTS verified_at DATETIME DEFAULT NULL COMMENT 'Timestamp when email was verified';

-- Add index for token lookup (performance)
ALTER TABLE Users
ADD INDEX IF NOT EXISTS idx_verification_token (verification_token);

-- Add index for verification status (filtering)
ALTER TABLE Users
ADD INDEX IF NOT EXISTS idx_email_verified (email_verified);

-- GDPR Compliance: Log email verification events
CREATE TABLE IF NOT EXISTS Email_Verification_Logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL COMMENT 'sent, verified, resent, expired',
  token_hash VARCHAR(255) COMMENT 'Hashed token for audit trail',
  ip_address VARCHAR(45) COMMENT 'User IP address',
  user_agent TEXT COMMENT 'User agent string',
  mailerlite_response TEXT COMMENT 'MAILERLITE API response for debugging',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='GDPR-compliant email verification audit log';

-- Data retention policy: Clean up expired tokens after 30 days
-- (Run via cron job)
CREATE EVENT IF NOT EXISTS cleanup_expired_verification_tokens
ON SCHEDULE EVERY 1 DAY
DO
  UPDATE Users
  SET verification_token = NULL,
      verification_token_expires = NULL
  WHERE verification_token_expires < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Verification complete
SELECT
  'Email verification schema updated successfully' AS status,
  COUNT(*) AS total_users,
  SUM(CASE WHEN email_verified = TRUE THEN 1 ELSE 0 END) AS verified_users,
  SUM(CASE WHEN email_verified = FALSE THEN 1 ELSE 0 END) AS unverified_users
FROM Users;
