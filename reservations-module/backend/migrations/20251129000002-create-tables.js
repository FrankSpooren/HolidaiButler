'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tables', {
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
      table_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      min_capacity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      max_capacity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      table_type: {
        type: Sequelize.ENUM('standard', 'booth', 'bar', 'outdoor', 'private', 'communal'),
        defaultValue: 'standard',
      },
      location: {
        type: Sequelize.ENUM('indoor', 'outdoor', 'bar', 'private', 'terrace', 'garden'),
        defaultValue: 'indoor',
      },
      floor: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      features: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      combinable_with: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 50,
      },
      position_x: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      position_y: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
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
    await queryInterface.addIndex('tables', ['restaurant_id']);
    await queryInterface.addIndex('tables', ['restaurant_id', 'table_number'], { unique: true });
    await queryInterface.addIndex('tables', ['is_active']);
    await queryInterface.addIndex('tables', ['location']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tables');
  },
};
