/**
 * Inventory Service (Fase III — Blok B)
 *
 * Redis-based inventory locking for race condition prevention.
 * Uses MySQL FOR UPDATE row locks + Redis TTL as checkout timer.
 *
 * Functions:
 * - reserveInventory — Lock inventory during checkout (15 min)
 * - confirmInventory — Convert reserved → sold after payment
 * - releaseInventory — Release reserved inventory (cancel/timeout)
 * - releaseExpiredReservations — BullMQ job: cleanup expired orders
 *
 * All capacity tracking in ticket_inventory table:
 *   available = total_capacity - reserved_count - sold_count
 */

import { mysqlSequelize } from '../../config/database.js';
import redis from '../../config/redis.js';
import logger from '../../utils/logger.js';

const { QueryTypes } = (await import('sequelize')).default;

// Reserve key prefix in Redis
const RESERVE_PREFIX = 'ticket:reserve:';
// Lock key prefix for distributed locking
const LOCK_PREFIX = 'ticket:lock:';
// Checkout window: 15 minutes
const CHECKOUT_TTL_SECONDS = 900;
// Lock acquisition timeout: 5 seconds
const LOCK_TTL_SECONDS = 5;

// ============================================================================
// RESERVE INVENTORY
// ============================================================================

/**
 * Reserve inventory slots during checkout.
 * Uses MySQL FOR UPDATE + Redis TTL for automatic expiry.
 *
 * @param {number} inventoryId - ticket_inventory.id
 * @param {number} quantity - Number of tickets to reserve
 * @param {number} orderId - ticket_orders.id (for tracking)
 * @returns {Promise<Object>} { success, expiresAt }
 * @throws {Error} INSUFFICIENT_INVENTORY if not enough capacity
 */
export async function reserveInventory(inventoryId, quantity, orderId) {
  const lockKey = `${LOCK_PREFIX}${inventoryId}`;
  const reserveKey = `${RESERVE_PREFIX}${inventoryId}:${orderId}`;
  let lockAcquired = false;

  try {
    // 1. Acquire distributed lock via Redis SETNX (optional — graceful if Redis unavailable)
    if (redis.isConnected()) {
      const client = redis.getClient();
      const result = await client.set(lockKey, orderId.toString(), 'EX', LOCK_TTL_SECONDS, 'NX');
      lockAcquired = result === 'OK';
      if (!lockAcquired) {
        // Wait briefly and retry once
        await new Promise(r => setTimeout(r, 500));
        const retry = await client.set(lockKey, orderId.toString(), 'EX', LOCK_TTL_SECONDS, 'NX');
        lockAcquired = retry === 'OK';
        if (!lockAcquired) {
          throw new Error('LOCK_TIMEOUT');
        }
      }
    }

    // 2. Use explicit MySQL transaction for SELECT FOR UPDATE + UPDATE atomicity
    const result = await mysqlSequelize.transaction(async (t) => {
      // Check availability with row lock
      const [inventory] = await mysqlSequelize.query(
        `SELECT total_capacity, reserved_count, sold_count
         FROM ticket_inventory
         WHERE id = :inventoryId AND is_available = TRUE
         FOR UPDATE`,
        { replacements: { inventoryId }, type: QueryTypes.SELECT, transaction: t }
      );

      if (!inventory) {
        throw new Error('INVENTORY_NOT_FOUND');
      }

      const available = inventory.total_capacity - inventory.reserved_count - inventory.sold_count;
      if (available < quantity) {
        throw new Error('INSUFFICIENT_INVENTORY');
      }

      // Increment reserved_count (same transaction → row lock held)
      await mysqlSequelize.query(
        `UPDATE ticket_inventory
         SET reserved_count = reserved_count + :quantity,
             updated_at = NOW()
         WHERE id = :inventoryId`,
        { replacements: { quantity, inventoryId }, type: QueryTypes.UPDATE, transaction: t }
      );

      return { totalCapacity: inventory.total_capacity, reserved: inventory.reserved_count + quantity };
    });

    // 3. Set Redis reserve key with checkout TTL (outside transaction — non-critical)
    if (redis.isConnected()) {
      await redis.set(
        reserveKey,
        JSON.stringify({ quantity, inventoryId, orderId }),
        CHECKOUT_TTL_SECONDS
      );
    }

    const expiresAt = new Date(Date.now() + CHECKOUT_TTL_SECONDS * 1000);
    logger.info(`[Ticketing] Reserved ${quantity} for inventory ${inventoryId}, order ${orderId}, expires ${expiresAt.toISOString()}`);

    return { success: true, expiresAt };
  } finally {
    // Release Redis lock
    if (lockAcquired && redis.isConnected()) {
      await redis.del(lockKey);
    }
  }
}

