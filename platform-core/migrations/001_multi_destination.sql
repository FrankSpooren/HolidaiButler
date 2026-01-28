-- Migration 001: Multi-Destination Support
-- Date: 2026-01-28
-- Author: Claude Code
-- Description: Adds multi-destination architecture support
-- Status: EXECUTED

-- ============================================================
-- 1. CREATE DESTINATIONS MASTER TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS destinations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Short code like calpe, texel, alicante',
    name VARCHAR(100) NOT NULL COMMENT 'Internal name',
    display_name VARCHAR(100) NOT NULL COMMENT 'Public display name',
    country VARCHAR(50) NOT NULL,
    region VARCHAR(100) DEFAULT NULL COMMENT 'Region/province',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Madrid',
    currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
    default_language VARCHAR(10) NOT NULL DEFAULT 'en',
    supported_languages JSON COMMENT 'Array of supported language codes',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    feature_flags JSON COMMENT 'Feature toggles per destination',
    config JSON COMMENT 'Destination-specific configuration',
    domain VARCHAR(100) DEFAULT NULL COMMENT 'Custom domain if applicable',
    subdomain VARCHAR(50) DEFAULT NULL COMMENT 'Subdomain if applicable',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Master table for multi-destination support';

-- ============================================================
-- 2. INSERT INITIAL DESTINATIONS
-- ============================================================
-- Calpe (Active), Texel (Planned), Alicante (Planned)
-- Executed via direct SQL commands

-- ============================================================
-- 3. ADD DESTINATION_ID TO TABLES
-- ============================================================
-- Tables modified:
-- - POI: destination_id INT DEFAULT 1, FK to destinations(id)
-- - QA: destination_id INT DEFAULT 1, FK to destinations(id)
-- - agenda: destination_id INT DEFAULT 1, FK to destinations(id)
-- - Users: destination_id INT DEFAULT 1, FK to destinations(id)
-- - user_journeys: destination_id INT DEFAULT 1, FK to destinations(id)
-- - holibot_sessions: destination_id INT DEFAULT 1, FK to destinations(id)

-- ============================================================
-- 4. RESULTS (28 Jan 2026)
-- ============================================================
-- destinations: 3 records (calpe=1, texel=2, alicante=3)
-- POI: 1593 records -> destination_id=1 (Calpe)
-- QA: 0 records
-- agenda: 314 records -> destination_id=1 (Calpe)
-- Users: 10 records -> destination_id=1 (Calpe)
-- user_journeys: 0 records
-- holibot_sessions: 169 records -> destination_id=1 (Calpe)

-- ============================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================
-- ALTER TABLE holibot_sessions DROP FOREIGN KEY fk_holibot_sessions_destination;
-- ALTER TABLE holibot_sessions DROP INDEX idx_holibot_sessions_destination_id;
-- ALTER TABLE holibot_sessions DROP COLUMN destination_id;
-- ALTER TABLE user_journeys DROP FOREIGN KEY fk_journeys_destination;
-- ALTER TABLE user_journeys DROP INDEX idx_journeys_destination_id;
-- ALTER TABLE user_journeys DROP COLUMN destination_id;
-- ALTER TABLE Users DROP FOREIGN KEY fk_users_destination;
-- ALTER TABLE Users DROP INDEX idx_users_destination_id;
-- ALTER TABLE Users DROP COLUMN destination_id;
-- ALTER TABLE agenda DROP FOREIGN KEY fk_agenda_destination;
-- ALTER TABLE agenda DROP INDEX idx_agenda_destination_id;
-- ALTER TABLE agenda DROP COLUMN destination_id;
-- ALTER TABLE QA DROP FOREIGN KEY fk_qa_destination;
-- ALTER TABLE QA DROP INDEX idx_qa_destination_id;
-- ALTER TABLE QA DROP COLUMN destination_id;
-- ALTER TABLE POI DROP FOREIGN KEY fk_poi_destination;
-- ALTER TABLE POI DROP INDEX idx_destination_id;
-- ALTER TABLE POI DROP COLUMN destination_id;
-- DROP TABLE destinations;
