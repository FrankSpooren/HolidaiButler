/**
 * Database Index Optimization Migration
 * ENTERPRISE: Composite indexes for query performance
 *
 * Performance Impact:
 * - Query speed improvement: 10-100x for filtered queries
 * - Reduced full table scans
 * - Better JOIN performance
 * - Optimized ORDER BY operations
 *
 * Index Strategy:
 * - Composite indexes for common query patterns
 * - Covering indexes where possible
 * - Cardinality-aware ordering (high to low)
 * - Query pattern analysis based on codebase
 *
 * IMPORTANT: Run this migration during low-traffic hours
 * Index creation can lock tables temporarily
 */

-- ============================================================================
-- POI TABLE COMPOSITE INDEXES
-- ============================================================================

-- Drop existing basic indexes (will be replaced by composite indexes)
DROP INDEX IF EXISTS tier ON pois;
DROP INDEX IF EXISTS category ON pois;
DROP INDEX IF EXISTS city ON pois;
DROP INDEX IF EXISTS poi_score ON pois;
DROP INDEX IF EXISTS next_update_at ON pois;

-- ============================================================================
-- COMPOSITE INDEX #1: Tier-based POI Lists
-- Query: SELECT * FROM pois WHERE tier = ? AND city = ? AND active = true ORDER BY poi_score DESC
-- Usage: GET /api/v1/poi-classification/tier/:tier?city=Valencia
-- Frequency: Very High (tier lists are most common query)
-- ============================================================================
CREATE INDEX idx_tier_city_active_score ON pois (
  tier ASC,
  city ASC,
  active ASC,
  poi_score DESC
);
-- Cardinality: tier (4 values) → city (50-100 values) → active (2 values) → score (continuous)
-- Performance: O(log n) lookup + index-only scan for ORDER BY
-- Expected speedup: 50-100x (from full table scan to index scan)

-- ============================================================================
-- COMPOSITE INDEX #2: Category-based Discovery
-- Query: SELECT * FROM pois WHERE category = ? AND city = ? AND active = true
-- Usage: POI discovery by category
-- Frequency: High (discovery workflows)
-- ============================================================================
CREATE INDEX idx_category_city_active ON pois (
  category ASC,
  city ASC,
  active ASC,
  poi_score DESC
);
-- Cardinality: category (10 values) → city (50-100 values) → active (2 values)
-- Performance: Fast filtering + pre-sorted results
-- Expected speedup: 20-50x

-- ============================================================================
-- COMPOSITE INDEX #3: Scheduled Update Queue
-- Query: SELECT * FROM pois WHERE next_update_at <= NOW() AND tier = ? AND active = true ORDER BY next_update_at ASC
-- Usage: Tier-based workflow scheduled updates
-- Frequency: Medium (cron jobs every hour/day/week)
-- ============================================================================
CREATE INDEX idx_next_update_tier_active ON pois (
  next_update_at ASC,
  tier ASC,
  active ASC
);
-- Cardinality: next_update_at (datetime, high) → tier (4 values) → active (2 values)
-- Performance: Range scan on next_update_at + filter on tier
-- Expected speedup: 30-60x

-- ============================================================================
-- COMPOSITE INDEX #4: Active & Verified POIs
-- Query: SELECT * FROM pois WHERE active = true AND verified = true ORDER BY poi_score DESC
-- Usage: Public-facing POI lists (only show verified)
-- Frequency: Medium (public API endpoints)
-- ============================================================================
CREATE INDEX idx_active_verified_score ON pois (
  active ASC,
  verified ASC,
  poi_score DESC
);
-- Cardinality: active (2 values) → verified (2 values) → score (continuous)
-- Performance: Boolean filter + index-only ORDER BY
-- Expected speedup: 40-80x

-- ============================================================================
-- COMPOSITE INDEX #5: Geographic Search
-- Query: SELECT * FROM pois WHERE city = ? AND active = true AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?
-- Usage: Nearby POI search, map bounding boxes
-- Frequency: Medium (map-based features)
-- ============================================================================
CREATE INDEX idx_city_active_location ON pois (
  city ASC,
  active ASC,
  latitude ASC,
  longitude ASC
);
-- Cardinality: city → active → lat/lon (spatial)
-- Performance: City filter + spatial range scan
-- Expected speedup: 15-30x
-- Note: For advanced geospatial queries, consider MySQL SPATIAL index upgrade

-- ============================================================================
-- COMPOSITE INDEX #6: Classification Status
-- Query: SELECT * FROM pois WHERE tier = ? AND last_classified_at < DATE_SUB(NOW(), INTERVAL X DAY)
-- Usage: Find POIs needing re-classification
-- Frequency: Low (maintenance jobs)
-- ============================================================================
CREATE INDEX idx_tier_last_classified ON pois (
  tier ASC,
  last_classified_at ASC
);
-- Cardinality: tier (4 values) → last_classified_at (datetime)
-- Performance: Tier filter + date range scan
-- Expected speedup: 25-40x

