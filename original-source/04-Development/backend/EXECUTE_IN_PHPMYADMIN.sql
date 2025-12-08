-- =====================================================
-- POI OFFLINE MIGRATION
-- =====================================================
-- INSTRUCTIES:
--   1. Login bij Hetzner phpMyAdmin (https://jotx.your-database.de/phpMyAdmin)
--   2. Selecteer database: pxoziy_db1
--   3. Ga naar SQL tab
--   4. Kopieer en plak deze VOLLEDIGE SQL
--   5. Klik 'Go' om uit te voeren
-- =====================================================

USE pxoziy_db1;

-- Step 1: Add is_active column (if not exists)
ALTER TABLE POI
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL
COMMENT 'Whether the POI is currently active/online';

-- Step 2: Add index for performance
ALTER TABLE POI
ADD INDEX IF NOT EXISTS idx_is_active (is_active);

-- Step 3: Set all existing POIs to active
UPDATE POI
SET is_active = TRUE
WHERE is_active IS NULL;

-- Step 4: Mark POI 436 and POI 1 as INACTIVE
UPDATE POI
SET is_active = FALSE
WHERE id IN (436, 1);

-- Verification Query 1: Statistics
SELECT
  'Migration Successful' AS status,
  COUNT(*) AS total_pois,
  SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) AS active_pois,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive_pois
FROM POI;

-- Verification Query 2: Show inactive POIs
SELECT
  id,
  name,
  category,
  is_active
FROM POI
WHERE is_active = FALSE;
