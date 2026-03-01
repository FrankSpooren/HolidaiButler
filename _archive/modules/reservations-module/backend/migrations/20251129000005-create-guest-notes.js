'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('guest_notes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      guest_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'guests',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
      staff_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      note_type: {
        type: Sequelize.ENUM('preference', 'allergy', 'incident', 'vip', 'other'),
        defaultValue: 'other',
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      is_alert: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      alert_message: {
        type: Sequelize.STRING(200),
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
    await queryInterface.addIndex('guest_notes', ['guest_id']);
    await queryInterface.addIndex('guest_notes', ['restaurant_id']);
    await queryInterface.addIndex('guest_notes', ['guest_id', 'restaurant_id']);
    await queryInterface.addIndex('guest_notes', ['is_alert']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('guest_notes');
  },
};
