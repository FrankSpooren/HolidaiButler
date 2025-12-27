-- HoliBot Conversation Logging Tables
-- Tracks all chat sessions and messages for analytics and improvement
-- Created: 2024-12-27

-- =====================================================
-- Table 1: holibot_sessions - Track unique chat sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS holibot_sessions (
  id VARCHAR(64) PRIMARY KEY COMMENT 'Unique session identifier (UUID)',

  -- User identification (anonymous or authenticated)
  user_id INT NULL COMMENT 'FK to users table if authenticated',
  device_fingerprint VARCHAR(128) NULL COMMENT 'Anonymous device identifier',

  -- Session metadata
  language VARCHAR(5) NOT NULL DEFAULT 'nl' COMMENT 'Primary language used',
  user_agent TEXT NULL COMMENT 'Browser/device user agent',
  ip_country VARCHAR(2) NULL COMMENT 'Country code from IP geolocation',
  referrer VARCHAR(500) NULL COMMENT 'Where user came from',

  -- Session metrics
  message_count INT DEFAULT 0 COMMENT 'Total messages in session',
  avg_response_time_ms INT NULL COMMENT 'Average response time',

  -- Quality indicators
  had_fallback BOOLEAN DEFAULT FALSE COMMENT 'Did any response trigger fallback?',
  had_spell_correction BOOLEAN DEFAULT FALSE COMMENT 'Was spell correction used?',
  user_satisfaction TINYINT NULL COMMENT 'User rating 1-5 if provided',

  -- Timestamps
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL COMMENT 'When session was explicitly ended',

  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_language (language),
  INDEX idx_started_at (started_at),
  INDEX idx_had_fallback (had_fallback)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tracks HoliBot chat sessions for analytics';

-- =====================================================
-- Table 2: holibot_messages - Individual chat messages
-- =====================================================
CREATE TABLE IF NOT EXISTS holibot_messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL COMMENT 'FK to holibot_sessions',

  -- Message content
  role ENUM('user', 'assistant') NOT NULL,
  message TEXT NOT NULL COMMENT 'Message content',

  -- For user messages
  original_message TEXT NULL COMMENT 'Before spell correction',
  was_spell_corrected BOOLEAN DEFAULT FALSE,

  -- For assistant messages
  source VARCHAR(50) NULL COMMENT 'RAG source: chromadb, fallback, cache',
  poi_count INT NULL COMMENT 'Number of POIs in response',
  had_fallback BOOLEAN DEFAULT FALSE,

  -- Response quality
  search_time_ms INT NULL COMMENT 'RAG search duration',
  total_response_time_ms INT NULL COMMENT 'Total response time',

  -- POIs referenced (for click tracking)
  poi_ids JSON NULL COMMENT 'Array of POI IDs mentioned in response',

  -- Quick action context
  quick_action VARCHAR(50) NULL COMMENT 'itinerary, location, directions, daily-tip',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_session_id (session_id),
  INDEX idx_role (role),
  INDEX idx_created_at (created_at),
  INDEX idx_source (source),
  INDEX idx_had_fallback (had_fallback),

  -- Foreign key
  CONSTRAINT fk_messages_session FOREIGN KEY (session_id)
    REFERENCES holibot_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Individual messages within HoliBot chat sessions';

-- =====================================================
-- Table 3: holibot_poi_clicks - Track POI interactions
-- =====================================================
CREATE TABLE IF NOT EXISTS holibot_poi_clicks (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  message_id BIGINT NULL COMMENT 'FK to holibot_messages',

  -- POI information
  poi_id INT NOT NULL COMMENT 'FK to POI table',
  poi_name VARCHAR(255) NULL,

  -- Click context
  click_type ENUM('view_details', 'get_directions', 'visit_website', 'call', 'add_to_itinerary') NOT NULL,
  source_context VARCHAR(50) NULL COMMENT 'chat, itinerary, daily-tip, search',

  -- Timestamp
  clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_session_id (session_id),
  INDEX idx_poi_id (poi_id),
  INDEX idx_click_type (click_type),
  INDEX idx_clicked_at (clicked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tracks user interactions with POIs shown by HoliBot';

-- =====================================================
-- Analytics Views
-- =====================================================

-- Daily conversation metrics
CREATE OR REPLACE VIEW holibot_daily_metrics AS
SELECT
  DATE(started_at) as date,
  COUNT(*) as total_sessions,
  SUM(message_count) as total_messages,
  ROUND(AVG(message_count), 1) as avg_messages_per_session,
  ROUND(AVG(avg_response_time_ms)) as avg_response_ms,
  SUM(CASE WHEN had_fallback THEN 1 ELSE 0 END) as sessions_with_fallback,
  ROUND(100.0 * SUM(CASE WHEN had_fallback THEN 1 ELSE 0 END) / COUNT(*), 1) as fallback_rate_pct,
  COUNT(DISTINCT language) as languages_used
FROM holibot_sessions
GROUP BY DATE(started_at)
ORDER BY date DESC;

-- Language breakdown
CREATE OR REPLACE VIEW holibot_language_stats AS
SELECT
  language,
  COUNT(*) as session_count,
  SUM(message_count) as total_messages,
  ROUND(AVG(message_count), 1) as avg_messages,
  SUM(CASE WHEN had_fallback THEN 1 ELSE 0 END) as fallback_count
FROM holibot_sessions
WHERE started_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY language
ORDER BY session_count DESC;

-- Popular POIs (most clicked)
CREATE OR REPLACE VIEW holibot_popular_pois AS
SELECT
  poi_id,
  poi_name,
  COUNT(*) as total_clicks,
  SUM(CASE WHEN click_type = 'view_details' THEN 1 ELSE 0 END) as detail_views,
  SUM(CASE WHEN click_type = 'get_directions' THEN 1 ELSE 0 END) as direction_requests,
  COUNT(DISTINCT session_id) as unique_sessions
FROM holibot_poi_clicks
WHERE clicked_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY poi_id, poi_name
ORDER BY total_clicks DESC
LIMIT 50;
