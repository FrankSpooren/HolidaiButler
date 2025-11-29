/**
 * Table Management Service
 * Handles table allocation, floor plans, and optimization
 */

const { Table, Reservation, Restaurant, FloorPlan } = require('../models');

class TableManagementService {
  /**
   * Find available tables for a party size
   */
  async findAvailableTables(restaurantId, date, time, partySize, preferences = {}) {
    const { seatingArea, features } = preferences;

    const where = {
      restaurant_id: restaurantId,
      is_active: true,
      is_available_for_online: true,
    };

    if (seatingArea) where.seating_area = seatingArea;

    // Get all potentially suitable tables
    let tables = await Table.findAll({ where });

    // Filter by features if specified
    if (features && features.length > 0) {
      tables = tables.filter((table) =>
        features.every((feature) => table.hasFeature(feature))
      );
    }

    // Find tables that can accommodate party size
    const suitableTables = [];

    // 1. Single table solutions
    for (const table of tables) {
      if (table.canAccommodate(partySize)) {
        suitableTables.push({
          tables: [table],
          capacity: table.max_capacity,
          priority: table.priority,
          combinedTables: false,
        });
      }
    }

    // 2. Combined table solutions
    for (const table1 of tables) {
      if (table1.can_combine_with && table1.can_combine_with.length > 0) {
        for (const table2Id of table1.can_combine_with) {
          const table2 = tables.find((t) => t.id === table2Id);
          if (table2) {
            const combinedCapacity =
              table1.combined_capacity ||
              table1.max_capacity + table2.max_capacity;
            if (combinedCapacity >= partySize) {
              suitableTables.push({
                tables: [table1, table2],
                capacity: combinedCapacity,
                priority: Math.max(table1.priority, table2.priority),
                combinedTables: true,
              });
            }
          }
        }
      }
    }

    // Sort by priority (highest first), then by capacity (smallest sufficient)
    suitableTables.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.capacity - b.capacity;
    });

    return suitableTables;
  }

  /**
   * Auto-assign tables to a reservation
   */
  async autoAssignTables(reservationId) {
    const reservation = await Reservation.findByPk(reservationId, {
      include: [{ model: Restaurant, as: 'restaurant' }],
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    const tableOptions = await this.findAvailableTables(
      reservation.restaurant_id,
      reservation.reservation_date,
      reservation.reservation_time,
      reservation.party_size,
      {
        seatingArea: reservation.seating_area_preference,
      }
    );

    if (tableOptions.length === 0) {
      throw new Error('No suitable tables found');
    }

    // Select best option (first one after sorting)
    const bestOption = tableOptions[0];
    const tableIds = bestOption.tables.map((t) => t.id);

    await reservation.update({ table_ids: tableIds });

    return {
      reservation,
      assignedTables: bestOption.tables,
    };
  }

  /**
   * Manually assign tables
   */
  async assignTables(reservationId, tableIds, staffId) {
    const reservation = await Reservation.findByPk(reservationId);

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    // Validate tables exist and belong to restaurant
    const tables = await Table.findAll({
      where: {
        id: tableIds,
        restaurant_id: reservation.restaurant_id,
      },
    });

    if (tables.length !== tableIds.length) {
      throw new Error('Invalid table selection');
    }

    // Check combined capacity
    const totalCapacity = tables.reduce((sum, table) => sum + table.max_capacity, 0);
    if (totalCapacity < reservation.party_size) {
      throw new Error('Insufficient table capacity for party size');
    }

    await reservation.update({ table_ids: tableIds });

    return { reservation, assignedTables: tables };
  }

  /**
   * Get floor plan with table status
   */
  async getFloorPlanWithStatus(restaurantId, floorPlanId, date, time) {
    const floorPlan = await FloorPlan.findOne({
      where: { id: floorPlanId, restaurant_id: restaurantId },
    });

    if (!floorPlan) {
      throw new Error('Floor plan not found');
    }

    // Get all tables
    const tables = await Table.findAll({
      where: { restaurant_id: restaurantId },
    });

    // Get reservations for specified time
    const reservations = await Reservation.findAll({
      where: {
        restaurant_id: restaurantId,
        reservation_date: date,
        reservation_time: time,
        status: ['confirmed', 'seated'],
      },
    });

    // Build table status map
    const tableStatus = {};
    for (const table of tables) {
      const reservation = reservations.find((r) => r.table_ids.includes(table.id));
      tableStatus[table.id] = {
        table,
        status: reservation ? 'occupied' : 'available',
        reservation: reservation || null,
      };
    }

    return {
      floorPlan,
      tableStatus,
    };
  }

  /**
   * Create table
   */
  async createTable(tableData) {
    const table = await Table.create(tableData);
    return table;
  }

  /**
   * Update table
   */
  async updateTable(tableId, updates) {
    const table = await Table.findByPk(tableId);
    if (!table) {
      throw new Error('Table not found');
    }

    await table.update(updates);
    return table;
  }

  /**
   * Delete table
   */
  async deleteTable(tableId) {
    const table = await Table.findByPk(tableId);
    if (!table) {
      throw new Error('Table not found');
    }

    await table.destroy();
    return true;
  }

  /**
   * Get all tables for restaurant
   */
  async getTablesByRestaurant(restaurantId) {
    const tables = await Table.findAll({
      where: { restaurant_id: restaurantId },
      order: [
        ['seating_area', 'ASC'],
        ['table_number', 'ASC'],
      ],
    });

    return tables;
  }
}

module.exports = new TableManagementService();
