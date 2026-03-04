-- ============================================================================
-- Migration 012: Intermediary Transaction Module
-- Fase IV Blok B: Intermediair State Machine
-- Date: 2026-03-04
-- ============================================================================

-- Intermediary transactions (state machine: voorstel → toestemming → bevestiging → delen → reminder → review)
CREATE TABLE IF NOT EXISTS intermediary_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  destination_id INT NOT NULL,
  transaction_uuid CHAR(36) NOT NULL,
  transaction_number VARCHAR(30) NOT NULL,

  -- Relationships
  partner_id INT NOT NULL,
  poi_id INT NOT NULL,
  partner_poi_id INT,
  payment_transaction_id INT,

  -- State machine
  status ENUM('voorstel','toestemming','bevestiging','delen','reminder','review','cancelled','expired')
    NOT NULL DEFAULT 'voorstel',

  -- Service details
  service_type VARCHAR(100),
  service_description TEXT,
  activity_date DATE,
  activity_time TIME,

  -- Financial (CENTS, never floats)
  amount_cents INT NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_cents INT NOT NULL DEFAULT 0,
  partner_amount_cents INT NOT NULL DEFAULT 0,

  -- Guest info (GDPR-compliant)
  guest_name VARCHAR(255),
  guest_email VARCHAR(255),
  guest_phone VARCHAR(50),
  user_id INT,

  -- QR code
  qr_code_data VARCHAR(255),
  qr_validated BOOLEAN DEFAULT FALSE,
  qr_validated_at DATETIME,
  qr_validated_by VARCHAR(255),

  -- State transition timestamps
  proposed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  consented_at DATETIME,
  confirmed_at DATETIME,
  shared_at DATETIME,
  reminder_sent_at DATETIME,
  review_requested_at DATETIME,
  cancelled_at DATETIME,
  cancellation_reason VARCHAR(255),

  -- Metadata
  notes TEXT,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign keys
  FOREIGN KEY (destination_id) REFERENCES destinations(id),
  FOREIGN KEY (partner_id) REFERENCES partners(id),

  -- Unique keys
  UNIQUE KEY uk_transaction_uuid (transaction_uuid),
  UNIQUE KEY uk_transaction_number (transaction_number),

  -- Indexes
  INDEX idx_destination (destination_id),
  INDEX idx_partner (partner_id),
  INDEX idx_poi (poi_id),
  INDEX idx_status (status),
  INDEX idx_activity_date (activity_date),
  INDEX idx_guest_email (guest_email),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Extend payment_transactions.order_type to include 'intermediary'
ALTER TABLE payment_transactions
  MODIFY COLUMN order_type ENUM('ticket','reservation','booking','intermediary') NOT NULL;
