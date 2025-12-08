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

// ============================================================================
// Define Associations
// ============================================================================

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
};
