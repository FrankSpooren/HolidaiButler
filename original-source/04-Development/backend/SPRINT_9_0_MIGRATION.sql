-- =====================================================
-- Sprint 9.0: Multilingual POI Schema Migration
-- =====================================================
-- Database: pxoziy_db1 (Hetzner KonsoleH)
-- Generated: 2025-11-09
-- Migration Type: ADDITIVE (backward compatible)
-- Estimated Duration: 5-10 minutes
-- Downtime: NONE
-- Risk Level: MEDIUM (additive migration)
--
-- INSTRUCTIONS:
--   1. ✅ Create full database backup BEFORE running
--   2. ✅ Test on staging environment first
--   3. Login to Hetzner phpMyAdmin (jotx.your-database.de)
--   4. Select database: pxoziy_db1
--   5. Go to SQL tab
--   6. Paste this entire script
--   7. Click 'Go' to execute
--   8. ✅ Verify success with validation queries at bottom
-- =====================================================

USE pxoziy_db1;

-- Start transaction for atomicity
START TRANSACTION;

-- =====================================================
-- PHASE 1: ADD MULTILINGUAL COLUMNS
-- =====================================================

ALTER TABLE POI
  -- ============================================
  -- NAME: 5 language columns (NL, EN, ES, DE, FR)
  -- ============================================
  ADD COLUMN name_nl VARCHAR(255) NULL COMMENT 'Name in Dutch' AFTER name,
  ADD COLUMN name_en VARCHAR(255) NULL COMMENT 'Name in English' AFTER name_nl,
  ADD COLUMN name_es VARCHAR(255) NULL COMMENT 'Name in Spanish' AFTER name_en,
  ADD COLUMN name_de VARCHAR(255) NULL COMMENT 'Name in German' AFTER name_es,
  ADD COLUMN name_fr VARCHAR(255) NULL COMMENT 'Name in French' AFTER name_de,

  -- ============================================
  -- DESCRIPTION: 5 language columns (NL, EN, ES, DE, FR)
  -- ============================================
  ADD COLUMN description_nl TEXT NULL COMMENT 'Description in Dutch' AFTER description,
  ADD COLUMN description_en TEXT NULL COMMENT 'Description in English' AFTER description_nl,
  ADD COLUMN description_es TEXT NULL COMMENT 'Description in Spanish' AFTER description_en,
  ADD COLUMN description_de TEXT NULL COMMENT 'Description in German' AFTER description_es,
  ADD COLUMN description_fr TEXT NULL COMMENT 'Description in French' AFTER description_de,

  -- ============================================
  -- CATEGORY: 5 language columns (NL, EN, ES, DE, FR)
  -- ============================================
  ADD COLUMN category_nl VARCHAR(100) NULL COMMENT 'Category in Dutch' AFTER category,
  ADD COLUMN category_en VARCHAR(100) NULL COMMENT 'Category in English' AFTER category_nl,
  ADD COLUMN category_es VARCHAR(100) NULL COMMENT 'Category in Spanish' AFTER category_en,
  ADD COLUMN category_de VARCHAR(100) NULL COMMENT 'Category in German' AFTER category_es,
  ADD COLUMN category_fr VARCHAR(100) NULL COMMENT 'Category in French' AFTER category_de,

  -- ============================================
  -- SUBCATEGORY: 5 language columns (NL, EN, ES, DE, FR)
  -- ============================================
  ADD COLUMN subcategory_nl VARCHAR(100) NULL COMMENT 'Subcategory in Dutch' AFTER subcategory,
  ADD COLUMN subcategory_en VARCHAR(100) NULL COMMENT 'Subcategory in English' AFTER subcategory_nl,
  ADD COLUMN subcategory_es VARCHAR(100) NULL COMMENT 'Subcategory in Spanish' AFTER subcategory_en,
  ADD COLUMN subcategory_de VARCHAR(100) NULL COMMENT 'Subcategory in German' AFTER subcategory_es,
  ADD COLUMN subcategory_fr VARCHAR(100) NULL COMMENT 'Subcategory in French' AFTER subcategory_de,

  -- ============================================
  -- METADATA: Track source language and translations
  -- ============================================
  ADD COLUMN source_language VARCHAR(5) DEFAULT 'nl' COMMENT 'Original language of content' AFTER is_active,
  ADD COLUMN available_languages VARCHAR(100) NULL COMMENT 'JSON array of available languages' AFTER source_language,
  ADD COLUMN last_translated TIMESTAMP NULL COMMENT 'Last translation update timestamp' AFTER available_languages;

-- =====================================================
-- PHASE 2: MIGRATE EXISTING DATA TO NL COLUMNS
-- =====================================================

UPDATE POI SET
  name_nl = name,
  description_nl = description,
  category_nl = category,
  subcategory_nl = subcategory,
  source_language = 'nl',
  available_languages = '["nl"]',
  last_translated = NOW()
WHERE is_active = TRUE;

-- =====================================================
-- PHASE 3: ADD INDEXES FOR PERFORMANCE
-- =====================================================

