/**
 * Webhook Dispatcher — Blok 3.4 Fase B
 *
 * Subscribed op alle `content.*.*` domain events via domainEventBus en levert ze
 * door naar per-tenant geconfigureerde webhook endpoints (Slack, Zapier, custom).
 *
 * Features:
 *   - HMAC-SHA256 signing met per-endpoint secret (header: X-HB-Signature)
 *   - 5s timeout per request
 *   - Exponential backoff retry: 1s, 5s, 30s (3 attempts max)
 *   - Per-delivery audit row in webhook_deliveries
 *   - Status: pending -> success / failed / timeout / retrying
 *   - Acceptance: 99% delivery binnen 5s naar custom endpoints
 *
 * @module webhookDispatcher
 * @version 1.0.0
 */

import crypto from 'crypto';
import { mysqlSequelize } from '../config/database.js';
import logger from '../utils/logger.js';
import domainEventBus from './domainEventBus.js';

const REQUEST_TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [1000, 5000, 30000];  // 1s, 5s, 30s
const ENDPOINT_FAILURE_THRESHOLD = 10;  // auto-disable na 10 opeenvolgende fails

class WebhookDispatcher {
  constructor() {
    this.initialized = false;
    this.stats = { dispatched: 0, success: 0, failed: 0, timeout: 0 };
    this.retryTimer = null;
  }

  initialize() {
    if (this.initialized) return;
    this.initialized = true;

    // Subscribe op alle content.* domain events
    domainEventBus.subscribe('content.>', (envelope) => {
      this._handleEvent(envelope).catch((err) => {
        logger.warn(`[WebhookDispatcher] handler error: ${err.message}`);
      });
    });

    // Periodieke retry-queue scanner (elke 30s)
    this.retryTimer = setInterval(() => {
      this._processRetryQueue().catch((err) => {
        logger.warn(`[WebhookDispatcher] retry queue error: ${err.message}`);
      });
    }, 30000);

    logger.info('[WebhookDispatcher] initialized — listening op content.> domain events');
  }

  shutdown() {
    if (this.retryTimer) clearInterval(this.retryTimer);
    this.initialized = false;
  }

  async _handleEvent(envelope) {
    if (!envelope?.subject || !envelope?.destinationId) return;
    const endpoints = await this._findMatchingEndpoints(envelope);
    if (endpoints.length === 0) return;

    for (const ep of endpoints) {
      // Fire-and-forget per endpoint; deliveries individueel gelogd
      this._deliver(ep, envelope, 1).catch((err) => {
        logger.warn(`[WebhookDispatcher] deliver failed (endpoint=${ep.id}): ${err.message}`);
      });
    }
  }

  async _findMatchingEndpoints(envelope) {
    try {
      const [rows] = await mysqlSequelize.query(
        `SELECT id, destination_id, url, events, secret, name, failure_count
         FROM webhook_endpoints
         WHERE destination_id = :destId AND enabled = 1`,
        { replacements: { destId: Number(envelope.destinationId) } }
      );
      // Filter op subject-pattern match (events JSON kolom bevat patterns array)
      return rows.filter((r) => {
        let patterns;
        try {
          patterns = typeof r.events === 'string' ? JSON.parse(r.events) : r.events;
        } catch {
          return false;
        }
        if (!Array.isArray(patterns) || patterns.length === 0) return false;
        return patterns.some((p) => this._subjectMatches(p, envelope.subject));
      });
    } catch (err) {
      logger.warn(`[WebhookDispatcher] endpoint lookup failed: ${err.message}`);
      return [];
    }
  }

