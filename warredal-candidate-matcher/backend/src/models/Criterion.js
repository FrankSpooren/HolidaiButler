import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Criterion = sequelize.define('Criterion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  vacancyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'vacancies',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  category: {
    type: DataTypes.ENUM('education', 'experience', 'skills', 'network', 'personality', 'location', 'other'),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Criterium naam (bijv. "Diploma Marketing")'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Gedetailleerde beschrijving van criterium'
  },
  weight: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    defaultValue: 1.0,
    validate: {
      min: 0,
      max: 10
    },
    comment: 'Weging van 0-10'
  },
  scoreType: {
    type: DataTypes.ENUM('boolean', 'scale', 'text'),
    defaultValue: 'scale',
    comment: 'Boolean (ja/nee), Scale (0-10), Text (vrije tekst)'
  },
  required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Is dit een must-have criterium?'
  },
  keywords: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    comment: 'Keywords voor automatische matching'
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Volgorde van weergave'
  }
}, {
  tableName: 'criteria',
  indexes: [
    {
      fields: ['vacancy_id']
    },
    {
      fields: ['category']
    }
  ]
});

export default Criterion;
