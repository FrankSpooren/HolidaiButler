import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Vacancy = sequelize.define('Vacancy', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  organization: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  requirements: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  websiteUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'paused', 'closed'),
    defaultValue: 'draft'
  },
  targetCount: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    comment: 'Aantal gewenste kandidaten'
  },
  // Flexible settings per vacancy
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Vacature-specifieke instellingen'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'vacancies',
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['organization']
    }
  ]
});

export default Vacancy;
