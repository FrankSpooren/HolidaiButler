'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reservations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      reservation_reference: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      restaurant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'restaurants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      guest_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'guests',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      reservation_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      reservation_time: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      party_size: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      seating_duration: {
        type: Sequelize.INTEGER,
        defaultValue: 90,
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
      guest_language: {
        type: Sequelize.STRING(5),
        defaultValue: 'en',
      },
      status: {
        type: Sequelize.ENUM('pending_confirmation', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'),
        defaultValue: 'pending_confirmation',
      },
      confirmation_method: {
        type: Sequelize.ENUM('instant', 'manual'),
        defaultValue: 'instant',
      },
      special_occasion: {
        type: Sequelize.ENUM('none', 'birthday', 'anniversary', 'date', 'business', 'other'),
        defaultValue: 'none',
      },
      special_requests: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      dietary_restrictions: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      seating_area_preference: {
        type: Sequelize.ENUM('indoor', 'outdoor', 'bar', 'private', 'no-preference'),
        defaultValue: 'no-preference',
      },
      assigned_tables: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      deposit_required: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      deposit_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      deposit_status: {
        type: Sequelize.ENUM('pending', 'paid', 'refunded', 'forfeited'),
        allowNull: true,
      },
      payment_transaction_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      paid_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      source: {
        type: Sequelize.ENUM('web', 'mobile', 'api', 'admin', 'thefork', 'google', 'waitlist'),
        defaultValue: 'web',
      },
      external_reference: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      external_source: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      ai_message_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      is_repeat_guest: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      previous_visits_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      vip_status: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      checked_in_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      checked_in_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      actual_party_size: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cancelled_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cancelled_by: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      cancellation_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      cancellation_within_deadline: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      no_show_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      reminder_sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      email_reminder_sent: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      sms_reminder_sent: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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
    await queryInterface.addIndex('reservations', ['reservation_reference'], { unique: true });
    await queryInterface.addIndex('reservations', ['restaurant_id', 'reservation_date']);
    await queryInterface.addIndex('reservations', ['guest_id']);
    await queryInterface.addIndex('reservations', ['status']);
    await queryInterface.addIndex('reservations', ['reservation_date', 'reservation_time']);
    await queryInterface.addIndex('reservations', ['external_reference']);
    await queryInterface.addIndex('reservations', ['payment_transaction_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('reservations');
  },
};
