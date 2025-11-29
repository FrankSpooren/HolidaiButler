'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('availability', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      poi_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      timeslot: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Format: HH:MM-HH:MM',
      },
      // Capacity
      total_capacity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      booked_capacity: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      reserved_capacity: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      available_capacity: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      // Pricing
      base_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'EUR',
      },
      dynamic_price_multiplier: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 1.0,
      },
      final_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      // Restrictions
      min_booking: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      max_booking: {
        type: Sequelize.INTEGER,
        defaultValue: 10,
      },
      cutoff_hours: {
        type: Sequelize.INTEGER,
        defaultValue: 2,
      },
      // Status
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      is_sold_out: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      // Partner sync
      last_synced_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      external_inventory_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      sync_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      // Metadata
      created_by: {
        type: Sequelize.STRING(50),
        defaultValue: 'system',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      // Timestamps
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    });

    // Add indexes
    await queryInterface.addIndex('availability', ['poi_id', 'date', 'timeslot'], {
      unique: true,
      name: 'availability_poi_date_timeslot_unique'
    });
    await queryInterface.addIndex('availability', ['date', 'is_active'], { name: 'availability_date_is_active' });
    await queryInterface.addIndex('availability', ['poi_id', 'date', 'is_sold_out'], { name: 'availability_poi_date_sold_out' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('availability');
  },
};
