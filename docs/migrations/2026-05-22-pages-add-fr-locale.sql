-- Migration: pages-tabel FR-locale toevoegen (Frans)
-- Datum: 2026-05-22
-- Context: BLOK B Page Builder i18n-scope uitgebreid van NL/EN/DE/ES naar NL/EN/DE/ES/FR per Frank's GO 22-05-2026.
-- Geen destination heeft NU FR in supported_languages — toevoeging is forward-compatible.
-- Forwards: voegt 3 NULL-able kolommen toe (title_fr, seo_title_fr, seo_description_fr).
-- Backwards: zie 2026-05-22-pages-add-fr-locale-rollback.sql

-- =====================================================
-- PRE-CONDITIES
-- =====================================================
-- 1. Backup table snapshot vóór ALTER (per rollback-protocol):
--    CREATE TABLE pages_pre_2026_05_22 AS SELECT * FROM pages;
-- 2. Geen running migrations op pages (check INFORMATION_SCHEMA.PROCESSLIST)
-- 3. Backup-file aanwezig in /root/backups/db_20260522.sql.gz (82MB, geverifieerd)

-- =====================================================
-- FORWARDS — ADD COLUMN (idempotent via IF NOT EXISTS waar ondersteund)
-- =====================================================
-- MariaDB 10.4+ ondersteunt IF NOT EXISTS op ADD COLUMN.

ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS title_fr VARCHAR(255) DEFAULT NULL AFTER title_es,
  ADD COLUMN IF NOT EXISTS seo_title_fr VARCHAR(255) DEFAULT NULL AFTER seo_title_es,
  ADD COLUMN IF NOT EXISTS seo_description_fr TEXT DEFAULT NULL AFTER seo_description_es;

-- =====================================================
-- VERIFICATIE QUERIES (handmatig uitvoeren NA migratie)
-- =====================================================
-- SHOW CREATE TABLE pages\G  -- bevestigt 3 nieuwe kolommen aanwezig
-- SELECT COUNT(*) FROM pages WHERE title_fr IS NULL;  -- moet gelijk zijn aan totale pages-count
-- DESC pages;  -- title_fr, seo_title_fr, seo_description_fr aanwezig op juiste positie

-- =====================================================
-- IMPACT-NOTITIES
-- =====================================================
-- 1. Geen impact op bestaande rows (defaults NULL — alle huidige queries blijven werken).
-- 2. Geen impact op pages.layout (block-niveau i18n via TranslatableField in JSON-keys, FR-keys
--    al accepteerbaar via JSON-vrij schema).
-- 3. PUT /pages/:id whitelist (adminPortal.js regel 10153) moet worden uitgebreid met
--    'title_fr', 'seo_title_fr', 'seo_description_fr' — gebeurt in B.8.
-- 4. POST /pages (adminPortal.js regel 10069) optionele title_fr in body — gebeurt in B.8.
-- 5. PagesPage.jsx form expanded met FR-tab gebaseerd op destinations.supported_languages — gebeurt in B.9.
-- 6. Geen invloed op published pages (status='published') — pages renderer
--    (hb-websites/src/app/[[...slug]]/) leest layout JSON + per-locale title via existing pattern.
