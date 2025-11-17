/**
 * Event Bus Service
 * Redis-based pub/sub for inter-module communication
 */

import Redis from 'ioredis';
import logger from '../utils/logger.js';
import { EventEmitter } from 'events';

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // Increase for multiple listeners

    this.publisher = null;
    this.subscriber = null;
    this.isInitialized = false;
    this.eventHandlers = new Map();
  }

  /**
   * Initialize Redis connections
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      };

      // Create separate connections for pub/sub
      this.publisher = new Redis(redisConfig);
      this.subscriber = new Redis(redisConfig);

      // Handle Redis errors
      this.publisher.on('error', (err) => {
        logger.error('Redis Publisher Error:', err);
      });

      this.subscriber.on('error', (err) => {
        logger.error('Redis Subscriber Error:', err);
      });

      // Subscribe to all platform events
      await this.subscriber.psubscribe('platform:*');

      // Listen for messages
      this.subscriber.on('pmessage', (pattern, channel, message) => {
        this.handleEvent(channel, message);
      });

      this.isInitialized = true;
      logger.info('✅ Event Bus initialized');
    } catch (error) {
      logger.error('❌ Event Bus initialization failed:', error);
      throw error;
    }
  }

  /**
   * Publish event to the bus
   */
  async publish(eventName, data) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const channel = `platform:${eventName}`;
      const payload = JSON.stringify({
        event: eventName,
        data,
        timestamp: new Date().toISOString(),
        source: 'platform-core',
      });

      await this.publisher.publish(channel, payload);

      logger.integration('event_published', {
        event: eventName,
        channel,
      });

      // Also emit locally
      this.emit(eventName, data);
    } catch (error) {
      logger.error(`Failed to publish event ${eventName}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to specific event
   */
  on(eventName, handler) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }

    this.eventHandlers.get(eventName).push(handler);
    super.on(eventName, handler);

    logger.debug(`Registered handler for event: ${eventName}`);
  }

  /**
   * Handle incoming events
   */
  async handleEvent(channel, message) {
    try {
      const payload = JSON.parse(message);
      const { event, data, timestamp, source } = payload;

      logger.integration('event_received', {
        event,
        channel,
        source,
        timestamp,
      });

      // Execute registered handlers
      const handlers = this.eventHandlers.get(event) || [];
      for (const handler of handlers) {
        try {
          await handler(data, { source, timestamp });
        } catch (error) {
          logger.error(`Error in event handler for ${event}:`, error);
        }
      }

      // Emit to local listeners
      this.emit(event, data);
    } catch (error) {
      logger.error('Failed to handle event:', error);
    }
  }

  /**
   * Store event in history (for replay/debugging)
   */
  async storeEvent(eventName, data) {
    try {
      const key = `event_history:${eventName}`;
      const event = {
        data,
        timestamp: new Date().toISOString(),
      };

      await this.publisher.lpush(key, JSON.stringify(event));

      // Keep only last 1000 events per type
      await this.publisher.ltrim(key, 0, 999);

      // Set expiry based on retention policy
      const retentionDays = parseInt(process.env.EVENT_RETENTION_DAYS || '30');
      await this.publisher.expire(key, retentionDays * 24 * 60 * 60);
    } catch (error) {
      logger.error('Failed to store event history:', error);
    }
  }

  /**
   * Get event history
   */
  async getEventHistory(eventName, limit = 100) {
    try {
      const key = `event_history:${eventName}`;
      const events = await this.publisher.lrange(key, 0, limit - 1);
      return events.map(e => JSON.parse(e));
    } catch (error) {
      logger.error('Failed to get event history:', error);
      return [];
    }
  }

  /**
   * Graceful shutdown
   */
  async close() {
    if (this.publisher) {
      await this.publisher.quit();
    }
    if (this.subscriber) {
      await this.subscriber.quit();
    }
    this.isInitialized = false;
    logger.info('Event Bus closed');
  }
}

// Export singleton instance
const eventBus = new EventBus();

export async function initializeEventBus() {
  if (process.env.EVENT_BUS_ENABLED !== 'false') {
    await eventBus.initialize();
  }
}

export default eventBus;
