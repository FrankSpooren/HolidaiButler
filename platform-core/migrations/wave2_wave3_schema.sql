-- Wave 2 + Wave 3 Database Migrations
-- Execute on Hetzner: mysql --no-defaults -u pxoziy_1 -p pxoziy_db1 < wave2_wave3_schema.sql
-- Date: 2026-03-07

-- W2.1: Page Hierarchy (parent_id)
ALTER TABLE pages ADD COLUMN parent_id INT DEFAULT NULL AFTER sort_order;
ALTER TABLE pages ADD FOREIGN KEY fk_pages_parent (parent_id) REFERENCES pages(id) ON DELETE SET NULL;

-- W2.4: OG Image Upload (og_image_path)
ALTER TABLE pages ADD COLUMN og_image_path VARCHAR(500) DEFAULT NULL AFTER og_image_url;

-- W2.5: Media Library
CREATE TABLE IF NOT EXISTS media (
  id INT AUTO_INCREMENT PRIMARY KEY,
  destination_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  mime_type VARCHAR(100),
  size_bytes INT,
  width INT,
  height INT,
  category ENUM('branding','pages','pois','video','documents','other') DEFAULT 'other',
  alt_text VARCHAR(500),
  uploaded_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (destination_id) REFERENCES destinations(id),
  INDEX idx_media_dest_cat (destination_id, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- W3.2: Page Revisions
CREATE TABLE IF NOT EXISTS page_revisions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page_id INT NOT NULL,
  layout JSON NOT NULL,
  title_nl VARCHAR(255),
  changed_by INT,
  change_summary VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
  INDEX idx_page_rev_date (page_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
