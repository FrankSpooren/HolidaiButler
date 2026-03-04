-- ============================================================================
-- Migration 013: Financial Process Module
-- Fase IV Blok C: Settlement batches, partner payouts, credit notes, audit log
-- Date: 2026-03-04
-- ============================================================================

-- Settlement batches — groups partner payouts for a settlement period
CREATE TABLE IF NOT EXISTS settlement_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  destination_id INT NOT NULL,
  batch_number VARCHAR(30) NOT NULL,

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- State machine
  status ENUM('draft','calculated','approved','processing','completed','cancelled')
    NOT NULL DEFAULT 'draft',

  -- Aggregated totals (CENTS)
  total_transaction_count INT NOT NULL DEFAULT 0,
  total_gross_cents INT NOT NULL DEFAULT 0,
  total_commission_cents INT NOT NULL DEFAULT 0,
  total_payout_cents INT NOT NULL DEFAULT 0,
  total_partner_count INT NOT NULL DEFAULT 0,

  -- State transition timestamps
  calculated_at DATETIME,
  approved_at DATETIME,
  approved_by VARCHAR(255),
  processing_at DATETIME,
  completed_at DATETIME,
  cancelled_at DATETIME,
  cancellation_reason VARCHAR(255),

  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (destination_id) REFERENCES destinations(id),
  UNIQUE KEY uk_batch_number (batch_number),
  INDEX idx_destination (destination_id),
  INDEX idx_status (status),
  INDEX idx_period (period_start, period_end),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Partner payouts — one row per partner per settlement batch
CREATE TABLE IF NOT EXISTS partner_payouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  destination_id INT NOT NULL,
  settlement_batch_id INT NOT NULL,
  partner_id INT NOT NULL,
  payout_number VARCHAR(30) NOT NULL,

  -- State machine
  status ENUM('pending','approved','processing','paid','failed','cancelled')
    NOT NULL DEFAULT 'pending',

  -- Financial (CENTS)
  transaction_count INT NOT NULL DEFAULT 0,
  gross_cents INT NOT NULL DEFAULT 0,
  commission_cents INT NOT NULL DEFAULT 0,
  payout_cents INT NOT NULL DEFAULT 0,

  -- Partner snapshot (frozen at payout creation)
  partner_iban VARCHAR(34),
  partner_company_name VARCHAR(255),
  partner_vat_number VARCHAR(20),

  -- State transition timestamps
  approved_at DATETIME,
  approved_by VARCHAR(255),
  paid_at DATETIME,
  paid_reference VARCHAR(255),
  failed_at DATETIME,
  failure_reason VARCHAR(255),
  cancelled_at DATETIME,

  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (destination_id) REFERENCES destinations(id),
  FOREIGN KEY (settlement_batch_id) REFERENCES settlement_batches(id),
  FOREIGN KEY (partner_id) REFERENCES partners(id),
  UNIQUE KEY uk_payout_number (payout_number),
  UNIQUE KEY uk_batch_partner (settlement_batch_id, partner_id),
  INDEX idx_destination (destination_id),
  INDEX idx_partner (partner_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Credit notes — HolidaiButler's commission invoices TO partners
CREATE TABLE IF NOT EXISTS credit_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  destination_id INT NOT NULL,
  partner_payout_id INT NOT NULL,
  partner_id INT NOT NULL,
  credit_note_number VARCHAR(30) NOT NULL,

  -- Period covered
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Financial (CENTS)
  subtotal_cents INT NOT NULL DEFAULT 0,
  vat_rate DECIMAL(5,2) NOT NULL DEFAULT 21.00,
  vat_cents INT NOT NULL DEFAULT 0,
  total_cents INT NOT NULL DEFAULT 0,

  -- Partner snapshot
  partner_company_name VARCHAR(255),
  partner_vat_number VARCHAR(20),
  partner_kvk_number VARCHAR(20),

  -- Status
  status ENUM('draft','final','voided') NOT NULL DEFAULT 'draft',
  finalized_at DATETIME,
  voided_at DATETIME,
  void_reason VARCHAR(255),

  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (destination_id) REFERENCES destinations(id),
  FOREIGN KEY (partner_payout_id) REFERENCES partner_payouts(id),
  FOREIGN KEY (partner_id) REFERENCES partners(id),
  UNIQUE KEY uk_credit_note_number (credit_note_number),
  INDEX idx_destination (destination_id),
  INDEX idx_partner (partner_id),
  INDEX idx_status (status),
  INDEX idx_period (period_start, period_end),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Financial audit log — immutable trail for all money-related state changes
CREATE TABLE IF NOT EXISTS financial_audit_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  destination_id INT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT NOT NULL,

  actor_type ENUM('admin','system','cron') NOT NULL DEFAULT 'admin',
  actor_email VARCHAR(255),

  old_status VARCHAR(50),
  new_status VARCHAR(50),
  amount_cents INT,
  details JSON,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_destination (destination_id),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_event_type (event_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Link intermediary transactions to settlement batches
ALTER TABLE intermediary_transactions
  ADD COLUMN settlement_batch_id INT DEFAULT NULL,
  ADD COLUMN partner_payout_id INT DEFAULT NULL,
  ADD INDEX idx_settlement_batch (settlement_batch_id),
  ADD INDEX idx_partner_payout (partner_payout_id);
