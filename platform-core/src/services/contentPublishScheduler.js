/**
 * Content Publish Scheduler — Blok 4 Fase B (v4.97)
 *
 * BullMQ delayed-job orchestration voor exacte publicatie-timing (60s precisie
 * vs huidige 15-min polling-vertraging). Per content_item een delayed job met
 * jobId=`publish-{itemId}` zodat reschedule via queue.remove() + add() werkt.
 *
 * Features:
 *   - scheduleItem(itemId, scheduledAt) — voeg delayed job toe
 *   - rescheduleItem(itemId, newScheduledAt) — verwijder oude + add nieuwe
 *   - cancelItem(itemId) — verwijder geplande job (bij approve/delete/reject)
 *   - Idempotent: dubbele schedule-calls overschrijven bestaande job
 *   - Feature flag `publisher.delayed_jobs_enabled` (default true)
 *     bij false: skip BullMQ, fallback naar 15-min cron safety-net
 *
 * @module contentPublishScheduler
 * @version 1.0.0
 */

import { Queue } from 'bullmq';
import logger from '../utils/logger.js';
import { mysqlSequelize } from '../config/database.js';
import { connection } from './orchestrator/queues.js';
import featureFlagService from './featureFlagService.js';

export const CONTENT_PUBLISH_QUEUE = 'content-publish-item';

class ContentPublishScheduler {
  constructor() {
    this.queue = new Queue(CONTENT_PUBLISH_QUEUE, {
      connection,
      defaultJobOptions: {
        attempts: 1,                                    // publisher heeft eigen retry (Blok 1.1 Graph API confirm)
        removeOnComplete: { age: 86400, count: 1000 }, // keep 24h / 1000 jobs
        removeOnFail: { age: 604800, count: 2000 },    // keep 7d / 2000 jobs
      },
    });
    this.stats = { scheduled: 0, rescheduled: 0, cancelled: 0, skippedFlag: 0 };
  }

  _jobId(itemId) {
    return `publish-${Number(itemId)}`;
  }

  /**
   * Check feature flag voor delayed-jobs per destination.
   * Default: enabled. Wanneer false → caller valt terug op cron polling.
   *
   * @param {number} destinationId
   * @returns {Promise<boolean>}
   */
  async isEnabled(destinationId) {
    if (!destinationId) return true; // global default
    try {
      return await featureFlagService.isEnabled('publisher.delayed_jobs_enabled', {
        scopeType: 'destination',
        scopeId: Number(destinationId),
        fallback: true,
      });
    } catch (err) {
      logger.debug(`[ContentPublishScheduler] feature flag check failed (default true): ${err.message}`);
      return true;
    }
  }

  /**
   * Plan een content item voor publicatie op exacte tijd.
   * Idempotent: bestaande job met zelfde jobId wordt automatisch vervangen
   * (BullMQ removeOnComplete + jobId uniqueness).
   *
   * @param {Object} params
   * @param {number} params.itemId
   * @param {Date|string} params.scheduledAt
   * @param {number} [params.destinationId]
   * @returns {Promise<{itemId, jobId, delayMs, skipped?}>}
   */
  async scheduleItem({ itemId, scheduledAt, destinationId = null }) {
    if (!itemId || !scheduledAt) {
      throw new Error('scheduleItem: itemId + scheduledAt required');
    }
    const enabled = await this.isEnabled(destinationId);
    if (!enabled) {
      this.stats.skippedFlag += 1;
      logger.debug(`[ContentPublishScheduler] delayed-jobs disabled for dest=${destinationId}, item=${itemId} — cron safety-net pickup`);
      return { itemId, jobId: this._jobId(itemId), delayMs: null, skipped: 'feature-flag-disabled' };
    }
    const scheduledMs = new Date(scheduledAt).getTime();
    if (isNaN(scheduledMs)) {
      throw new Error(`scheduleItem: invalid scheduledAt=${scheduledAt}`);
    }
    const delayMs = Math.max(0, scheduledMs - Date.now());
    const jobId = this._jobId(itemId);

    // Remove bestaande job (idempotent overwrite). BullMQ throwt niet als job niet bestaat.
    try {
      const existing = await this.queue.getJob(jobId);
      if (existing) await existing.remove();
    } catch (_) { /* noop */ }

    await this.queue.add(
      'content-publish-item',
      { itemId: Number(itemId), destinationId, scheduledAt: new Date(scheduledMs).toISOString() },
      { jobId, delay: delayMs }
    );
    this.stats.scheduled += 1;
    logger.info(`[ContentPublishScheduler] scheduled item=${itemId} at=${new Date(scheduledMs).toISOString()} delay=${delayMs}ms`);
    return { itemId: Number(itemId), jobId, delayMs };
  }

