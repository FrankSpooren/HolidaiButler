'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('restaurant_availability', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      restaurant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'restaurants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      time_slot: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
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
      is_open: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      block_reason: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      last_synced_at: {
        type: Sequelize.DATE,
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
    await queryInterface.addIndex('restaurant_availability', ['restaurant_id', 'date', 'time_slot'], {
      unique: true,
      name: 'availability_unique',
    });
    await queryInterface.addIndex('restaurant_availability', ['date']);
    await queryInterface.addIndex('restaurant_availability', ['is_open']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('restaurant_availability');
  },
};
