'use strict';

/**
 * Migration: Add new feature fields and tables
 * - Reminder fields for Bookings
 * - Refund tracking fields for Bookings
 * - Additional Ticket fields (transfer, validation)
 * - TicketTransfer table
 * - DeviceToken table for push notifications
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // ========== ADD REMINDER FIELDS TO BOOKINGS ==========
      await queryInterface.addColumn('bookings', 'reminder_scheduled', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }, { transaction });

      await queryInterface.addColumn('bookings', 'reminder_24h_scheduled_for', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('bookings', 'reminder_2h_scheduled_for', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('bookings', 'reminder_24h_sent_at', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('bookings', 'reminder_2h_sent_at', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      // ========== ADD REFUND TRACKING FIELDS TO BOOKINGS ==========
      await queryInterface.addColumn('bookings', 'refund_status', {
        type: Sequelize.ENUM('none', 'initiated', 'processing', 'sent', 'completed', 'failed'),
        defaultValue: 'none',
      }, { transaction });

      await queryInterface.addColumn('bookings', 'refund_amount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('bookings', 'refund_transaction_id', {
        type: Sequelize.STRING(100),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('bookings', 'refund_completed_at', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      // ========== ADD ADDITIONAL FIELDS TO TICKETS ==========
      await queryInterface.addColumn('tickets', 'transferred_at', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('tickets', 'holder_first_name', {
        type: Sequelize.STRING(100),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('tickets', 'holder_last_name', {
        type: Sequelize.STRING(100),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('tickets', 'validation_code', {
        type: Sequelize.STRING(50),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('tickets', 'is_used', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }, { transaction });

      // ========== CREATE TICKET_TRANSFERS TABLE ==========
      await queryInterface.createTable('ticket_transfers', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        ticket_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'tickets',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        from_user_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        from_name: {
          type: Sequelize.STRING(200),
          allowNull: false,
        },
        from_email: {
          type: Sequelize.STRING(200),
          allowNull: false,
        },
        to_user_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        to_name: {
          type: Sequelize.STRING(200),
          allowNull: false,
        },
        to_email: {
          type: Sequelize.STRING(200),
          allowNull: false,
        },
        transferred_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        status: {
          type: Sequelize.ENUM('pending', 'completed', 'cancelled'),
          defaultValue: 'completed',
        },
        transfer_reason: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      }, { transaction });

      // Add indexes for ticket_transfers
      await queryInterface.addIndex('ticket_transfers', ['ticket_id'], {
        name: 'idx_ticket_transfers_ticket_id',
        transaction,
      });

      await queryInterface.addIndex('ticket_transfers', ['from_user_id'], {
        name: 'idx_ticket_transfers_from_user_id',
        transaction,
      });

      await queryInterface.addIndex('ticket_transfers', ['to_email'], {
        name: 'idx_ticket_transfers_to_email',
        transaction,
      });

      await queryInterface.addIndex('ticket_transfers', ['transferred_at'], {
        name: 'idx_ticket_transfers_transferred_at',
        transaction,
      });

      // ========== CREATE DEVICE_TOKENS TABLE ==========
      await queryInterface.createTable('device_tokens', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        token: {
          type: Sequelize.STRING(500),
          allowNull: false,
          unique: true,
        },
        platform: {
          type: Sequelize.ENUM('web', 'android', 'ios'),
          allowNull: false,
          defaultValue: 'web',
        },
        device_id: {
          type: Sequelize.STRING(200),
          allowNull: true,
        },
        app_version: {
          type: Sequelize.STRING(20),
          allowNull: true,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
        },
        last_used_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      }, { transaction });

      // Add indexes for device_tokens
      await queryInterface.addIndex('device_tokens', ['user_id', 'is_active'], {
        name: 'idx_device_tokens_user_active',
        transaction,
      });

      await queryInterface.addIndex('device_tokens', ['token'], {
        name: 'idx_device_tokens_token',
        unique: true,
        transaction,
      });

      await queryInterface.addIndex('device_tokens', ['platform'], {
        name: 'idx_device_tokens_platform',
        transaction,
      });

      await transaction.commit();
      console.log('✅ Migration 20251129000004-add-new-features completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Drop tables
      await queryInterface.dropTable('device_tokens', { transaction });
      await queryInterface.dropTable('ticket_transfers', { transaction });

      // Remove ticket columns
      await queryInterface.removeColumn('tickets', 'is_used', { transaction });
      await queryInterface.removeColumn('tickets', 'validation_code', { transaction });
      await queryInterface.removeColumn('tickets', 'holder_last_name', { transaction });
      await queryInterface.removeColumn('tickets', 'holder_first_name', { transaction });
      await queryInterface.removeColumn('tickets', 'transferred_at', { transaction });

      // Remove booking columns
      await queryInterface.removeColumn('bookings', 'refund_completed_at', { transaction });
      await queryInterface.removeColumn('bookings', 'refund_transaction_id', { transaction });
      await queryInterface.removeColumn('bookings', 'refund_amount', { transaction });
      await queryInterface.removeColumn('bookings', 'refund_status', { transaction });
      await queryInterface.removeColumn('bookings', 'reminder_2h_sent_at', { transaction });
      await queryInterface.removeColumn('bookings', 'reminder_24h_sent_at', { transaction });
      await queryInterface.removeColumn('bookings', 'reminder_2h_scheduled_for', { transaction });
      await queryInterface.removeColumn('bookings', 'reminder_24h_scheduled_for', { transaction });
      await queryInterface.removeColumn('bookings', 'reminder_scheduled', { transaction });

      await transaction.commit();
      console.log('✅ Migration 20251129000004-add-new-features rolled back successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  },
};
