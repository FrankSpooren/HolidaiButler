-- =====================================================================
-- Migration 009: Workflow Configurations Schema (Fase B prep)
-- =====================================================================
-- Purpose:
--   Per-tenant workflow customization storage.
--   Schema-only — geactiveerd in Fase B na 5e destination.
--
--   Example use: corporate tenant wil 3-step review (legal → marketing → ceo),
--   small tenant wil 1-step approve.
--
-- Author: HolidaiButler Platform Team
-- Date: 2026-05-14
-- =====================================================================

CREATE TABLE IF NOT EXISTS workflow_configurations (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  destination_id  INT NOT NULL,
  organization_id BIGINT NULL                         COMMENT 'Future: link to organizations table when multi-org per destination',
  workflow_type   VARCHAR(50) NOT NULL DEFAULT 'content_approval'
                    COMMENT 'e.g. content_approval, payment_approval, etc.',
  transitions     JSON NOT NULL
                    COMMENT 'FSM transitions map: { "draft": ["pending_review","approved","rejected"], "approved": ["scheduled","publishing"], ... }',
  approval_steps  JSON NOT NULL DEFAULT (JSON_ARRAY())
                    COMMENT 'Ordered review steps: [{role: "legal", required: true}, {role: "marketing", required: true}]',
  publish_rules   JSON NULL
                    COMMENT 'Publishing constraints: { min_score: 70, require_image: true, allowed_times: [...] }',
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE
                    COMMENT 'Mark default workflow if multiple per destination',
  description     TEXT NULL,
  created_by_user_id VARCHAR(36) NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_dest_org_type (destination_id, organization_id, workflow_type),
  INDEX idx_dest_enabled (destination_id, enabled),
  INDEX idx_workflow_type (workflow_type),

  CONSTRAINT fk_workflow_dest FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Per-tenant workflow customization (Fase B activation: post-5e destination)';

-- ---------------------------------------------------------------------
-- Seed: default content_approval workflow for all existing destinations
-- (matches current hardcoded FSM in approvalStateMachine.js)
-- ---------------------------------------------------------------------

INSERT INTO workflow_configurations
  (destination_id, workflow_type, transitions, approval_steps, enabled, is_default, description)
SELECT
  d.id,
  'content_approval',
  JSON_OBJECT(
    'draft',             JSON_ARRAY('pending_review', 'approved', 'rejected', 'deleted'),
    'pending_review',    JSON_ARRAY('in_review', 'reviewed', 'changes_requested', 'rejected', 'approved', 'deleted'),
    'in_review',         JSON_ARRAY('reviewed', 'changes_requested', 'rejected', 'approved'),
    'reviewed',          JSON_ARRAY('approved', 'changes_requested', 'rejected'),
    'changes_requested', JSON_ARRAY('draft', 'pending_review', 'rejected'),
    'rejected',          JSON_ARRAY('draft', 'pending_review', 'deleted'),
    'approved',          JSON_ARRAY('scheduled', 'publishing', 'rejected', 'archived', 'deleted'),
    'scheduled',         JSON_ARRAY('publishing', 'published', 'failed', 'approved', 'deleted'),
    'publishing',        JSON_ARRAY('published', 'failed'),
    'published',         JSON_ARRAY('archived'),
    'failed',            JSON_ARRAY('draft', 'approved', 'scheduled', 'rejected'),
    'archived',          JSON_ARRAY('deleted'),
    'deleted',           JSON_ARRAY()
  ),
  JSON_ARRAY(JSON_OBJECT('role', 'destination_admin', 'required', true)),
  TRUE,
  TRUE,
  'Default content approval workflow — 1-step approve by destination_admin'
FROM destinations d
WHERE NOT EXISTS (
  SELECT 1 FROM workflow_configurations wc
  WHERE wc.destination_id = d.id AND wc.workflow_type = 'content_approval'
);

-- =====================================================================
-- Migration 009 complete
-- Fase B activeert deze tabel: approvalStateMachine.js leest transitions per tenant
-- =====================================================================
