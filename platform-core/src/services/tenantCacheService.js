/**
 * Tenant Cache Service — Blok 5.1 Fase B (v4.98)
 *
 * Per-tenant Redis caching met event-driven invalidation via domainEventBus.
 * Cache-aside pattern: get(key) -> miss -> caller fetcht uit DB -> set(key, value).
 *
 * Key-namespace: `tenant:{destId}:{namespace}:{hash}` — voorkomt cross-tenant
 * data-leaks en maakt bulk-invalidate per destination triviaal (DEL pattern).
 *
 * Invalidation strategie:
 *   - Domain event `content.{destId}.{action}` → invalidate alle 'content-*' en
 *     'concepts-*' namespaces voor die destination
 *   - Handmatige invalidate via API: invalidateDestination(destId) / invalidateNamespace(...)
 *
 * Feature flag: cache.content_listings_enabled per destination (default true).
 * Rollback: zet flag op false → service slaat cache over (volledig DB-driven).
 *
 * Acceptance Blok 5: Cache hit-rate >80% in productie + P95 latency <100ms voor
 * content-list endpoints.
 *
 * @module tenantCacheService
 * @version 1.0.0
 */

import Redis from 'ioredis';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import featureFlagService from './featureFlagService.js';
import domainEventBus from './domainEventBus.js';

const DEFAULT_TTL_SECONDS = 300;            // 5 min
const NS_PREFIX = 'tenant';

