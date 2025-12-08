/**
 * Permission Model (MySQL)
 * RBAC permissions for granular access control
 */

import { DataTypes } from 'sequelize';
import { mysqlSequelize } from '../config/database.js';

const Permission = mysqlSequelize.define('Permission', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Format: resource.action (e.g., poi.create)',
  },
  display_name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  resource: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Resource type: poi, user, booking, etc.',
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Action: create, read, update, delete, manage',
  },
  is_system: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'permissions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['name'], unique: true },
    { fields: ['resource'] },
    { fields: ['resource', 'action'] },
  ],
});

/**
 * Get permission by name
 * @param {string} name
 * @returns {Promise<Permission|null>}
 */
Permission.findByName = async function(name) {
  return this.findOne({
    where: { name },
  });
};

/**
 * Get permissions by resource
 * @param {string} resource
 * @returns {Promise<Permission[]>}
 */
Permission.findByResource = async function(resource) {
  return this.findAll({
    where: { resource },
    order: [['action', 'ASC']],
  });
};

export default Permission;
