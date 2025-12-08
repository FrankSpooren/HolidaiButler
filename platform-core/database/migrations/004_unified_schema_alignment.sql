-- ============================================================================
-- HolidaiButler Database Schema Alignment Migration
-- Version: 004
-- Date: 2025-12-01
-- Description: Unified schema alignment across all modules
-- ============================================================================

-- ============================================================================
-- PHASE 1: POI TABLE ALIGNMENT
-- Admin-module POI -> Align with platform-core POI
-- ============================================================================

-- Add UUID column for cross-module references
ALTER TABLE `POI`
ADD COLUMN IF NOT EXISTS `uuid` CHAR(36) NOT NULL DEFAULT (UUID()) AFTER `id`,
ADD UNIQUE INDEX `idx_poi_uuid` (`uuid`);

-- Add missing platform-core fields
ALTER TABLE `POI`
ADD COLUMN IF NOT EXISTS `slug` VARCHAR(255) UNIQUE AFTER `name`,
ADD COLUMN IF NOT EXISTS `tier` TINYINT DEFAULT 4 COMMENT '1=realtime, 2=daily, 3=weekly, 4=monthly' AFTER `popularity_score`,
ADD COLUMN IF NOT EXISTS `poi_score` DECIMAL(4,2) DEFAULT 0.00 COMMENT 'Weighted score 0-10' AFTER `tier`,
ADD COLUMN IF NOT EXISTS `tourist_relevance` DECIMAL(3,2) DEFAULT 0.00 COMMENT '0-10 scale' AFTER `poi_score`,
ADD COLUMN IF NOT EXISTS `booking_frequency` INT DEFAULT 0 COMMENT 'Monthly average' AFTER `tourist_relevance`,
ADD COLUMN IF NOT EXISTS `tripadvisor_id` VARCHAR(255) AFTER `google_placeid`,
ADD COLUMN IF NOT EXISTS `thefork_id` VARCHAR(255) AFTER `tripadvisor_id`,
ADD COLUMN IF NOT EXISTS `booking_com_id` VARCHAR(255) AFTER `thefork_id`,
ADD COLUMN IF NOT EXISTS `getyourguide_id` VARCHAR(255) AFTER `booking_com_id`,
ADD COLUMN IF NOT EXISTS `last_classified_at` DATETIME AFTER `last_updated`,
ADD COLUMN IF NOT EXISTS `next_update_at` DATETIME AFTER `last_classified_at`;

-- Rename rating to average_rating for clarity (add alias column)
-- Note: We keep 'rating' for backwards compatibility and add 'average_rating' view
-- ALTER TABLE `POI` CHANGE COLUMN `rating` `average_rating` DECIMAL(3,2);

-- Add indexes for new fields
ALTER TABLE `POI`
ADD INDEX IF NOT EXISTS `idx_poi_tier` (`tier`),
ADD INDEX IF NOT EXISTS `idx_poi_score` (`poi_score`),
ADD INDEX IF NOT EXISTS `idx_poi_next_update` (`next_update_at`);

-- Generate UUIDs for existing records
UPDATE `POI` SET `uuid` = UUID() WHERE `uuid` IS NULL OR `uuid` = '';

-- ============================================================================
-- PHASE 2: BOOKING TABLE ALIGNMENT
-- Ensure compatible fields between admin-module and ticketing-module
-- ============================================================================

-- Add cross-reference fields to admin-module bookings (if table exists)
-- These allow linking to ticketing-module records

-- For admin-module bookings table
ALTER TABLE `bookings`
ADD COLUMN IF NOT EXISTS `poi_id` CHAR(36) AFTER `confirmation_code` COMMENT 'UUID reference to POI',
ADD COLUMN IF NOT EXISTS `adults_count` INT DEFAULT 1 AFTER `visit_participants`,
ADD COLUMN IF NOT EXISTS `children_count` INT DEFAULT 0 AFTER `adults_count`,
ADD COLUMN IF NOT EXISTS `infants_count` INT DEFAULT 0 AFTER `children_count`,
ADD COLUMN IF NOT EXISTS `partner_confirmation_number` VARCHAR(100) AFTER `confirmation_code`;

-- Add index for POI reference
ALTER TABLE `bookings`
ADD INDEX IF NOT EXISTS `idx_bookings_poi_id` (`poi_id`);

-- ============================================================================
-- PHASE 3: TICKET TABLE ALIGNMENT
-- Ensure compatible fields between admin-module and ticketing-module
-- ============================================================================