  /**
   * Verplaats een geplande job naar nieuw tijdstip.
   * = remove + add (BullMQ "delayed job update" pattern).
   */
  async rescheduleItem({ itemId, newScheduledAt, destinationId = null }) {
    const jobId = this._jobId(itemId);
    try {
      const existing = await this.queue.getJob(jobId);
      if (existing) {
        await existing.remove();
        this.stats.rescheduled += 1;
      }
    } catch (err) {
      logger.debug(`[ContentPublishScheduler] reschedule remove non-blocking error: ${err.message}`);
    }
    return this.scheduleItem({ itemId, scheduledAt: newScheduledAt, destinationId });
  }

  /**
   * Verwijder een geplande job (bij approve→approved unschedule, reject, delete).
   * Idempotent: failed-removal wordt gelogd, niet throwed.
   */
  async cancelItem(itemId) {
    const jobId = this._jobId(itemId);
    try {
      const existing = await this.queue.getJob(jobId);
      if (existing) {
        await existing.remove();
        this.stats.cancelled += 1;
        logger.info(`[ContentPublishScheduler] cancelled scheduled job for item=${itemId}`);
        return { itemId: Number(itemId), jobId, cancelled: true };
      }
    } catch (err) {
      logger.debug(`[ContentPublishScheduler] cancel non-blocking error: ${err.message}`);
    }
    return { itemId: Number(itemId), jobId, cancelled: false };
  }

  /**
   * Inspect: huidige delayed-job-count + queue counts.
   */
  async getQueueStats() {
    try {
      const counts = await this.queue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed');
      return { ...counts, dispatcherStats: this.stats };
    } catch (err) {
      return { error: err.message, dispatcherStats: this.stats };
    }
  }

  async getDelayedJobs(limit = 50) {
    try {
      const jobs = await this.queue.getDelayed(0, limit - 1);
      return jobs.map((j) => ({
        id: j.id,
        name: j.name,
        data: j.data,
        delay: j.opts?.delay,
        timestamp: j.timestamp,
        runAt: new Date(j.timestamp + (j.opts?.delay || 0)).toISOString(),
      }));
    } catch (err) {
      logger.warn(`[ContentPublishScheduler] getDelayedJobs error: ${err.message}`);
      return [];
    }
  }

  /**
   * Backfill: register delayed-jobs voor alle items die op deploy-moment al
   * 'scheduled' state hebben met scheduled_at in toekomst. Idempotent: bestaande
   * jobs worden vervangen, geen risico op duplicaten.
   *
   * Aanroepen bij boot (na DB ready) zodat Redis-restart en eerste-deploy
   * scenario's geen orphan-detector lag van >5min veroorzaken.
   *
   * @returns {Promise<{registered: number, skipped: number}>}
   */
  async backfillScheduled() {
    try {
      const [items] = await mysqlSequelize.query(
        `SELECT id, destination_id, scheduled_at FROM content_items
         WHERE approval_status = 'scheduled'
           AND scheduled_at > NOW()
           AND published_at IS NULL
           AND (publish_url IS NULL OR publish_url = '')`
      );
      let registered = 0, skipped = 0;
      for (const item of items) {
        try {
          const result = await this.scheduleItem({
            itemId: item.id,
            scheduledAt: item.scheduled_at,
            destinationId: item.destination_id,
          });
          if (result.skipped) skipped += 1; else registered += 1;
        } catch (err) {
          logger.warn(`[ContentPublishScheduler] backfill item=${item.id} failed: ${err.message}`);
        }
      }
      logger.info(`[ContentPublishScheduler] backfill complete: registered=${registered}, skipped=${skipped} (totaal ${items.length} scheduled future items)`);
      return { registered, skipped, total: items.length };
    } catch (err) {
      logger.warn(`[ContentPublishScheduler] backfill failed: ${err.message}`);
      return { registered: 0, skipped: 0, error: err.message };
    }
  }

  async shutdown() {
    try { await this.queue.close(); } catch (_) { /* noop */ }
  }
}

const contentPublishScheduler = new ContentPublishScheduler();
export default contentPublishScheduler;
