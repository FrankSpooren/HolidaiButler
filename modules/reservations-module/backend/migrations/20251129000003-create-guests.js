'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('guests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: Sequelize.STRING(200),
        allowNull: false,
        unique: true,
      },
      first_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      last_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      date_of_birth: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      preferred_language: {
        type: Sequelize.STRING(5),
        defaultValue: 'en',
      },
      dietary_restrictions: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      seating_preferences: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      total_reservations: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      completed_reservations: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      no_show_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      cancellation_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      reputation_score: {
        type: Sequelize.INTEGER,
        defaultValue: 100,
      },
      is_vip: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      vip_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_blacklisted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      blacklist_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      blacklisted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      blacklisted_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      email_notifications: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      sms_notifications: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      last_activity_at: {
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
    await queryInterface.addIndex('guests', ['email'], { unique: true });
    await queryInterface.addIndex('guests', ['phone']);
    await queryInterface.addIndex('guests', ['is_vip']);
    await queryInterface.addIndex('guests', ['is_blacklisted']);
    await queryInterface.addIndex('guests', ['reputation_score']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('guests');
  },
};
