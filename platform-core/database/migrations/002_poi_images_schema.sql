-- ============================================================================
-- Migration 002: POI Images Enhancement System
-- ============================================================================
-- Description: Database schema voor geautomatiseerd POI image management
--              met Flickr en Unsplash integratie
-- Author: HolidaiButler Development Team
-- Date: 2025-11-18
-- Dependencies: 001_poi_classification_schema.sql
-- ============================================================================

USE holidaibutler;

-- ============================================================================
-- Table: poi_images
-- ============================================================================
-- Stores high-quality images voor POI's from multiple sources (Flickr, Unsplash)
-- ============================================================================

CREATE TABLE IF NOT EXISTS poi_images (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  poi_id VARCHAR(36) NOT NULL,

  -- ===========================
  -- Image Source Information
  -- ===========================
  source_type ENUM('flickr', 'unsplash', 'google_places', 'manual', 'user_upload') NOT NULL,
  source_id VARCHAR(255) NOT NULL COMMENT 'External ID from source (Flickr photo ID, Unsplash ID, etc.)',
  source_url TEXT NOT NULL COMMENT 'Original URL at source',
  source_page_url TEXT COMMENT 'Web page URL for attribution',

  -- ===========================
  -- Image URLs (Multiple Sizes)
  -- ===========================
  url_original TEXT COMMENT 'Original highest resolution',
  url_large TEXT NOT NULL COMMENT 'Large: 1920x1080+',
  url_medium TEXT COMMENT 'Medium: 1280x720',
  url_thumbnail TEXT COMMENT 'Thumbnail: 400x300',

  -- ===========================
  -- Image Dimensions
  -- ===========================
  width INT NOT NULL,
  height INT NOT NULL,
  aspect_ratio DECIMAL(5, 3) COMMENT 'Calculated width/height',
  file_size INT COMMENT 'File size in bytes',
  mime_type VARCHAR(50) DEFAULT 'image/jpeg',
  format VARCHAR(10) COMMENT 'jpg, png, webp, etc.',

  -- ===========================
  -- Attribution & Licensing
  -- ===========================
  author_name VARCHAR(255),
  author_username VARCHAR(255),
  author_url TEXT,
  author_profile_url TEXT,
  license_type VARCHAR(100) COMMENT 'CC-BY, CC-BY-SA, CC0, Unsplash License, etc.',
  license_url TEXT,
  attribution_required BOOLEAN DEFAULT TRUE,
  commercial_use_allowed BOOLEAN DEFAULT TRUE,

  -- ===========================
  -- Geo-Validation
  -- ===========================
  photo_latitude DECIMAL(10, 8) COMMENT 'GPS coordinates from photo EXIF',
  photo_longitude DECIMAL(11, 8),
  distance_to_poi DECIMAL(10, 2) COMMENT 'Distance in meters from POI location',
  geo_accuracy VARCHAR(20) COMMENT 'high (<50m), medium (<200m), low (<500m), none',

  -- ===========================
  -- Quality Metrics
  -- ===========================
  quality_score DECIMAL(4, 2) DEFAULT 0.00 COMMENT 'Overall score 0.00-10.00',
  resolution_score INT DEFAULT 0 COMMENT 'Score 0-10 based on resolution',
  geo_accuracy_score INT DEFAULT 0 COMMENT 'Score 0-10 based on GPS accuracy',
  tag_relevance_score INT DEFAULT 0 COMMENT 'Score 0-10 based on tag matching',
  license_score INT DEFAULT 0 COMMENT 'Score 0-10 based on license quality',
  recency_score INT DEFAULT 0 COMMENT 'Score 0-10 based on photo date',

  -- ===========================
  -- Image Classification
  -- ===========================
  image_type ENUM(
    'exterior',
    'interior',
    'food',
    'view',
    'amenity',
    'event',
    'people',
    'logo',
    'menu',
    'room',
    'beach',
    'pool',
    'other'
  ) DEFAULT 'exterior',

  is_primary BOOLEAN DEFAULT FALSE COMMENT 'Primary hero image for POI',
  display_order INT DEFAULT 0 COMMENT 'Order in gallery (0 = first)',

  -- ===========================
  -- Status & Moderation
  -- ===========================
  status ENUM('pending', 'approved', 'rejected', 'flagged', 'archived') DEFAULT 'pending',
  auto_approved BOOLEAN DEFAULT FALSE COMMENT 'Auto-approved if quality_score >= 8.0',
  verified_by VARCHAR(36) COMMENT 'Admin user ID who verified',
  verified_at TIMESTAMP NULL,
  rejection_reason TEXT,

  -- ===========================
  -- Metadata
  -- ===========================
  tags JSON COMMENT 'Array of tags from source',
  extracted_keywords JSON COMMENT 'Keywords extracted from tags/description',
  caption TEXT COMMENT 'Caption/description from source',
  alt_text VARCHAR(255) COMMENT 'Accessibility alt text',
  title VARCHAR(255),

  -- ===========================
  -- EXIF & Technical Data
  -- ===========================
  exif_data JSON COMMENT 'Camera, settings, date taken, etc.',
  date_taken TIMESTAMP NULL COMMENT 'When photo was taken',
  camera_make VARCHAR(100),
  camera_model VARCHAR(100),

  -- ===========================
  -- Engagement Metrics
  -- ===========================
  views_count INT DEFAULT 0,
  clicks_count INT DEFAULT 0,
  source_views INT COMMENT 'Views on original platform (Flickr/Unsplash)',
  source_likes INT COMMENT 'Likes on original platform',
  source_downloads INT COMMENT 'Downloads on original platform',

  -- ===========================
  -- Image Hash (Deduplication)
  -- ===========================
  perceptual_hash VARCHAR(64) COMMENT 'pHash for duplicate detection',
  md5_hash VARCHAR(32) COMMENT 'MD5 checksum of image file',

  -- ===========================
  -- Timestamps
  -- ===========================
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_validated_at TIMESTAMP NULL,

  -- ===========================
  -- Constraints
  -- ===========================
  FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE,

  -- ===========================
  -- Indexes
  -- ===========================
  INDEX idx_poi_status (poi_id, status),
  INDEX idx_quality (quality_score DESC),
  INDEX idx_source (source_type, source_id),
  INDEX idx_primary (poi_id, is_primary),
  INDEX idx_display_order (poi_id, display_order),
  INDEX idx_geo (photo_latitude, photo_longitude),
  INDEX idx_hash (perceptual_hash),
  INDEX idx_verified (verified_at, verified_by),

  -- Prevent duplicate images from same source for same POI
  UNIQUE KEY unique_source_poi (source_type, source_id, poi_id)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='High-quality POI images from Flickr, Unsplash and other sources';


-- ============================================================================
-- Table: poi_image_queue
-- ============================================================================
-- Queue for batch processing of image discovery and validation
-- ============================================================================

CREATE TABLE IF NOT EXISTS poi_image_queue (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  poi_id VARCHAR(36) NOT NULL,

  -- ===========================
  -- Queue Configuration
  -- ===========================
  status ENUM('pending', 'processing', 'completed', 'failed', 'skipped') DEFAULT 'pending',
  priority INT DEFAULT 5 COMMENT 'Priority 1-10 (10 = highest), based on POI tier',

  -- ===========================
  -- Processing Configuration
  -- ===========================
  sources_to_check JSON NOT NULL DEFAULT '["flickr", "unsplash"]' COMMENT 'Array of sources to query',
  max_images_per_source INT DEFAULT 10 COMMENT 'Max images to fetch per source',
  min_quality_score DECIMAL(4, 2) DEFAULT 6.00 COMMENT 'Minimum quality threshold',

  -- ===========================
  -- Processing Results
  -- ===========================
  images_found INT DEFAULT 0 COMMENT 'Total images discovered',
  images_approved INT DEFAULT 0 COMMENT 'Auto-approved images',
  images_pending INT DEFAULT 0 COMMENT 'Images pending manual review',
  images_rejected INT DEFAULT 0 COMMENT 'Images rejected by quality filter',

  sources_completed JSON COMMENT 'Array of completed sources',
  processing_details JSON COMMENT 'Detailed results per source',

  -- ===========================
  -- Error Handling
  -- ===========================
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  last_error TEXT,
  error_code VARCHAR(50),

  -- ===========================
  -- API Budget Tracking
  -- ===========================
  api_calls_flickr INT DEFAULT 0,
  api_calls_unsplash INT DEFAULT 0,
  api_cost_estimate DECIMAL(10, 4) DEFAULT 0.0000 COMMENT 'Estimated cost in EUR',

  -- ===========================
  -- Timestamps
  -- ===========================
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  next_retry_at TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- ===========================
  -- Constraints
  -- ===========================
  FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE,

  -- ===========================
  -- Indexes
  -- ===========================
  INDEX idx_status_priority (status, priority DESC),
  INDEX idx_poi (poi_id),
  INDEX idx_next_retry (next_retry_at),
  INDEX idx_created (created_at),

  -- Prevent duplicate queue entries for same POI
  UNIQUE KEY unique_poi_pending (poi_id, status)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Queue for automated POI image discovery processing';


-- ============================================================================
-- Table: poi_image_sources
-- ============================================================================
-- Configuration and statistics for each image source
-- ============================================================================

CREATE TABLE IF NOT EXISTS poi_image_sources (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),

  source_name VARCHAR(50) NOT NULL UNIQUE COMMENT 'flickr, unsplash, google_places, etc.',
  display_name VARCHAR(100) NOT NULL,

  -- ===========================
  -- Configuration
  -- ===========================
  enabled BOOLEAN DEFAULT TRUE,
  api_endpoint VARCHAR(255),
  requires_api_key BOOLEAN DEFAULT TRUE,

  -- ===========================
  -- Rate Limiting
  -- ===========================
  rate_limit_requests_per_hour INT COMMENT 'API rate limit',
  rate_limit_requests_per_day INT,
  current_hour_requests INT DEFAULT 0,
  current_day_requests INT DEFAULT 0,
  rate_limit_reset_at TIMESTAMP NULL,

  -- ===========================
  -- Quality & Trust
  -- ===========================
  default_license_score INT DEFAULT 5 COMMENT 'Default license quality score 0-10',
  trust_score DECIMAL(3, 2) DEFAULT 5.00 COMMENT 'Source reliability score 0.00-10.00',
  average_image_quality DECIMAL(4, 2) COMMENT 'Average quality_score from this source',

  -- ===========================
  -- Usage Statistics
  -- ===========================
  total_requests INT DEFAULT 0,
  total_images_found INT DEFAULT 0,
  total_images_approved INT DEFAULT 0,
  total_images_rejected INT DEFAULT 0,

  success_rate DECIMAL(5, 2) COMMENT 'Percentage of approved images',

  -- ===========================
  -- Cost Tracking
  -- ===========================
  cost_per_request DECIMAL(10, 6) DEFAULT 0.000000 COMMENT 'Cost in EUR',
  monthly_budget_eur DECIMAL(10, 2),
  current_month_cost DECIMAL(10, 2) DEFAULT 0.00,
  budget_reset_at TIMESTAMP NULL,

  -- ===========================
  -- Timestamps
  -- ===========================
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP NULL,

  -- ===========================
  -- Indexes
  -- ===========================
  INDEX idx_enabled (enabled),
  INDEX idx_source_name (source_name)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Configuration and statistics for image sources';


-- ============================================================================
-- Insert default image sources
-- ============================================================================

INSERT INTO poi_image_sources (source_name, display_name, enabled, api_endpoint, requires_api_key, rate_limit_requests_per_hour, rate_limit_requests_per_day, default_license_score, trust_score, cost_per_request, monthly_budget_eur)
VALUES
  ('flickr', 'Flickr', TRUE, 'https://api.flickr.com/services/rest/', TRUE, 3600, 86400, 8, 9.00, 0.000000, 0.00),
  ('unsplash', 'Unsplash', TRUE, 'https://api.unsplash.com/', TRUE, 50, 1200, 10, 9.50, 0.000000, 0.00),
  ('google_places', 'Google Places', TRUE, 'https://maps.googleapis.com/maps/api/place/', TRUE, 100, 2400, 6, 7.50, 0.003000, 50.00),
  ('manual', 'Manual Upload', TRUE, NULL, FALSE, NULL, NULL, 5, 8.00, 0.000000, 0.00),
  ('user_upload', 'User Upload', TRUE, NULL, FALSE, NULL, NULL, 4, 6.00, 0.000000, 0.00)
ON DUPLICATE KEY UPDATE
  updated_at = CURRENT_TIMESTAMP;


-- ============================================================================
-- Update api_usage_log table to track image API usage
-- ============================================================================

-- Check if column exists before adding
SET @dbname = DATABASE();
SET @tablename = 'api_usage_log';
SET @columnname = 'api_category';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN api_category ENUM(''scraping'', ''images'', ''ai'', ''maps'', ''other'') DEFAULT ''other'' AFTER service')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;


-- ============================================================================
-- Table: poi_image_moderation_log
-- ============================================================================
-- Audit log for image approval/rejection decisions
-- ============================================================================

CREATE TABLE IF NOT EXISTS poi_image_moderation_log (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  poi_image_id VARCHAR(36) NOT NULL,
  poi_id VARCHAR(36) NOT NULL,

  -- ===========================
  -- Moderation Action
  -- ===========================
  action ENUM('approve', 'reject', 'flag', 'unflag', 'set_primary', 'archive') NOT NULL,
  previous_status ENUM('pending', 'approved', 'rejected', 'flagged', 'archived'),
  new_status ENUM('pending', 'approved', 'rejected', 'flagged', 'archived'),

  -- ===========================
  -- Moderator Info
  -- ===========================
  moderator_id VARCHAR(36) COMMENT 'Admin user ID',
  moderator_name VARCHAR(255),
  is_automated BOOLEAN DEFAULT FALSE COMMENT 'TRUE if auto-approved by system',

  -- ===========================
  -- Reason & Notes
  -- ===========================
  reason TEXT,
  notes TEXT,

  -- ===========================
  -- Quality Scores at Time of Decision
  -- ===========================
  quality_score_at_decision DECIMAL(4, 2),

  -- ===========================
  -- Timestamp
  -- ===========================
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- ===========================
  -- Constraints
  -- ===========================
  FOREIGN KEY (poi_image_id) REFERENCES poi_images(id) ON DELETE CASCADE,
  FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE,

  -- ===========================
  -- Indexes
  -- ===========================
  INDEX idx_image (poi_image_id),
  INDEX idx_poi (poi_id),
  INDEX idx_moderator (moderator_id),
  INDEX idx_action (action, created_at),
  INDEX idx_automated (is_automated)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Audit log for image moderation decisions';


-- ============================================================================
-- View: poi_images_summary
-- ============================================================================
-- Quick overview of image status per POI
-- ============================================================================

CREATE OR REPLACE VIEW poi_images_summary AS
SELECT
  p.id AS poi_id,
  p.name AS poi_name,
  p.tier,
  COUNT(pi.id) AS total_images,
  SUM(CASE WHEN pi.status = 'approved' THEN 1 ELSE 0 END) AS approved_images,
  SUM(CASE WHEN pi.status = 'pending' THEN 1 ELSE 0 END) AS pending_images,
  SUM(CASE WHEN pi.status = 'rejected' THEN 1 ELSE 0 END) AS rejected_images,
  SUM(CASE WHEN pi.is_primary = TRUE THEN 1 ELSE 0 END) AS primary_images,
  MAX(pi.quality_score) AS best_quality_score,
  AVG(pi.quality_score) AS avg_quality_score,
  SUM(CASE WHEN pi.source_type = 'flickr' THEN 1 ELSE 0 END) AS flickr_images,
  SUM(CASE WHEN pi.source_type = 'unsplash' THEN 1 ELSE 0 END) AS unsplash_images,
  SUM(CASE WHEN pi.source_type = 'google_places' THEN 1 ELSE 0 END) AS google_images,
  MAX(pi.created_at) AS last_image_added
FROM pois p
LEFT JOIN poi_images pi ON p.id = pi.poi_id
GROUP BY p.id, p.name, p.tier;


-- ============================================================================
-- View: poi_image_queue_status
-- ============================================================================
-- Overview of processing queue status
-- ============================================================================

CREATE OR REPLACE VIEW poi_image_queue_status AS
SELECT
  status,
  COUNT(*) AS queue_count,
  AVG(priority) AS avg_priority,
  SUM(images_found) AS total_images_found,
  SUM(images_approved) AS total_images_approved,
  SUM(api_calls_flickr) AS total_flickr_calls,
  SUM(api_calls_unsplash) AS total_unsplash_calls,
  MIN(created_at) AS oldest_entry,
  MAX(created_at) AS newest_entry
FROM poi_image_queue
GROUP BY status;


-- ============================================================================
-- Stored Procedure: AddPOIToImageQueue
-- ============================================================================
-- Adds a POI to the image discovery queue with proper priority
-- ============================================================================

DELIMITER //

CREATE PROCEDURE AddPOIToImageQueue(
  IN p_poi_id VARCHAR(36),
  IN p_sources JSON,
  IN p_max_images INT
)
BEGIN
  DECLARE v_priority INT;
  DECLARE v_tier INT;

  -- Get POI tier to determine priority
  SELECT tier INTO v_tier FROM pois WHERE id = p_poi_id;

  -- Calculate priority (Tier 1 = priority 10, Tier 4 = priority 1)
  SET v_priority = 11 - v_tier;

  -- Insert into queue (or update if already exists)
  INSERT INTO poi_image_queue (
    poi_id,
    priority,
    sources_to_check,
    max_images_per_source,
    status
  )
  VALUES (
    p_poi_id,
    v_priority,
    IFNULL(p_sources, '["flickr", "unsplash"]'),
    IFNULL(p_max_images, 10),
    'pending'
  )
  ON DUPLICATE KEY UPDATE
    priority = v_priority,
    sources_to_check = IFNULL(p_sources, sources_to_check),
    max_images_per_source = IFNULL(p_max_images, max_images_per_source),
    status = 'pending',
    attempts = 0,
    updated_at = CURRENT_TIMESTAMP;

END //

DELIMITER ;


-- ============================================================================
-- Stored Procedure: SetPrimaryImage
-- ============================================================================
-- Sets an image as primary and unsets other primary images for the POI
-- ============================================================================

DELIMITER //

CREATE PROCEDURE SetPrimaryImage(
  IN p_image_id VARCHAR(36),
  IN p_moderator_id VARCHAR(36)
)
BEGIN
  DECLARE v_poi_id VARCHAR(36);

  -- Get POI ID from image
  SELECT poi_id INTO v_poi_id FROM poi_images WHERE id = p_image_id;

  -- Unset all primary images for this POI
  UPDATE poi_images
  SET is_primary = FALSE
  WHERE poi_id = v_poi_id AND is_primary = TRUE;

  -- Set new primary image
  UPDATE poi_images
  SET
    is_primary = TRUE,
    status = 'approved',
    verified_by = p_moderator_id,
    verified_at = CURRENT_TIMESTAMP
  WHERE id = p_image_id;

  -- Log moderation action
  INSERT INTO poi_image_moderation_log (
    poi_image_id,
    poi_id,
    action,
    new_status,
    moderator_id,
    is_automated,
    quality_score_at_decision
  )
  SELECT
    id,
    poi_id,
    'set_primary',
    status,
    p_moderator_id,
    FALSE,
    quality_score
  FROM poi_images
  WHERE id = p_image_id;

END //

DELIMITER ;


-- ============================================================================
-- Stored Procedure: CleanupOldQueueEntries
-- ============================================================================
-- Removes completed/failed queue entries older than specified days
-- ============================================================================

DELIMITER //

CREATE PROCEDURE CleanupOldQueueEntries(
  IN p_days_old INT
)
BEGIN
  DELETE FROM poi_image_queue
  WHERE
    status IN ('completed', 'failed', 'skipped')
    AND completed_at < DATE_SUB(NOW(), INTERVAL p_days_old DAY);

  SELECT ROW_COUNT() AS deleted_entries;
END //

DELIMITER ;


-- ============================================================================
-- Event: Reset Daily API Usage Counters
-- ============================================================================

CREATE EVENT IF NOT EXISTS reset_daily_image_api_counters
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY)
DO
  UPDATE poi_image_sources
  SET
    current_day_requests = 0,
    rate_limit_reset_at = CURRENT_TIMESTAMP
  WHERE enabled = TRUE;


-- ============================================================================
-- Event: Reset Hourly API Usage Counters
-- ============================================================================

CREATE EVENT IF NOT EXISTS reset_hourly_image_api_counters
ON SCHEDULE EVERY 1 HOUR
DO
  UPDATE poi_image_sources
  SET
    current_hour_requests = 0
  WHERE enabled = TRUE;


-- ============================================================================
-- Event: Cleanup Old Moderation Logs (keep 90 days)
-- ============================================================================

CREATE EVENT IF NOT EXISTS cleanup_old_moderation_logs
ON SCHEDULE EVERY 1 WEEK
DO
  DELETE FROM poi_image_moderation_log
  WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);


-- ============================================================================
-- Grants and Permissions
-- ============================================================================

-- Grant access to application user (adjust username as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON poi_images TO 'holidaibutler_app'@'%';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON poi_image_queue TO 'holidaibutler_app'@'%';
-- GRANT SELECT, INSERT ON poi_image_moderation_log TO 'holidaibutler_app'@'%';
-- GRANT SELECT, UPDATE ON poi_image_sources TO 'holidaibutler_app'@'%';
-- GRANT EXECUTE ON PROCEDURE AddPOIToImageQueue TO 'holidaibutler_app'@'%';
-- GRANT EXECUTE ON PROCEDURE SetPrimaryImage TO 'holidaibutler_app'@'%';


-- ============================================================================
-- Migration Complete
-- ============================================================================

SELECT 'Migration 002: POI Images Enhancement System - COMPLETED' AS status;
SELECT COUNT(*) AS poi_count FROM pois;
SELECT COUNT(*) AS image_sources FROM poi_image_sources;
