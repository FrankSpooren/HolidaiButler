/**
 * Destination configuration service
 *
 * Single source of truth for per-destination URL/domain lookups.
 * Replaces previously hardcoded { 1: 'calpetrip.com', ... } maps scattered
 * across contentGenerator, internalLinker and adminPortal — those required
 * a code-deploy for every new destination and silently fell back to a
 * Calpe URL for any unmapped tenant (root cause of the BUTE → calpetrip.com
 * link incident, item 248/249, 2026-05-16).
 *
 * Source of truth: destinations.domain (active rows only).
 * Cache TTL: 5 minutes (consistent with featureFlagService).
 *
 * Throws MissingDomainConfigError when no active destination matches.
 * Callers MUST handle this — silent fallback to a default domain is what
 * caused the original incident.
 */

import { mysqlSequelize } from '../config/database.js';
import logger from '../utils/logger.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

export class MissingDomainConfigError extends Error {
  constructor(destinationId) {
    super(`No active destination found with id=${destinationId} or destinations.domain is empty`);
    this.name = 'MissingDomainConfigError';
    this.code = 'MISSING_DOMAIN_CONFIG';
    this.destinationId = destinationId;
  }
}

function normalizeDomain(raw) {
  if (!raw || typeof raw !== 'string') return null;
  return raw.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '') || null;
}

async function loadDomain(destinationId) {
  const [[row]] = await mysqlSequelize.query(
    'SELECT id, domain FROM destinations WHERE id = :id AND status = "active" LIMIT 1',
    { replacements: { id: destinationId } }
  );
  const domain = normalizeDomain(row?.domain);
  if (!domain) throw new MissingDomainConfigError(destinationId);
  return domain;
}

export async function getDestinationDomain(destinationId) {
  const id = Number(destinationId);
  if (!Number.isInteger(id) || id <= 0) throw new MissingDomainConfigError(destinationId);

  const now = Date.now();
  const cached = cache.get(id);
  if (cached && cached.expiresAt > now) return cached.domain;

  const domain = await loadDomain(id);
  cache.set(id, { domain, expiresAt: now + CACHE_TTL_MS });
  return domain;
}

export async function getDestinationBaseUrl(destinationId) {
  const domain = await getDestinationDomain(destinationId);
  return `https://${domain}`;
}

export function clearDestinationConfigCache(destinationId) {
  if (destinationId === undefined) {
    cache.clear();
    logger.debug('[destinationConfig] full cache cleared');
    return;
  }
  cache.delete(Number(destinationId));
}

export default { getDestinationDomain, getDestinationBaseUrl, clearDestinationConfigCache, MissingDomainConfigError };
