-- =====================================================================
-- Migration 008: Approval State Consistency (Optie C+D — FSM enforcement)
-- =====================================================================
-- Purpose:
--   1. Repair Jumbo + alle items met inconsistente state (scheduled_at + approved)
--   2. Re-sync concept-level statuses via FSM derivation
--   3. (Future) CHECK constraint when MariaDB SQL_MODE allows
--
-- Reparatie criterium:
--   approval_status='approved' AND scheduled_at IS NOT NULL AND scheduled_at > NOW()
--   → demoten naar approval_status='scheduled'
--
-- Author: HolidaiButler Platform Team
-- Date: 2026-05-14
-- =====================================================================

-- 1. Repair Jumbo specifically (Frank's evidence items 265, 266)
UPDATE content_items
SET approval_status = 'scheduled', updated_at = NOW()
WHERE id IN (265, 266)
  AND scheduled_at IS NOT NULL
  AND approval_status = 'approved';

-- 2. Platform-wide cleanup: any approved item with future scheduled_at → demote to scheduled
UPDATE content_items
SET approval_status = 'scheduled', updated_at = NOW()
WHERE scheduled_at IS NOT NULL
  AND scheduled_at > NOW()
  AND approval_status = 'approved';

-- 3. Log all repairs in approval log (best-effort, may already be logged)
-- Skip — frontend repair triggers go through transitionStatus() going forward

-- 4. Re-sync concept-level statuses based on (new) item states
-- Concept gets the highest-priority effective status across its items.
UPDATE content_concepts cc
JOIN (
  SELECT concept_id,
    CASE
      WHEN SUM(approval_status = 'published') > 0 THEN 'published'
      WHEN SUM(approval_status = 'publishing') > 0 THEN 'publishing'
      WHEN SUM(approval_status = 'scheduled') > 0 THEN 'scheduled'
      WHEN SUM(approval_status = 'failed') > 0 THEN 'failed'
      WHEN SUM(approval_status = 'approved') > 0 THEN 'approved'
      WHEN SUM(approval_status = 'in_review') > 0 THEN 'in_review'
      WHEN SUM(approval_status = 'reviewed') > 0 THEN 'reviewed'
      WHEN SUM(approval_status = 'pending_review') > 0 THEN 'pending_review'
      WHEN SUM(approval_status = 'rejected') > 0 THEN 'rejected'
      ELSE 'draft'
    END AS derived
  FROM content_items
  WHERE concept_id IS NOT NULL
    AND approval_status != 'deleted'
  GROUP BY concept_id
) ci ON cc.id = ci.concept_id
SET cc.approval_status = ci.derived,
    cc.updated_at = NOW();

-- =====================================================================
-- Migration 008 complete
-- Note: CHECK constraint (scheduled_at <-> approval_status) defer until
-- MariaDB SQL_MODE compatibility verified. FSM gateway enforces invariant
-- at application layer (sufficient for v4.92.0).
-- =====================================================================