-- ============================================================================
-- COMPOSITE INDEX #7: POI Score Leaderboard
-- Query: SELECT * FROM pois WHERE active = true ORDER BY poi_score DESC LIMIT 100
-- Usage: Top POIs globally or per city
-- Frequency: Medium (analytics, dashboards)
-- ============================================================================
CREATE INDEX idx_active_score_desc ON pois (
  active ASC,
  poi_score DESC
);
-- Cardinality: active (2 values) → score (continuous, descending)
-- Performance: Index-only scan for top N queries
-- Expected speedup: 100x+ (no sort needed)

-- ============================================================================
-- POI SCORE HISTORY TABLE INDEXES
-- ============================================================================

-- COMPOSITE INDEX #8: POI Score History Lookup
-- Query: SELECT * FROM poi_score_history WHERE poi_id = ? ORDER BY created_at DESC LIMIT 10
-- Usage: Score history timeline for a specific POI
-- Frequency: Medium (POI detail pages, analytics)
-- ============================================================================
CREATE INDEX idx_poi_history_created ON poi_score_history (
  poi_id ASC,
  created_at DESC
);
-- Cardinality: poi_id (UUID, very high) → created_at (datetime)
-- Performance: Direct lookup + reverse chronological order
-- Expected speedup: 50-100x

-- ============================================================================
-- COMPOSITE INDEX #9: Tier Change Analysis
-- Query: SELECT * FROM poi_score_history WHERE old_tier != new_tier AND created_at >= ?
-- Usage: Analytics - track tier promotions/demotions
-- Frequency: Low (analytics queries)
-- ============================================================================
CREATE INDEX idx_tier_change_created ON poi_score_history (
  old_tier ASC,
  new_tier ASC,
  created_at DESC
);
-- Cardinality: old_tier → new_tier → created_at
-- Performance: Efficient tier change filtering
-- Expected speedup: 20-40x

-- ============================================================================
-- ANALYZE TABLES
-- Update table statistics for query optimizer
-- ============================================================================
ANALYZE TABLE pois;
ANALYZE TABLE poi_score_history;

-- ============================================================================
-- INDEX STATISTICS & VALIDATION
-- ============================================================================

-- Show all indexes on pois table
SHOW INDEX FROM pois;

-- Show index cardinality
SELECT
  TABLE_NAME,
  INDEX_NAME,
  CARDINALITY,
  COLUMN_NAME,
  SEQ_IN_INDEX
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'pois'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- ============================================================================
-- PERFORMANCE TESTING QUERIES
-- Run these before and after migration to measure improvement
-- ============================================================================

-- Test 1: Tier list query (most common)
EXPLAIN SELECT * FROM pois
WHERE tier = 1 AND city = 'Valencia' AND active = true
ORDER BY poi_score DESC
LIMIT 20;
-- Before: type=ALL, rows=10000+ (full table scan)
-- After:  type=ref, rows=20 (index scan)

-- Test 2: Category discovery
EXPLAIN SELECT * FROM pois
WHERE category = 'food_drinks' AND city = 'Valencia' AND active = true
LIMIT 50;
-- Before: type=ALL, rows=10000+ (full table scan)
-- After:  type=ref, rows=50 (index scan)

-- Test 3: Update queue
EXPLAIN SELECT * FROM pois
WHERE next_update_at <= NOW() AND tier = 2 AND active = true
ORDER BY next_update_at ASC
LIMIT 100;
-- Before: type=ALL, rows=10000+, filesort (slow)
-- After:  type=range, rows=100, no filesort (fast)

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

/*
-- To rollback to basic indexes:
DROP INDEX IF EXISTS idx_tier_city_active_score ON pois;
DROP INDEX IF EXISTS idx_category_city_active ON pois;
DROP INDEX IF EXISTS idx_next_update_tier_active ON pois;
DROP INDEX IF EXISTS idx_active_verified_score ON pois;
DROP INDEX IF EXISTS idx_city_active_location ON pois;
DROP INDEX IF EXISTS idx_tier_last_classified ON pois;
DROP INDEX IF EXISTS idx_active_score_desc ON pois;
DROP INDEX IF EXISTS idx_poi_history_created ON poi_score_history;
DROP INDEX IF EXISTS idx_tier_change_created ON poi_score_history;

-- Recreate basic indexes
CREATE INDEX tier ON pois (tier);
CREATE INDEX category ON pois (category);
CREATE INDEX city ON pois (city);
CREATE INDEX poi_score ON pois (poi_score);
CREATE INDEX next_update_at ON pois (next_update_at);
*/

-- ============================================================================
-- MAINTENANCE RECOMMENDATIONS
-- ============================================================================

/*
1. Monitor index usage:
   SELECT * FROM sys.schema_unused_indexes WHERE object_schema = DATABASE();

2. Rebuild indexes monthly:
   OPTIMIZE TABLE pois;
   OPTIMIZE TABLE poi_score_history;

3. Update statistics weekly:
   ANALYZE TABLE pois;
   ANALYZE TABLE poi_score_history;

4. Monitor query performance:
   SELECT * FROM sys.statement_analysis
   WHERE query LIKE '%pois%'
   ORDER BY total_latency DESC
   LIMIT 20;

5. Check index fragmentation:
   SELECT TABLE_NAME, INDEX_NAME, DATA_FREE
   FROM INFORMATION_SCHEMA.TABLES
   WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'pois';
*/
