-- Migration 03: Add Missing POI Columns for Admin Module
-- Adds columns expected by adminPOI.js that are missing from the POI table
-- Run this via phpMyAdmin: https://pma.your-server.de/index.php?route=/database/sql&db=pxoziy_db1

-- Add region column (geographic region like "Costa Blanca")
ALTER TABLE POI
ADD COLUMN IF NOT EXISTS region VARCHAR(100) DEFAULT NULL
AFTER city;

-- Add country column
ALTER TABLE POI
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Spain'
AFTER region;

-- Add email column for POI contact
ALTER TABLE POI
ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT NULL
AFTER website;

-- Add accessibility_features column (JSON data)
ALTER TABLE POI
ADD COLUMN IF NOT EXISTS accessibility_features LONGTEXT DEFAULT NULL
AFTER amenities;

-- Add images column (JSON array) - different from enhanced_images
ALTER TABLE POI
ADD COLUMN IF NOT EXISTS images LONGTEXT DEFAULT NULL
AFTER accessibility_features;

-- Set default values for existing records
UPDATE POI
SET
  region = 'Costa Blanca',
  country = 'Spain',
  images = '[]',
  accessibility_features = NULL
WHERE region IS NULL OR images IS NULL;

-- Add comment to document the migration
ALTER TABLE POI COMMENT = 'POI table with admin module columns added (migration 03)';

SELECT 'Migration 03 completed successfully!' as status;
