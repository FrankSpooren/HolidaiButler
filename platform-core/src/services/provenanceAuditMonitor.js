/**
 * Provenance Audit Monitor — Blok 1.6 Fase B
 *
 * Tracks consecutive failures of ai_generation_log writes across alle 5 callsites
 * (aiQualityOrchestrator.writeAuditLog + 4 contentGenerator INSERTs).
 *
 * Triggert [AUDIT-ALERT] error log wanneer 3 opeenvolgende writes falen
 * (cooldown 15 min om alert-spam te voorkomen). Volgens Fase B Blok 1.6:
 * "alert wanneer ai_generation_log write 3x op rij faalt".
 *
 * Acceptance: PM2 logs zonder audit-write-errors gedurende 24u (Frank punt 1.6).
 *
 * @module provenanceAuditMonitor
 * @version 1.0.0
 */

import logger from '../utils/logger.js';

const FAILURE_THRESHOLD = 3;
const ALERT_COOLDOWN_MS = 15 * 60 * 1000;

class ProvenanceAuditMonitor {
  constructor() {
    this.consecutiveFailures = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
    this.lastAlertAt = null;
    this.lastFailureContext = null;
    this.lastFailureMessage = null;
  }

  recordSuccess() {
    if (this.consecutiveFailures > 0) {
      logger.info(`[AuditMonitor] ai_generation_log recovered after ${this.consecutiveFailures} consecutive failures`);
    }
    this.consecutiveFailures = 0;
    this.totalSuccesses += 1;
  }

  recordFailure(err, context = 'unknown') {
    this.consecutiveFailures += 1;
    this.totalFailures += 1;
    this.lastFailureContext = context;
    this.lastFailureMessage = err?.message || String(err);

    if (this.consecutiveFailures >= FAILURE_THRESHOLD) {
      const now = Date.now();
      const sinceLastAlert = this.lastAlertAt ? now - this.lastAlertAt : Infinity;
      if (sinceLastAlert >= ALERT_COOLDOWN_MS) {
        this.lastAlertAt = now;
        logger.error(
          `[AUDIT-ALERT] ai_generation_log write failed ${this.consecutiveFailures}x op rij. ` +
          `Laatste context: ${context}. Laatste err: ${this.lastFailureMessage}. ` +
          `Totaal failures sinds boot: ${this.totalFailures} / successes: ${this.totalSuccesses}. ` +
          `EU AI Act traceability is in gevaar — onderzoek DB connectie of schema.`
        );
      } else {
        const minsRemaining = Math.ceil((ALERT_COOLDOWN_MS - sinceLastAlert) / 60000);
        logger.warn(
          `[AuditMonitor] ai_generation_log failure ${this.consecutiveFailures}x op rij (alert cooldown nog ${minsRemaining} min) — context: ${context}`
        );
      }
    } else {
      logger.warn(`[AuditMonitor] ai_generation_log write failed (${this.consecutiveFailures}/${FAILURE_THRESHOLD}) — context: ${context}, err: ${this.lastFailureMessage}`);
    }
  }

  getStatus() {
    return {
      consecutiveFailures: this.consecutiveFailures,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      lastAlertAt: this.lastAlertAt ? new Date(this.lastAlertAt).toISOString() : null,
      lastFailureContext: this.lastFailureContext,
      lastFailureMessage: this.lastFailureMessage,
      threshold: FAILURE_THRESHOLD,
      cooldownMs: ALERT_COOLDOWN_MS,
    };
  }

  reset() {
    this.consecutiveFailures = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
    this.lastAlertAt = null;
    this.lastFailureContext = null;
    this.lastFailureMessage = null;
  }
}

const provenanceAuditMonitor = new ProvenanceAuditMonitor();

export default provenanceAuditMonitor;
export { ProvenanceAuditMonitor, FAILURE_THRESHOLD, ALERT_COOLDOWN_MS };
