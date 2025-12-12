// Models Index - Central export with associations
import sequelize from '../config/database.js';

// Import all models
import AdminUser from './AdminUser.js';
import Agenda from './Agenda.js';
import AgendaDates from './AgendaDates.js';
import Booking from './Booking.js';
import Event from './Event.js';
import PlatformConfig from './PlatformConfig.js';
import POI from './POI.js';
import POIImportHistory from './POIImportHistory.js';
import Reservation from './Reservation.js';
import Ticket from './Ticket.js';
import Transaction from './Transaction.js';
import User from './User.js';

// Define Associations

// POI Import History associations
POIImportHistory.belongsTo(AdminUser, { as: 'user', foreignKey: 'user_id' });

// AdminUser self-reference (created by)
AdminUser.belongsTo(AdminUser, { as: 'createdBy', foreignKey: 'createdById' });

// Booking associations
Booking.hasMany(Ticket, { foreignKey: 'bookingId', as: 'tickets' });
Booking.hasOne(Transaction, { foreignKey: 'bookingId', as: 'transaction' });
Booking.belongsTo(AdminUser, { as: 'createdBy', foreignKey: 'createdById' });
Booking.belongsTo(AdminUser, { as: 'updatedBy', foreignKey: 'updatedById' });

// Ticket associations
Ticket.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });
Ticket.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
Ticket.belongsTo(AdminUser, { as: 'scannedBy', foreignKey: 'scannedById' });
Ticket.belongsTo(AdminUser, { as: 'createdBy', foreignKey: 'createdById' });
Ticket.belongsTo(AdminUser, { as: 'updatedBy', foreignKey: 'updatedById' });

// Transaction associations
Transaction.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });
Transaction.belongsTo(Ticket, { foreignKey: 'ticketId', as: 'ticket' });
Transaction.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });
Transaction.belongsTo(AdminUser, { as: 'createdBy', foreignKey: 'createdById' });
Transaction.belongsTo(AdminUser, { as: 'updatedBy', foreignKey: 'updatedById' });
Transaction.belongsTo(AdminUser, { as: 'refundInitiatedBy', foreignKey: 'refundInitiatedById' });

// Reservation associations
Reservation.hasMany(Transaction, { foreignKey: 'reservationId', as: 'transactions' });
Reservation.belongsTo(AdminUser, { as: 'createdBy', foreignKey: 'createdById' });
Reservation.belongsTo(AdminUser, { as: 'updatedBy', foreignKey: 'updatedById' });

// Event associations
Event.hasMany(Ticket, { foreignKey: 'eventId', as: 'tickets' });
Event.belongsTo(AdminUser, { as: 'createdBy', foreignKey: 'createdById' });
Event.belongsTo(AdminUser, { as: 'updatedBy', foreignKey: 'updatedById' });
Event.belongsTo(AdminUser, { as: 'qualityVerifiedBy', foreignKey: 'qualityVerifiedById' });
Event.belongsTo(AdminUser, { as: 'deletedBy', foreignKey: 'deletedById' });

// PlatformConfig associations
PlatformConfig.belongsTo(AdminUser, { as: 'lastModifiedBy', foreignKey: 'lastModifiedById' });

// Agenda associations (link agenda_dates to agenda via provider_event_hash)
// Note: This is a logical relationship, not a foreign key constraint in the DB

// Export models
export {
  sequelize,
  AdminUser,
  Agenda,
  AgendaDates,
  Booking,
  Event,
  PlatformConfig,
  POI,
  POIImportHistory,
  Reservation,
  Ticket,
  Transaction,
  User
};

// Default export for convenience
export default {
  sequelize,
  AdminUser,
  Agenda,
  AgendaDates,
  Booking,
  Event,
  PlatformConfig,
  POI,
  POIImportHistory,
  Reservation,
  Ticket,
  Transaction,
  User
};