-- Add missing fields to admin-module tickets table
ALTER TABLE `tickets`
ADD COLUMN IF NOT EXISTS `qr_code_data` TEXT AFTER `qr_code` COMMENT 'Full QR payload',
ADD COLUMN IF NOT EXISTS `qr_code_image_url` VARCHAR(500) AFTER `qr_code_data`,
ADD COLUMN IF NOT EXISTS `is_transferred` BOOLEAN DEFAULT FALSE AFTER `status`,
ADD COLUMN IF NOT EXISTS `original_holder` VARCHAR(200) AFTER `is_transferred`,
ADD COLUMN IF NOT EXISTS `transferred_at` DATETIME AFTER `original_holder`,
ADD COLUMN IF NOT EXISTS `validation_code` VARCHAR(50) AFTER `transferred_at`,
ADD COLUMN IF NOT EXISTS `wallet_pass_url` VARCHAR(500) AFTER `validation_code`,
ADD COLUMN IF NOT EXISTS `wallet_pass_type` ENUM('apple', 'google', 'none') DEFAULT 'none';

-- Add indexes for new ticket fields
ALTER TABLE `tickets`
ADD INDEX IF NOT EXISTS `idx_tickets_transferred` (`is_transferred`),
ADD INDEX IF NOT EXISTS `idx_tickets_validation` (`validation_code`);

-- ============================================================================
-- PHASE 4: TRANSACTION TABLE ALIGNMENT
-- Ensure compatible fields between admin-module and payment-module
-- ============================================================================

-- Add Adyen-specific fields to admin-module transactions
ALTER TABLE `transactions`
ADD COLUMN IF NOT EXISTS `psp_reference` VARCHAR(100) UNIQUE AFTER `external_transaction_id` COMMENT 'Adyen pspReference',
ADD COLUMN IF NOT EXISTS `merchant_reference` VARCHAR(100) AFTER `psp_reference`,
ADD COLUMN IF NOT EXISTS `authorized_amount` DECIMAL(10,2) AFTER `total_amount`,
ADD COLUMN IF NOT EXISTS `captured_amount` DECIMAL(10,2) AFTER `authorized_amount`,
ADD COLUMN IF NOT EXISTS `refunded_amount` DECIMAL(10,2) AFTER `captured_amount`,
ADD COLUMN IF NOT EXISTS `authorized_at` DATETIME AFTER `refunded_amount`,
ADD COLUMN IF NOT EXISTS `captured_at` DATETIME AFTER `authorized_at`,
ADD COLUMN IF NOT EXISTS `resource_type` VARCHAR(50) AFTER `customer_phone` COMMENT 'ticket, restaurant, hotel, etc.',
ADD COLUMN IF NOT EXISTS `resource_id` CHAR(36) AFTER `resource_type`;

-- Add indexes for Adyen fields
ALTER TABLE `transactions`
ADD INDEX IF NOT EXISTS `idx_transactions_psp` (`psp_reference`),
ADD INDEX IF NOT EXISTS `idx_transactions_merchant_ref` (`merchant_reference`),
ADD INDEX IF NOT EXISTS `idx_transactions_resource` (`resource_type`, `resource_id`);

-- ============================================================================
-- PHASE 5: ENUM STANDARDIZATION
-- Update ENUM values to be consistent across modules
-- ============================================================================

-- Update booking status ENUM (if needed - requires careful migration)
-- Note: MySQL doesn't allow easy ENUM modification, these are reference only

-- Standard Booking Status values:
-- 'pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'refunded', 'expired'

-- Standard Payment Status values:
-- 'pending', 'authorized', 'paid', 'captured', 'failed', 'refunded', 'partially_refunded'

-- Standard Ticket Status values:
-- 'pending', 'active', 'used', 'transferred', 'expired', 'cancelled', 'refunded', 'invalid'

-- ============================================================================
-- PHASE 6: CREATE CROSS-MODULE VIEWS
-- Views for unified access to data across modules
-- ============================================================================

-- Unified POI view (combines data for read access)
CREATE OR REPLACE VIEW `unified_pois` AS
SELECT
    p.id,
    p.uuid,
    p.name,
    p.slug,
    p.description,
    p.category,
    p.subcategory,
    p.latitude,
    p.longitude,
    p.address,
    p.city,
    p.region,
    p.country,
    p.rating AS average_rating,
    p.review_count,
    p.price_level,
    p.phone,
    p.website,
    p.email,
    p.tier,
    p.poi_score,
    p.verified,
    p.is_active AS active,
    p.featured,
    p.thumbnail_url,
    p.google_placeid AS google_place_id,
    p.tripadvisor_id,
    p.thefork_id,
    p.created_at,
    p.updated_at
