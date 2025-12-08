-- =====================================================
-- Password Reset Schema Update
-- =====================================================
-- Purpose: Add password reset capability to Users table
-- Compliance: GDPR Article 5 (Data security), EU AI Act
-- Date: 2025-11-03
-- Author: Enterprise Backend Team
-- =====================================================

USE pxoziy_db1;

-- Add password reset columns to Users table
ALTER TABLE Users
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) DEFAULT NULL COMMENT 'Password reset token (crypto-secure)',
ADD COLUMN IF NOT EXISTS reset_token_expires DATETIME DEFAULT NULL COMMENT 'Reset token expiry (1 hour)',
ADD COLUMN IF NOT EXISTS reset_sent_count INT DEFAULT 0 COMMENT 'Rate limiting counter for reset emails',
ADD COLUMN IF NOT EXISTS reset_sent_at DATETIME DEFAULT NULL COMMENT 'Last password reset email sent',
ADD COLUMN IF NOT EXISTS password_reset_at DATETIME DEFAULT NULL COMMENT 'Last successful password reset timestamp';

-- Add index for reset token lookup (performance + security)
ALTER TABLE Users
ADD INDEX IF NOT EXISTS idx_reset_token (reset_token);

-- Update Email_Verification_Logs to support password reset actions
-- (Already supports this via action column: 'password_reset_sent', 'password_reset_completed')
-- No schema changes needed

-- Data retention policy: Clean up expired reset tokens after 24 hours
-- (More aggressive than verification tokens for security)
CREATE EVENT IF NOT EXISTS cleanup_expired_reset_tokens
ON SCHEDULE EVERY 1 HOUR
DO
  UPDATE Users
  SET reset_token = NULL,
      reset_token_expires = NULL
  WHERE reset_token_expires < DATE_SUB(NOW(), INTERVAL 24 HOUR);

-- Verification complete
SELECT
  'Password reset schema updated successfully' AS status,
  COUNT(*) AS total_users,
  SUM(CASE WHEN reset_token IS NOT NULL THEN 1 ELSE 0 END) AS users_with_pending_reset
FROM Users;
