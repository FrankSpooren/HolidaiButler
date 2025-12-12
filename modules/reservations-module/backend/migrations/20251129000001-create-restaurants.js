'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('restaurants', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      cuisine_type: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      },
      price_range: {
        type: Sequelize.ENUM('€', '€€', '€€€', '€€€€'),
        allowNull: false,
      },
      address: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      contact: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      opening_hours: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      features: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      rating: {
        type: Sequelize.DECIMAL(2, 1),
        defaultValue: 0,
      },
      review_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      total_reservations: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      min_party_size: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      max_party_size: {
        type: Sequelize.INTEGER,
        defaultValue: 20,
      },
      default_seating_duration: {
        type: Sequelize.INTEGER,
        defaultValue: 90,
      },
      advance_booking_days: {
        type: Sequelize.INTEGER,
        defaultValue: 90,
      },
      same_day_booking_cutoff: {
        type: Sequelize.INTEGER,
        defaultValue: 2,
      },
      deposit_required: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      deposit_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      deposit_percentage: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      cancellation_deadline_hours: {
        type: Sequelize.INTEGER,
        defaultValue: 24,
      },
      no_show_fee: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
      },
      auto_confirm_reservations: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      pos_integration_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      pos_location_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      thefork_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      google_place_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('restaurants', ['name']);
    await queryInterface.addIndex('restaurants', ['is_active']);
    await queryInterface.addIndex('restaurants', ['thefork_id']);
    await queryInterface.addIndex('restaurants', ['google_place_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('restaurants');
  },
};
