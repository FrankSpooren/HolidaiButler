-- Create POI_ImportExportHistory table for tracking CSV import/export operations
-- HolidaiButler Admin Module - CSV Import/Export Feature

CREATE TABLE IF NOT EXISTS POI_ImportExportHistory (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- User who performed the operation
  user_id INT NOT NULL,

  -- Operation details
  operation_type ENUM('import', 'export') NOT NULL,
  file_name VARCHAR(255) DEFAULT NULL,

  -- Statistics
  total_rows INT DEFAULT 0,
  successful_rows INT DEFAULT 0,
  failed_rows INT DEFAULT 0,

  -- Error tracking (stored as JSON for detailed error messages)
  error_log JSON DEFAULT NULL COMMENT 'Array of errors: [{row, field, message}]',

  -- Operation status
  status ENUM('processing', 'completed', 'failed') DEFAULT 'processing',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,

  -- Indexes for performance
  INDEX idx_user_id (user_id),
  INDEX idx_operation_type (operation_type),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),

  -- Foreign key to AdminUsers table
  FOREIGN KEY (user_id) REFERENCES AdminUsers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
