-- ============================================
-- Migration: User Consent Management
-- Database: HolidaiButler (Hetzner MySQL)
-- Date: 2025-12-17
-- ============================================
-- Handmatig importeren in phpMyAdmin
-- ============================================

-- 1. Hoofdtabel: user_consent
CREATE TABLE IF NOT EXISTS user_consent (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,

    -- Consent types (GDPR categorieën)
    consent_essential BOOLEAN DEFAULT TRUE COMMENT 'Essentieel - altijd vereist',
    consent_analytics BOOLEAN DEFAULT FALSE COMMENT 'Analytics - voorkeuren tracking',
    consent_personalization BOOLEAN DEFAULT FALSE COMMENT 'Personalisatie - AI aanbevelingen',
    consent_marketing BOOLEAN DEFAULT FALSE COMMENT 'Marketing - emails en promoties',

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Index
    INDEX idx_user_consent_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Historietabel: consent_history (audit trail)
CREATE TABLE IF NOT EXISTS consent_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,

    -- Welke consent is gewijzigd
    consent_type ENUM('essential', 'analytics', 'personalization', 'marketing') NOT NULL,
    old_value BOOLEAN,
    new_value BOOLEAN NOT NULL,

    -- Context
    ip_address VARCHAR(45) NULL COMMENT 'IPv4 of IPv6',
    user_agent TEXT NULL,
    source ENUM('registration', 'settings', 'cookie_banner', 'api', 'admin') DEFAULT 'settings',

    -- Timestamp
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_consent_history_user (user_id),
    INDEX idx_consent_history_type (consent_type),
    INDEX idx_consent_history_date (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Voeg foreign keys toe (apart voor compatibiliteit)
-- Alleen uitvoeren als keys nog niet bestaan
SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user_consent'
    AND CONSTRAINT_NAME = 'fk_user_consent_user'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE user_consent ADD CONSTRAINT fk_user_consent_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'consent_history'
    AND CONSTRAINT_NAME = 'fk_consent_history_user'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE consent_history ADD CONSTRAINT fk_consent_history_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Verificatie - toon tabel structuur
DESCRIBE user_consent;
DESCRIBE consent_history;

-- Klaar!
SELECT 'User Consent tabellen succesvol aangemaakt!' AS resultaat;
