'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('floor_plans', {
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
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      floor: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      layout_image: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      dimensions: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      total_capacity: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
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
    await queryInterface.addIndex('floor_plans', ['restaurant_id']);
    await queryInterface.addIndex('floor_plans', ['is_active']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('floor_plans');
  },
};
