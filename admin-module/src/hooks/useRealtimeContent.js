/**
 * useRealtimeContent — Blok 2.2 Fase B
 *
 * React hook: connect met Socket.IO realtime server, subscribe op
 * destination-room en invalidate TanStack Query content-caches on incoming
 * state-events. Multi-user concurrent editing: 5 admins binnen 1 destination
 * zien elkaars wijzigingen <2s.
 *
 * Events worden ge-emit als `content:{action}` (approved, rejected, scheduled,
 * unscheduled, published, deleted, updated, retried, item-created).
 *
 * Server-side: `realtimeService.publishContentEvent({ destinationId, action, ... })`
 *
 * Gebruik in admin layout:
 *   useRealtimeContent(destinationId);  // auto-invalidate ['content', destId, ...] on events
 *
 * @module useRealtimeContent
 * @version 1.0.0
 */

import { useEffect, useRef } from 'react';
import { io as socketIO } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../stores/authStore.js';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.holidaibutler.com';

let _sharedSocket = null;
let _sharedSocketDestId = null;
let _connectListeners = 0;

function getOrCreateSocket(token) {
  if (_sharedSocket && _sharedSocket.connected) {
    return _sharedSocket;
  }
  if (_sharedSocket) {
    try { _sharedSocket.disconnect(); } catch (_) { /* noop */ }
    _sharedSocket = null;
  }
  _sharedSocket = socketIO(API_BASE, {
    path: '/realtime',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    timeout: 8000,
  });
  return _sharedSocket;
}

export default function useRealtimeContent(destinationId, options = {}) {
  const queryClient = useQueryClient();
  const enabled = options.enabled !== false && Boolean(destinationId);
  const token = useAuthStore(s => s.accessToken);
  const socketRef = useRef(null);

  // Stash callbacks in ref zodat useEffect niet re-runs op elke render
  const callbacksRef = useRef({ onConnect: options.onConnect, onEvent: options.onEvent, onError: options.onError });
  useEffect(() => {
    callbacksRef.current.onConnect = options.onConnect;
    callbacksRef.current.onEvent = options.onEvent;
    callbacksRef.current.onError = options.onError;
  }, [options.onConnect, options.onEvent, options.onError]);

  useEffect(() => {
    if (!enabled || !token) {
      return;
    }
    const destId = Number(destinationId);
    if (!destId) return;

    const socket = getOrCreateSocket(token);
    socketRef.current = socket;
    _connectListeners += 1;

    const handleConnect = () => {
      socket.emit('subscribe:destination', destId);
      callbacksRef.current.onConnect?.();
    };

    const handleContentEvent = (eventName) => (payload) => {
      if (!payload || payload.destinationId !== destId) return;

      queryClient.invalidateQueries({ queryKey: ['content', destId] });
      queryClient.invalidateQueries({ queryKey: ['concepts', destId] });
      queryClient.invalidateQueries({ queryKey: ['content-items', destId] });
      if (payload.itemId) {
        queryClient.invalidateQueries({ queryKey: ['content-item', destId, payload.itemId] });
      }
      if (payload.conceptId) {
        queryClient.invalidateQueries({ queryKey: ['concept', destId, payload.conceptId] });
      }

      callbacksRef.current.onEvent?.(eventName, payload);
    };

    const handleConnectError = (err) => {
      callbacksRef.current.onError?.(err);
    };

    const actions = ['approved', 'rejected', 'scheduled', 'unscheduled', 'published', 'deleted', 'updated', 'retried', 'item-created'];
    const handlers = {};
    actions.forEach((action) => {
      const eventName = `content:${action}`;
      const handler = handleContentEvent(eventName);
      handlers[eventName] = handler;
      socket.on(eventName, handler);
    });

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      try {
        socket.emit('unsubscribe:destination', destId);
        socket.off('connect', handleConnect);
        socket.off('connect_error', handleConnectError);
        Object.entries(handlers).forEach(([eventName, handler]) => socket.off(eventName, handler));
      } catch (_) { /* noop */ }
      _connectListeners = Math.max(0, _connectListeners - 1);
      if (_connectListeners === 0 && _sharedSocket) {
        try { _sharedSocket.disconnect(); } catch (_) { /* noop */ }
        _sharedSocket = null;
      }
    };
  }, [enabled, destinationId, token, queryClient]);

  return {
    socket: socketRef.current,
    connected: socketRef.current?.connected || false,
  };
}
