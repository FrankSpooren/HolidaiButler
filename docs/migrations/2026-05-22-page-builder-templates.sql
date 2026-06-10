-- Migration: page_builder_templates tabel voor BLOK F6 block-template library
-- Datum: 2026-05-22

CREATE TABLE IF NOT EXISTS page_builder_templates (
  id INT(11) NOT NULL AUTO_INCREMENT,
  destination_id INT(11) DEFAULT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  block_type VARCHAR(64) NOT NULL,
  block_payload LONGTEXT NOT NULL CHECK (json_valid(block_payload)),
  thumbnail VARCHAR(500) DEFAULT NULL,
  is_global TINYINT(1) DEFAULT 0,
  category VARCHAR(50) DEFAULT 'content',
  created_by INT(11) DEFAULT NULL,
  use_count INT(11) DEFAULT 0,
  last_used_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT current_timestamp(),
  updated_at TIMESTAMP NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (id),
  KEY idx_destination_block_type (destination_id, block_type),
  KEY idx_is_global_block_type (is_global, block_type),
  CONSTRAINT fk_pbt_destination FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rollback: DROP TABLE page_builder_templates;
