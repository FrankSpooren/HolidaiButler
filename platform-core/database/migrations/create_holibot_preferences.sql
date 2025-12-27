-- HoliBot User Preferences Tables
-- Stores user preferences for personalized recommendations
-- Created: 2024-12-27

-- =====================================================
-- Table 1: holibot_user_preferences - Explicit preferences
-- =====================================================
CREATE TABLE IF NOT EXISTS holibot_user_preferences (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  -- User identification (session-based or authenticated)
  session_id VARCHAR(64) NULL COMMENT 'For anonymous users',
  user_id INT NULL COMMENT 'For authenticated users',
  device_fingerprint VARCHAR(128) NULL COMMENT 'For cross-session tracking',

  -- Category preferences (1-5 scale, NULL = no preference)
  pref_beaches TINYINT NULL COMMENT 'Beaches & Nature preference 1-5',
  pref_food TINYINT NULL COMMENT 'Food & Drinks preference 1-5',
  pref_culture TINYINT NULL COMMENT 'Culture & History preference 1-5',
  pref_active TINYINT NULL COMMENT 'Active/Sports preference 1-5',
  pref_shopping TINYINT NULL COMMENT 'Shopping preference 1-5',
  pref_nightlife TINYINT NULL COMMENT 'Nightlife preference 1-5',
  pref_family TINYINT NULL COMMENT 'Family-friendly preference 1-5',

  -- Dietary preferences (for restaurant recommendations)
  dietary_vegetarian BOOLEAN DEFAULT FALSE,
  dietary_vegan BOOLEAN DEFAULT FALSE,
  dietary_gluten_free BOOLEAN DEFAULT FALSE,
  dietary_halal BOOLEAN DEFAULT FALSE,
  dietary_kosher BOOLEAN DEFAULT FALSE,

  -- Budget preference
  budget_level ENUM('budget', 'moderate', 'premium', 'luxury') DEFAULT 'moderate',

  -- Activity level
  activity_level ENUM('relaxed', 'moderate', 'active', 'very_active') DEFAULT 'moderate',

  -- Travel companion context
  travel_with ENUM('solo', 'couple', 'family', 'friends', 'business') NULL,
  has_children BOOLEAN DEFAULT FALSE,
  has_pets BOOLEAN DEFAULT FALSE,
  has_mobility_issues BOOLEAN DEFAULT FALSE,

  -- Language preference
  preferred_language VARCHAR(5) DEFAULT 'nl',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_session_id (session_id),
  INDEX idx_user_id (user_id),
  INDEX idx_device_fingerprint (device_fingerprint),

  -- Unique constraint: one preference record per session/user
  UNIQUE KEY uk_session (session_id),
  UNIQUE KEY uk_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores explicit user preferences for HoliBot personalization';

-- =====================================================
-- Table 2: holibot_learned_preferences - Implicit preferences from behavior
-- =====================================================
CREATE TABLE IF NOT EXISTS holibot_learned_preferences (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  -- User identification
  session_id VARCHAR(64) NULL,
  user_id INT NULL,
  device_fingerprint VARCHAR(128) NULL,

  -- Category interaction counts (learned from clicks/searches)
  clicks_beaches INT DEFAULT 0,
  clicks_food INT DEFAULT 0,
  clicks_culture INT DEFAULT 0,
  clicks_active INT DEFAULT 0,
  clicks_shopping INT DEFAULT 0,
  clicks_nightlife INT DEFAULT 0,

  -- Search behavior
  searches_total INT DEFAULT 0,
  searches_with_results INT DEFAULT 0,

  -- POI interaction patterns
  avg_rating_clicked DECIMAL(3,2) NULL COMMENT 'Average rating of clicked POIs',
  avg_price_level_clicked DECIMAL(3,2) NULL COMMENT 'Average price level of clicked POIs',

  -- Time patterns
  typical_search_hour TINYINT NULL COMMENT 'Most common hour of day for searches',
  weekend_active BOOLEAN DEFAULT FALSE COMMENT 'More active on weekends',

  -- Favorite POIs (JSON array of POI IDs)
  favorite_pois JSON NULL,

  -- Last categories searched (JSON array)
  recent_categories JSON NULL,

  -- Timestamps
  first_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_session_id (session_id),
  INDEX idx_user_id (user_id),
  INDEX idx_device_fingerprint (device_fingerprint),
  INDEX idx_last_interaction (last_interaction)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores learned preferences from user behavior';

-- =====================================================
-- Table 3: holibot_poi_ratings - User ratings for POIs
-- =====================================================
CREATE TABLE IF NOT EXISTS holibot_poi_ratings (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  -- User identification
  session_id VARCHAR(64) NULL,
  user_id INT NULL,

  -- POI and rating
  poi_id INT NOT NULL,
  rating TINYINT NOT NULL COMMENT 'User rating 1-5',

  -- Optional feedback
  feedback_text TEXT NULL,
  would_recommend BOOLEAN NULL,

  -- Timestamp
  rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_session_id (session_id),
  INDEX idx_user_id (user_id),
  INDEX idx_poi_id (poi_id),
  INDEX idx_rating (rating),

  -- Unique: one rating per user per POI
  UNIQUE KEY uk_session_poi (session_id, poi_id),
  UNIQUE KEY uk_user_poi (user_id, poi_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User ratings for POIs';

-- =====================================================
-- View: User preference summary
-- =====================================================
CREATE OR REPLACE VIEW holibot_preference_summary AS
SELECT
  COALESCE(up.session_id, lp.session_id) as session_id,
  COALESCE(up.user_id, lp.user_id) as user_id,
  -- Explicit preferences
  up.pref_beaches, up.pref_food, up.pref_culture, up.pref_active,
  up.budget_level, up.activity_level, up.travel_with,
  -- Learned preferences
  lp.clicks_beaches, lp.clicks_food, lp.clicks_culture, lp.clicks_active,
  lp.searches_total, lp.avg_rating_clicked,
  -- Combined score (explicit + learned)
  COALESCE(up.pref_beaches, 3) + COALESCE(lp.clicks_beaches, 0) * 0.1 as score_beaches,
  COALESCE(up.pref_food, 3) + COALESCE(lp.clicks_food, 0) * 0.1 as score_food,
  COALESCE(up.pref_culture, 3) + COALESCE(lp.clicks_culture, 0) * 0.1 as score_culture,
  COALESCE(up.pref_active, 3) + COALESCE(lp.clicks_active, 0) * 0.1 as score_active
FROM holibot_user_preferences up
LEFT JOIN holibot_learned_preferences lp
  ON up.session_id = lp.session_id OR up.user_id = lp.user_id;
