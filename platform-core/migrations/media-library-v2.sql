-- ============================================
-- MEDIA LIBRARY v2.0 — Schema Uitbreiding
-- Datum: 11 april 2026
-- ============================================

-- 1. ALTER TABLE media — nieuwe kolommen
ALTER TABLE media
  ADD COLUMN description TEXT NULL AFTER alt_text,
  ADD COLUMN description_en TEXT NULL AFTER description,
  ADD COLUMN description_de TEXT NULL AFTER description_en,
  ADD COLUMN description_es TEXT NULL AFTER description_de,
  ADD COLUMN description_fr TEXT NULL AFTER description_es,
  ADD COLUMN tags JSON NULL AFTER description_fr,
  ADD COLUMN tags_ai JSON NULL AFTER tags,
  ADD COLUMN owner_name VARCHAR(255) NULL AFTER tags_ai,
  ADD COLUMN owner_email VARCHAR(255) NULL AFTER owner_name,
  ADD COLUMN usage_rights ENUM('internal','online','offline','commercial','informational','all') DEFAULT 'all' AFTER owner_email,
  ADD COLUMN license_type ENUM('own','stock_pexels','stock_flickr','stock_unsplash','creative_commons','rights_managed') DEFAULT 'own' AFTER usage_rights,
  ADD COLUMN license_expiry DATE NULL AFTER license_type,
  ADD COLUMN consent_status ENUM('not_required','pending','approved','expired') DEFAULT 'not_required' AFTER license_expiry,
  ADD COLUMN consent_form_url VARCHAR(500) NULL AFTER consent_status,
  ADD COLUMN media_type ENUM('image','video','reel','gpx','pdf','audio') DEFAULT 'image' AFTER consent_form_url,
  ADD COLUMN original_date DATETIME NULL AFTER media_type,
  ADD COLUMN location_lat DECIMAL(10,7) NULL AFTER original_date,
  ADD COLUMN location_lng DECIMAL(10,7) NULL AFTER location_lat,
  ADD COLUMN location_name VARCHAR(255) NULL AFTER location_lng,
  ADD COLUMN quality_tier ENUM('low','medium','high','ultra') DEFAULT 'medium' AFTER location_name,
  ADD COLUMN perceptual_hash VARCHAR(64) NULL AFTER quality_tier,
  ADD COLUMN ai_processed TINYINT(1) DEFAULT 0 AFTER perceptual_hash,
  ADD COLUMN ai_badge TINYINT(1) DEFAULT 0 AFTER ai_processed,
  ADD COLUMN version_number INT DEFAULT 1 AFTER ai_badge,
  ADD COLUMN archived TINYINT(1) DEFAULT 0 AFTER version_number,
  ADD COLUMN download_count INT DEFAULT 0 AFTER archived,
  ADD COLUMN usage_count INT DEFAULT 0 AFTER download_count,
  ADD COLUMN last_used_at DATETIME NULL AFTER usage_count;

-- 2. Indexes op media
ALTER TABLE media
  ADD INDEX idx_media_phash (perceptual_hash),
  ADD INDEX idx_media_dest_type_arch (destination_id, media_type, archived),
  ADD INDEX idx_media_dest_quality (destination_id, quality_tier),
  ADD INDEX idx_media_license_expiry (license_expiry),
  ADD INDEX idx_media_consent (consent_status);

ALTER TABLE media
  ADD FULLTEXT INDEX ft_media_search (alt_text, description, owner_name, location_name);

-- 3. Nieuwe tabel: media_collections
CREATE TABLE IF NOT EXISTS media_collections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  destination_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  cover_media_id INT NULL,
  share_token VARCHAR(64) NULL UNIQUE,
  share_password_hash VARCHAR(255) NULL,
  is_public TINYINT(1) DEFAULT 0,
  created_by VARCHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cover_media_id) REFERENCES media(id) ON DELETE SET NULL,
  INDEX idx_mc_dest (destination_id),
  INDEX idx_mc_share (share_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Nieuwe tabel: media_collection_items
CREATE TABLE IF NOT EXISTS media_collection_items (
  collection_id INT NOT NULL,
  media_id INT NOT NULL,
  sort_order INT DEFAULT 0,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (collection_id, media_id),
  FOREIGN KEY (collection_id) REFERENCES media_collections(id) ON DELETE CASCADE,
  FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Nieuwe tabel: media_versions
CREATE TABLE IF NOT EXISTS media_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  media_id INT NOT NULL,
  version_number INT NOT NULL,
  filename VARCHAR(500) NOT NULL,
  size_bytes INT NOT NULL,
  width INT NULL,
  height INT NULL,
  changed_by VARCHAR(36) NOT NULL,
  change_description VARCHAR(500) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
  INDEX idx_mv_media (media_id, version_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Nieuwe tabel: media_audit_log
CREATE TABLE IF NOT EXISTS media_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  media_id INT NULL,
  collection_id INT NULL,
  action ENUM('upload','view','download','edit','share','delete','tag','rights_change','collection_create','collection_share') NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mal_media (media_id, created_at),
  INDEX idx_mal_user (user_id, created_at),
  INDEX idx_mal_action (action, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
