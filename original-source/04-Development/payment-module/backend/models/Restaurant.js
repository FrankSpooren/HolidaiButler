/**
 * Restaurant Model
 * Represents a restaurant in the reservation system
 */

const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Restaurant = sequelize.define(
    'Restaurant',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: () => uuidv4(),
        primaryKey: true,
      },

      // Basic Info
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [2, 200],
        },
      },
      slug: {
        type: DataTypes.STRING(200),
        unique: true,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      cuisine_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Italian, French, Asian, Dutch, etc.',
      },
      price_range: {
        type: DataTypes.ENUM('€', '€€', '€€€', '€€€€'),
        defaultValue: '€€',
      },

      // Location
      address_line1: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      address_line2: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      postal_code: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      country: {
        type: DataTypes.STRING(2),
        defaultValue: 'NL',
        comment: 'ISO 3166-1 alpha-2 code',
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
      },

      // Contact
      phone: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(200),
        allowNull: true,
        validate: {
          isEmail: true,
        },
      },
      website: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
          isUrl: true,
        },
      },

      // Media
      logo_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      cover_image_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      gallery_images: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of image URLs',
      },

      // Operating Hours
      opening_hours: {
        type: DataTypes.JSON,
        defaultValue: {
          monday: { open: '17:00', close: '23:00', closed: false },
          tuesday: { open: '17:00', close: '23:00', closed: false },
          wednesday: { open: '17:00', close: '23:00', closed: false },
          thursday: { open: '17:00', close: '23:00', closed: false },
          friday: { open: '17:00', close: '23:00', closed: false },
          saturday: { open: '12:00', close: '23:00', closed: false },
          sunday: { open: '12:00', close: '22:00', closed: false },
        },
        comment: 'Opening hours per day of week',
      },

      // Reservation Settings
      advance_booking_days: {
        type: DataTypes.INTEGER,
        defaultValue: 90,
        comment: 'How many days in advance guests can book',
      },
      min_party_size: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      max_party_size: {
        type: DataTypes.INTEGER,
        defaultValue: 12,
      },
      default_seating_duration: {
        type: DataTypes.INTEGER,
        defaultValue: 90,
        comment: 'Default reservation duration in minutes',
      },
      time_slot_interval: {
        type: DataTypes.INTEGER,
        defaultValue: 15,
        comment: 'Time slot interval in minutes (15, 30, etc.)',
      },

      // Cancellation Policy
      cancellation_deadline_hours: {
        type: DataTypes.INTEGER,
        defaultValue: 24,
        comment: 'Hours before reservation when free cancellation ends',
      },
      no_show_fee: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        comment: 'Fixed no-show fee',
      },
      deposit_required: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      deposit_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Fixed deposit amount per person',
      },
      deposit_percentage: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Deposit as percentage of estimated bill',
      },

      // Features
      features: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment:
          'Array of features: outdoor_seating, wheelchair_accessible, parking, wifi, etc.',
      },

      // Integrations
      pos_system: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'toast, square, lightspeed, etc.',
      },
      pos_integration_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      thefork_restaurant_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      google_place_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      // Status
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      is_accepting_reservations: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      is_featured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      // Analytics
      average_rating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        validate: {
          min: 0,
          max: 5,
        },
      },
      total_reviews: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      total_reservations: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },

      // Metadata
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: 'restaurants',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: 'idx_location',
          fields: ['city', 'cuisine_type'],
        },
        {
          name: 'idx_active',
          fields: ['is_active', 'is_accepting_reservations'],
        },
        {
          name: 'idx_featured',
          fields: ['is_featured', 'average_rating'],
        },
        {
          name: 'idx_slug',
          unique: true,
          fields: ['slug'],
        },
      ],
    }
  );

  // Instance Methods
  Restaurant.prototype.isOpenOn = function (dayOfWeek) {
    const day = dayOfWeek.toLowerCase();
    return this.opening_hours[day] && !this.opening_hours[day].closed;
  };

  Restaurant.prototype.getOpeningHoursFor = function (dayOfWeek) {
    const day = dayOfWeek.toLowerCase();
    return this.opening_hours[day] || null;
  };

  Restaurant.prototype.canAcceptReservations = function () {
    return this.is_active && this.is_accepting_reservations;
  };

  Restaurant.prototype.incrementReservationCount = async function () {
    this.total_reservations += 1;
    await this.save();
  };

  // Hooks
  Restaurant.beforeValidate((restaurant) => {
    if (restaurant.name && !restaurant.slug) {
      restaurant.slug = restaurant.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  });

  return Restaurant;
};
