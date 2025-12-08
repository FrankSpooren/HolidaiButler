-- =====================================================
-- Ticketing Module - Database Migration (FIXED)
-- HolidaiButler Platform - MySQL (Hetzner pxoziy_db1)
-- Version: 1.0.1 - FIXED for INT(11) IDs
-- Created: 2025-11-17
-- =====================================================
-- NOTE: Changed from VARCHAR(36) UUIDs to INT(11) to match
-- existing Users and POI table structures
-- =====================================================

-- Set character set and collation
SET NAMES utf8mb4;
SET character_set_client = utf8mb4;

-- =====================================================
-- 1. BOOKINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS `bookings` (
  `id` INT(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `booking_reference` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Format: BK-YYYY-NNNNNN',
  `user_id` INT(11) NOT NULL COMMENT 'Reference to Users table',
  `poi_id` INT(11) NOT NULL COMMENT 'Reference to POI table',
  `status` ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no-show', 'expired') NOT NULL DEFAULT 'pending',

  -- Booking Details
  `booking_date` DATE NOT NULL,
  `booking_time` TIME NULL COMMENT 'Format: HH:MM',
  `duration_minutes` INT NULL COMMENT 'Duration in minutes',
  `adults` INT NOT NULL DEFAULT 0,
  `children` INT NOT NULL DEFAULT 0,
  `infants` INT NOT NULL DEFAULT 0,
  `special_requests` TEXT NULL,

  -- Pricing (JSON)
  `pricing` JSON NOT NULL COMMENT 'Contains basePrice, taxes, fees, discount, totalPrice, currency, commission',

  -- Payment
  `payment_status` ENUM('pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded') NOT NULL DEFAULT 'pending',
  `payment_method` VARCHAR(50) NULL COMMENT 'card, ideal, paypal, etc.',
  `transaction_id` VARCHAR(100) NULL COMMENT 'Payment transaction reference',
  `paid_at` DATETIME NULL,

  -- Tickets
  `ticket_ids` JSON NULL DEFAULT (JSON_ARRAY()) COMMENT 'Array of ticket IDs',
  `delivery_method` ENUM('email', 'sms', 'app', 'wallet') NOT NULL DEFAULT 'email',
  `delivered_at` DATETIME NULL,

  -- Experience (JSON)
  `experience` JSON NULL COMMENT 'productType, meetingPoint, duration, language, groupSize',

  -- Cancellation (JSON)
  `cancellation` JSON NULL COMMENT 'allowCancellation, deadline, policy, cancelledAt, cancelledBy, reason',

  -- Voucher (JSON)
  `voucher` JSON NULL COMMENT 'code, discountAmount, discountPercentage',

  -- Partner (JSON)
  `partner` JSON NULL COMMENT 'name, email, confirmationMethod, confirmedAt, externalReference',

  -- AI Context (JSON)
  `ai_context` JSON NULL COMMENT 'generatedFromMessage, recommendationScore, conversationContext',

  -- Reservation Lock (JSON)
  `reservation` JSON NULL COMMENT 'isLocked, lockedUntil, lockId',

  -- Guest Information
  `guest_name` VARCHAR(200) NOT NULL,
  `guest_email` VARCHAR(200) NOT NULL,
  `guest_phone` VARCHAR(50) NULL,
  `guest_nationality` VARCHAR(2) NULL COMMENT 'ISO 3166-1 alpha-2',

  -- Metadata (JSON)
  `metadata` JSON NULL COMMENT 'source, ipAddress, userAgent',

  -- Timestamps
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX `idx_booking_ref` (`booking_reference`),
  INDEX `idx_user_status` (`user_id`, `status`),
  INDEX `idx_poi_date` (`poi_id`, `booking_date`),
  INDEX `idx_transaction` (`transaction_id`),
  INDEX `idx_status_created` (`status`, `created_at`),

  -- Foreign Keys - FIXED table names (Users, POI)
  CONSTRAINT `fk_bookings_user` FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bookings_poi` FOREIGN KEY (`poi_id`) REFERENCES `POI`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ticketing module - Bookings';

-- =====================================================
-- 2. TICKETS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS `tickets` (
  `id` INT(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `ticket_number` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Format: HB-YYYY-NNNNNN',
  `booking_id` INT(11) NOT NULL COMMENT 'Reference to bookings table',
  `user_id` INT(11) NOT NULL COMMENT 'Reference to Users table',
  `poi_id` INT(11) NOT NULL COMMENT 'Reference to POI table',
  `type` ENUM('single', 'multi-day', 'group', 'guided-tour', 'experience', 'combo') NOT NULL,

  -- Validity
  `valid_from` DATETIME NOT NULL,
  `valid_until` DATETIME NOT NULL,
  `timeslot` VARCHAR(20) NULL COMMENT 'Format: HH:MM-HH:MM',
  `timezone` VARCHAR(50) NOT NULL DEFAULT 'Europe/Amsterdam',

  -- QR Code
  `qr_code_data` TEXT NOT NULL COMMENT 'Encrypted payload for verification',
  `qr_code_image_url` VARCHAR(500) NULL COMMENT 'S3/CloudFront URL',
  `qr_code_format` ENUM('QR', 'Barcode128') NOT NULL DEFAULT 'QR',

  -- Holder
  `holder_name` VARCHAR(200) NOT NULL,
  `holder_email` VARCHAR(200) NOT NULL,
  `holder_phone` VARCHAR(50) NULL,

  -- Details (JSON)
  `details` JSON NOT NULL COMMENT 'productName, description, quantity, language, specialRequirements',

  -- Validation
  `is_validated` BOOLEAN NOT NULL DEFAULT FALSE,
  `validated_at` DATETIME NULL,
  `validated_by` VARCHAR(100) NULL COMMENT 'Staff member ID or device ID',
  `validation_location` VARCHAR(200) NULL COMMENT 'GPS coordinates or location identifier',

  -- Status
  `status` ENUM('active', 'used', 'expired', 'cancelled', 'refunded') NOT NULL DEFAULT 'active',

  -- Mobile Wallet
  `apple_wallet_url` VARCHAR(500) NULL,
  `google_pay_url` VARCHAR(500) NULL,

  -- Metadata (JSON)
  `metadata` JSON NULL COMMENT 'source, isTransferred, originalHolder',

  -- Timestamps
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX `idx_ticket_number` (`ticket_number`),
  INDEX `idx_booking_id` (`booking_id`),
  INDEX `idx_user_status` (`user_id`, `status`),
  INDEX `idx_poi_date` (`poi_id`, `valid_from`),
  INDEX `idx_qr_code` (`qr_code_data`(255)),
  INDEX `idx_status_validity` (`status`, `valid_until`),
  INDEX `idx_validated` (`is_validated`),

  -- Foreign Keys - FIXED table names
  CONSTRAINT `fk_tickets_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tickets_user` FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tickets_poi` FOREIGN KEY (`poi_id`) REFERENCES `POI`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ticketing module - Digital tickets';

-- =====================================================
-- 3. AVAILABILITY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS `availability` (
  `id` INT(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `poi_id` INT(11) NOT NULL COMMENT 'Reference to POI table',
  `date` DATE NOT NULL,
  `timeslot` VARCHAR(20) NULL COMMENT 'Format: HH:MM-HH:MM, NULL for all-day',

  -- Capacity Management
  `total_capacity` INT NOT NULL DEFAULT 0,
  `booked_capacity` INT NOT NULL DEFAULT 0,
  `reserved_capacity` INT NOT NULL DEFAULT 0 COMMENT 'Pending payments (15 min lock)',
  `available_capacity` INT NOT NULL DEFAULT 0 COMMENT 'Computed: total - booked - reserved',

  -- Pricing
  `base_price` DECIMAL(10,2) NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'EUR',
  `dynamic_price_multiplier` DECIMAL(3,2) NOT NULL DEFAULT 1.00 COMMENT 'Demand-based multiplier (0.50-3.00)',
  `final_price` DECIMAL(10,2) NULL COMMENT 'Computed: base * multiplier',

  -- Booking Restrictions
  `min_booking` INT NOT NULL DEFAULT 1,
  `max_booking` INT NOT NULL DEFAULT 10,
  `cutoff_hours` INT NOT NULL DEFAULT 2 COMMENT 'Hours before event when booking closes',

  -- Status
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `is_sold_out` BOOLEAN NOT NULL DEFAULT FALSE,

  -- Partner Sync (JSON)
  `partner_sync` JSON NULL COMMENT 'lastSyncedAt, externalInventoryId, syncEnabled',

  -- Metadata (JSON)
  `metadata` JSON NULL COMMENT 'createdBy (system/admin/partner-sync), notes',

  -- Timestamps
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  UNIQUE INDEX `idx_poi_date_timeslot` (`poi_id`, `date`, `timeslot`),
  INDEX `idx_date_active` (`date`, `is_active`),
  INDEX `idx_poi_date_soldout` (`poi_id`, `date`, `is_sold_out`),
  INDEX `idx_poi_id` (`poi_id`),

  -- Foreign Keys - FIXED table name
  CONSTRAINT `fk_availability_poi` FOREIGN KEY (`poi_id`) REFERENCES `POI`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ticketing module - Availability & capacity management';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT
  '✅ Ticketing Module Tables Created Successfully!' AS Status,
  'bookings, tickets, availability' AS Tables_Created,
  'INT(11) IDs used to match platform schema' AS Note,
  NOW() AS Migration_Completed;
