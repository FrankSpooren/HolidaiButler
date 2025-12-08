-- =====================================================
-- Restaurant Reservations Module - Database Migration
-- HolidaiButler Platform - MySQL (Hetzner pxoziy_db1)
-- Version: 1.0.0
-- Created: 2025-11-17
-- =====================================================

-- Set character set and collation
SET NAMES utf8mb4;
SET character_set_client = utf8mb4;

-- =====================================================
-- 1. RESTAURANTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS `restaurants` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',

  -- Basic Info
  `name` VARCHAR(200) NOT NULL,
  `slug` VARCHAR(200) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `cuisine_type` VARCHAR(100) NULL COMMENT 'Italian, French, Asian, Dutch, etc.',
  `price_range` ENUM('€', '€€', '€€€', '€€€€') NOT NULL DEFAULT '€€',

  -- Location
  `address_line1` VARCHAR(200) NULL,
  `address_line2` VARCHAR(200) NULL,
  `city` VARCHAR(100) NULL,
  `postal_code` VARCHAR(20) NULL,
  `country` VARCHAR(2) NOT NULL DEFAULT 'NL' COMMENT 'ISO 3166-1 alpha-2',
  `latitude` DECIMAL(10,8) NULL,
  `longitude` DECIMAL(11,8) NULL,

  -- Contact
  `phone` VARCHAR(50) NULL,
  `email` VARCHAR(200) NULL,
  `website` VARCHAR(500) NULL,

  -- Media
  `logo_url` VARCHAR(500) NULL,
  `cover_image_url` VARCHAR(500) NULL,
  `gallery_images` JSON NULL DEFAULT (JSON_ARRAY()),

  -- Operating Hours (JSON)
  `opening_hours` JSON NOT NULL COMMENT 'Opening hours per day of week',

  -- Reservation Settings
  `advance_booking_days` INT NOT NULL DEFAULT 90,
  `min_party_size` INT NOT NULL DEFAULT 1,
  `max_party_size` INT NOT NULL DEFAULT 12,
  `default_seating_duration` INT NOT NULL DEFAULT 90 COMMENT 'Minutes',
  `time_slot_interval` INT NOT NULL DEFAULT 15 COMMENT 'Minutes',

  -- Cancellation Policy
  `cancellation_deadline_hours` INT NOT NULL DEFAULT 24,
  `no_show_fee` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `deposit_required` BOOLEAN NOT NULL DEFAULT FALSE,
  `deposit_amount` DECIMAL(10,2) NULL COMMENT 'Fixed amount per person',
  `deposit_percentage` INT NULL COMMENT 'Percentage of estimated bill',

  -- Features (JSON)
  `features` JSON NULL DEFAULT (JSON_ARRAY()) COMMENT 'outdoor_seating, wheelchair_accessible, parking, wifi',

  -- Integrations
  `pos_system` VARCHAR(50) NULL COMMENT 'toast, square, lightspeed',
  `pos_integration_enabled` BOOLEAN NOT NULL DEFAULT FALSE,
  `thefork_restaurant_id` VARCHAR(100) NULL,
  `google_place_id` VARCHAR(100) NULL,

  -- Status
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `is_accepting_reservations` BOOLEAN NOT NULL DEFAULT TRUE,
  `is_featured` BOOLEAN NOT NULL DEFAULT FALSE,

  -- Analytics
  `average_rating` DECIMAL(3,2) NULL,
  `total_reviews` INT NOT NULL DEFAULT 0,
  `total_reservations` INT NOT NULL DEFAULT 0,

  -- Metadata
  `created_by` VARCHAR(36) NULL,

  -- Timestamps
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX `idx_location` (`city`, `cuisine_type`),
  INDEX `idx_active` (`is_active`, `is_accepting_reservations`),
  INDEX `idx_featured` (`is_featured`, `average_rating`),
  INDEX `idx_slug` (`slug`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Restaurant Reservations - Restaurant profiles';

-- =====================================================
-- 2. TABLES TABLE (Restaurant Tables)
-- =====================================================

CREATE TABLE IF NOT EXISTS `tables` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `restaurant_id` VARCHAR(36) NOT NULL,
  `table_number` VARCHAR(20) NOT NULL,

  -- Capacity
  `min_capacity` INT NOT NULL DEFAULT 2,
  `max_capacity` INT NOT NULL DEFAULT 4,

  -- Location in Restaurant
  `area` ENUM('main_dining', 'bar', 'outdoor', 'private', 'terrace') NOT NULL DEFAULT 'main_dining',
  `floor_plan_x` INT NULL COMMENT 'X coordinate on floor plan',
  `floor_plan_y` INT NULL COMMENT 'Y coordinate on floor plan',

  -- Properties (JSON)
  `properties` JSON NULL COMMENT 'window_seat, booth, high_top, wheelchair_accessible',

  -- Combination Settings
  `is_combinable` BOOLEAN NOT NULL DEFAULT FALSE,
  `combination_priority` INT NOT NULL DEFAULT 0 COMMENT 'Lower = combine first',

  -- Status
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,

  -- Timestamps
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX `idx_restaurant` (`restaurant_id`),
  INDEX `idx_restaurant_area` (`restaurant_id`, `area`),
  INDEX `idx_capacity` (`min_capacity`, `max_capacity`),
  INDEX `idx_active` (`is_active`),

  -- Foreign Keys
  CONSTRAINT `fk_tables_restaurant` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Restaurant Reservations - Physical tables';

-- =====================================================
-- 3. GUESTS TABLE (CRM)
-- =====================================================

CREATE TABLE IF NOT EXISTS `guests` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',

  -- Basic Info
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(200) NOT NULL UNIQUE,
  `phone` VARCHAR(50) NULL,

  -- Demographics
  `birthday` DATE NULL,
  `language` VARCHAR(2) NULL DEFAULT 'nl' COMMENT 'ISO 639-1',

  -- Preferences (JSON)
  `preferences` JSON NULL COMMENT 'dietaryRestrictions, seatingPreferences, specialRequests',

  -- Marketing
  `marketing_opt_in` BOOLEAN NOT NULL DEFAULT FALSE,

  -- Statistics
  `total_reservations` INT NOT NULL DEFAULT 0,
  `completed_reservations` INT NOT NULL DEFAULT 0,
  `cancelled_reservations` INT NOT NULL DEFAULT 0,
  `no_shows` INT NOT NULL DEFAULT 0,
  `total_spent` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `average_party_size` DECIMAL(3,1) NULL,
  `last_visit_date` DATE NULL,

  -- VIP Status
  `is_vip` BOOLEAN NOT NULL DEFAULT FALSE,
  `vip_level` ENUM('bronze', 'silver', 'gold', 'platinum') NULL,
  `vip_notes` TEXT NULL,

  -- Tags (JSON)
  `tags` JSON NULL DEFAULT (JSON_ARRAY()) COMMENT 'Array of tags for segmentation',

  -- Timestamps
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX `idx_email` (`email`),
  INDEX `idx_phone` (`phone`),
  INDEX `idx_name` (`last_name`, `first_name`),
  INDEX `idx_vip` (`is_vip`, `vip_level`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Restaurant Reservations - Guest CRM';

-- =====================================================
-- 4. GUEST_NOTES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS `guest_notes` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `guest_id` VARCHAR(36) NOT NULL,
  `restaurant_id` VARCHAR(36) NOT NULL,
  `note` TEXT NOT NULL,
  `category` ENUM('general', 'allergy', 'preference', 'complaint', 'compliment', 'vip') NOT NULL DEFAULT 'general',
  `is_alert` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Show alert when guest books',
  `created_by` VARCHAR(36) NULL COMMENT 'Staff member who created note',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX `idx_guest` (`guest_id`),
  INDEX `idx_restaurant` (`restaurant_id`),
  INDEX `idx_alert` (`is_alert`),

  -- Foreign Keys
  CONSTRAINT `fk_guest_notes_guest` FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_guest_notes_restaurant` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Restaurant Reservations - Staff notes about guests';

-- =====================================================
-- 5. RESERVATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS `reservations` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `reservation_number` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Format: RES-YYYY-NNNNNN',
  `restaurant_id` VARCHAR(36) NOT NULL,
  `guest_id` VARCHAR(36) NOT NULL,

  -- Reservation Details
  `reservation_date` DATE NOT NULL,
  `reservation_time` TIME NOT NULL,
  `party_size` INT NOT NULL,
  `duration_minutes` INT NOT NULL DEFAULT 90,

  -- Table Assignment
  `table_ids` JSON NULL COMMENT 'Array of assigned table IDs',

  -- Status
  `status` ENUM('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'pending',

  -- Guest Requests
  `special_requests` TEXT NULL,
  `occasion` VARCHAR(100) NULL COMMENT 'birthday, anniversary, business, date',

  -- Payment
  `deposit_required` BOOLEAN NOT NULL DEFAULT FALSE,
  `deposit_amount` DECIMAL(10,2) NULL,
  `deposit_paid` BOOLEAN NOT NULL DEFAULT FALSE,
  `deposit_transaction_id` VARCHAR(100) NULL,

  -- Source
  `source` ENUM('website', 'phone', 'walk-in', 'thefork', 'google', 'instagram', 'admin') NOT NULL DEFAULT 'website',
  `external_booking_id` VARCHAR(100) NULL,

  -- Cancellation
  `cancelled_at` DATETIME NULL,
  `cancelled_by` VARCHAR(100) NULL,
  `cancellation_reason` TEXT NULL,

  -- Confirmation
  `confirmed_at` DATETIME NULL,
  `confirmation_sent_at` DATETIME NULL,
  `reminder_sent_at` DATETIME NULL,

  -- Metadata (JSON)
  `metadata` JSON NULL COMMENT 'ip_address, user_agent, notes',

  -- Timestamps
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX `idx_reservation_number` (`reservation_number`),
  INDEX `idx_restaurant_date` (`restaurant_id`, `reservation_date`),
  INDEX `idx_guest` (`guest_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_date_time` (`reservation_date`, `reservation_time`),

  -- Foreign Keys
  CONSTRAINT `fk_reservations_restaurant` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reservations_guest` FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Restaurant Reservations - Bookings';

-- =====================================================
-- 6. WAITLIST TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS `waitlist` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `restaurant_id` VARCHAR(36) NOT NULL,
  `guest_id` VARCHAR(36) NOT NULL,
  `desired_date` DATE NOT NULL,
  `desired_time` TIME NOT NULL,
  `party_size` INT NOT NULL,
  `status` ENUM('active', 'notified', 'booked', 'expired', 'cancelled') NOT NULL DEFAULT 'active',
  `notify_by` ENUM('email', 'sms', 'both') NOT NULL DEFAULT 'email',
  `notified_at` DATETIME NULL,
  `expires_at` DATETIME NOT NULL COMMENT 'Auto-expire after 48 hours',

  -- Timestamps
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX `idx_restaurant_date` (`restaurant_id`, `desired_date`),
  INDEX `idx_guest` (`guest_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_expires` (`expires_at`),

  -- Foreign Keys
  CONSTRAINT `fk_waitlist_restaurant` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_waitlist_guest` FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Restaurant Reservations - Waitlist management';

-- =====================================================
-- 7. FLOOR_PLANS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS `floor_plans` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `restaurant_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `image_url` VARCHAR(500) NULL,
  `width` INT NOT NULL DEFAULT 1000 COMMENT 'Canvas width in pixels',
  `height` INT NOT NULL DEFAULT 800 COMMENT 'Canvas height in pixels',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,

  -- Timestamps
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX `idx_restaurant` (`restaurant_id`),

  -- Foreign Keys
  CONSTRAINT `fk_floor_plans_restaurant` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Restaurant Reservations - Visual floor plans';

-- =====================================================
-- 8. RESTAURANT_AVAILABILITY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS `restaurant_availability` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `restaurant_id` VARCHAR(36) NOT NULL,
  `date` DATE NOT NULL,
  `time_slot` TIME NOT NULL,
  `total_capacity` INT NOT NULL COMMENT 'Total covers available',
  `booked_capacity` INT NOT NULL DEFAULT 0,
  `available_capacity` INT NOT NULL,
  `is_available` BOOLEAN NOT NULL DEFAULT TRUE,

  -- Timestamps
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  UNIQUE INDEX `idx_restaurant_date_time` (`restaurant_id`, `date`, `time_slot`),
  INDEX `idx_date_available` (`date`, `is_available`),

  -- Foreign Keys
  CONSTRAINT `fk_rest_avail_restaurant` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Restaurant Reservations - Real-time availability';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT
  '✅ Restaurant Reservations Module Tables Created Successfully!' AS Status,
  'restaurants, tables, guests, guest_notes, reservations, waitlist, floor_plans, restaurant_availability' AS Tables_Created,
  NOW() AS Migration_Completed;
