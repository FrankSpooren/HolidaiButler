-- ============================================================================
-- Migration 011: Partner Management Tables
-- Fase IV Blok A: Partner Management Module
-- Date: 2026-03-03
-- ============================================================================

-- Partners tabel (POI-eigenaars die meedoen aan het intermediair-programma)
CREATE TABLE IF NOT EXISTS partners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  destination_id INT NOT NULL,
  poi_id INT,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  iban VARCHAR(34),
  kvk_number VARCHAR(20),
  vat_number VARCHAR(20),
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  commission_type ENUM('percentage', 'fixed') DEFAULT 'percentage',
  contract_status ENUM('draft', 'pending', 'active', 'suspended', 'terminated') DEFAULT 'draft',
  contract_start_date DATE,
  contract_end_date DATE,
  onboarding_completed_at DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (destination_id) REFERENCES destinations(id),
  INDEX idx_destination (destination_id),
  INDEX idx_poi (poi_id),
  INDEX idx_contract_status (contract_status),
  INDEX idx_contact_email (contact_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Partner POI koppelingen (1 partner kan meerdere POIs beheren)
CREATE TABLE IF NOT EXISTS partner_pois (
  id INT AUTO_INCREMENT PRIMARY KEY,
  partner_id INT NOT NULL,
  poi_id INT NOT NULL,
  commission_override DECIMAL(5,2),
  services_offered JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
  UNIQUE KEY uk_partner_poi (partner_id, poi_id),
  INDEX idx_poi_id (poi_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Partner onboarding stappen
CREATE TABLE IF NOT EXISTS partner_onboarding (
  id INT AUTO_INCREMENT PRIMARY KEY,
  partner_id INT NOT NULL,
  step_name VARCHAR(100) NOT NULL,
  step_status ENUM('pending', 'completed', 'skipped') DEFAULT 'pending',
  completed_at DATETIME,
  completed_by VARCHAR(255),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
  INDEX idx_partner (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
