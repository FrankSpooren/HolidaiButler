/**
 * Platform Core Models Index
 * Central export with associations
 */

import { mysqlSequelize } from '../config/database.js';

// Import all models
import POI from './POI.js';
import POIScoreHistory from './POIScoreHistory.js';
import POIDataSource from './POIDataSource.js';
import DiscoveryRun from './DiscoveryRun.js';
import APIUsageLog from './APIUsageLog.js';
import DestinationConfig from './DestinationConfig.js';
import User from './User.js';
import Role from './Role.js';
import Permission from './Permission.js';
import UserConsent from './UserConsent.js';
import ConsentHistory from './ConsentHistory.js';

// ============================================================================
// Define Associations (with guard to prevent duplicate registration)
// ============================================================================

// Guard to prevent duplicate association registration on multiple imports
const associationsInitialized = POI.associations && Object.keys(POI.associations).length > 0;

if (!associationsInitialized) {
  // POI Associations
  POI.hasMany(POIScoreHistory, { foreignKey: 'poi_id', as: 'scoreHistory' });
  POI.hasMany(POIDataSource, { foreignKey: 'poi_id', as: 'dataSources' });

  POIScoreHistory.belongsTo(POI, { foreignKey: 'poi_id', as: 'poi' });
  POIDataSource.belongsTo(POI, { foreignKey: 'poi_id', as: 'poi' });

  // User-Role Association
  User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
  Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });

  // Role-Permission Many-to-Many (through role_permissions table)
  Role.belongsToMany(Permission, {
    through: 'role_permissions',
    foreignKey: 'role_id',
    otherKey: 'permission_id',
    as: 'permissions',
  });
  Permission.belongsToMany(Role, {
    through: 'role_permissions',
    foreignKey: 'permission_id',
    otherKey: 'role_id',
    as: 'roles',
  });

  // User-Permission Many-to-Many (through user_permissions table for overrides)
  User.belongsToMany(Permission, {
    through: 'user_permissions',
    foreignKey: 'user_id',
    otherKey: 'permission_id',
    as: 'directPermissions',
  });
  Permission.belongsToMany(User, {
    through: 'user_permissions',
    foreignKey: 'permission_id',
    otherKey: 'user_id',
    as: 'usersWithPermission',
  });

  // User-Consent Association
  User.hasOne(UserConsent, { foreignKey: 'user_id', as: 'consent' });
  UserConsent.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // User-ConsentHistory Association
  User.hasMany(ConsentHistory, { foreignKey: 'user_id', as: 'consentHistory' });
  ConsentHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
}

// ============================================================================
// Export Models
// ============================================================================

export {
  mysqlSequelize,
  POI,
  POIScoreHistory,
  POIDataSource,
  DiscoveryRun,
  APIUsageLog,
  DestinationConfig,
  User,
  Role,
  Permission,
  UserConsent,
  ConsentHistory,
};

export default {
  sequelize: mysqlSequelize,
  POI,
  POIScoreHistory,
  POIDataSource,
  DiscoveryRun,
  APIUsageLog,
  DestinationConfig,
  User,
  Role,
  Permission,
  UserConsent,
  ConsentHistory,
};