// ============================================================================
// CONFIRM INVENTORY
// ============================================================================

/**
 * Convert reserved inventory to sold after successful payment.
 *
 * @param {number} orderId - ticket_orders.id
 * @param {number} inventoryId - ticket_inventory.id
 * @param {number} quantity - Number of tickets confirmed
 */
export async function confirmInventory(orderId, inventoryId, quantity) {
  await mysqlSequelize.query(
    `UPDATE ticket_inventory
     SET reserved_count = GREATEST(reserved_count - :quantity, 0),
         sold_count = sold_count + :quantity,
         updated_at = NOW()
     WHERE id = :inventoryId`,
    { replacements: { quantity, inventoryId }, type: QueryTypes.UPDATE }
  );

  // Remove Redis reserve key
  const reserveKey = `${RESERVE_PREFIX}${inventoryId}:${orderId}`;
  await redis.del(reserveKey);

  logger.info(`[Ticketing] Confirmed ${quantity} for inventory ${inventoryId}, order ${orderId}`);
}

// ============================================================================
// RELEASE INVENTORY
// ============================================================================

/**
 * Release reserved inventory (cancel or timeout).
 *
 * @param {number} orderId - ticket_orders.id
 * @param {number} inventoryId - ticket_inventory.id
 * @param {number} quantity - Number of tickets to release
 */
export async function releaseInventory(orderId, inventoryId, quantity) {
  await mysqlSequelize.query(
    `UPDATE ticket_inventory
     SET reserved_count = GREATEST(reserved_count - :quantity, 0),
         updated_at = NOW()
     WHERE id = :inventoryId`,
    { replacements: { quantity, inventoryId }, type: QueryTypes.UPDATE }
  );

  // Remove Redis reserve key
  const reserveKey = `${RESERVE_PREFIX}${inventoryId}:${orderId}`;
  await redis.del(reserveKey);

  logger.info(`[Ticketing] Released ${quantity} for inventory ${inventoryId}, order ${orderId}`);
}

// ============================================================================
// RELEASE EXPIRED RESERVATIONS (BullMQ scheduled job)
// ============================================================================

/**
 * Find and release all expired pending orders.
 * Called every minute by BullMQ scheduler.
 *
 * @returns {Promise<Object>} { releasedCount, errors }
 */
export async function releaseExpiredReservations() {
  let releasedCount = 0;
  const errors = [];

  try {
    // Find expired pending orders
    const expiredOrders = await mysqlSequelize.query(
      `SELECT o.id as order_id, oi.inventory_id, oi.quantity
       FROM ticket_orders o
       JOIN ticket_order_items oi ON oi.order_id = o.id
       WHERE o.status = 'pending'
         AND o.expires_at IS NOT NULL
         AND o.expires_at < NOW()`,
      { type: QueryTypes.SELECT }
    );

    if (expiredOrders.length === 0) {
      return { releasedCount: 0, errors: [] };
    }

    // Group by order_id for batch status update
    const orderIds = [...new Set(expiredOrders.map(o => o.order_id))];

    // Release inventory for each item
    for (const item of expiredOrders) {
      try {
        await releaseInventory(item.order_id, item.inventory_id, item.quantity);
        releasedCount++;
      } catch (err) {
        errors.push({ orderId: item.order_id, inventoryId: item.inventory_id, error: err.message });
        logger.error(`[Ticketing] Failed to release inventory for order ${item.order_id}:`, err.message);
      }
    }

    // Mark orders as expired
    if (orderIds.length > 0) {
      await mysqlSequelize.query(
        `UPDATE ticket_orders
         SET status = 'expired', updated_at = NOW()
         WHERE id IN (:orderIds) AND status = 'pending'`,
        { replacements: { orderIds }, type: QueryTypes.UPDATE }
      );
    }

    logger.info(`[Ticketing] Released ${releasedCount} expired reservations from ${orderIds.length} orders`);
  } catch (err) {
    logger.error('[Ticketing] releaseExpiredReservations error:', err.message);
    errors.push({ error: err.message });
  }

  return { releasedCount, errors };
}

export default {
  reserveInventory,
  confirmInventory,
  releaseInventory,
  releaseExpiredReservations,
};
