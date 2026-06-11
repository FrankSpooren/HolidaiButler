/**
 * INC-2026-06-10-005 Migration: re-encrypt social_accounts.access_token_encrypted
 * and refresh_token_encrypted with new SOCIAL_TOKEN_ENCRYPTION_KEY + random-IV.
 *
 * OLD key chain (effective): JWT_SECRET (fallback after missing SOCIAL_TOKEN_ENCRYPTION_KEY)
 * NEW key: SOCIAL_TOKEN_ENCRYPTION_KEY (newly generated, in .env)
 *
 * Format detection:
 *   - FormatA: 'iv_hex:ciphertext_hex' (from SocialAccount.encryptToken, random-IV)
 *   - FormatB: 'ciphertext_hex' (from old adminPortal.js inline, zero-IV)
 *
 * Modes:
 *   --dry-run  : decrypt + re-encrypt in memory, log results, NO db writes
 *   --commit   : decrypt + re-encrypt + UPDATE social_accounts rows
 *
 * Safety:
 *   - Pre-migration JSON backup at /root/backups/2026-06-11-inc005/social_accounts.pre-inc005.json
 *   - Per-row try/catch — failures logged, do not abort batch
 *   - Always logs counts (success / fail / skipped per token-col)
 *
 * Run from /var/www/api.holidaibutler.com/platform-core/ via:
 *   node scripts/migrations/2026-06-11-inc005-reencrypt-social-tokens.mjs --dry-run
 *   node scripts/migrations/2026-06-11-inc005-reencrypt-social-tokens.mjs --commit
 */

import crypto from 'crypto';
import { mysqlSequelize } from '../../src/config/database.js';

const ALGORITHM = 'aes-256-cbc';
const TOKEN_COLS = ['access_token_encrypted', 'refresh_token_encrypted'];

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const COMMIT = args.has('--commit');

if (!DRY_RUN && !COMMIT) {
  console.error('USAGE: node inc005-reencrypt-social-tokens.mjs --dry-run | --commit');
  process.exit(2);
}
if (DRY_RUN && COMMIT) {
  console.error('FATAL: --dry-run and --commit are mutually exclusive');
  process.exit(2);
}

const OLD_KEY_SOURCE = process.env.JWT_SECRET;
const NEW_KEY_SOURCE = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;

if (!OLD_KEY_SOURCE) {
  console.error('FATAL: JWT_SECRET missing in env — cannot derive OLD encryption key');
  process.exit(3);
}
if (!NEW_KEY_SOURCE) {
  console.error('FATAL: SOCIAL_TOKEN_ENCRYPTION_KEY missing in env — cannot derive NEW encryption key');
  process.exit(3);
}
if (OLD_KEY_SOURCE === NEW_KEY_SOURCE) {
  console.error('FATAL: JWT_SECRET === SOCIAL_TOKEN_ENCRYPTION_KEY — refusing to re-encrypt with identical key');
  process.exit(3);
}

const OLD_KEY = crypto.createHash('sha256').update(OLD_KEY_SOURCE).digest();
const NEW_KEY = crypto.createHash('sha256').update(NEW_KEY_SOURCE).digest();

const detectFormat = (value) => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value !== 'string') return 'INVALID';
  return value.includes(':') ? 'A' : 'B';
};

const decryptWithOldKey = (value) => {
  const fmt = detectFormat(value);
  if (fmt === 'NULL' || fmt === 'INVALID') return null;
  let iv, ctHex;
  if (fmt === 'A') {
    const [ivHex, ct] = value.split(':');
    iv = Buffer.from(ivHex, 'hex');
    ctHex = ct;
  } else {
    iv = Buffer.alloc(16, 0);
    ctHex = value;
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, OLD_KEY, iv);
  let decrypted = decipher.update(ctHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

const encryptWithNewKey = (plaintext) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, NEW_KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

const stats = {
  total_rows: 0,
  per_col: {
    access_token_encrypted: { null: 0, formatA: 0, formatB: 0, decrypt_ok: 0, decrypt_fail: 0, reencrypted: 0, written: 0 },
    refresh_token_encrypted: { null: 0, formatA: 0, formatB: 0, decrypt_ok: 0, decrypt_fail: 0, reencrypted: 0, written: 0 },
  },
  failures: [],
};

const mode = COMMIT ? 'COMMIT' : 'DRY-RUN';
console.log(`[INC-005-migration] mode=${mode} starting`);

try {
  const [rows] = await mysqlSequelize.query('SELECT id, destination_id, platform, access_token_encrypted, refresh_token_encrypted FROM social_accounts ORDER BY id');
  stats.total_rows = rows.length;
  console.log(`[INC-005-migration] loaded ${rows.length} rows`);

  for (const row of rows) {
    const updates = {};
    for (const col of TOKEN_COLS) {
      const current = row[col];
      const fmt = detectFormat(current);
      const colStats = stats.per_col[col];
      if (fmt === 'NULL') {
        colStats.null += 1;
        continue;
      }
      if (fmt === 'INVALID') {
        colStats.decrypt_fail += 1;
        stats.failures.push({ id: row.id, col, reason: 'invalid_type' });
        continue;
      }
      colStats[fmt === 'A' ? 'formatA' : 'formatB'] += 1;
      let plaintext;
      try {
        plaintext = decryptWithOldKey(current);
        colStats.decrypt_ok += 1;
      } catch (err) {
        colStats.decrypt_fail += 1;
        stats.failures.push({ id: row.id, col, reason: 'decrypt_error', error: err.message });
        continue;
      }
      let reencrypted;
      try {
        reencrypted = encryptWithNewKey(plaintext);
        colStats.reencrypted += 1;
      } catch (err) {
        stats.failures.push({ id: row.id, col, reason: 'reencrypt_error', error: err.message });
        continue;
      }
      updates[col] = reencrypted;
      console.log(`[INC-005-migration] row id=${row.id} platform=${row.platform} col=${col} fmt=${fmt} plaintext_len=${plaintext.length} new_fmt=A new_len=${reencrypted.length}`);
    }

    if (COMMIT && Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map(c => `${c} = :${c}`).join(', ');
      const replacements = { ...updates, id: row.id };
      await mysqlSequelize.query(`UPDATE social_accounts SET ${setClauses}, updated_at = NOW() WHERE id = :id`, { replacements });
      for (const col of Object.keys(updates)) {
        stats.per_col[col].written += 1;
      }
    }
  }

  console.log('[INC-005-migration] DONE');
  console.log(JSON.stringify(stats, null, 2));
} finally {
  await mysqlSequelize.close();
}
