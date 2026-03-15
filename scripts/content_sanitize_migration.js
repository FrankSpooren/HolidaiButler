/**
 * Content Sanitize Migration — Clean existing content items
 * Strips markdown artifacts from all body fields in content_items.
 *
 * Usage:
 *   node scripts/content_sanitize_migration.js --dry-run
 *   node scripts/content_sanitize_migration.js --execute
 *
 * @version 1.0.0
 */

import mysql from 'mysql2/promise';
import { sanitizeContent, detectMarkdownArtifacts } from '../platform-core/src/services/agents/contentRedacteur/contentSanitizer.js';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'jotx.your-database.de',
  user: process.env.DB_USER || 'pxoziy_1',
  password: process.env.DB_PASS || 'j8,DrtshJSm$',
  database: process.env.DB_NAME || 'pxoziy_db1',
};

const BODY_FIELDS = ['body_en', 'body_nl', 'body_de', 'body_es', 'body_fr'];

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const execute = process.argv.includes('--execute');

  if (!dryRun && !execute) {
    console.log('Usage: node scripts/content_sanitize_migration.js --dry-run | --execute');
    process.exit(1);
  }

  console.log(`\n=== Content Sanitize Migration (${dryRun ? 'DRY-RUN' : 'EXECUTE'}) ===\n`);

  const conn = await mysql.createConnection(DB_CONFIG);

  const [items] = await conn.query('SELECT id, content_type, target_platform, body_en, body_nl, body_de, body_es, body_fr FROM content_items');

  let dirtyCount = 0;
  let fieldCount = 0;
  const changes = [];

  for (const item of items) {
    for (const field of BODY_FIELDS) {
      if (!item[field] || typeof item[field] !== 'string') continue;

      const { isDirty, issues } = detectMarkdownArtifacts(item[field]);
      if (!isDirty) continue;

      dirtyCount++;
      fieldCount++;

      const cleaned = sanitizeContent(item[field], item.content_type, item.target_platform || 'website');
      const changed = cleaned !== item[field];

      if (changed) {
        changes.push({ id: item.id, field, issues, before: item[field].substring(0, 100), after: cleaned.substring(0, 100) });

        if (execute) {
          await conn.query(`UPDATE content_items SET ${field} = ?, updated_at = NOW() WHERE id = ?`, [cleaned, item.id]);
        }
      }
    }
  }

  console.log(`Totaal items: ${items.length}`);
  console.log(`Vervuilde velden: ${fieldCount}`);
  console.log(`Wijzigingen ${dryRun ? 'gepland' : 'uitgevoerd'}: ${changes.length}`);

  if (changes.length > 0) {
    console.log('\n--- Details ---');
    for (const c of changes) {
      console.log(`  Item #${c.id} [${c.field}]: ${c.issues.join(', ')}`);
      console.log(`    VOOR: ${c.before}...`);
      console.log(`    NA:   ${c.after}...`);
    }
  }

  if (dryRun && changes.length > 0) {
    console.log(`\n→ Run met --execute om ${changes.length} wijzigingen door te voeren.`);
  }

  await conn.end();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
