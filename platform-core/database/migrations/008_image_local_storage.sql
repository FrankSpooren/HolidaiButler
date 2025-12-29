-- =============================================================================
-- Migration 008: Image Local Storage
-- =============================================================================
-- Adds local storage support for POI images to eliminate dependency on
-- ephemeral external URLs (especially Google's gps-cs-s format).
--
-- Run: mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < 008_image_local_storage.sql
-- =============================================================================

-- Add local_path column to store path to locally downloaded image
ALTER TABLE imageurls
ADD COLUMN local_path VARCHAR(255) NULL AFTER image_url;

-- Add file metadata columns
ALTER TABLE imageurls
ADD COLUMN file_size INT NULL COMMENT 'File size in bytes';

ALTER TABLE imageurls
ADD COLUMN file_hash VARCHAR(64) NULL COMMENT 'SHA256 hash for deduplication';

ALTER TABLE imageurls
ADD COLUMN downloaded_at DATETIME NULL COMMENT 'When image was downloaded locally';

-- Add index for efficient local_path lookups
ALTER TABLE imageurls
ADD INDEX idx_local_path (local_path);

-- Add index for finding images that need downloading
ALTER TABLE imageurls
ADD INDEX idx_needs_download (local_path, image_url);

-- Verify changes
SELECT
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'imageurls'
  AND TABLE_SCHEMA = DATABASE()
ORDER BY ORDINAL_POSITION;
