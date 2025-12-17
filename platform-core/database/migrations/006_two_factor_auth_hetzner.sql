-- ============================================
-- Migration: Two-Factor Authentication (2FA)
-- Database: HolidaiButler (Hetzner MySQL)
-- Date: 2025-12-17
-- ============================================
-- Dit script kan veilig meerdere keren uitgevoerd worden.
-- Het voegt 2FA ondersteuning toe aan de Users tabel.
-- ============================================

-- Voeg totp_secret kolom toe (alleen als deze niet bestaat)
SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Users'
    AND COLUMN_NAME = 'totp_secret'
);
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE Users ADD COLUMN totp_secret VARCHAR(255) NULL COMMENT ''TOTP secret for authenticator apps''',
    'SELECT ''Column totp_secret already exists'' AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Voeg totp_enabled kolom toe
SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Users'
    AND COLUMN_NAME = 'totp_enabled'
);
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE Users ADD COLUMN totp_enabled TINYINT(1) DEFAULT 0 COMMENT ''Whether 2FA is enabled''',
    'SELECT ''Column totp_enabled already exists'' AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Voeg totp_verified_at kolom toe
SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Users'
    AND COLUMN_NAME = 'totp_verified_at'
);
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE Users ADD COLUMN totp_verified_at DATETIME NULL COMMENT ''When 2FA was enabled''',
    'SELECT ''Column totp_verified_at already exists'' AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Voeg backup_codes kolom toe
SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Users'
    AND COLUMN_NAME = 'backup_codes'
);
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE Users ADD COLUMN backup_codes TEXT NULL COMMENT ''JSON array of hashed backup codes''',
    'SELECT ''Column backup_codes already exists'' AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Voeg index toe voor snellere lookups (alleen als deze niet bestaat)
SET @index_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Users'
    AND INDEX_NAME = 'idx_users_totp_enabled'
);
SET @sql = IF(@index_exists = 0,
    'CREATE INDEX idx_users_totp_enabled ON Users(totp_enabled)',
    'SELECT ''Index idx_users_totp_enabled already exists'' AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificatie: toon de nieuwe kolommen
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'Users'
AND COLUMN_NAME IN ('totp_secret', 'totp_enabled', 'totp_verified_at', 'backup_codes')
ORDER BY ORDINAL_POSITION;

SELECT '2FA Migration completed successfully!' AS result;
