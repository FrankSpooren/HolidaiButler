/**
 * POI Model (MySQL)
 * Central POI data - ALIGNED with actual pxoziy_db1.POI table structure
 * Updated: 2025-12-14 - Added translation fields for NL, DE, ES, SV, PL
 */

import { DataTypes } from 'sequelize';
import { mysqlSequelize } from '../config/database.js';

const POI = mysqlSequelize.define('POI', {
  // Primary key
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  // External ID - Google Places
  google_place_id: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: true,
    field: 'google_placeid',
  },

  // Basic Info
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // Category
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Uncategorized',
  },
  subcategory: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  poi_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },

  // Location
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Calpe',
  },
  region: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Spain',
  },
  postal_code: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },

  // Contact
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  website: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },

  // Ratings & Reviews
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
  },
  review_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  price_level: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },

  // Status
  verified: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  featured: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },

  // Scores
  popularity_score: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },

  // Features (JSON)
  amenities: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  accessibility_features: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  opening_hours: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },

  // Images
  images: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  thumbnail_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // Content Quality
  content_quality_score: {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: true,
  },
  content_quality_data: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  content_quality_assessed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // Enriched Content (English - default)
  enriched_tile_description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  enriched_detail_description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  enriched_highlights: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  enriched_target_audience: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },

  // Enriched Content Translations - Dutch (NL)
  enriched_tile_description_nl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  enriched_detail_description_nl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // Enriched Content Translations - German (DE)
  enriched_tile_description_de: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  enriched_detail_description_de: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // Enriched Content Translations - Spanish (ES)
  enriched_tile_description_es: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  enriched_detail_description_es: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // Enriched Content Translations - Swedish (SV)
  enriched_tile_description_sv: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  enriched_detail_description_sv: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // Enriched Content Translations - Polish (PL)
  enriched_tile_description_pl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  enriched_detail_description_pl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // Timestamps
  last_updated: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'POI',
  modelName: 'POI',
  timestamps: false, // We manage timestamps manually
  indexes: [
    { fields: ['google_placeid'], unique: true },
    { fields: ['category'] },
    { fields: ['subcategory'] },
    { fields: ['city'] },
    { fields: ['verified'] },
    { fields: ['is_active'] },
    { fields: ['featured'] },
    { fields: ['name'] },
    { fields: ['rating'] },
    { fields: ['price_level'] },
    { fields: ['popularity_score'] },
    { fields: ['latitude', 'longitude'] },
  ],
});

// Instance method to format POI for API response with language support
POI.prototype.toPublicJSON = function(lang = 'en') {
  const values = this.get();

  // Safe JSON parse helper
  const parseJSON = (data, defaultValue = null) => {
    if (!data) return defaultValue;
    if (typeof data === 'object') return data;
    try {
      return JSON.parse(data);
    } catch {
      return defaultValue;
    }
  };

  // Get translated description based on language
  const getTranslatedTileDescription = () => {
    const langField = `enriched_tile_description_${lang}`;
    return values[langField] || values.enriched_tile_description;
  };

  const getTranslatedDetailDescription = () => {
    const langField = `enriched_detail_description_${lang}`;
    return values[langField] || values.enriched_detail_description;
  };

  return {
    id: values.id,
    name: values.name,
    slug: values.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: values.description,
    category: values.category,
    subcategory: values.subcategory,
    poi_type: values.poi_type,
    city: values.city,
    region: values.region,
    country: values.country,
    address: values.address,
    postal_code: values.postal_code,
    latitude: values.latitude ? parseFloat(values.latitude) : null,
    longitude: values.longitude ? parseFloat(values.longitude) : null,
    status: values.verified && values.is_active ? 'active' : 'pending',
    rating: values.rating ? parseFloat(values.rating) : null,
    reviewCount: values.review_count,
    priceLevel: values.price_level,
    verified: values.verified,
    featured: values.featured,
    images: parseJSON(values.images, []),
    amenities: parseJSON(values.amenities, []),
    accessibility_features: parseJSON(values.accessibility_features, []),
    opening_hours: parseJSON(values.opening_hours, null),
    phone: values.phone,
    website: values.website,
    email: values.email,
    thumbnail_url: values.thumbnail_url,
    enriched_tile_description: getTranslatedTileDescription(),
    enriched_detail_description: getTranslatedDetailDescription(),
    enriched_highlights: parseJSON(values.enriched_highlights, []),
    enriched_target_audience: values.enriched_target_audience,
    google_placeid: values.google_place_id,
  };
};

export default POI;
