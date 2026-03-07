-- Migration: Add multilingual SEO columns to pages table (DE/ES)
-- Context: Wave 2/3 adminPortal.js references seo_title_de/es and seo_description_de/es
-- but these columns were missing from the original pages schema (only NL/EN existed).

ALTER TABLE pages
  ADD COLUMN seo_title_de VARCHAR(255) DEFAULT NULL AFTER seo_title_en,
  ADD COLUMN seo_title_es VARCHAR(255) DEFAULT NULL AFTER seo_title_de,
  ADD COLUMN seo_description_de TEXT DEFAULT NULL AFTER seo_description_en,
  ADD COLUMN seo_description_es TEXT DEFAULT NULL AFTER seo_description_de;
