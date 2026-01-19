-- GDPR Agent Migration: Deletion Requests Table
-- Version: 010
-- Created: 2026-01-19
-- Purpose: Track GDPR Art. 17 deletion requests with 72h deadline

-- Create GDPR deletion requests table
CREATE TABLE IF NOT EXISTS gdpr_deletion_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(100) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    user_type ENUM('user', 'partner') DEFAULT 'user',
    reason VARCHAR(255) DEFAULT 'user_request',
    status ENUM('pending', 'in_progress', 'awaiting_approval', 'completed', 'partially_completed', 'failed', 'rejected') DEFAULT 'pending',

    -- Timestamps
    requested_at DATETIME NOT NULL,
    deadline DATETIME NOT NULL COMMENT '72 hours from request',
    started_at DATETIME DEFAULT NULL,
    completed_at DATETIME DEFAULT NULL,

    -- Approval workflow (for partners)
    approval_requested_at DATETIME DEFAULT NULL,
    approved_by INT DEFAULT NULL,
    approved_at DATETIME DEFAULT NULL,
    rejected_by INT DEFAULT NULL,
    rejection_reason TEXT DEFAULT NULL,
    rejected_at DATETIME DEFAULT NULL,

    -- Result tracking
    deletion_log JSON DEFAULT NULL,
    error_message TEXT DEFAULT NULL,

    -- Standard timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_status (status),
    INDEX idx_user_id (user_id),
    INDEX idx_deadline (deadline),
    INDEX idx_requested_at (requested_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment to table
ALTER TABLE gdpr_deletion_requests
COMMENT = 'GDPR Art. 17 deletion requests tracking with 72h deadline compliance';
