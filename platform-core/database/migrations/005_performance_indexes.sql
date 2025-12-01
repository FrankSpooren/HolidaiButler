-- ============================================================================
-- HolidaiButler Performance Optimization Indexes
-- Version: 005
-- Date: 2025-12-01
-- Description: Add missing indexes for query performance optimization
-- ============================================================================

-- ============================================================================
-- PHASE 1: POI TABLE INDEXES
-- Optimize search and listing queries
-- ============================================================================

-- Full-text search index for POI name and description
-- Replaces slow LIKE '%search%' queries
ALTER TABLE `POI`
ADD FULLTEXT INDEX IF NOT EXISTS `idx_poi_fulltext_search` (`name`, `description`);

-- Composite index for listing queries (status + category + sorting)
ALTER TABLE `POI`
ADD INDEX IF NOT EXISTS `idx_poi_listing` (`is_active`, `verified`, `category`, `tier`, `poi_score` DESC);

-- Index for city-based filtering (common in tourist apps)
ALTER TABLE `POI`
ADD INDEX IF NOT EXISTS `idx_poi_city_category` (`city`, `category`, `is_active`);

-- Index for featured POIs (used in homepage)
ALTER TABLE `POI`
ADD INDEX IF NOT EXISTS `idx_poi_featured` (`featured`, `is_active`, `poi_score` DESC);

-- Index for tier-based update scheduling
ALTER TABLE `POI`
ADD INDEX IF NOT EXISTS `idx_poi_update_schedule` (`next_update_at`, `tier`);

-- Spatial index for geo-queries (if using MyISAM or InnoDB with spatial support)
-- Note: Requires POINT column, add if needed:
-- ALTER TABLE `POI` ADD COLUMN `location` POINT GENERATED ALWAYS AS (ST_POINT(longitude, latitude)) STORED;
-- ALTER TABLE `POI` ADD SPATIAL INDEX `idx_poi_location` (`location`);

-- ============================================================================
-- PHASE 2: BOOKING TABLE INDEXES
-- Optimize booking lookups and reporting
-- ============================================================================

-- Index for POI reference lookups
ALTER TABLE `bookings`
ADD INDEX IF NOT EXISTS `idx_bookings_poi` (`poi_id`);

-- Composite index for date-based booking queries
ALTER TABLE `bookings`
ADD INDEX IF NOT EXISTS `idx_bookings_date_range` (`visit_date`, `status`, `created_at`);

-- Index for customer lookups (support queries)
ALTER TABLE `bookings`
ADD INDEX IF NOT EXISTS `idx_bookings_customer_lookup` (`customer_email`, `customer_phone`);

-- Index for payment status filtering
ALTER TABLE `bookings`
ADD INDEX IF NOT EXISTS `idx_bookings_payment` (`payment_status`, `status`, `created_at` DESC);

-- Index for confirmation code lookups (fast ticket retrieval)
ALTER TABLE `bookings`
ADD INDEX IF NOT EXISTS `idx_bookings_confirmation` (`confirmation_code`);

-- ============================================================================
-- PHASE 3: TICKET TABLE INDEXES
-- Optimize ticket validation and lookups
-- ============================================================================

-- Index for booking reference
ALTER TABLE `tickets`
ADD INDEX IF NOT EXISTS `idx_tickets_booking` (`booking_id`);

-- Index for QR code/validation lookups
ALTER TABLE `tickets`
ADD INDEX IF NOT EXISTS `idx_tickets_validation` (`validation_code`, `status`);

-- Index for ticket number lookups
ALTER TABLE `tickets`
ADD INDEX IF NOT EXISTS `idx_tickets_number` (`ticket_number`);

-- Index for status-based queries (active tickets)
ALTER TABLE `tickets`
ADD INDEX IF NOT EXISTS `idx_tickets_status_valid` (`status`, `valid_from`, `valid_until`);

-- Index for holder email (ticket transfer, support)
ALTER TABLE `tickets`
ADD INDEX IF NOT EXISTS `idx_tickets_holder` (`holder_email`);

-- ============================================================================
-- PHASE 4: TRANSACTION TABLE INDEXES
-- Optimize payment reconciliation and reporting
-- ============================================================================

-- Index for Adyen PSP reference lookups
ALTER TABLE `transactions`
ADD INDEX IF NOT EXISTS `idx_transactions_psp` (`psp_reference`);

-- Index for date-based reporting
ALTER TABLE `transactions`
ADD INDEX IF NOT EXISTS `idx_transactions_reporting` (`created_at`, `status`, `payment_method`);

