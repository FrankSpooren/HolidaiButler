/**
 * De Magazijnier — Inventory Sync Agent (Fase IV Blok D)
 *
 * Monitors ticket inventory and reservation slot consistency.
 * Redis vs MySQL sync checks, stale reservation detection,
 * and low-inventory alerts.
 *
 * Type A: destination-aware. Schedule: every 30 min.
 *
 * Checks:
 *   1. Ticket inventory: Redis reserves vs MySQL reserved_count
 *   2. Reservation slots: available vs actual bookings
 *   3. Stale reservations: pending >2h without confirmation
 *   4. Low inventory: <10% remaining for active items
 *
 * @module agents/inventorySync/index
 * @version 1.0.0
 */

import { mysqlSequelize } from '../../../config/database.js';
import redis from '../../../config/redis.js';
import { logAgent, logAlert } from '../../orchestrator/auditTrail/index.js';
import mongoose from 'mongoose';

const { QueryTypes } = (await import('sequelize')).default;

// ============================================================================
// MONGODB SCHEMA
// ============================================================================

const inventorySyncResultSchema = new mongoose.Schema({
  timestamp:             { type: Date, default: Date.now },
  destination_id:        Number,
  ticket_inventory_sync: mongoose.Schema.Types.Mixed,
  reservation_slot_sync: mongoose.Schema.Types.Mixed,
  stale_reservations:    mongoose.Schema.Types.Mixed,
  low_inventory_alerts:  [mongoose.Schema.Types.Mixed],
  summary:               mongoose.Schema.Types.Mixed
}, { collection: 'inventory_sync_results' });

let InventorySyncResult;
try {
  InventorySyncResult = mongoose.model('InventorySyncResult');
} catch {
  InventorySyncResult = mongoose.model('InventorySyncResult', inventorySyncResultSchema);
}

// ============================================================================
// DE MAGAZIJNIER
// ============================================================================

class InventorySyncAgent {
  constructor() {
    this.name = 'De Magazijnier';
    this.version = '1.0.0';
  }

  /**
   * Check if destination has commerce features enabled.
   */
  async hasCommerceFeatures(destinationId) {
    try {
      const destCode = destinationId === 1 ? 'calpe' : destinationId === 2 ? 'texel' : null;
      if (!destCode) return false;
      const config = (await import(`../../../config/destinations/${destCode}.config.js`)).default;
      return config?.commerce?.hasTicketing || config?.commerce?.hasReservations || false;
    } catch {
      return false;
    }
  }

  /**
   * Check Redis ticket reserves vs MySQL ticket_inventory.reserved_count.
   * Uses SCAN instead of KEYS for production safety.
   */
  async checkTicketInventorySync(destinationId) {
    const redisClient = redis.getClient ? redis.getClient() : redis;
    if (!redisClient) {
      return { checked: 0, mismatches: [], error: 'Redis unavailable' };
    }

    // Get all active inventory items for this destination
    const inventoryItems = await mysqlSequelize.query(
      `SELECT ti.id, ti.poi_id, ti.reserved_count, ti.sold_count, ti.total_capacity,
              p.name as poi_name
       FROM ticket_inventory ti
       LEFT JOIN POI p ON ti.poi_id = p.id
       WHERE ti.destination_id = :destinationId
         AND ti.is_available = TRUE`,
      { replacements: { destinationId }, type: QueryTypes.SELECT }
    );

    const mismatches = [];

    for (const item of inventoryItems) {
      // Count Redis keys for this inventory item using SCAN
      let redisReserveCount = 0;
      try {
        const pattern = `ticket:reserve:${item.id}:*`;
        const keys = await this._scanKeys(redisClient, pattern);
        redisReserveCount = keys.length;
      } catch {
        // Redis SCAN failure — skip this item
        continue;
      }

      // Compare: Redis active reserves should not exceed MySQL reserved_count
      // MySQL reserved_count includes both Redis-tracked and expired-but-not-released
      if (redisReserveCount !== item.reserved_count && item.reserved_count > 0) {
        mismatches.push({
          inventory_id: item.id,
          poi_id: item.poi_id,
          poi_name: item.poi_name,
          redis_reserved: redisReserveCount,
          mysql_reserved: item.reserved_count,
          diff: item.reserved_count - redisReserveCount
        });
      }
    }

    if (mismatches.length > 0) {
      await logAgent('inventory-sync', 'inventory_mismatch', {
        description: `${mismatches.length} Redis/MySQL inventory mismatch(es) for dest ${destinationId}`,
        destinationId,
        metadata: { mismatchCount: mismatches.length }
      });
    }

    return {
      checked: inventoryItems.length,
      mismatches,
      mismatch_count: mismatches.length
    };
  }

