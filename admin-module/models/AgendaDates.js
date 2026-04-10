/**
 * AgendaDates Model - Event dates/occurrences
 * Admin module Sequelize model for agenda dates
 * ALIGNED with actual pxoziy_db1.agenda_dates table structure
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class AgendaDates extends Model {}

AgendaDates.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    provider_event_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    event_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    event_time: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    event_datetime_cet: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'agenda_dates',
    modelName: 'AgendaDates',
    timestamps: false,
    indexes: [
      { fields: ['provider_event_hash'] },
      { fields: ['event_date'] },
      { fields: ['event_datetime_cet'] },
    ],
  }
);

export default AgendaDates;
