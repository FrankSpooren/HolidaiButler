-- =============================================================================
-- Migration 009: Data Sync Agent Enterprise Features
-- =============================================================================
-- Adds enterprise-level data sync capabilities:
-- - POI lifecycle management (status, deactivation, duplicate detection)
-- - Reviews table with sentiment analysis and spam detection
-- - Q&A table with multi-language support and approval workflow
--
-- Run: mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < 009_data_sync_agent_enterprise.sql
-- =============================================================================

-- =============================================================================
-- PART 1: POI TABLE EXTENSIONS
-- =============================================================================

-- Add status column for lifecycle management
ALTER TABLE POI
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'
COMMENT 'Lifecycle status: active, temporarily_closed, pending_deactivation, deactivated';

-- Add pending deactivation date for grace period tracking
ALTER TABLE POI
ADD COLUMN IF NOT EXISTS pending_deactivation_date DATETIME NULL
COMMENT 'Date when POI will be deactivated after grace period';

-- Add deactivation timestamp
ALTER TABLE POI
ADD COLUMN IF NOT EXISTS deactivated_at DATETIME NULL
COMMENT 'When POI was deactivated';

-- Add duplicate hash for fuzzy matching
ALTER TABLE POI
ADD COLUMN IF NOT EXISTS duplicate_hash VARCHAR(32) NULL
COMMENT 'MD5 hash of name+address for duplicate detection';

-- Add tier_score column if not exists (for tier classification)
ALTER TABLE POI
ADD COLUMN IF NOT EXISTS tier_score DECIMAL(4,2) DEFAULT 0
COMMENT 'Calculated tier score (0-10)';

-- Add indexes for lifecycle management
ALTER TABLE POI
ADD INDEX IF NOT EXISTS idx_poi_status (status);

ALTER TABLE POI
ADD INDEX IF NOT EXISTS idx_poi_pending_deactivation (pending_deactivation_date);

ALTER TABLE POI
ADD INDEX IF NOT EXISTS idx_poi_duplicate_hash (duplicate_hash);

ALTER TABLE POI
ADD INDEX IF NOT EXISTS idx_poi_tier_score (tier_score);

-- =============================================================================
-- PART 2: REVIEWS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS Reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poi_id INT NOT NULL,
  google_review_id VARCHAR(255) NULL COMMENT 'Google review ID if from Google',
  reviewer_name VARCHAR(255) NULL,
  reviewer_photo VARCHAR(500) NULL,
  rating TINYINT NOT NULL COMMENT 'Rating 1-5',
  text TEXT NULL COMMENT 'Review text',
  language VARCHAR(10) DEFAULT 'unknown' COMMENT 'Detected language: nl, en, es, de, unknown',
  review_date DATETIME NULL COMMENT 'Original review date',
  review_hash VARCHAR(32) NOT NULL COMMENT 'MD5 hash for deduplication',

  -- Sentiment analysis
  sentiment_score DECIMAL(3,2) DEFAULT 0 COMMENT 'Sentiment score -1 to 1',
  sentiment_label VARCHAR(20) DEFAULT 'neutral' COMMENT 'positive, neutral, negative',

  -- Spam detection
  spam_score DECIMAL(3,2) DEFAULT 0 COMMENT 'Spam probability 0-1',

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign key
  CONSTRAINT fk_reviews_poi FOREIGN KEY (poi_id) REFERENCES POI(id) ON DELETE CASCADE,

  -- Indexes
  INDEX idx_reviews_poi_id (poi_id),
  INDEX idx_reviews_rating (rating),
  INDEX idx_reviews_language (language),
  INDEX idx_reviews_sentiment (sentiment_label),
  INDEX idx_reviews_spam (spam_score),
  INDEX idx_reviews_date (review_date),
  UNIQUE INDEX idx_reviews_hash (review_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='POI reviews with sentiment analysis and spam detection';

-- =============================================================================
-- PART 3: Q&A TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS QA (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poi_id INT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'en' COMMENT 'Language: nl, en, es',

  -- Source tracking
  source VARCHAR(50) DEFAULT 'ai_generated' COMMENT 'google, ai_generated, manual',

  -- Approval workflow
  status VARCHAR(30) DEFAULT 'pending_approval' COMMENT 'pending_approval, approved, rejected, auto_approved',
  priority TINYINT DEFAULT 10 COMMENT 'Display priority (lower = higher)',

  -- Approval metadata
  approved_at DATETIME NULL,
  rejection_reason TEXT NULL,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign key
  CONSTRAINT fk_qa_poi FOREIGN KEY (poi_id) REFERENCES POI(id) ON DELETE CASCADE,

  -- Indexes
  INDEX idx_qa_poi_id (poi_id),
  INDEX idx_qa_language (language),
  INDEX idx_qa_status (status),
  INDEX idx_qa_source (source),
  INDEX idx_qa_poi_lang (poi_id, language)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='POI Q&A pairs with multi-language support and approval workflow';

-- =============================================================================
-- PART 4: VERIFICATION
-- =============================================================================

-- Verify POI columns
SELECT 'POI Table Columns:' as info;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'POI'
  AND TABLE_SCHEMA = DATABASE()
  AND COLUMN_NAME IN ('status', 'pending_deactivation_date', 'deactivated_at', 'duplicate_hash', 'tier_score')
ORDER BY ORDINAL_POSITION;

-- Verify Reviews table
SELECT 'Reviews Table:' as info;
SELECT TABLE_NAME, TABLE_ROWS, TABLE_COMMENT
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = 'Reviews'
  AND TABLE_SCHEMA = DATABASE();

-- Verify QA table
SELECT 'QA Table:' as info;
SELECT TABLE_NAME, TABLE_ROWS, TABLE_COMMENT
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = 'QA'
  AND TABLE_SCHEMA = DATABASE();

-- Show index summary
SELECT 'Indexes Created:' as info;
SELECT TABLE_NAME, INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as columns
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('POI', 'Reviews', 'QA')
  AND INDEX_NAME != 'PRIMARY'
GROUP BY TABLE_NAME, INDEX_NAME
ORDER BY TABLE_NAME, INDEX_NAME;