  /**
   * SCAN helper: safely iterate Redis keys matching pattern.
   */
  async _scanKeys(client, pattern) {
    const keys = [];
    let cursor = '0';
    do {
      const [nextCursor, matchedKeys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      keys.push(...matchedKeys);
    } while (cursor !== '0');
    return keys;
  }

  /**
   * Check reservation slot availability vs actual bookings.
   */
  async checkReservationSlotSync(destinationId) {
    const slots = await mysqlSequelize.query(
      `SELECT rs.id, rs.poi_id, rs.date, rs.start_time, rs.end_time,
              rs.max_capacity, rs.booked_count,
              p.name as poi_name,
              COUNT(r.id) as actual_bookings
       FROM reservation_slots rs
       LEFT JOIN POI p ON rs.poi_id = p.id
       LEFT JOIN reservations r ON r.slot_id = rs.id AND r.status NOT IN ('cancelled', 'no_show')
       WHERE rs.destination_id = :destinationId
         AND rs.date >= CURDATE()
       GROUP BY rs.id
       HAVING actual_bookings != rs.booked_count`,
      { replacements: { destinationId }, type: QueryTypes.SELECT }
    );

    return {
      checked: true,
      mismatches: slots.map(s => ({
        slot_id: s.id,
        poi_id: s.poi_id,
        poi_name: s.poi_name,
        date: s.date,
        booked_count: s.booked_count,
        actual_bookings: s.actual_bookings,
        diff: s.booked_count - s.actual_bookings
      })),
      mismatch_count: slots.length
    };
  }

  /**
   * Detect stale reservations: pending >2h without confirmation.
   */
  async detectStaleReservations(destinationId) {
    // Stale ticket orders
    const staleTickets = await mysqlSequelize.query(
      `SELECT id, order_number, total_amount_cents, created_at,
              TIMESTAMPDIFF(MINUTE, created_at, NOW()) as minutes_pending
       FROM ticket_orders
       WHERE status = 'pending'
         AND created_at < DATE_SUB(NOW(), INTERVAL 2 HOUR)
         AND destination_id = :destinationId
       ORDER BY created_at ASC`,
      { replacements: { destinationId }, type: QueryTypes.SELECT }
    );

    // Stale reservations
    const staleReservations = await mysqlSequelize.query(
      `SELECT id, reservation_number, created_at,
              TIMESTAMPDIFF(MINUTE, created_at, NOW()) as minutes_pending
       FROM reservations
       WHERE status = 'deposit_pending'
         AND created_at < DATE_SUB(NOW(), INTERVAL 2 HOUR)
         AND destination_id = :destinationId
       ORDER BY created_at ASC`,
      { replacements: { destinationId }, type: QueryTypes.SELECT }
    );

    const total = staleTickets.length + staleReservations.length;
    if (total > 0) {
      await logAgent('inventory-sync', 'stale_reservations', {
        description: `${total} stale reservations detected (dest ${destinationId})`,
        destinationId,
        metadata: { staleTickets: staleTickets.length, staleReservations: staleReservations.length }
      });
    }

    return {
      stale_tickets: staleTickets.length,
      stale_reservations: staleReservations.length,
      total: total,
      details: {
        tickets: staleTickets.slice(0, 10).map(t => ({
          id: t.id, order_number: t.order_number, minutes_pending: t.minutes_pending
        })),
        reservations: staleReservations.slice(0, 10).map(r => ({
          id: r.id, reservation_number: r.reservation_number, minutes_pending: r.minutes_pending
        }))
      }
    };
  }

  /**
   * Alert when inventory <10% remaining for active items.
   */
  async checkLowInventory(destinationId) {
    const lowItems = await mysqlSequelize.query(
      `SELECT ti.id as inventory_id, ti.poi_id, ti.total_capacity, ti.reserved_count, ti.sold_count,
              (ti.total_capacity - ti.reserved_count - ti.sold_count) as remaining,
              ROUND(((ti.total_capacity - ti.reserved_count - ti.sold_count) / ti.total_capacity) * 100, 1) as remaining_pct,
              p.name as poi_name
       FROM ticket_inventory ti
       LEFT JOIN POI p ON ti.poi_id = p.id
       WHERE ti.destination_id = :destinationId
         AND ti.is_available = TRUE
         AND ti.total_capacity > 0
         AND ti.sold_count > 0
         AND ((ti.total_capacity - ti.reserved_count - ti.sold_count) / ti.total_capacity) < 0.10
       ORDER BY remaining_pct ASC`,
      { replacements: { destinationId }, type: QueryTypes.SELECT }
    );

    if (lowItems.length > 0) {
      await logAlert('info', `Low inventory: ${lowItems.length} item(s) <10% remaining (dest ${destinationId})`, {
        source: 'De Magazijnier',
        destinationId,
        itemCount: lowItems.length
      });
    }

    return lowItems.map(i => ({
      inventory_id: i.inventory_id,
      poi_id: i.poi_id,
      poi_name: i.poi_name,
      total_capacity: i.total_capacity,
      remaining: i.remaining,
      remaining_pct: i.remaining_pct
    }));
  }

  /**
   * Main entry: run all inventory checks for a destination.
   */
  async runForDestination(destinationId) {
    const startTime = Date.now();

    // Check if commerce features are enabled for this destination
    const hasCommerce = await this.hasCommerceFeatures(destinationId);
    if (!hasCommerce) {
      return {
        destination_id: destinationId,
        skipped: true,
        reason: 'Commerce features not enabled',
        duration_ms: Date.now() - startTime
      };
    }

    try {
      const ticketSync = await this.checkTicketInventorySync(destinationId);
      const slotSync = await this.checkReservationSlotSync(destinationId);
      const staleReservations = await this.detectStaleReservations(destinationId);
      const lowInventory = await this.checkLowInventory(destinationId);

      const result = {
        timestamp: new Date(),
        destination_id: destinationId,
        ticket_inventory_sync: ticketSync,
        reservation_slot_sync: slotSync,
        stale_reservations: staleReservations,
        low_inventory_alerts: lowInventory,
        summary: {
          ticket_mismatches: ticketSync.mismatch_count || 0,
          slot_mismatches: slotSync.mismatch_count || 0,
          stale_total: staleReservations.total || 0,
          low_inventory_count: lowInventory.length,
          duration_ms: Date.now() - startTime
        }
      };

      // Store in MongoDB
      await InventorySyncResult.create(result);

      await logAgent('inventory-sync', 'sync_completed', {
        description: `De Magazijnier completed for destination ${destinationId}`,
        destinationId,
        metadata: result.summary
      });

      return result;
    } catch (error) {
      console.error(`[De Magazijnier] Error for destination ${destinationId}:`, error.message);
      await logAgent('inventory-sync', 'sync_error', {
        description: `De Magazijnier failed for destination ${destinationId}: ${error.message}`,
        destinationId,
        status: 'error'
      });
      return { destination_id: destinationId, error: error.message };
    }
  }

  /**
   * Get latest result from MongoDB (for daily briefing).
   */
  async getLatestResult(destinationId) {
    try {
      return await InventorySyncResult.findOne(
        { destination_id: destinationId },
        null,
        { sort: { timestamp: -1 } }
      ).lean();
    } catch {
      return null;
    }
  }
}

export default new InventorySyncAgent();
