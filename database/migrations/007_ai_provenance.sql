-- =====================================================================
-- Migration 007: AI Provenance Watermark (Optie D Layer 5)
-- =====================================================================
-- Purpose: EU AI Act Article 50 compliance — auditeerbare provenance per AI output
--
-- Adds provenance JSON column to content_items:
-- {
--   "signature": "sha256-hex",          // cryptographic signature
--   "model": "mistral-medium-latest",
--   "ai_generated": true,
--   "generated_at": "2026-05-14T12:00:00Z",
--   "source_ids": [3, 4, 5],            // brand_knowledge IDs used
--   "validation": {
--     "hallucination_rate": 0.05,
--     "passed": true,
--     "retries": 0,
--     "ungrounded_entities": []
--   },
--   "schema_version": "1.0"
-- }
-- =====================================================================

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS provenance JSON NULL
    COMMENT 'EU AI Act provenance metadata: signature, model, sources, validation';

-- Index for compliance queries (find all AI-generated content)
ALTER TABLE content_items
  ADD INDEX IF NOT EXISTS idx_provenance_signature
    ((CAST(JSON_EXTRACT(provenance, '$.signature') AS CHAR(64))));

-- =====================================================================
-- Migration 007 complete
-- =====================================================================
