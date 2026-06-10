-- Rollback Migration: pages-tabel FR-locale verwijderen
-- Datum: 2026-05-22
-- Pair met: 2026-05-22-pages-add-fr-locale.sql
-- Use case: indien BLOK B integratie wordt teruggetrokken of FR-scope vervalt.

-- =====================================================
-- PRE-CONDITIES VOOR ROLLBACK
-- =====================================================
-- 1. Geen FR-content in pages (anders DATA LOSS!). Verifieer:
--    SELECT COUNT(*) FROM pages
--      WHERE title_fr IS NOT NULL
--         OR seo_title_fr IS NOT NULL
--         OR seo_description_fr IS NOT NULL;
--    → moet 0 zijn voor veilige rollback.
-- 2. Indien wel FR-data: eerst SELECT INTO OUTFILE backup, dan rollback.

-- =====================================================
-- BACKWARDS — DROP COLUMN
-- =====================================================

ALTER TABLE pages
  DROP COLUMN IF EXISTS title_fr,
  DROP COLUMN IF EXISTS seo_title_fr,
  DROP COLUMN IF EXISTS seo_description_fr;

-- =====================================================
-- VERIFICATIE
-- =====================================================
-- SHOW CREATE TABLE pages\G  -- bevestigt 3 kolommen verwijderd
-- DESC pages;  -- geen title_fr / seo_title_fr / seo_description_fr meer
