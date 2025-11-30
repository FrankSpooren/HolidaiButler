/**
 * Role Model (MySQL)
 * RBAC roles for user authorization
 */

import { DataTypes } from 'sequelize';
import { mysqlSequelize } from '../config/database.js';

const Role = mysqlSequelize.define('Role', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  display_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  is_system: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'System roles cannot be deleted',
  },
}, {
  tableName: 'roles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['name'], unique: true },
  ],
});

/**
 * Get role by name
 * @param {string} name
 * @returns {Promise<Role|null>}
 */
Role.findByName = async function(name) {
  return this.findOne({
    where: { name },
  });
};

export default Role;
