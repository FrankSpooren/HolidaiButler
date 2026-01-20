-- Migration: Add enhanced_images column to POIs table
-- Description: Store Flickr/Unsplash enhanced images with categorization

ALTER TABLE pois
ADD COLUMN enhanced_images JSON NULL COMMENT 'Enhanced images from Flickr/Unsplash with categories',
ADD COLUMN enhanced_at TIMESTAMP NULL COMMENT 'When images were last enhanced',
ADD INDEX idx_enhanced_at (enhanced_at);

-- Example enhanced_images JSON structure:
-- {
--   "enhanced_images": [
--     {
--       "url": "https://live.staticflickr.com/...",
--       "source": "flickr",
--       "license": "CC",
--       "category": "outdoor",
--       "flickr_id": "123456"
--     },
--     {
--       "url": "https://images.unsplash.com/...",
--       "source": "unsplash",
--       "license": "Unsplash",
--       "category": "indoor",
--       "photographer": "John Doe",
--       "unsplash_id": "abc123"
--     }
--   ],
--   "enhanced_at": "2025-01-13T10:00:00.000Z",
--   "image_sources": ["flickr", "unsplash"]
-- }
