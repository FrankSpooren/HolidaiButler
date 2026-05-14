-- =====================================================================
-- Migration 006: Brand Context Hardening + Feature Flags + AI Audit
-- =====================================================================
-- Purpose:
--   1. Extend brand_knowledge for website scraping + Mistral websearch sources
--   2. Introduce dedicated feature_flags system with audit trail
--   3. Add ai_generation_log for AI content audit + monitoring
--
-- Design principles:
--   - Idempotent (safe to re-run)
--   - Backward compatible (no breaking changes to existing reads)
--   - Audit-first (every change traceable)
--
-- Author: HolidaiButler Platform Team
-- Date: 2026-05-13
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. brand_knowledge — extend for website scraping + websearch sources
-- ---------------------------------------------------------------------

-- Extend source_type ENUM (additive, existing values preserved)
ALTER TABLE brand_knowledge
  MODIFY COLUMN source_type
    ENUM('document','url','text','website_scrape','mistral_websearch')
    NOT NULL;

-- Content hash for change-detection (avoid re-embedding unchanged content)
ALTER TABLE brand_knowledge
  ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64) NULL
    COMMENT 'SHA-256 of content_text for change-detection on re-scrape';

-- Soft-disable flag (deactivate sources without deletion)
ALTER TABLE brand_knowledge
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE
    COMMENT 'Soft-disable flag — inactive sources excluded from brand context';

-- Index for active source lookups per destination
ALTER TABLE brand_knowledge
  ADD INDEX IF NOT EXISTS idx_brand_knowledge_active
    (destination_id, is_active, source_type);

-- ---------------------------------------------------------------------
-- 2. feature_flags — dedicated table with polymorphic scope
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS feature_flags (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  flag_key        VARCHAR(100) NOT NULL
                    COMMENT 'Dot-notation key, e.g. ai_content.seo_min_score',
  scope_type      ENUM('global','brand','destination','user','role') NOT NULL DEFAULT 'global',
  scope_id        BIGINT NULL
                    COMMENT 'NULL for global scope, entity ID otherwise',
  value_type      ENUM('boolean','string','integer','json') NOT NULL DEFAULT 'boolean',
  value_boolean   BOOLEAN NULL,
  value_string    VARCHAR(500) NULL,
  value_integer   INT NULL,
  value_json      JSON NULL,
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at      DATETIME NULL
                    COMMENT 'Optional auto-expiry for time-bound flags',
  description     TEXT NULL,
  created_by_user_id BIGINT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_flag_scope (flag_key, scope_type, scope_id),
  INDEX idx_lookup (flag_key, scope_type, scope_id, enabled),
  INDEX idx_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Feature flag system with polymorphic scope (global/brand/destination/user/role)';

-- ---------------------------------------------------------------------
-- 3. feature_flag_audit — change history for compliance/governance
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS feature_flag_audit (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  feature_flag_id BIGINT NULL
                    COMMENT 'NULL after flag deletion (preserves audit trail)',
  flag_key        VARCHAR(100) NOT NULL
                    COMMENT 'Denormalized for queryability after flag deletion',
  scope_type      VARCHAR(20) NOT NULL,
  scope_id        BIGINT NULL,
  action          ENUM('create','update','delete','enable','disable') NOT NULL,
  old_value       JSON NULL,
  new_value       JSON NULL,
  changed_by_user_id BIGINT NULL,
  changed_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address      VARCHAR(45) NULL,
  user_agent      VARCHAR(500) NULL,

  INDEX idx_flag (feature_flag_id, changed_at),
  INDEX idx_key_scope (flag_key, scope_type, scope_id, changed_at),
  INDEX idx_audit_time (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Audit trail for feature flag changes';

-- ---------------------------------------------------------------------
-- 4. ai_generation_log — audit + monitoring for AI content generation
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_generation_log (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  destination_id  INT NULL,
  content_item_id INT NULL
                    COMMENT 'FK to content_items if applicable',
  content_type    VARCHAR(50) NULL
                    COMMENT 'e.g. blog, social_post, instagram, facebook',
  platform        VARCHAR(50) NULL
                    COMMENT 'Target platform for social posts',
  locale          VARCHAR(10) NULL,
  operation       ENUM('generate','improve','rewrite','translate') NOT NULL,
  model           VARCHAR(100) NULL
                    COMMENT 'AI model used, e.g. mistral-large-2411',
  internal_sources_count INT NOT NULL DEFAULT 0
                    COMMENT 'Number of brand_knowledge chunks used',
  external_sources_used  BOOLEAN NOT NULL DEFAULT FALSE
                    COMMENT 'Whether Mistral web_search fallback was triggered',
  has_internal_sources   BOOLEAN NOT NULL DEFAULT FALSE
                    COMMENT 'Whether any brand_knowledge was available at generate-time',
  soft_warning_shown     BOOLEAN NOT NULL DEFAULT FALSE
                    COMMENT 'Whether reviewer got "no internal sources" warning',
  validation_passed      BOOLEAN NULL
                    COMMENT 'Result of post-generation contentValidator check',
  validation_reasons     JSON NULL
                    COMMENT 'Reasons array from contentValidator if rejected',
  prompt_token_count     INT NULL,
  completion_token_count INT NULL,
  duration_ms            INT NULL,
  status                 ENUM('success','validation_failed','error') NOT NULL DEFAULT 'success',
  error_message          TEXT NULL,
  user_id                BIGINT NULL,
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_destination (destination_id, created_at),
  INDEX idx_content_item (content_item_id, created_at),
  INDEX idx_status (status, created_at),
  INDEX idx_warnings (soft_warning_shown, created_at),
  INDEX idx_operation (operation, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Audit log for all AI content generation operations';

-- ---------------------------------------------------------------------
-- 5. Seed initial feature flags
-- ---------------------------------------------------------------------

-- Global: SEO minimum score for AI improve (currently hardcoded 75 in contentGenerator.js)
INSERT INTO feature_flags
  (flag_key, scope_type, scope_id, value_type, value_integer, enabled, description)
VALUES
  ('ai_content.seo_min_score', 'global', NULL, 'integer', 75, TRUE,
   'Minimum SEO score required before AI rewrite is considered necessary. Below this score, AI will attempt to improve.')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Brand BUTE (destination_id=10): strict brand context enforcement (anti-hallucination)
INSERT INTO feature_flags
  (flag_key, scope_type, scope_id, value_type, value_boolean, enabled, description)
VALUES
  ('ai_content.strict_brand_context', 'destination', 10, 'boolean', TRUE, TRUE,
   'Enforce strict anti-hallucination rules using brand_knowledge as primary source. Reject hallucinated content via contentValidator.')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Brand BUTE: enable Mistral Agents web_search fallback when KB is empty
INSERT INTO feature_flags
  (flag_key, scope_type, scope_id, value_type, value_boolean, enabled, description)
VALUES
  ('ai_content.mistral_websearch_fallback', 'destination', 10, 'boolean', FALSE, TRUE,
   'Enable Mistral Agents web_search tool as fallback when brand_knowledge is empty. Activate after DPA verification.')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Global default: Mistral websearch fallback DISABLED until rollout (safety)
INSERT INTO feature_flags
  (flag_key, scope_type, scope_id, value_type, value_boolean, enabled, description)
VALUES
  ('ai_content.mistral_websearch_fallback', 'global', NULL, 'boolean', FALSE, TRUE,
   'Global default for Mistral web_search fallback. Disabled by default — enable per destination after verification.')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- =====================================================================
-- Migration 006 complete
-- =====================================================================