-- Index for resource lookups (booking/ticket transactions)
ALTER TABLE `transactions`
ADD INDEX IF NOT EXISTS `idx_transactions_resource` (`resource_type`, `resource_id`);

-- Index for customer transaction history
ALTER TABLE `transactions`
ADD INDEX IF NOT EXISTS `idx_transactions_customer` (`customer_email`, `created_at` DESC);

-- ============================================================================
-- PHASE 5: AVAILABILITY TABLE INDEXES
-- Optimize availability checks (critical for booking performance)
-- ============================================================================

-- Composite index for availability lookups (most common query)
CREATE TABLE IF NOT EXISTS `availability` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `poi_id` CHAR(36) NOT NULL,
  `date` DATE NOT NULL,
  `time_slot` VARCHAR(20),
  `total_capacity` INT DEFAULT 0,
  `booked_count` INT DEFAULT 0,
  `available_count` INT GENERATED ALWAYS AS (total_capacity - booked_count) STORED,
  `is_available` BOOLEAN GENERATED ALWAYS AS (available_count > 0) STORED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_availability_poi_date_slot` (`poi_id`, `date`, `time_slot`),
  INDEX `idx_availability_lookup` (`poi_id`, `date`, `is_available`),
  INDEX `idx_availability_date_range` (`date`, `is_available`)
);

-- ============================================================================
-- PHASE 6: USER/SESSION TABLE INDEXES
-- Optimize authentication and session lookups
-- ============================================================================

-- Index for email lookups (login)
ALTER TABLE `users`
ADD INDEX IF NOT EXISTS `idx_users_email` (`email`);

-- Index for session lookups
ALTER TABLE `sessions`
ADD INDEX IF NOT EXISTS `idx_sessions_token` (`token`);

-- Index for session expiry cleanup
ALTER TABLE `sessions`
ADD INDEX IF NOT EXISTS `idx_sessions_expiry` (`expires_at`);

-- ============================================================================
-- PHASE 7: AUDIT LOG INDEXES
-- Optimize audit trail queries
-- ============================================================================

ALTER TABLE `audit_log`
ADD INDEX IF NOT EXISTS `idx_audit_user` (`user_id`, `created_at` DESC),
ADD INDEX IF NOT EXISTS `idx_audit_action` (`action`, `created_at` DESC),
ADD INDEX IF NOT EXISTS `idx_audit_resource` (`resource_type`, `resource_id`);

-- ============================================================================
-- PHASE 8: POI Q&A INDEXES (HoliBot)
-- Optimize chatbot knowledge base queries
-- ============================================================================

ALTER TABLE `poi_qna`
ADD INDEX IF NOT EXISTS `idx_qna_poi` (`poi_id`),
ADD FULLTEXT INDEX IF NOT EXISTS `idx_qna_search` (`question`, `answer`);

-- ============================================================================
-- QUERY OPTIMIZATION VIEWS
-- Pre-computed views for common dashboard queries
-- ============================================================================

-- POI Statistics View (for admin dashboard)
CREATE OR REPLACE VIEW `v_poi_stats` AS
SELECT
    COUNT(*) AS total_pois,
    SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) AS verified_count,
    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_count,
    SUM(CASE WHEN featured = 1 THEN 1 ELSE 0 END) AS featured_count,
    AVG(rating) AS avg_rating,
    SUM(review_count) AS total_reviews,
    AVG(poi_score) AS avg_poi_score
FROM `POI`;

-- Daily Booking Statistics View
CREATE OR REPLACE VIEW `v_booking_stats_daily` AS
SELECT
    DATE(created_at) AS booking_date,
    COUNT(*) AS total_bookings,
    SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_count,
    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count,
    SUM(CASE WHEN payment_status = 'completed' THEN pricing_total ELSE 0 END) AS total_revenue,
    AVG(pricing_total) AS avg_booking_value
FROM `bookings`
GROUP BY DATE(created_at);

-- Active Tickets Summary View
CREATE OR REPLACE VIEW `v_active_tickets` AS
SELECT
    DATE(valid_from) AS ticket_date,
    COUNT(*) AS total_tickets,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_count,
    SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) AS used_count
FROM `tickets`
WHERE valid_from >= CURDATE() - INTERVAL 30 DAY
GROUP BY DATE(valid_from);

-- ============================================================================
-- MIGRATION COMPLETION
-- ============================================================================

-- Log migration
INSERT INTO `schema_migrations` (`version`, `name`, `executed_at`)
VALUES ('005', 'performance_indexes', NOW())
ON DUPLICATE KEY UPDATE `executed_at` = NOW();

SELECT 'Performance indexes migration 005 completed successfully' AS status;