-- Name indexes (for search and sorting)
CREATE INDEX idx_poi_name_nl ON POI(name_nl);
CREATE INDEX idx_poi_name_en ON POI(name_en);
CREATE INDEX idx_poi_name_es ON POI(name_es);

-- Category indexes (for filtering)
CREATE INDEX idx_poi_category_nl ON POI(category_nl);
CREATE INDEX idx_poi_category_en ON POI(category_en);
CREATE INDEX idx_poi_category_es ON POI(category_es);

-- Metadata indexes
CREATE INDEX idx_poi_source_language ON POI(source_language);

-- =====================================================
-- PHASE 4: ADD FULLTEXT SEARCH INDEXES
-- =====================================================
-- For advanced search functionality (optional)

-- Note: Fulltext indexes require MyISAM or InnoDB with ROW_FORMAT=DYNAMIC
-- ALTER TABLE POI ENGINE=InnoDB ROW_FORMAT=DYNAMIC; -- Run if needed

CREATE FULLTEXT INDEX ft_description_nl ON POI(description_nl);
CREATE FULLTEXT INDEX ft_description_en ON POI(description_en);

-- =====================================================
-- COMMIT TRANSACTION
-- =====================================================

COMMIT;

-- =====================================================
-- VALIDATION QUERIES (Run after migration)
-- =====================================================

-- 1. Verify all active POIs have NL content migrated
SELECT
  COUNT(*) as total_active_pois,
  SUM(CASE WHEN name_nl IS NOT NULL THEN 1 ELSE 0 END) as name_nl_populated,
  SUM(CASE WHEN description_nl IS NOT NULL THEN 1 ELSE 0 END) as description_nl_populated,
  SUM(CASE WHEN category_nl IS NOT NULL THEN 1 ELSE 0 END) as category_nl_populated
FROM POI
WHERE is_active = TRUE;
-- Expected: total_active_pois = 1591, all *_populated = 1591

-- 2. Verify no data loss (compare old and new columns)
SELECT COUNT(*) as data_mismatch
FROM POI
WHERE is_active = TRUE
  AND (
    name != name_nl OR
    description != description_nl OR
    category != category_nl OR
    (subcategory IS NOT NULL AND subcategory != subcategory_nl)
  );
-- Expected: 0 (no mismatches)

-- 3. Check table size increase
SELECT
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)',
  table_rows
FROM information_schema.TABLES
WHERE table_schema = 'pxoziy_db1'
  AND table_name = 'POI';
-- Expected: Size increased by ~15-25%

-- 4. Sample multilingual data
SELECT
  id,
  name,
  name_nl,
  name_en,
  name_es,
  category_nl,
  category_en,
  available_languages,
  source_language
FROM POI
WHERE is_active = TRUE
LIMIT 10;

-- 5. Check for POIs with missing descriptions (ready for enrichment)
SELECT
  COUNT(*) as pois_needing_enrichment
FROM POI
WHERE is_active = TRUE
  AND (description_nl IS NULL OR description_nl = '' OR LENGTH(description_nl) < 100);
-- Expected: ~518 POIs (32.6% of total)

-- =====================================================
-- ROLLBACK SCRIPT (Use ONLY if migration fails)
-- =====================================================
/*
USE pxoziy_db1;

START TRANSACTION;

-- Drop all new columns
ALTER TABLE POI
  DROP COLUMN name_nl,
  DROP COLUMN name_en,
  DROP COLUMN name_es,
  DROP COLUMN name_de,
  DROP COLUMN name_fr,
  DROP COLUMN description_nl,
  DROP COLUMN description_en,
  DROP COLUMN description_es,
  DROP COLUMN description_de,
  DROP COLUMN description_fr,
  DROP COLUMN category_nl,
  DROP COLUMN category_en,
  DROP COLUMN category_es,
  DROP COLUMN category_de,
  DROP COLUMN category_fr,
  DROP COLUMN subcategory_nl,
  DROP COLUMN subcategory_en,
  DROP COLUMN subcategory_es,
  DROP COLUMN subcategory_de,
  DROP COLUMN subcategory_fr,
  DROP COLUMN source_language,
  DROP COLUMN available_languages,
  DROP COLUMN last_translated;

-- Drop indexes
DROP INDEX idx_poi_name_nl ON POI;
DROP INDEX idx_poi_name_en ON POI;
DROP INDEX idx_poi_name_es ON POI;
DROP INDEX idx_poi_category_nl ON POI;
DROP INDEX idx_poi_category_en ON POI;
DROP INDEX idx_poi_category_es ON POI;
DROP INDEX idx_poi_source_language ON POI;
DROP INDEX ft_description_nl ON POI;
DROP INDEX ft_description_en ON POI;

COMMIT;
*/

-- =====================================================
-- MIGRATION COMPLETE ✅
-- =====================================================
-- Next Steps:
--   1. ✅ Verify validation queries above
--   2. ✅ Monitor application for 24 hours
--   3. ✅ Begin content enrichment (518 POIs)
--   4. ✅ Begin translation (1,591 POIs × 4 languages)
--   5. ✅ Update backend API to use multilingual fields
--   6. ✅ Update frontend to support language switching
-- =====================================================
