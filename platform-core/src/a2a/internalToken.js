import { readFileSync, existsSync, statSync } from 'fs';

let _cachedToken = null;
let _cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export function getInternalToken() {
  const now = Date.now();
  if (_cachedToken && (now - _cachedAt) < CACHE_TTL_MS) {
    return _cachedToken;
  }

  const tokenFile = process.env.A2A_INTERNAL_TOKEN_FILE
    || '/etc/holidaibutler/a2a/internal-token';

  if (!existsSync(tokenFile)) {
    throw new Error(`A2A token file not found: ${tokenFile}`);
  }

  const stats = statSync(tokenFile);
  if ((stats.mode & 0o777) !== 0o600) {
    console.warn(`[a2a] WARN: token file permissions not 600`);
  }

  const token = readFileSync(tokenFile, 'utf8').trim();
  if (!token || token.length < 32) {
    throw new Error('A2A token empty or too short');
  }

  _cachedToken = token;
  _cachedAt = now;
  return token;
}

export function invalidateCache() {
  _cachedToken = null;
  _cachedAt = 0;
}
