-- Migration: Add age tracking to imageurls table
-- Purpose: Track when images were fetched to enable proactive refresh before expiration

-- Add last_fetched_at column to track image age
ALTER TABLE imageurls
ADD COLUMN IF NOT EXISTS last_fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Add index for efficient querying of old images
CREATE INDEX IF NOT EXISTS idx_imageurls_last_fetched
ON imageurls(last_fetched_at);

-- Set existing images to a date 30 days ago (so they'll be refreshed soon)
UPDATE imageurls
SET last_fetched_at = DATE_SUB(NOW(), INTERVAL 30 DAY)
WHERE last_fetched_at IS NULL;

-- Add source column to track where image came from
ALTER TABLE imageurls
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'google_places';

-- Add google_place_id for easier refresh lookups
ALTER TABLE imageurls
ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255);

-- Create index for google_place_id lookups
CREATE INDEX IF NOT EXISTS idx_imageurls_google_place_id
ON imageurls(google_place_id);

-- Populate google_place_id from POI table
UPDATE imageurls iu
JOIN POI p ON iu.poi_id = p.id
SET iu.google_place_id = p.google_placeid
WHERE iu.google_place_id IS NULL AND p.google_placeid IS NOT NULL;