  _subjectMatches(pattern, subject) {
    if (!pattern || !subject) return false;
    if (pattern === subject) return true;
    const re = pattern.split('.').map((t) => {
      if (t === '*') return '[^.]+';
      if (t === '>') return '.+';
      return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('\\.');
    return new RegExp('^' + re + '$').test(subject);
  }

  /**
   * POST event naar endpoint met HMAC sig + audit row.
   */
  async _deliver(endpoint, envelope, attempt) {
    const startedAt = Date.now();
    let deliveryId = null;
    try {
      // Audit row: pending
      const [insertResult] = await mysqlSequelize.query(
        `INSERT INTO webhook_deliveries
          (webhook_endpoint_id, destination_id, event_subject, event_payload, attempt, status)
         VALUES (:epId, :destId, :subject, :payload, :attempt, 'pending')`,
        { replacements: {
          epId: endpoint.id,
          destId: Number(envelope.destinationId),
          subject: envelope.subject,
          payload: JSON.stringify(envelope),
          attempt,
        } }
      );
      deliveryId = insertResult?.insertId || insertResult;

      const body = JSON.stringify(envelope);
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'HolidaiButler-Webhook/1.0',
        'X-HB-Subject': envelope.subject,
        'X-HB-Destination-Id': String(envelope.destinationId),
        'X-HB-Delivery-Id': String(deliveryId || ''),
        'X-HB-Attempt': String(attempt),
      };
      if (endpoint.secret) {
        const sig = crypto.createHmac('sha256', endpoint.secret).update(body).digest('hex');
        headers['X-HB-Signature'] = `sha256=${sig}`;
      }

      // Native fetch met timeout via AbortController (Node 18+)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let res;
      try {
        res = await fetch(endpoint.url, {
          method: 'POST',
          headers,
          body,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const duration = Date.now() - startedAt;
      const responseBody = (await res.text().catch(() => '')).slice(0, 2000);
      const success = res.ok;

      await mysqlSequelize.query(
        `UPDATE webhook_deliveries
         SET status = :status, http_status_code = :code, response_body = :body,
             duration_ms = :ms, delivered_at = NOW()
         WHERE id = :id`,
        { replacements: {
          status: success ? 'success' : 'failed',
          code: res.status,
          body: responseBody,
          ms: duration,
          id: deliveryId,
        } }
      );

      if (success) {
        this.stats.success += 1;
        await this._markEndpointSuccess(endpoint.id);
      } else {
        this.stats.failed += 1;
        await this._scheduleRetry(endpoint, envelope, deliveryId, attempt, `HTTP ${res.status}`);
      }
    } catch (err) {
      const duration = Date.now() - startedAt;
      const isTimeout = err.name === 'AbortError';
      if (isTimeout) this.stats.timeout += 1; else this.stats.failed += 1;

      if (deliveryId) {
        await mysqlSequelize.query(
          `UPDATE webhook_deliveries
           SET status = :status, error_message = :err, duration_ms = :ms
           WHERE id = :id`,
          { replacements: {
            status: isTimeout ? 'timeout' : 'failed',
            err: String(err.message || err).slice(0, 1000),
            ms: duration,
            id: deliveryId,
          } }
        );
      }
      await this._scheduleRetry(endpoint, envelope, deliveryId, attempt, err.message);
    } finally {
      this.stats.dispatched += 1;
    }
  }

  async _scheduleRetry(endpoint, envelope, deliveryId, attempt, reason) {
    if (attempt >= MAX_ATTEMPTS) {
      logger.warn(`[WebhookDispatcher] endpoint=${endpoint.id} subject=${envelope.subject} GAVE UP na ${attempt} attempts: ${reason}`);
      await this._markEndpointFailure(endpoint.id);
      return;
    }
    const delayMs = RETRY_BACKOFF_MS[attempt - 1] || RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1];
    const nextRetryAt = new Date(Date.now() + delayMs);
    if (deliveryId) {
      await mysqlSequelize.query(
        `UPDATE webhook_deliveries SET status = 'retrying', next_retry_at = :nra WHERE id = :id`,
        { replacements: { nra: nextRetryAt, id: deliveryId } }
      );
    }
    setTimeout(() => {
      this._deliver(endpoint, envelope, attempt + 1).catch(() => {});
    }, delayMs);
  }

  async _processRetryQueue() {
    // Pick up retrying rows whose next_retry_at is overdue (server reboot recovery)
    try {
      const [rows] = await mysqlSequelize.query(
        `SELECT d.id, d.webhook_endpoint_id, d.event_payload, d.event_subject, d.attempt,
                e.url, e.secret, e.name, e.destination_id, e.failure_count, e.enabled
         FROM webhook_deliveries d
         INNER JOIN webhook_endpoints e ON e.id = d.webhook_endpoint_id
         WHERE d.status = 'retrying' AND d.next_retry_at <= NOW() AND e.enabled = 1
         ORDER BY d.next_retry_at ASC LIMIT 50`
      );
      for (const row of rows) {
        const envelope = typeof row.event_payload === 'string' ? JSON.parse(row.event_payload) : row.event_payload;
        const endpoint = {
          id: row.webhook_endpoint_id,
          destination_id: row.destination_id,
          url: row.url,
          secret: row.secret,
          name: row.name,
        };
        // Markeer huidige row als 'failed' (vorige attempt) en doe nieuwe attempt
        await mysqlSequelize.query(
          `UPDATE webhook_deliveries SET status = 'failed', next_retry_at = NULL WHERE id = :id`,
          { replacements: { id: row.id } }
        );
        this._deliver(endpoint, envelope, (row.attempt || 0) + 1).catch(() => {});
      }
    } catch (err) {
      logger.debug(`[WebhookDispatcher] retry queue scan error: ${err.message}`);
    }
  }

  async _markEndpointSuccess(endpointId) {
    try {
      await mysqlSequelize.query(
        `UPDATE webhook_endpoints SET failure_count = 0, last_success_at = NOW() WHERE id = :id`,
        { replacements: { id: endpointId } }
      );
    } catch (_) { /* non-blocking */ }
  }

  async _markEndpointFailure(endpointId) {
    try {
      await mysqlSequelize.query(
        `UPDATE webhook_endpoints
         SET failure_count = failure_count + 1, last_failure_at = NOW(),
             enabled = CASE WHEN failure_count + 1 >= :threshold THEN 0 ELSE enabled END
         WHERE id = :id`,
        { replacements: { id: endpointId, threshold: ENDPOINT_FAILURE_THRESHOLD } }
      );
    } catch (_) { /* non-blocking */ }
  }

  getStats() {
    return { ...this.stats, initialized: this.initialized };
  }
}

const webhookDispatcher = new WebhookDispatcher();
export default webhookDispatcher;
