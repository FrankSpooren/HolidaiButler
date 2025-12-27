-- HoliBot Fallback Logging Table
-- Tracks queries that triggered fallback responses for quality improvement
-- Created: 2024-12-27

-- Create holibot_fallbacks table
CREATE TABLE IF NOT EXISTS holibot_fallbacks (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Query information
  query TEXT NOT NULL COMMENT 'Original user query',
  corrected_query TEXT COMMENT 'Spell-corrected version of query',
  language VARCHAR(5) NOT NULL DEFAULT 'nl' COMMENT 'User language code (nl, en, de, es, sv, pl)',

  -- Response information
  fallback_type ENUM('no_results', 'low_quality', 'spell_suggestion', 'category_suggestion', 'error') NOT NULL,
  original_source VARCHAR(50) COMMENT 'Original RAG source (chromadb, fallback, etc)',
  poi_count INT DEFAULT 0 COMMENT 'Number of POIs returned by RAG',

  -- Spell correction data
  was_spell_corrected BOOLEAN DEFAULT FALSE,
  spell_suggestions JSON COMMENT 'Array of spell suggestions offered',

  -- Category suggestions
  suggested_categories JSON COMMENT 'Categories suggested to user',

  -- User interaction (for future use)
  user_clicked_suggestion BOOLEAN DEFAULT NULL COMMENT 'Did user click a suggestion?',
  user_refinement TEXT COMMENT 'Follow-up query from user',

  -- Metadata
  session_id VARCHAR(64) COMMENT 'Session identifier for tracking user journey',
  response_time_ms INT COMMENT 'Total response time in milliseconds',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes for analytics
  INDEX idx_fallback_type (fallback_type),
  INDEX idx_language (language),
  INDEX idx_created_at (created_at),
  INDEX idx_session (session_id),
  INDEX idx_spell_corrected (was_spell_corrected)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tracks HoliBot queries that triggered fallback responses for continuous improvement';

-- Create view for fallback analytics
CREATE OR REPLACE VIEW holibot_fallback_stats AS
SELECT
  DATE(created_at) as date,
  language,
  fallback_type,
  COUNT(*) as count,
  AVG(response_time_ms) as avg_response_ms,
  SUM(CASE WHEN was_spell_corrected THEN 1 ELSE 0 END) as spell_corrected_count
FROM holibot_fallbacks
GROUP BY DATE(created_at), language, fallback_type
ORDER BY date DESC, count DESC;
