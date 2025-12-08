-- =====================================================
-- Opening Hours Schema Update
-- =====================================================
-- Purpose: Add opening_hours JSON column to POI table
-- Compliance: Data structure for business hours filtering
-- Date: 2025-11-03
-- Author: Enterprise Backend Team
-- =====================================================

USE pxoziy_db1;

-- Add opening_hours JSON column to POI table
ALTER TABLE POI
ADD COLUMN IF NOT EXISTS opening_hours JSON DEFAULT NULL COMMENT 'Business opening hours in JSON format';

-- Note: MariaDB doesn't support indexes on JSON columns directly
-- Filtering will be done in application layer for open_now queries

-- Sample JSON structure documentation:
-- {
--   "monday": [{"open": "09:00", "close": "17:00"}],
--   "tuesday": [{"open": "09:00", "close": "17:00"}],
--   "wednesday": [{"open": "09:00", "close": "17:00"}],
--   "thursday": [{"open": "09:00", "close": "17:00"}],
--   "friday": [{"open": "09:00", "close": "17:00"}],
--   "saturday": [{"open": "10:00", "close": "16:00"}],
--   "sunday": []  // Closed on Sunday
-- }

-- Verification
SELECT
  'Opening hours column added successfully' AS status,
  COUNT(*) AS total_pois,
  SUM(CASE WHEN opening_hours IS NOT NULL THEN 1 ELSE 0 END) AS pois_with_hours
FROM POI;
