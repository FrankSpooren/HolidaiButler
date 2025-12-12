'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('waitlist', {
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
      guest_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      guest_email: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      guest_phone: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      preferred_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      preferred_time_start: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      preferred_time_end: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      party_size: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      flexibility: {
        type: Sequelize.ENUM('exact', 'flexible_time', 'flexible_date', 'very_flexible'),
        defaultValue: 'flexible_time',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('waiting', 'notified', 'converted', 'expired', 'cancelled'),
        defaultValue: 'waiting',
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      notified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      notification_expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      converted_to_reservation_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'reservations',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      converted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cancelled_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cancellation_reason: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      expired_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      expires_at: {
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
    await queryInterface.addIndex('waitlist', ['restaurant_id', 'preferred_date']);
    await queryInterface.addIndex('waitlist', ['guest_id']);
    await queryInterface.addIndex('waitlist', ['status']);
    await queryInterface.addIndex('waitlist', ['position']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('waitlist');
  },
};
