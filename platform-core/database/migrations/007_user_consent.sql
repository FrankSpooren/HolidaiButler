-- ============================================
-- Migration: User Consent Management
-- Database: HolidaiButler (Hetzner MySQL)
-- Date: 2025-12-17
-- ============================================
-- GDPR-compliant consent tracking voor gebruikers.
-- Elke consent wijziging wordt gelogd in consent_history.
-- ============================================

-- Hoofdtabel: user_consent
SET @table_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user_consent'
);
SET @sql = IF(@table_exists = 0,
    'CREATE TABLE user_consent (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,

        -- Consent types (GDPR categorieën)
        consent_essential BOOLEAN DEFAULT TRUE COMMENT ''Essentieel - altijd vereist voor account'',
        consent_analytics BOOLEAN DEFAULT FALSE COMMENT ''Analytics - voorkeuren en gedrag tracking'',
        consent_personalization BOOLEAN DEFAULT FALSE COMMENT ''Personalisatie - AI aanbevelingen'',
        consent_marketing BOOLEAN DEFAULT FALSE COMMENT ''Marketing - emails en promoties'',

        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        -- Foreign key
        CONSTRAINT fk_user_consent_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,

        -- Index voor snelle lookups
        INDEX idx_user_consent_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'SELECT ''Table user_consent already exists'' AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Historietabel: consent_history (audit trail)
SET @table_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'consent_history'
);
SET @sql = IF(@table_exists = 0,
    'CREATE TABLE consent_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,

        -- Welke consent is gewijzigd
        consent_type ENUM(''essential'', ''analytics'', ''personalization'', ''marketing'') NOT NULL,
        old_value BOOLEAN,
        new_value BOOLEAN NOT NULL,

        -- Context
        ip_address VARCHAR(45) NULL COMMENT ''IPv4 of IPv6 adres'',
        user_agent TEXT NULL,
        source ENUM(''registration'', ''settings'', ''cookie_banner'', ''api'', ''admin'') DEFAULT ''settings'',

        -- Timestamp
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- Foreign key
        CONSTRAINT fk_consent_history_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,

        -- Indexes
        INDEX idx_consent_history_user (user_id),
        INDEX idx_consent_history_type (consent_type),
        INDEX idx_consent_history_date (changed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'SELECT ''Table consent_history already exists'' AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Trigger: Log consent changes automatisch
DROP TRIGGER IF EXISTS trg_consent_analytics_change;
DROP TRIGGER IF EXISTS trg_consent_personalization_change;
DROP TRIGGER IF EXISTS trg_consent_marketing_change;

DELIMITER //

CREATE TRIGGER trg_consent_analytics_change
AFTER UPDATE ON user_consent
FOR EACH ROW
BEGIN
    IF OLD.consent_analytics != NEW.consent_analytics THEN
        INSERT INTO consent_history (user_id, consent_type, old_value, new_value, source)
        VALUES (NEW.user_id, 'analytics', OLD.consent_analytics, NEW.consent_analytics, 'settings');
    END IF;
END//

CREATE TRIGGER trg_consent_personalization_change
AFTER UPDATE ON user_consent
FOR EACH ROW
BEGIN
    IF OLD.consent_personalization != NEW.consent_personalization THEN
        INSERT INTO consent_history (user_id, consent_type, old_value, new_value, source)
        VALUES (NEW.user_id, 'personalization', OLD.consent_personalization, NEW.consent_personalization, 'settings');
    END IF;
END//

CREATE TRIGGER trg_consent_marketing_change
AFTER UPDATE ON user_consent
FOR EACH ROW
BEGIN
    IF OLD.consent_marketing != NEW.consent_marketing THEN
        INSERT INTO consent_history (user_id, consent_type, old_value, new_value, source)
        VALUES (NEW.user_id, 'marketing', OLD.consent_marketing, NEW.consent_marketing, 'settings');
    END IF;
END//

DELIMITER ;

-- Verificatie: toon aangemaakte tabellen
SELECT
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('user_consent', 'consent_history')
ORDER BY TABLE_NAME;

SELECT 'User Consent Migration completed successfully!' AS result;
