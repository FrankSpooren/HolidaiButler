-- =====================================================
-- Migration 25: Add is_active Column to POI Table
-- =====================================================
-- Purpose: Add is_active field to manage POI visibility
--   - Allows marking POIs as offline/inactive
--   - Default TRUE for all existing POIs
--   - Indexed for performance
-- =====================================================

USE pxoziy_db1;

-- Start transaction
START TRANSACTION;

-- Step 1: Add is_active column (default TRUE)
ALTER TABLE POI
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL
COMMENT 'Whether the POI is currently active/online';

-- Step 2: Add index for filtering
ALTER TABLE POI
ADD INDEX IF NOT EXISTS idx_is_active (is_active);

-- Step 3: Ensure all existing POIs are active by default
UPDATE POI
SET is_active = TRUE
WHERE is_active IS NULL;

-- Step 4: Mark specific POIs as inactive (POI 436 and POI 1)
UPDATE POI
SET is_active = FALSE
WHERE id IN (436, 1);

-- Commit transaction
COMMIT;

-- Verification
SELECT
  'Migration 25: is_active field added successfully' AS status,
  COUNT(*) AS total_pois,
  SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) AS active_pois,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive_pois
FROM POI;

-- Show the inactive POIs
SELECT
  id,
  name,
  category,
  is_active
FROM POI
WHERE is_active = FALSE;
