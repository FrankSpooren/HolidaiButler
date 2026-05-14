/**
 * Realtime Service — Blok 2.2 Fase B
 *
 * Socket.IO server bridge tussen backend state-events (via eventBus / Redis pub-sub
 * conform NATS-style subject naming `content.{destinationId}.{event}`) en frontend
 * admin sessies. Multi-user concurrent editing: 5 admins binnen 1 destination
 * zien elkaars wijzigingen <2s.
 *
 * Authentication: JWT-based (zelfde token als REST API).
 * Rooms: `destination:{id}` — events scoped per-tenant.
 * Event-subjects: `content.{destinationId}.{action}` waar action ∈
 *   { approved, rejected, scheduled, unscheduled, published, deleted, updated, retried, item-created }.
 *
 * @module realtimeService
 * @version 1.0.0
 */

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import eventBus from './eventBus.js';
import domainEventBus from './domainEventBus.js';
import featureFlagService from './featureFlagService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

class RealtimeService {
  constructor() {
    this.io = null;
    this.connectedClients = 0;
    this.eventStats = { emitted: 0, lastEvent: null };
  }

  /**
   * Initialiseer Socket.IO server gekoppeld aan httpServer (vereist voor
   * dezelfde poort als Express). Wire eventBus subscribers naar Socket.IO rooms.
   *
   * @param {import('http').Server} httpServer
   * @param {Object} [options]
   * @param {string[]} [options.allowedOrigins] - CORS origins
   */
  initialize(httpServer, options = {}) {
    if (this.io) {
      logger.warn('[Realtime] Already initialized, skipping');
      return this.io;
    }

    const allowedOrigins = options.allowedOrigins || [
      'https://admin.holidaibutler.com',
      'https://test.holidaibutler.com',
      'http://localhost:5173',
      'http://localhost:5174',
    ];

    this.io = new Server(httpServer, {
      cors: {
        origin: allowedOrigins,
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      path: '/realtime',
    });

    // JWT authentication middleware
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth?.token
          || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
        if (!token) {
          return next(new Error('Missing auth token'));
        }
        const payload = jwt.verify(token, JWT_SECRET);
        socket.user = {
          id: payload.id || payload.userId || payload.sub,
          email: payload.email,
          role: payload.role,
          destinationId: payload.destination_id || payload.destinationId || null,
        };
        return next();
      } catch (err) {
        logger.warn(`[Realtime] Auth rejected: ${err.message}`);
        return next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      this.connectedClients += 1;
      logger.info(`[Realtime] Client connected — user=${socket.user?.email || socket.user?.id} total=${this.connectedClients}`);

      // Subscribe to per-destination room
      socket.on('subscribe:destination', (destinationId) => {
        const destIdNum = Number(destinationId);
        if (!destIdNum || isNaN(destIdNum)) {
          socket.emit('error', { code: 'INVALID_DESTINATION', message: 'destinationId required' });
          return;
        }
        // Authorization: alleen platform_admin mag andere destinations subscriben
        if (socket.user.role !== 'platform_admin' && socket.user.destinationId && socket.user.destinationId !== destIdNum) {
          socket.emit('error', { code: 'FORBIDDEN', message: 'No access to destination ' + destIdNum });
          return;
        }
        const room = `destination:${destIdNum}`;
        socket.join(room);
        socket.emit('subscribed', { destinationId: destIdNum, room });
        logger.debug(`[Realtime] Socket ${socket.id} joined ${room}`);
      });

      socket.on('unsubscribe:destination', (destinationId) => {
        const room = `destination:${Number(destinationId)}`;
        socket.leave(room);
      });

      socket.on('disconnect', () => {
        this.connectedClients = Math.max(0, this.connectedClients - 1);
        logger.debug(`[Realtime] Disconnected ${socket.id} total=${this.connectedClients}`);
      });
    });

    // Bridge eventBus → Socket.IO rooms (NATS-style subject naming).
    // Backend services emiteren via eventBus.emit('content.{destId}.{action}', payload)
    // → broadcast naar room `destination:{destId}`.
    eventBus.on('content-event', (envelope) => {
      try {
        if (!envelope || !envelope.subject || typeof envelope.subject !== 'string') return;
        const match = envelope.subject.match(/^content\.(\d+)\.([a-z_-]+)$/i);
        if (!match) {
          logger.warn(`[Realtime] Subject mismatch: ${envelope.subject}`);
          return;
        }
        const destId = Number(match[1]);
        const action = match[2];
        const room = `destination:${destId}`;
        const eventName = `content:${action}`;
        this.io.to(room).emit(eventName, {
          subject: envelope.subject,
          destinationId: destId,
          action,
          itemId: envelope.itemId,
          conceptId: envelope.conceptId,
          fromStatus: envelope.fromStatus,
          toStatus: envelope.toStatus,
          ts: envelope.ts || new Date().toISOString(),
          actorId: envelope.actorId || null,
        });
        this.eventStats.emitted += 1;
        this.eventStats.lastEvent = { subject: envelope.subject, ts: Date.now() };
        logger.debug(`[Realtime] Broadcast ${eventName} → ${room}`);
      } catch (err) {
        logger.warn(`[Realtime] Broadcast failed: ${err.message}`);
      }
    });

    logger.info('[Realtime] Socket.IO server initialized op /realtime');
    return this.io;
  }

  /**
   * Publiceer een content state-change event in NATS-style subject naming.
   * Te gebruiken door FSM transitionStatus + publisher + andere mutators.
   *
   * @param {Object} params
   * @param {number} params.destinationId
   * @param {string} params.action  - approved/rejected/scheduled/published/deleted/updated/...
   * @param {number} [params.itemId]
   * @param {number} [params.conceptId]
   * @param {string} [params.fromStatus]
   * @param {string} [params.toStatus]
   * @param {string} [params.actorId]
   */
  async publishContentEvent({ destinationId, action, itemId = null, conceptId = null, fromStatus = null, toStatus = null, actorId = null }) {
    if (!destinationId || !action) return;
    // v4.95 Blok 2.E: feature flag gating per destination (rollback safety).
    // Default ENABLED. Zet flag=false per destination om realtime push uit te schakelen.
    try {
      const enabled = await featureFlagService.isEnabled('frontend.tanstack_query.enabled', {
        scopeType: 'destination',
        scopeId: Number(destinationId),
        fallback: true,
      });
      if (!enabled) {
        logger.debug(`[Realtime] feature disabled for destination=${destinationId}, skipping emit`);
        return;
      }
    } catch (ffErr) {
      logger.debug(`[Realtime] feature flag check failed (defaulting enabled): ${ffErr.message}`);
    }
    const envelope = {
      destinationId: Number(destinationId),
      action,
      itemId,
      conceptId,
      fromStatus,
      toStatus,
      actorId,
      ts: new Date().toISOString(),
    };
    // v4.96 Blok 3.3: publiceer via domainEventBus (NATS-style); bridge naar
    // eventBus blijft automatisch behouden voor backwards compat consumers.
    domainEventBus.publish(`content.${destinationId}.${action}`, envelope);
  }

  getStatus() {
    return {
      initialized: !!this.io,
      connectedClients: this.connectedClients,
      eventsEmitted: this.eventStats.emitted,
      lastEvent: this.eventStats.lastEvent,
    };
  }
}

const realtimeService = new RealtimeService();
export default realtimeService;
