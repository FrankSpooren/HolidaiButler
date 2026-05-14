-- =====================================================================
-- Migration 006a: feature_flags UNIQUE KEY fix
-- =====================================================================
-- Issue: UNIQUE KEY (flag_key, scope_type, scope_id) allows duplicates
--        when scope_id IS NULL (MariaDB/MySQL: NULL != NULL in UNIQUE).
-- Fix:   Make scope_id NOT NULL DEFAULT 0 (convention: 0 = global / unscoped)
-- =====================================================================

-- 1. Deduplicate existing global flags (keep oldest by id)
DELETE f1 FROM feature_flags f1
INNER JOIN feature_flags f2
  ON f1.flag_key = f2.flag_key
  AND f1.scope_type = f2.scope_type
  AND f1.scope_id IS NULL AND f2.scope_id IS NULL
  AND f1.id > f2.id;

-- 2. Convert NULL scope_id to 0 for existing rows
UPDATE feature_flags SET scope_id = 0 WHERE scope_id IS NULL;

-- 3. Make scope_id NOT NULL with default 0 (convention: 0 = global)
ALTER TABLE feature_flags
  MODIFY COLUMN scope_id BIGINT NOT NULL DEFAULT 0
    COMMENT 'Entity ID for scope. 0 = global/unscoped (NULL not allowed to ensure UNIQUE works)';

-- 4. Recreate UNIQUE KEY (now works correctly since no NULLs)
-- (UNIQUE definition unchanged structurally, but values now deterministic)

-- 5. Verify: SELECT flag_key, scope_type, scope_id, COUNT(*) FROM feature_flags
--           GROUP BY flag_key, scope_type, scope_id HAVING COUNT(*) > 1;
--    Expected: empty result

-- =====================================================================
-- Migration 006a complete
-- =====================================================================
