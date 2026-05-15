/**
 * Domain Event Bus — Blok 3.3 Fase B
 *
 * NATS-style publish/subscribe abstraction bovenop bestaande Redis-eventBus.
 * Subject naming convention: `content.{destinationId}.{action}` of generieker
 * `<aggregate>.<tenant>.<event>`. Wildcards: `content.*.approved` (alle dests),
 * `content.10.*` (BUTE alle events).
 *
 * Wanneer NATS JetStream live wordt geinstalleerd, swap deze implementation
 * naar `nats.js` zonder dat callers iets hoeven te wijzigen.
 *
 * Pattern: ESM singleton; in-memory subscriber tree + delegatie naar eventBus
 * voor cross-process distributie (Redis pub/sub).
 *
 * @module domainEventBus
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import logger from '../utils/logger.js';
import eventBus from './eventBus.js';

const REDIS_DELEGATE_EVENT = 'content-event';

class DomainEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
    /** @type {Array<{pattern: RegExp, subject: string, handler: Function}>} */
    this.subscriptions = [];
    this.stats = { published: 0, dispatched: 0, lastSubject: null };

    // Bridge Redis eventBus 'content-event' naar deze abstractie zodat
    // subscriptions ook events ontvangen die door andere modules direct via
    // eventBus zijn uitgezonden (backwards compat).
    eventBus.on(REDIS_DELEGATE_EVENT, (envelope) => {
      if (!envelope || !envelope.subject) return;
      this._dispatch(envelope.subject, envelope);
    });
  }

  /**
   * Compile een NATS-stijl subject pattern naar regex.
   * '*' = exact 1 token, '>' = rest tokens. Tokens gescheiden door '.'.
   * Bv `content.*.approved` -> matched `content.1.approved` maar niet
   * `content.1.2.approved`.
   */
  _compilePattern(subjectPattern) {
    const escaped = subjectPattern
      .split('.')
      .map(t => {
        if (t === '*') return '[^.]+';
        if (t === '>') return '.+';
        return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('\\.');
    return new RegExp('^' + escaped + '$');
  }

  /**
   * Publiceer een Domain Event. Subject MOET NATS-style zijn (dots, no spaces).
   *
   * @param {string} subject - bv. 'content.10.approved'
   * @param {Object} payload - JSON-serializable
   * @returns {boolean} true als minstens 1 handler matchte
   */
  publish(subject, payload) {
    if (!subject || typeof subject !== 'string') {
      logger.warn('[DomainEventBus] publish: invalid subject');
      return false;
    }
    const envelope = {
      subject,
      ts: payload?.ts || new Date().toISOString(),
      ...payload,
    };
    this.stats.published += 1;
    this.stats.lastSubject = subject;

    // Bridge naar Redis eventBus voor cross-process distributie + bestaande
    // realtimeService consumers
    try {
      eventBus.emit(REDIS_DELEGATE_EVENT, envelope);
    } catch (err) {
      logger.warn(`[DomainEventBus] eventBus bridge error: ${err.message}`);
    }

    // Lokale dispatch ook (in-proces subscribers)
    return this._dispatch(subject, envelope) > 0;
  }

  /**
   * Subscribe op een subject pattern. Handler ontvangt envelope.
   * Returns unsubscribe-function.
   *
   * @param {string} subjectPattern - bv. 'content.*.approved' of 'content.10.>'
   * @param {(envelope: Object) => void | Promise<void>} handler
   * @returns {() => void} unsubscribe
   */
  subscribe(subjectPattern, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('subscribe: handler must be a function');
    }
    const sub = {
      pattern: this._compilePattern(subjectPattern),
      subject: subjectPattern,
      handler,
    };
    this.subscriptions.push(sub);
    logger.debug(`[DomainEventBus] subscribed pattern=${subjectPattern}`);
    return () => {
      const idx = this.subscriptions.indexOf(sub);
      if (idx >= 0) this.subscriptions.splice(idx, 1);
    };
  }

  _dispatch(subject, envelope) {
    let matched = 0;
    for (const sub of this.subscriptions) {
      if (sub.pattern.test(subject)) {
        matched += 1;
        // Fire-and-forget; handler-fouten mogen niet de pub-loop breken
        Promise.resolve()
          .then(() => sub.handler(envelope))
          .catch((err) => {
            logger.warn(`[DomainEventBus] handler error on ${subject}: ${err.message}`);
          });
      }
    }
    this.stats.dispatched += matched;
    return matched;
  }

  getStats() {
    return {
      ...this.stats,
      subscriptions: this.subscriptions.length,
      patterns: this.subscriptions.map(s => s.subject),
    };
  }
}

const domainEventBus = new DomainEventBus();
export default domainEventBus;
