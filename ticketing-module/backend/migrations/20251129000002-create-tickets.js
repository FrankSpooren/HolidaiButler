'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tickets', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      ticket_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      booking_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'bookings',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      poi_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('single', 'multi-day', 'group', 'guided-tour', 'experience', 'combo'),
        allowNull: false,
      },
      // Validity
      valid_from: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      valid_until: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      timeslot: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      timezone: {
        type: Sequelize.STRING(50),
        defaultValue: 'Europe/Amsterdam',
      },
      // QR Code
      qr_code_data: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      qr_code_image_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      qr_code_format: {
        type: Sequelize.ENUM('QR', 'Barcode128'),
        defaultValue: 'QR',
      },
      // Holder
      holder_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      holder_email: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      holder_phone: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      // Product details
      product_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      product_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      language: {
        type: Sequelize.STRING(5),
        defaultValue: 'en',
      },
      special_requirements: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      // Validation
      is_validated: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      validated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      validated_by: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      validation_location: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      // Status
      status: {
        type: Sequelize.ENUM('active', 'used', 'expired', 'cancelled', 'refunded'),
        defaultValue: 'active',
        allowNull: false,
      },
      // Wallet
      apple_wallet_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      google_pay_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      // Metadata
      source: {
        type: Sequelize.ENUM('web', 'mobile', 'api', 'admin'),
        defaultValue: 'mobile',
      },
      is_transferred: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      original_holder: {
        type: Sequelize.STRING(200),
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
    await queryInterface.addIndex('tickets', ['ticket_number'], { unique: true, name: 'tickets_ticket_number_unique' });
    await queryInterface.addIndex('tickets', ['booking_id'], { name: 'tickets_booking_id' });
    await queryInterface.addIndex('tickets', ['user_id', 'status'], { name: 'tickets_user_id_status' });
    await queryInterface.addIndex('tickets', ['poi_id', 'valid_from'], { name: 'tickets_poi_id_valid_from' });
    await queryInterface.addIndex('tickets', ['qr_code_data'], { name: 'tickets_qr_code_data', type: 'FULLTEXT' });
    await queryInterface.addIndex('tickets', ['status', 'valid_until'], { name: 'tickets_status_valid_until' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tickets');
  },
};
