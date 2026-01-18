-- =============================================================================
-- Migration 009: Data Sync Agent Enterprise Features (Hetzner Production)
-- =============================================================================
-- Safe version for production with existence checks and error handling
--
-- Run on Hetzner:
-- mysql -u attexel -p attexel < 009_data_sync_agent_enterprise_hetzner.sql
-- =============================================================================

-- Use the correct database
USE attexel;

-- =============================================================================
-- PART 1: POI TABLE EXTENSIONS (Safe with column existence checks)
-- =============================================================================

-- Add status column if not exists
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'attexel' AND TABLE_NAME = 'POI' AND COLUMN_NAME = 'status'
);
SET @sql = IF(@column_exists = 0,
  'ALTER TABLE POI ADD COLUMN status VARCHAR(50) DEFAULT ''active'' COMMENT ''Lifecycle status''',
  'SELECT ''status column already exists'' as info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add pending_deactivation_date column if not exists
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'attexel' AND TABLE_NAME = 'POI' AND COLUMN_NAME = 'pending_deactivation_date'
);
SET @sql = IF(@column_exists = 0,
  'ALTER TABLE POI ADD COLUMN pending_deactivation_date DATETIME NULL COMMENT ''Grace period end date''',
  'SELECT ''pending_deactivation_date column already exists'' as info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add deactivated_at column if not exists
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'attexel' AND TABLE_NAME = 'POI' AND COLUMN_NAME = 'deactivated_at'
);
SET @sql = IF(@column_exists = 0,
  'ALTER TABLE POI ADD COLUMN deactivated_at DATETIME NULL COMMENT ''Deactivation timestamp''',
  'SELECT ''deactivated_at column already exists'' as info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add duplicate_hash column if not exists
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'attexel' AND TABLE_NAME = 'POI' AND COLUMN_NAME = 'duplicate_hash'
);
SET @sql = IF(@column_exists = 0,
  'ALTER TABLE POI ADD COLUMN duplicate_hash VARCHAR(32) NULL COMMENT ''MD5 hash for duplicate detection''',
  'SELECT ''duplicate_hash column already exists'' as info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add tier_score column if not exists
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'attexel' AND TABLE_NAME = 'POI' AND COLUMN_NAME = 'tier_score'
);
SET @sql = IF(@column_exists = 0,
  'ALTER TABLE POI ADD COLUMN tier_score DECIMAL(4,2) DEFAULT 0 COMMENT ''Calculated tier score''',
  'SELECT ''tier_score column already exists'' as info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add indexes (ignore errors if already exist)
CREATE INDEX idx_poi_status ON POI(status);
CREATE INDEX idx_poi_pending_deactivation ON POI(pending_deactivation_date);
CREATE INDEX idx_poi_duplicate_hash ON POI(duplicate_hash);
CREATE INDEX idx_poi_tier_score ON POI(tier_score);

-- =============================================================================
-- PART 2: REVIEWS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS Reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poi_id INT NOT NULL,
  google_review_id VARCHAR(255) NULL,
  reviewer_name VARCHAR(255) NULL,
  reviewer_photo VARCHAR(500) NULL,
  rating TINYINT NOT NULL,
  text TEXT NULL,
  language VARCHAR(10) DEFAULT 'unknown',
  review_date DATETIME NULL,
  review_hash VARCHAR(32) NOT NULL,
  sentiment_score DECIMAL(3,2) DEFAULT 0,
  sentiment_label VARCHAR(20) DEFAULT 'neutral',
  spam_score DECIMAL(3,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_reviews_poi_id (poi_id),
  INDEX idx_reviews_rating (rating),
  INDEX idx_reviews_language (language),
  INDEX idx_reviews_sentiment (sentiment_label),
  INDEX idx_reviews_spam (spam_score),
  INDEX idx_reviews_date (review_date),
  UNIQUE INDEX idx_reviews_hash (review_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key if not exists (may fail if constraint already exists)
SET @fk_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = 'attexel' AND TABLE_NAME = 'Reviews' AND CONSTRAINT_NAME = 'fk_reviews_poi'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE Reviews ADD CONSTRAINT fk_reviews_poi FOREIGN KEY (poi_id) REFERENCES POI(id) ON DELETE CASCADE',
  'SELECT ''fk_reviews_poi already exists'' as info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================================================
-- PART 3: Q&A TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS QA (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poi_id INT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  source VARCHAR(50) DEFAULT 'ai_generated',
  status VARCHAR(30) DEFAULT 'pending_approval',
  priority TINYINT DEFAULT 10,
  approved_at DATETIME NULL,
  rejection_reason TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_qa_poi_id (poi_id),
  INDEX idx_qa_language (language),
  INDEX idx_qa_status (status),
  INDEX idx_qa_source (source),
  INDEX idx_qa_poi_lang (poi_id, language)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key if not exists
SET @fk_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = 'attexel' AND TABLE_NAME = 'QA' AND CONSTRAINT_NAME = 'fk_qa_poi'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE QA ADD CONSTRAINT fk_qa_poi FOREIGN KEY (poi_id) REFERENCES POI(id) ON DELETE CASCADE',
  'SELECT ''fk_qa_poi already exists'' as info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================================================
-- PART 4: VERIFICATION
-- =============================================================================

SELECT '=== Migration 009 Complete ===' as status;

SELECT 'POI new columns:' as info;
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'attexel' AND TABLE_NAME = 'POI'
  AND COLUMN_NAME IN ('status', 'pending_deactivation_date', 'deactivated_at', 'duplicate_hash', 'tier_score');

SELECT 'Reviews table rows:' as info;
SELECT COUNT(*) as review_count FROM Reviews;

SELECT 'QA table rows:' as info;
SELECT COUNT(*) as qa_count FROM QA;

SELECT '=== Ready for Data Sync Agent v2.0 ===' as status;
