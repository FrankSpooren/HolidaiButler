/**
 * Agenda Model - Events/Agenda items
 * Admin module Sequelize model for agenda management
 * ALIGNED with actual pxoziy_db1.agenda table structure
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Agenda extends Model {
  toJSON() {
    const values = { ...this.get() };
    return {
      ...values,
      location: {
        name: values.location_name,
        address: values.location_address,
        latitude: values.location_lat ? parseFloat(values.location_lat) : null,
        longitude: values.location_lon ? parseFloat(values.location_lon) : null,
      },
      translations: {
        en: {
          title: values.title_en,
          short_description: values.short_description_en,
          long_description: values.long_description_en,
        },
        es: {
          title: values.title_es,
          short_description: values.short_description_es,
          long_description: values.long_description_es,
        },
      },
    };
  }
}

Agenda.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    provider_event_hash: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: true,
    },

    // Default language content (Dutch/original)
    title: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    short_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    long_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // English translations
    title_en: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    short_description_en: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    long_description_en: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Spanish translations
    title_es: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    short_description_es: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    long_description_es: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Date and time
    date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    time: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    // Location
    location_name: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    location_address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    location_lat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },
    location_lon: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    },

    // Media
    image: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    url: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },

    // Calpe area flags
    is_in_calpe_area: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    calpe_distance: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // Timestamps
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
    tableName: 'agenda',
    modelName: 'Agenda',
    timestamps: false,
    indexes: [
      { fields: ['provider_event_hash'], unique: true },
      { fields: ['date'] },
      { fields: ['location_lat'] },
      { fields: ['is_in_calpe_area'] },
      { fields: ['calpe_distance'] },
      { fields: ['created_at'] },
    ],
  }
);

export default Agenda;