class TenantCacheService {
  constructor() {
    this.redis = null;
    this.connected = false;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0,
      errors: 0,
      // Per-namespace breakdown
      byNamespace: {},
    };
  }

  async initialize() {
    if (this.connected) return;
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_CACHE_DB || '1'),
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 100, 3000),
        lazyConnect: false,
      });

      this.redis.on('connect', () => {
        this.connected = true;
        logger.info('[TenantCache] connected to Redis');
      });
      this.redis.on('error', (err) => {
        logger.warn(`[TenantCache] Redis error: ${err.message}`);
        this.connected = false;
      });
      this.redis.on('reconnecting', () => {
        logger.debug('[TenantCache] reconnecting...');
      });

      // Subscribe op content domain events voor automatische invalidation.
      // Verwijdert ALLE namespaces voor de getroffen destination (simpel + safe).
      // Frequentie blijft laag dankzij staleTime in TanStack Query SWR — netto
      // win in hit-rate omdat caches alleen worden geclear bij echte wijzigingen.
      domainEventBus.subscribe('content.>', (envelope) => {
        if (envelope?.destinationId) {
          this.invalidateDestination(envelope.destinationId)
            .catch((err) => logger.debug(`[TenantCache] event-invalidate error: ${err.message}`));
        }
      });
      logger.info('[TenantCache] subscribed op content.> domain events voor auto-invalidation');
    } catch (err) {
      logger.error(`[TenantCache] init faalde: ${err.message}`);
      this.connected = false;
    }
  }

  _buildKey(destinationId, namespace, identifier) {
    const safeIdent = typeof identifier === 'string'
      ? identifier
      : crypto.createHash('sha1').update(JSON.stringify(identifier || {})).digest('hex').slice(0, 16);
    return `${NS_PREFIX}:${Number(destinationId)}:${namespace}:${safeIdent}`;
  }

  _bumpStat(namespace, key) {
    if (!this.stats.byNamespace[namespace]) {
      this.stats.byNamespace[namespace] = { hits: 0, misses: 0, sets: 0, invalidations: 0 };
    }
    this.stats.byNamespace[namespace][key] = (this.stats.byNamespace[namespace][key] || 0) + 1;
    this.stats[key] = (this.stats[key] || 0) + 1;
  }

  /**
   * Check of cache enabled is voor destination via feature flag.
   * Default true. Zet flag op false om cache uit te schakelen per destination.
   */
  async _isEnabled(destinationId) {
    if (!destinationId) return false;
    try {
      return await featureFlagService.isEnabled('cache.content_listings_enabled', {
        scopeType: 'destination',
        scopeId: Number(destinationId),
        fallback: true,
      });
    } catch {
      return true;
    }
  }

  /**
   * Cache-aside read: returns parsed value of null bij miss/disabled/redis-down.
   *
   * @param {Object} params
   * @param {number} params.destinationId
   * @param {string} params.namespace - bv. 'concepts-list', 'concept-detail', 'content-items'
   * @param {string|Object} params.identifier - string of params-object (gehasht)
   * @returns {Promise<any|null>}
   */
  async get({ destinationId, namespace, identifier }) {
    if (!this.connected || !destinationId) return null;
    if (!(await this._isEnabled(destinationId))) return null;
    const key = this._buildKey(destinationId, namespace, identifier);
    try {
      const raw = await this.redis.get(key);
      if (raw === null) {
        this._bumpStat(namespace, 'misses');
        return null;
      }
      this._bumpStat(namespace, 'hits');
      return JSON.parse(raw);
    } catch (err) {
      this.stats.errors += 1;
      logger.debug(`[TenantCache] get error key=${key}: ${err.message}`);
      return null;
    }
  }

  /**
   * Cache-aside write. TTL in seconden (default 5min).
   *
   * @returns {Promise<boolean>} true bij succes
   */
  async set({ destinationId, namespace, identifier, value, ttlSeconds = DEFAULT_TTL_SECONDS }) {
    if (!this.connected || !destinationId || value === undefined) return false;
    if (!(await this._isEnabled(destinationId))) return false;
    const key = this._buildKey(destinationId, namespace, identifier);
    try {
      await this.redis.setex(key, Math.max(1, Math.floor(ttlSeconds)), JSON.stringify(value));
      this._bumpStat(namespace, 'sets');
      return true;
    } catch (err) {
      this.stats.errors += 1;
      logger.debug(`[TenantCache] set error key=${key}: ${err.message}`);
      return false;
    }
  }

  /**
   * Convenience: wrap een fetcher-functie met cache-aside (most common pattern).
   *
   *   const data = await tenantCache.wrap(
   *     { destinationId, namespace: 'concepts-list', identifier: queryParams, ttlSeconds: 300 },
   *     () => fetchFromDb(...)
   *   );
   */
  async wrap(params, fetcher) {
    const cached = await this.get(params);
    if (cached !== null) return cached;
    const fresh = await fetcher();
    if (fresh !== undefined && fresh !== null) {
      await this.set({ ...params, value: fresh });
    }
    return fresh;
  }

  /**
   * Invalidate specifieke (destinationId, namespace) combinatie.
   * Verwijdert ALLE keys binnen die namespace voor die destination.
   */
  async invalidateNamespace(destinationId, namespace) {
    if (!this.connected || !destinationId || !namespace) return 0;
    const pattern = `${NS_PREFIX}:${Number(destinationId)}:${namespace}:*`;
    try {
      let cursor = '0';
      let count = 0;
      do {
        const [next, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
        cursor = next;
        if (keys.length > 0) {
          await this.redis.del(...keys);
          count += keys.length;
        }
      } while (cursor !== '0');
      if (count > 0) {
        this._bumpStat(namespace, 'invalidations');
        logger.debug(`[TenantCache] invalidated ${count} keys voor ${pattern}`);
      }
      return count;
    } catch (err) {
      this.stats.errors += 1;
      logger.debug(`[TenantCache] invalidateNamespace error: ${err.message}`);
      return 0;
    }
  }

  /**
   * Bulk invalidate alle keys voor een destination (over alle namespaces, of een lijst).
   */
  async invalidateDestination(destinationId, namespaces = null) {
    if (!destinationId) return 0;
    if (Array.isArray(namespaces) && namespaces.length > 0) {
      let total = 0;
      for (const ns of namespaces) {
        total += await this.invalidateNamespace(destinationId, ns);
      }
      return total;
    }
    // Geen lijst → alle namespaces voor deze tenant
    if (!this.connected) return 0;
    const pattern = `${NS_PREFIX}:${Number(destinationId)}:*`;
    try {
      let cursor = '0';
      let count = 0;
      do {
        const [next, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
        cursor = next;
        if (keys.length > 0) {
          await this.redis.del(...keys);
          count += keys.length;
        }
      } while (cursor !== '0');
      if (count > 0) {
        this.stats.invalidations += 1;
        logger.debug(`[TenantCache] full destination invalidate ${pattern}: ${count} keys`);
      }
      return count;
    } catch (err) {
      this.stats.errors += 1;
      return 0;
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) : 0;
    return {
      connected: this.connected,
      hitRate: Math.round(hitRate * 10000) / 100,  // 0-100 met 2 decimalen
      ...this.stats,
    };
  }
}

const tenantCacheService = new TenantCacheService();
export default tenantCacheService;
