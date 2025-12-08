/**
 * Admin POI Routes
 * Full CRUD operations, bulk actions, import/export for POI management
 */

import express from 'express';
import { Op, literal } from 'sequelize';
import { verifyAdminToken, requirePermission, requirePOIAccess, logActivity } from '../middleware/adminAuth.js';
import { POI, POIImportHistory, AdminUser, sequelize } from '../models/index.js';

const router = express.Router();

// Development mode check
const isDevelopmentMode = () => {
  const env = process.env.NODE_ENV;
  return env === 'development' || env === undefined || env === '';
};

// Development fallback POIs (Costa Blanca attractions)
const DEV_FALLBACK_POIS = [
  {
    id: 1,
    google_placeid: 'dev_poi_001',
    name: 'Peñón de Ifach',
    description: 'Iconic limestone rock formation rising 332m from the sea. Natural park with hiking trails and stunning Mediterranean views.',
    category: 'attraction',
    subcategory: 'natural_landmark',
    latitude: 38.6347,
    longitude: 0.0781,
    address: 'Parque Natural del Peñón de Ifach',
    city: 'Calpe',
    region: 'Costa Blanca',
    country: 'Spain',
    postal_code: '03710',
    phone: '+34 965 836 920',
    website: 'https://parquesnaturales.gva.es',
    rating: 4.7,
    review_count: 12450,
    price_level: 1,
    verified: true,
    featured: true,
    popularity_score: 9500,
    amenities: JSON.stringify(['parking', 'visitor_center', 'hiking_trails', 'viewpoint']),
    images: JSON.stringify(['https://example.com/penon1.jpg', 'https://example.com/penon2.jpg']),
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    google_placeid: 'dev_poi_002',
    name: 'Restaurant El Bodegón',
    description: 'Traditional Spanish restaurant specializing in fresh seafood and local paella. Family-run since 1985.',
    category: 'restaurant',
    subcategory: 'seafood',
    latitude: 38.6456,
    longitude: 0.0456,
    address: 'Calle del Mar 23',
    city: 'Calpe',
    region: 'Costa Blanca',
    country: 'Spain',
    postal_code: '03710',
    phone: '+34 965 831 234',
    website: 'https://elbodegon-calpe.es',
    rating: 4.5,
    review_count: 892,
    price_level: 2,
    verified: true,
    featured: false,
    popularity_score: 4200,
    amenities: JSON.stringify(['outdoor_seating', 'wifi', 'reservations', 'wheelchair_accessible']),
    images: JSON.stringify(['https://example.com/bodegon1.jpg']),
    created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    google_placeid: 'dev_poi_003',
    name: 'Playa del Arenal-Bol',
    description: 'Beautiful sandy beach with Blue Flag certification. Perfect for swimming, sunbathing, and water sports.',
    category: 'beach',
    subcategory: 'sandy_beach',
    latitude: 38.6398,
    longitude: 0.0534,
    address: 'Paseo Marítimo',
    city: 'Calpe',
    region: 'Costa Blanca',
    country: 'Spain',
    postal_code: '03710',
    phone: null,
    website: null,
    rating: 4.6,
    review_count: 5623,
    price_level: 0,
    verified: true,
    featured: true,
    popularity_score: 7800,
    amenities: JSON.stringify(['lifeguard', 'showers', 'beach_bars', 'sunbed_rental', 'water_sports']),
    images: JSON.stringify(['https://example.com/arenal1.jpg', 'https://example.com/arenal2.jpg']),
    created_at: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 4,
    google_placeid: 'dev_poi_004',
    name: 'Hotel Suitopia Sol y Mar',
    description: 'Modern 4-star hotel with sea views, rooftop pool, and spa facilities. Located near the beach and town center.',
    category: 'accommodation',
    subcategory: 'hotel',
    latitude: 38.6412,
    longitude: 0.0489,
    address: 'Avenida Juan Carlos I, 48',
    city: 'Calpe',
    region: 'Costa Blanca',
    country: 'Spain',
    postal_code: '03710',
    phone: '+34 965 836 400',
    website: 'https://suitopia.es',
    rating: 4.3,
    review_count: 1876,
    price_level: 3,
    verified: true,
    featured: false,
    popularity_score: 5100,
    amenities: JSON.stringify(['pool', 'spa', 'restaurant', 'wifi', 'parking', 'gym', 'bar']),
    images: JSON.stringify(['https://example.com/suitopia1.jpg']),
    created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 5,
    google_placeid: 'dev_poi_005',
    name: 'Casco Antiguo de Calpe',
    description: 'Historic old town with narrow streets, whitewashed houses, and the 15th-century Church of Nuestra Señora de las Nieves.',
    category: 'attraction',
    subcategory: 'historic_district',
    latitude: 38.6445,
    longitude: 0.0512,
    address: 'Plaza de la Villa',
    city: 'Calpe',
    region: 'Costa Blanca',
    country: 'Spain',
    postal_code: '03710',
    phone: '+34 965 833 541',
    website: 'https://calpe.es',
    rating: 4.4,
    review_count: 2341,
    price_level: 0,
    verified: true,
    featured: true,
    popularity_score: 6200,
    amenities: JSON.stringify(['walking_tours', 'museums', 'shops', 'restaurants']),
    images: JSON.stringify(['https://example.com/casco1.jpg', 'https://example.com/casco2.jpg']),
    created_at: new Date(Date.now() - 250 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 6,
    google_placeid: 'dev_poi_006',
    name: 'Las Salinas de Calpe',
    description: 'Ancient salt flats and lagoon, home to flamingos and diverse birdlife. Important wetland ecosystem.',
    category: 'attraction',
    subcategory: 'nature_reserve',
    latitude: 38.6523,
    longitude: 0.0623,
    address: 'Salinas de Calpe',
    city: 'Calpe',
    region: 'Costa Blanca',
    country: 'Spain',
    postal_code: '03710',
    phone: null,
    website: null,
    rating: 4.2,
    review_count: 1567,
    price_level: 0,
    verified: false,
    featured: false,
    popularity_score: 3400,
    amenities: JSON.stringify(['birdwatching', 'walking_path', 'information_boards']),
    images: JSON.stringify(['https://example.com/salinas1.jpg']),
    created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

/**
 * Safe JSON parse helper
 */
const safeJSONParse = (data, defaultValue = null) => {
  if (!data) return defaultValue;
  if (typeof data === 'object') return data;
  try {
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
};

/**
 * Format POI for API response
 */
const formatPOI = (poi) => {
  const data = poi.toJSON ? poi.toJSON() : poi;
  return {
    ...data,
    opening_hours: safeJSONParse(data.opening_hours, null),
    amenities: safeJSONParse(data.amenities, []),
    accessibility_features: safeJSONParse(data.accessibility_features, null),
    images: safeJSONParse(data.images, []),
    google_place_data: safeJSONParse(data.google_place_data, null),
    status: data.verified ? 'active' : 'pending',
    location: {
      city: data.city,
      country: data.country,
      region: data.region,
      address: data.address,
      postal_code: data.postal_code,
      latitude: data.latitude ? parseFloat(data.latitude) : null,
      longitude: data.longitude ? parseFloat(data.longitude) : null,
    },
    quality: {
      needsReview: !data.verified,
    },
  };
};

/**
 * @route   GET /api/admin/pois
 * @desc    Get all POIs with filters and pagination
 * @access  Private (Admin with read permission)
 */
router.get(
  '/',
  verifyAdminToken,
  requirePermission('pois', 'read'),
  logActivity('view', 'pois'),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        category,
        city,
        country,
        search,
        sort = '-created_at',
        needsReview,
      } = req.query;

      let pois = [];
      let total = 0;

      try {
        // Build WHERE conditions
        const where = {};

        // Status filter
        if (status) {
          if (status === 'active') where.verified = true;
          else if (status === 'inactive' || status === 'pending') where.verified = false;
        }

        if (category) where.category = category;
        if (city) where.city = { [Op.like]: `%${city}%` };
        if (country) where.country = country;
        if (needsReview === 'true') where.verified = false;

        if (search) {
          where[Op.or] = [
            { name: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } },
            { city: { [Op.like]: `%${search}%` } },
          ];
        }

        // Parse sort parameter
        let order = [['created_at', 'DESC']];
        if (sort) {
          const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
          const sortDir = sort.startsWith('-') ? 'DESC' : 'ASC';
          const fieldMap = {
            createdAt: 'created_at',
            created_at: 'created_at',
            name: 'name',
            rating: 'rating',
            category: 'category',
          };
          const mappedField = fieldMap[sortField] || 'created_at';
          order = [[mappedField, sortDir]];
        }

        // Calculate pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Execute query
        const { count, rows } = await POI.findAndCountAll({
          where,
          order,
          limit: parseInt(limit),
          offset,
        });

        pois = rows.map(formatPOI);
        total = count;
      } catch (dbError) {
        console.warn('POIs query failed, using fallback:', dbError.message);
        if (isDevelopmentMode()) {
          // Apply filters to fallback data
          let filteredPois = DEV_FALLBACK_POIS.filter(p => {
            if (status === 'active' && !p.verified) return false;
            if ((status === 'inactive' || status === 'pending') && p.verified) return false;
            if (category && p.category !== category) return false;
            if (city && !p.city.toLowerCase().includes(city.toLowerCase())) return false;
            if (country && p.country !== country) return false;
            if (needsReview === 'true' && p.verified) return false;
            if (search) {
              const searchLower = search.toLowerCase();
              if (!p.name.toLowerCase().includes(searchLower) &&
                  !p.description.toLowerCase().includes(searchLower) &&
                  !p.city.toLowerCase().includes(searchLower)) {
                return false;
              }
            }
            return true;
          });

          // Format fallback POIs to match expected structure
          pois = filteredPois.map(p => ({
            ...p,
            opening_hours: null,
            amenities: safeJSONParse(p.amenities, []),
            accessibility_features: null,
            images: safeJSONParse(p.images, []),
            google_place_data: null,
            status: p.verified ? 'active' : 'pending',
            location: {
              city: p.city,
              country: p.country,
              region: p.region,
              address: p.address,
              postal_code: p.postal_code,
              latitude: p.latitude,
              longitude: p.longitude,
            },
            quality: {
              needsReview: !p.verified,
            },
          }));
          total = pois.length;
        }
      }

      res.json({
        success: true,
        data: {
          pois,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error('Get POIs error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching POIs.',
      });
    }
  }
);

/**
 * @route   GET /api/admin/pois/stats
 * @desc    Get POI statistics
 * @access  Private (Admin)
 */
router.get(
  '/stats',
  verifyAdminToken,
  requirePermission('pois', 'read'),
  async (req, res) => {
    try {
      // Try to get stats from database
      let total = 0, active = 0, inactive = 0, avgRating = 0, totalViews = 0;
      let byCategory = [];

      try {
        // Get overview stats
        total = await POI.count();
        active = await POI.count({ where: { verified: true } });
        inactive = await POI.count({ where: { verified: false } });
        const avgRatingResult = await POI.findOne({
          attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']],
          raw: true,
        });
        avgRating = parseFloat(avgRatingResult?.avgRating) || 0;
        totalViews = await POI.sum('popularity_score') || 0;

        // Get category breakdown
        byCategory = await POI.findAll({
          attributes: [
            ['category', '_id'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          ],
          group: ['category'],
          order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
          raw: true,
        });
      } catch (dbError) {
        // Database not available - use fallback data for stats
        console.warn('POI stats: Database not available, using fallback stats');
        if (isDevelopmentMode()) {
          total = DEV_FALLBACK_POIS.length;
          active = DEV_FALLBACK_POIS.filter(p => p.verified).length;
          inactive = DEV_FALLBACK_POIS.filter(p => !p.verified).length;
          avgRating = DEV_FALLBACK_POIS.reduce((sum, p) => sum + (p.rating || 0), 0) / total;
          totalViews = DEV_FALLBACK_POIS.reduce((sum, p) => sum + (p.popularity_score || 0), 0);

          // Calculate category breakdown from fallback data
          const categoryCount = {};
          DEV_FALLBACK_POIS.forEach(p => {
            categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
          });
          byCategory = Object.entries(categoryCount).map(([cat, count]) => ({
            _id: cat,
            count
          })).sort((a, b) => b.count - a.count);
        }
      }

      res.json({
        success: true,
        data: {
          overview: {
            total,
            active,
            inactive,
            pending: inactive,
            needsReview: inactive,
            avgRating: Math.round(avgRating * 10) / 10,
            totalViews,
            totalBookings: 0,
          },
          byCategory,
        },
        _degradedMode: total === 0 && active === 0,
      });
    } catch (error) {
      console.error('Get POI stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching POI statistics.',
      });
    }
  }
);

/**
 * @route   GET /api/admin/pois/:id
 * @desc    Get single POI
 * @access  Private (Admin with read permission)
 */
router.get(
  '/:id',
  verifyAdminToken,
  requirePermission('pois', 'read'),
  async (req, res) => {
    try {
      const poi = await POI.findByPk(req.params.id);

      if (!poi) {
        return res.status(404).json({
          success: false,
          message: 'POI not found.',
        });
      }

      res.json({
        success: true,
        data: {
          poi: formatPOI(poi),
        },
      });
    } catch (error) {
      console.error('Get POI error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching POI.',
      });
    }
  }
);

/**
 * @route   POST /api/admin/pois
 * @desc    Create new POI
 * @access  Private (Admin with create permission)
 */
router.post(
  '/',
  verifyAdminToken,
  requirePermission('pois', 'create'),
  logActivity('create', 'poi'),
  async (req, res) => {
    try {
      const poiData = req.body;

      const {
        name,
        description = '',
        category,
        subcategory = null,
        poi_type = null,
        latitude,
        longitude,
        address = '',
        city = 'Calpe',
        region = 'Costa Blanca',
        country = 'Spain',
        postal_code = null,
        rating = null,
        review_count = 0,
        price_level = null,
        opening_hours = null,
        phone = null,
        website = null,
        email = null,
        amenities = [],
        accessibility_features = null,
        images = [],
        thumbnail_url = null,
        google_placeid = null,
        google_place_data = null,
      } = poiData;

      // Validate required fields
      if (!name || !category || latitude === undefined || longitude === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, category, latitude, longitude',
        });
      }

      // POI owners submit as pending
      const verified = req.adminUser?.role === 'poi_owner' ? false : true;

      // Generate google_placeid if not provided
      const finalGooglePlaceId = google_placeid || `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create POI
      const poi = await POI.create({
        google_placeid: finalGooglePlaceId,
        google_place_data: google_place_data ? JSON.stringify(google_place_data) : null,
        name,
        description,
        category,
        subcategory,
        poi_type,
        latitude,
        longitude,
        address,
        city,
        region,
        country,
        postal_code,
        rating,
        review_count,
        price_level,
        opening_hours: opening_hours ? JSON.stringify(opening_hours) : null,
        phone,
        website,
        email,
        amenities: JSON.stringify(amenities),
        accessibility_features: accessibility_features ? JSON.stringify(accessibility_features) : null,
        images: JSON.stringify(images),
        thumbnail_url,
        verified,
        featured: false,
        popularity_score: 0,
      });

      res.status(201).json({
        success: true,
        message: 'POI created successfully.',
        data: {
          poi: formatPOI(poi),
        },
      });
    } catch (error) {
      console.error('Create POI error:', error);

      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          message: 'A POI with this Google Place ID already exists.',
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error creating POI.',
      });
    }
  }
);

/**
 * @route   PUT /api/admin/pois/:id
 * @desc    Update POI
 * @access  Private (Admin with update permission)
 */
router.put(
  '/:id',
  verifyAdminToken,
  requirePermission('pois', 'update'),
  requirePOIAccess,
  logActivity('update', 'poi'),
  async (req, res) => {
    try {
      const updates = req.body;
      const poiId = req.params.id;

      const poi = await POI.findByPk(poiId);
      if (!poi) {
        return res.status(404).json({
          success: false,
          message: 'POI not found.',
        });
      }

      // Allowed fields for update
      const allowedFields = [
        'name', 'description', 'category', 'subcategory', 'poi_type',
        'latitude', 'longitude', 'address', 'city', 'region', 'country',
        'postal_code', 'rating', 'review_count', 'price_level',
        'phone', 'website', 'email', 'thumbnail_url', 'featured',
      ];

      const updateData = {};

      // Process scalar fields
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateData[field] = updates[field];
        }
      }

      // Process JSON fields
      if (updates.opening_hours !== undefined) {
        updateData.opening_hours = JSON.stringify(updates.opening_hours);
      }
      if (updates.amenities !== undefined) {
        updateData.amenities = JSON.stringify(updates.amenities);
      }
      if (updates.accessibility_features !== undefined) {
        updateData.accessibility_features = JSON.stringify(updates.accessibility_features);
      }
      if (updates.images !== undefined) {
        updateData.images = JSON.stringify(updates.images);
      }

      // POI owners updates go to pending
      if (req.adminUser?.role === 'poi_owner') {
        updateData.verified = false;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update.',
        });
      }

      await poi.update(updateData);
      await poi.reload();

      res.json({
        success: true,
        message: 'POI updated successfully.',
        data: {
          poi: formatPOI(poi),
        },
      });
    } catch (error) {
      console.error('Update POI error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating POI.',
      });
    }
  }
);

/**
 * @route   PATCH /api/admin/pois/:id/status
 * @desc    Update POI status
 * @access  Private (Admin with approve permission)
 */
router.patch(
  '/:id/status',
  verifyAdminToken,
  requirePermission('pois', 'approve'),
  logActivity('update_status', 'poi'),
  async (req, res) => {
    try {
      const { status, reason = null } = req.body;

      const validStatuses = ['active', 'inactive', 'pending', 'closed_temporarily', 'closed_permanently'];

      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
      }

      const poi = await POI.findByPk(req.params.id);

      if (!poi) {
        return res.status(404).json({
          success: false,
          message: 'POI not found.',
        });
      }

      const oldVerified = poi.verified;
      const verified = status === 'active';

      await poi.update({ verified });

      // TODO: Add email notification for status changes
      // if (statusChanged && poi.email) { ... }

      res.json({
        success: true,
        message: `POI status updated to ${status}.`,
        data: {
          poi: formatPOI(poi),
        },
      });
    } catch (error) {
      console.error('Update POI status error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating POI status.',
      });
    }
  }
);

/**
 * @route   DELETE /api/admin/pois/:id
 * @desc    Delete POI
 * @access  Private (Admin with delete permission)
 */
router.delete(
  '/:id',
  verifyAdminToken,
  requirePermission('pois', 'delete'),
  logActivity('delete', 'poi'),
  async (req, res) => {
    try {
      const result = await POI.destroy({
        where: { id: req.params.id },
      });

      if (result === 0) {
        return res.status(404).json({
          success: false,
          message: 'POI not found.',
        });
      }

      res.json({
        success: true,
        message: 'POI deleted successfully.',
        data: {
          deletedId: req.params.id,
        },
      });
    } catch (error) {
      console.error('Delete POI error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error deleting POI.',
      });
    }
  }
);

/**
 * @route   PATCH /api/admin/pois/:id/verify
 * @desc    Verify POI (DMO verification)
 * @access  Private (Admin with approve permission)
 */
router.patch(
  '/:id/verify',
  verifyAdminToken,
  requirePermission('pois', 'approve'),
  logActivity('verify', 'poi'),
  async (req, res) => {
    try {
      const { verified } = req.body;

      const poi = await POI.findByPk(req.params.id);

      if (!poi) {
        return res.status(404).json({
          success: false,
          message: 'POI not found.',
        });
      }

      await poi.update({ verified: verified === true });

      res.json({
        success: true,
        message: verified ? 'POI verified successfully.' : 'POI verification removed.',
        data: {
          poi: formatPOI(poi),
        },
      });
    } catch (error) {
      console.error('Verify POI error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error verifying POI.',
      });
    }
  }
);

/**
 * @route   POST /api/admin/pois/bulk/action
 * @desc    Bulk operations on POIs
 * @access  Private (Admin with update permission)
 */
router.post(
  '/bulk/action',
  verifyAdminToken,
  requirePermission('pois', 'update'),
  logActivity('bulk_action', 'pois'),
  async (req, res) => {
    try {
      const { poiIds, action } = req.body;

      if (!poiIds || !Array.isArray(poiIds) || poiIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'POI IDs array is required.',
        });
      }

      let result;

      switch (action) {
        case 'activate':
          result = await POI.update(
            { verified: true },
            { where: { id: { [Op.in]: poiIds } } }
          );
          return res.json({
            success: true,
            message: `${result[0]} POIs activated successfully.`,
            data: { modifiedCount: result[0] },
          });

        case 'deactivate':
          result = await POI.update(
            { verified: false },
            { where: { id: { [Op.in]: poiIds } } }
          );
          return res.json({
            success: true,
            message: `${result[0]} POIs deactivated successfully.`,
            data: { modifiedCount: result[0] },
          });

        case 'delete':
          result = await POI.destroy({
            where: { id: { [Op.in]: poiIds } },
          });
          return res.json({
            success: true,
            message: `${result} POIs deleted successfully.`,
            data: { count: result },
          });

        case 'mark_reviewed':
          result = await POI.update(
            { verified: true },
            { where: { id: { [Op.in]: poiIds } } }
          );
          return res.json({
            success: true,
            message: `${result[0]} POIs marked as reviewed.`,
            data: { modifiedCount: result[0] },
          });

        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid action.',
          });
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error performing bulk action.',
      });
    }
  }
);

/**
 * @route   POST /api/admin/pois/import
 * @desc    Import POIs from CSV data
 * @access  Private (Admin with create permission)
 */
router.post(
  '/import',
  verifyAdminToken,
  requirePermission('pois', 'create'),
  logActivity('import', 'pois'),
  async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
      const { rows, fileName } = req.body;

      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No data rows provided for import.',
        });
      }

      const results = {
        total: rows.length,
        successful: 0,
        failed: 0,
        errors: [],
        insertedIds: [],
      };

      // Validation helper
      const validateRow = (row, index) => {
        const errors = [];

        if (!row.name || row.name.trim() === '') {
          errors.push({ row: index + 1, field: 'name', message: 'Name is required' });
        }
        if (!row.category || row.category.trim() === '') {
          errors.push({ row: index + 1, field: 'category', message: 'Category is required' });
        }

        const lat = parseFloat(row.latitude);
        const lng = parseFloat(row.longitude);

        if (isNaN(lat) || lat < -90 || lat > 90) {
          errors.push({ row: index + 1, field: 'latitude', message: 'Valid latitude (-90 to 90) is required' });
        }
        if (isNaN(lng) || lng < -180 || lng > 180) {
          errors.push({ row: index + 1, field: 'longitude', message: 'Valid longitude (-180 to 180) is required' });
        }

        return errors;
      };

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        try {
          const validationErrors = validateRow(row, i);
          if (validationErrors.length > 0) {
            results.errors.push(...validationErrors);
            results.failed++;
            continue;
          }

          // Check for duplicate
          const existing = await POI.findOne({
            where: {
              name: row.name.trim(),
              city: row.city?.trim() || '',
            },
            transaction,
          });

          if (existing) {
            results.errors.push({
              row: i + 1,
              field: 'name',
              message: `Duplicate POI found: "${row.name}" in ${row.city || 'Unknown city'}`,
            });
            results.failed++;
            continue;
          }

          // Create POI
          const poi = await POI.create({
            google_placeid: `import_${Date.now()}_${i}`,
            name: row.name.trim(),
            description: row.description?.trim() || null,
            category: row.category.trim(),
            subcategory: row.subcategory?.trim() || null,
            poi_type: row.poi_type?.trim() || null,
            latitude: parseFloat(row.latitude),
            longitude: parseFloat(row.longitude),
            address: row.address?.trim() || null,
            city: row.city?.trim() || null,
            region: row.region?.trim() || null,
            country: row.country?.trim() || null,
            postal_code: row.postal_code?.trim() || null,
            phone: row.phone?.trim() || null,
            website: row.website?.trim() || null,
            email: row.email?.trim() || null,
            rating: row.rating ? parseFloat(row.rating) : null,
            review_count: row.review_count ? parseInt(row.review_count) : null,
            price_level: row.price_level ? parseInt(row.price_level) : null,
            verified: row.verified === 'true' || row.verified === '1',
            featured: row.featured === 'true' || row.featured === '1',
            is_active: true,
            amenities: row.amenities ? JSON.stringify(row.amenities.split(',').map(a => a.trim()).filter(Boolean)) : null,
            images: row.images ? JSON.stringify(row.images.split(',').map(img => img.trim()).filter(Boolean)) : null,
          }, { transaction });

          results.successful++;
          results.insertedIds.push(poi.id);
        } catch (rowError) {
          console.error(`Error processing row ${i + 1}:`, rowError);
          results.errors.push({
            row: i + 1,
            field: 'general',
            message: rowError.message || 'Unknown error occurred',
          });
          results.failed++;
        }
      }

      // Log import history
      const history = await POIImportHistory.create({
        user_id: req.adminUser?.id || 1,
        operation_type: 'import',
        file_name: fileName || 'import.csv',
        total_rows: results.total,
        successful_rows: results.successful,
        failed_rows: results.failed,
        error_log: JSON.stringify(results.errors),
        status: results.successful > 0 ? 'completed' : 'failed',
        completed_at: new Date(),
      }, { transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: `Import completed: ${results.successful} POIs imported successfully, ${results.failed} failed.`,
        data: {
          importId: history.id,
          summary: {
            total: results.total,
            successful: results.successful,
            failed: results.failed,
            insertedIds: results.insertedIds,
          },
          errors: results.errors.slice(0, 50),
        },
      });
    } catch (error) {
      await transaction.rollback();
      console.error('CSV Import error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during import: ' + error.message,
      });
    }
  }
);

/**
 * @route   GET /api/admin/pois/import/history
 * @desc    Get import/export history
 * @access  Private (Admin with read permission)
 */
router.get(
  '/import/history',
  verifyAdminToken,
  requirePermission('pois', 'read'),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, operation_type } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const where = {};
      if (operation_type) where.operation_type = operation_type;

      const { count, rows } = await POIImportHistory.findAndCountAll({
        where,
        include: [
          {
            model: AdminUser,
            as: 'user',
            attributes: ['id', 'email', 'first_name', 'last_name'],
          },
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset,
      });

      const formattedHistory = rows.map(h => ({
        ...h.toJSON(),
        error_log: safeJSONParse(h.error_log, []),
      }));

      res.json({
        success: true,
        data: {
          history: formattedHistory,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error('Get import history error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching import history.',
      });
    }
  }
);

/**
 * @route   GET /api/admin/pois/import/history/:id
 * @desc    Get specific import/export details
 * @access  Private (Admin with read permission)
 */
router.get(
  '/import/history/:id',
  verifyAdminToken,
  requirePermission('pois', 'read'),
  async (req, res) => {
    try {
      const history = await POIImportHistory.findByPk(req.params.id, {
        include: [
          {
            model: AdminUser,
            as: 'user',
            attributes: ['id', 'email', 'first_name', 'last_name'],
          },
        ],
      });

      if (!history) {
        return res.status(404).json({
          success: false,
          message: 'Import history record not found.',
        });
      }

      res.json({
        success: true,
        data: {
          history: {
            ...history.toJSON(),
            error_log: safeJSONParse(history.error_log, []),
          },
        },
      });
    } catch (error) {
      console.error('Get import history detail error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching import history details.',
      });
    }
  }
);

/**
 * @route   POST /api/admin/pois/export
 * @desc    Export POIs to CSV format
 * @access  Private (Admin with read permission)
 */
router.post(
  '/export',
  verifyAdminToken,
  requirePermission('pois', 'read'),
  logActivity('export', 'pois'),
  async (req, res) => {
    try {
      const { status, category, city, country, search } = req.body;

      // Build WHERE conditions
      const where = {};
      if (status === 'active') where.verified = true;
      else if (status === 'inactive') where.verified = false;
      if (category) where.category = category;
      if (city) where.city = { [Op.like]: `%${city}%` };
      if (country) where.country = country;
      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
        ];
      }

      // Fetch POIs
      const pois = await POI.findAll({ where, order: [['name', 'ASC']] });

      // CSV Header
      const csvHeader = [
        'id', 'name', 'description', 'category', 'subcategory', 'poi_type',
        'latitude', 'longitude', 'address', 'city', 'region', 'country',
        'postal_code', 'phone', 'website', 'email', 'rating', 'review_count',
        'price_level', 'verified', 'featured', 'amenities', 'images',
        'created_at', 'updated_at',
      ].join(',');

      // CSV escape helper
      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // Build CSV rows
      const csvRows = pois.map(poi => {
        const data = poi.toJSON ? poi.toJSON() : poi;
        return [
          data.id,
          escapeCSV(data.name),
          escapeCSV(data.description),
          escapeCSV(data.category),
          escapeCSV(data.subcategory),
          escapeCSV(data.poi_type),
          data.latitude,
          data.longitude,
          escapeCSV(data.address),
          escapeCSV(data.city),
          escapeCSV(data.region),
          escapeCSV(data.country),
          escapeCSV(data.postal_code),
          escapeCSV(data.phone),
          escapeCSV(data.website),
          escapeCSV(data.email),
          data.rating,
          data.review_count,
          data.price_level,
          data.verified ? 'true' : 'false',
          data.featured ? 'true' : 'false',
          escapeCSV(safeJSONParse(data.amenities, []).join(',')),
          escapeCSV(safeJSONParse(data.images, []).join(',')),
          data.created_at,
          data.updated_at,
        ].join(',');
      });

      // Combine CSV
      const csvContent = '\uFEFF' + csvHeader + '\n' + csvRows.join('\n');

      // Log export history
      await POIImportHistory.create({
        user_id: req.adminUser?.id || 1,
        operation_type: 'export',
        file_name: `pois_export_${new Date().toISOString().slice(0, 10)}.csv`,
        total_rows: pois.length,
        successful_rows: pois.length,
        failed_rows: 0,
        status: 'completed',
        completed_at: new Date(),
      });

      // Send CSV response
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="pois_export_${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error('CSV Export error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during export.',
      });
    }
  }
);

export default router;
