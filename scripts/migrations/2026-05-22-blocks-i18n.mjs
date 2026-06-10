/**
 * Migration: bestaande pages.layout.blocks[*].props string text-content
 * upgraden naar { en: string } i18n-object voor BLOK D compatibility.
 *
 * Idempotent: skip values die al i18n-object zijn, alleen string-keys in
 * whitelist worden geconverteerd. Recursief door nested objects + arrays.
 *
 * Usage:
 *   node scripts/migrations/2026-05-22-blocks-i18n.js --dry-run    (default)
 *   node scripts/migrations/2026-05-22-blocks-i18n.js --apply
 *
 * Hergebruikt platform-core runtime stack (.env + mysql2/promise + SSL CA).
 *
 * @version BLOK D (22-05-2026)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.resolve(__dirname, '../../platform-core/.env');
dotenv.config({ path: ENV_PATH });

const APPLY = process.argv.includes('--apply');
const VERBOSE = process.argv.includes('--verbose');

// i18n-relevante prop-keys (matched aan TranslatableField usage in editors).
// Strings onder deze keys worden geconverteerd naar { en: string }.
const I18N_KEYS = new Set([
  'title', 'subtitle', 'description', 'headline', 'tagline', 'content',
  'message', 'text', 'body', 'heading',
  'buttonText', 'buttonLabel', 'ctaLabel', 'ctaText', 'linkText', 'label',
  'placeholder', 'hint', 'caption', 'alt',
  'chatbotName', 'consentText', 'privacyNoteText', 'emptyStateMessage',
  'customTitle', 'customDescription', 'badgeText', 'badge',
  'payoff', 'helperText',
]);

// Keys die EXPLICIET niet i18n moeten worden (override safety).
const NEVER_I18N = new Set([
  'url', 'href', 'src', 'link', 'target', 'embedUrl', 'videoUrl', 'youtubeUrl',
  'vimeoUrl', 'videoFile', 'thumbnailImage', 'imageUrl', 'image', 'logoUrl', 'logo',
  'id', 'slug', 'anchorId', 'eventId', 'poiId', 'sourceId', 'itemId', 'mailerliteGroupId',
  'color', 'fontColor', 'backgroundColor', 'textColor',
  'alignment', 'position', 'size', 'width', 'height', 'padding', 'margin',
  'count', 'limit', 'max', 'min', 'num',
  'enabled', 'visible', 'sticky', 'required',
  'date', 'time', 'duration', 'expiresAt', 'startDate', 'endDate',
  'price', 'priceCurrency', 'fileSize',
  'name', // INTERN field-name in ContactForm — geen user-facing tekst
  'categories', 'options', // arrays van config-strings
  'minRating', 'maxRating',
  'type', 'kind', 'variant', 'mode',
]);

const I18N_LANG_KEYS = new Set(['en', 'nl', 'de', 'es', 'fr', 'sv', 'pl']);

function isI18nObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  return keys.every(k => I18N_LANG_KEYS.has(k));
}

let stats = { stringsConverted: 0, objectsSkipped: 0, blocksProcessed: 0 };

function migrateProps(obj, parentKey = '') {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((item, idx) => migrateProps(item, `${parentKey}[${idx}]`));

  if (typeof obj !== 'object') return obj;

  // Don't touch i18n-objects (already migrated)
  if (isI18nObject(obj)) {
    stats.objectsSkipped++;
    return obj;
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (NEVER_I18N.has(key)) {
      // Recurse for nested objects (e.g. style.borderColor); never i18n the leaf
      result[key] = (typeof value === 'object' && value !== null && !Array.isArray(value))
        ? migrateProps(value, key)
        : value;
      continue;
    }
    if (I18N_KEYS.has(key) && typeof value === 'string') {
      result[key] = { en: value, nl: '', de: '', es: '', fr: '' };
      stats.stringsConverted++;
      if (VERBOSE) console.log(`  ${parentKey}.${key}: "${value.substring(0, 50)}..." -> i18n`);
      continue;
    }
    // Recurse for nested
    if (typeof value === 'object' && value !== null) {
      result[key] = migrateProps(value, `${parentKey}.${key}`);
    } else {
      result[key] = value;
    }
  }
  return result;
}

async function main() {
  if (!process.env.DB_HOST) {
    console.error('ERROR: DB_HOST not set. .env path:', ENV_PATH);
    process.exit(1);
  }

  console.log(`Mode: ${APPLY ? 'APPLY (writes to DB)' : 'DRY-RUN (no writes)'}`);
  console.log('Connecting to', process.env.DB_HOST);

  const sslCa = fs.readFileSync('/etc/ssl/certs/hetzner-mariadb-ca.pem');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { ca: sslCa, rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    dateStrings: true,
  });

  try {
    const [rows] = await conn.query('SELECT id, destination_id, slug, layout FROM pages');
    console.log(`Loaded ${rows.length} pages.`);

    const updates = [];
    for (const row of rows) {
      let layout;
      try {
        layout = typeof row.layout === 'string' ? JSON.parse(row.layout) : row.layout;
      } catch (err) {
        console.warn(`  page ${row.id} (${row.slug}): layout parse failed: ${err.message}`);
        continue;
      }
      if (!layout || !Array.isArray(layout.blocks)) continue;

      const newBlocks = layout.blocks.map((block) => {
        stats.blocksProcessed++;
        return { ...block, props: migrateProps(block.props || {}, `block[${block.type}]`) };
      });
      const newLayout = { ...layout, blocks: newBlocks };
      const newLayoutStr = JSON.stringify(newLayout);
      const oldLayoutStr = typeof row.layout === 'string' ? row.layout : JSON.stringify(row.layout);

      if (newLayoutStr !== oldLayoutStr) {
        updates.push({ id: row.id, slug: row.slug, dest: row.destination_id, newLayout: newLayoutStr });
      }
    }

    console.log(`\nMigration summary:`);
    console.log(`  Pages scanned:        ${rows.length}`);
    console.log(`  Blocks processed:     ${stats.blocksProcessed}`);
    console.log(`  Strings -> i18n:      ${stats.stringsConverted}`);
    console.log(`  Already-i18n skipped: ${stats.objectsSkipped}`);
    console.log(`  Pages with changes:   ${updates.length}`);

    if (updates.length === 0) {
      console.log('\nNo changes needed.');
      return;
    }

    if (!APPLY) {
      console.log('\nDRY-RUN: no DB writes. Pages that would update:');
      updates.forEach(u => console.log(`  page ${u.id} dest=${u.dest} slug=${u.slug}`));
      console.log('\nRun with --apply to persist.');
      return;
    }

    console.log('\nApplying changes...');
    for (const u of updates) {
      await conn.query('UPDATE pages SET layout = ?, updated_at = NOW() WHERE id = ?', [u.newLayout, u.id]);
      console.log(`  ✓ page ${u.id} dest=${u.dest} slug=${u.slug} updated`);
    }
    console.log(`\n${updates.length} pages updated.`);
  } finally {
    await conn.end();
  }
}

main().catch(err => { console.error('Migration error:', err); process.exit(1); });