FROM `POI` p;

-- Unified Bookings view (combines admin and ticketing bookings)
CREATE OR REPLACE VIEW `unified_bookings` AS
SELECT
    b.id,
    b.booking_number AS booking_reference,
    b.confirmation_code,
    b.type AS product_type,
    b.customer_user_id AS user_id,
    CONCAT(b.customer_first_name, ' ', b.customer_last_name) AS customer_name,
    b.customer_email,
    b.customer_phone,
    b.visit_date AS booking_date,
    b.visit_time AS booking_time,
    b.pricing_total AS total_price,
    b.currency,
    b.status,
    b.payment_status,
    b.payment_transaction_id AS transaction_id,
    b.created_at,
    b.updated_at,
    'admin' AS source_module
FROM `bookings` b;

-- ============================================================================
-- PHASE 7: FOREIGN KEY CONSTRAINTS
-- Add referential integrity where missing
-- ============================================================================

-- Note: Foreign keys should be added carefully with proper data validation first
-- These are the recommended constraints to add:

-- FK: tickets.booking_id -> bookings.id
-- ALTER TABLE `tickets`
-- ADD CONSTRAINT `fk_tickets_booking`
-- FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT;

-- FK: tickets.poi_id -> POI.uuid
-- ALTER TABLE `tickets`
-- ADD CONSTRAINT `fk_tickets_poi`
-- FOREIGN KEY (`poi_id`) REFERENCES `POI`(`uuid`) ON DELETE RESTRICT;

-- FK: reservations.poi_id -> POI.uuid
-- ALTER TABLE `reservations`
-- ADD CONSTRAINT `fk_reservations_poi`
-- FOREIGN KEY (`poi_id`) REFERENCES `POI`(`uuid`) ON DELETE RESTRICT;

-- ============================================================================
-- PHASE 8: DATA MIGRATION HELPERS
-- Functions and procedures to help with data migration
-- ============================================================================

-- Procedure to generate slugs for POIs without them
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS `generate_poi_slugs`()
BEGIN
    UPDATE `POI`
    SET `slug` = LOWER(
        REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(name, ' ', '-'),
                    '''', ''
                ),
                '"', ''
            ),
            '&', 'and'
        )
    )
    WHERE `slug` IS NULL OR `slug` = '';
END //
DELIMITER ;

-- Procedure to calculate POI scores
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS `update_poi_scores`()
BEGIN
    UPDATE `POI` SET
        `poi_score` = ROUND(
            (LEAST(review_count / 100, 10) * 0.3) +
            ((COALESCE(rating, 0) / 5) * 10 * 0.2) +
            (COALESCE(tourist_relevance, 0) * 0.3) +
            (COALESCE(booking_frequency, 0) * 0.2)
        , 2),
        `tier` = CASE
            WHEN poi_score >= 8.5 THEN 1
            WHEN poi_score >= 7.0 THEN 2
            WHEN poi_score >= 5.0 THEN 3
            ELSE 4
        END
    WHERE 1=1;
END //
DELIMITER ;

-- ============================================================================
-- PHASE 9: INDEXES FOR PERFORMANCE
-- Additional indexes for common query patterns
-- ============================================================================

-- POI search indexes
ALTER TABLE `POI`
ADD FULLTEXT INDEX IF NOT EXISTS `idx_poi_search` (`name`, `description`, `address`);

-- Booking search indexes
ALTER TABLE `bookings`
ADD INDEX IF NOT EXISTS `idx_bookings_customer_search` (`customer_email`, `customer_phone`),
ADD INDEX IF NOT EXISTS `idx_bookings_date_status` (`visit_date`, `status`);

-- Transaction search indexes
ALTER TABLE `transactions`
ADD INDEX IF NOT EXISTS `idx_transactions_date_status` (`created_at`, `status`),
ADD INDEX IF NOT EXISTS `idx_transactions_customer` (`customer_email`);

-- ============================================================================
-- MIGRATION COMPLETION
-- ============================================================================

-- Log migration completion
INSERT INTO `schema_migrations` (`version`, `name`, `executed_at`)
VALUES ('004', 'unified_schema_alignment', NOW())
ON DUPLICATE KEY UPDATE `executed_at` = NOW();

SELECT 'Schema alignment migration 004 completed successfully' AS status;
