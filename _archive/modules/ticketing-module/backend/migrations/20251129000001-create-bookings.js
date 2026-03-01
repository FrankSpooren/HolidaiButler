'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bookings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      booking_reference: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      poi_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no-show', 'expired'),
        allowNull: false,
        defaultValue: 'pending',
      },
      // Booking details
      booking_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      booking_time: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Duration in minutes',
      },
      adults_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      children_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      infants_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      special_requests: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      // Pricing
      base_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      taxes: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
      },
      fees: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
      },
      discount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
      },
      total_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'EUR',
      },
      commission: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      // Payment
      payment_status: {
        type: Sequelize.ENUM('pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded'),
        defaultValue: 'pending',
      },
      payment_method: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      transaction_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      paid_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      // Tickets
      delivery_method: {
        type: Sequelize.ENUM('email', 'sms', 'app', 'wallet'),
        defaultValue: 'email',
      },
      delivered_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      // Experience
      product_type: {
        type: Sequelize.ENUM('ticket', 'tour', 'excursion', 'experience', 'combo'),
        allowNull: false,
      },
      meeting_point_name: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      meeting_point_lat: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
      },
      meeting_point_lng: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
      },
      meeting_point_instructions: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      experience_language: {
        type: Sequelize.STRING(5),
        defaultValue: 'en',
      },
      min_group_size: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      max_group_size: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      // Cancellation
      allow_cancellation: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      cancellation_deadline: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      refund_policy: {
        type: Sequelize.ENUM('full', 'partial', 'none'),
        defaultValue: 'full',
      },
      partial_refund_percentage: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      cancelled_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cancelled_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      cancellation_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      // Voucher
      voucher_code: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      voucher_discount_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      voucher_discount_percentage: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      // Partner
      partner_name: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      partner_email: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      partner_confirmation_method: {
        type: Sequelize.ENUM('instant', 'manual', 'api'),
        defaultValue: 'instant',
      },
      partner_confirmed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      partner_external_reference: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      // Reservation lock
      is_locked: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      locked_until: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      lock_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      // Guest info
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
      guest_nationality: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      // AI Context
      ai_message_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      ai_recommendation_score: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
      },
      // Metadata
      source: {
        type: Sequelize.ENUM('web', 'mobile', 'api', 'admin'),
        defaultValue: 'mobile',
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      user_agent: {
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
    await queryInterface.addIndex('bookings', ['booking_reference'], { unique: true, name: 'bookings_booking_reference_unique' });
    await queryInterface.addIndex('bookings', ['user_id', 'status'], { name: 'bookings_user_id_status' });
    await queryInterface.addIndex('bookings', ['poi_id', 'booking_date'], { name: 'bookings_poi_id_booking_date' });
    await queryInterface.addIndex('bookings', ['transaction_id'], { name: 'bookings_transaction_id' });
    await queryInterface.addIndex('bookings', ['status', 'created_at'], { name: 'bookings_status_created_at' });
    await queryInterface.addIndex('bookings', ['booking_date'], { name: 'bookings_booking_date' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('bookings');
  },
};
