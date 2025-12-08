import express from 'express';
import { verifyAdminToken, requirePermission, requirePOIAccess, logActivity } from '../middleware/adminAuth.js';
import db from '../config/database.js';
import AdminUser from '../models/AdminUser.js';
import emailService from '../services/EmailService.js';

const router = express.Router();

/**
 * @route   GET /api/admin/pois
 * @desc    Get all POIs (with filters and pagination)
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
        needsReview
      } = req.query;

      // Build WHERE clauses
      const whereClauses = [];
      const params = [];

      // If user is POI owner, only show their POIs
      if (req.adminUser.role === 'poi_owner') {
        const ownedPOIs = await AdminUser.getOwnedPOIs(req.adminUser.id);
        if (ownedPOIs.length === 0) {
          // User owns no POIs, return empty result
          return res.json({
            success: true,
            data: {
              pois: [],
              pagination: {
                total: 0,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: 0
              }
            }
          });
        }
        whereClauses.push(`id IN (${ownedPOIs.map(() => '?').join(', ')})`);
        params.push(...ownedPOIs);
      }

      // Status filter - map to verified or custom status field if exists
      if (status) {
        if (status === 'active') {
          whereClauses.push('verified = ?');
          params.push(1);
        } else if (status === 'inactive') {
          whereClauses.push('verified = ?');
          params.push(0);
        } else if (status === 'pending') {
          whereClauses.push('verified = ?');
          params.push(0);
        }
      }

      if (category) {
        whereClauses.push('category = ?');
        params.push(category);
      }

      if (city) {
        whereClauses.push('city LIKE ?');
        params.push(`%${city}%`);
      }

      if (country) {
        whereClauses.push('country = ?');
        params.push(country);
      }

      if (needsReview === 'true') {
        whereClauses.push('verified = ?');
        params.push(0);
      }

      if (search) {
        whereClauses.push('(name LIKE ? OR description LIKE ? OR city LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // Build WHERE clause
      const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Parse sort parameter
      let orderBy = 'created_at DESC';
      if (sort) {
        const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
        const sortDir = sort.startsWith('-') ? 'DESC' : 'ASC';
        // Map common sort fields
        const fieldMap = {
          'createdAt': 'created_at',
          'created_at': 'created_at',
          'name': 'name',
          'rating': 'rating',
          'category': 'category'
        };
        const mappedField = fieldMap[sortField] || 'created_at';
        orderBy = `${mappedField} ${sortDir}`;
      }

      // Calculate pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Execute queries
      const countQuery = `SELECT COUNT(*) as total FROM POI ${whereSQL}`;
      const [countResult] = await db.execute(countQuery, params);
      const total = countResult[0].total;

      const selectQuery = `
        SELECT
          id,
          google_placeid,
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
          opening_hours,
          phone,
          website,
          email,
          amenities,
          accessibility_features,
          images,
          thumbnail_url,
          verified,
          featured,
          popularity_score,
          last_updated,
          created_at
        FROM POI
        ${whereSQL}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `;

      const [pois] = await db.execute(selectQuery, [...params, parseInt(limit), offset]);

      // Safe JSON parse helper
      const safeJSONParse = (data, defaultValue = null, fieldName = 'unknown', poiId = 'unknown') => {
        if (!data) return defaultValue;
        try {
          // If already an object, return it
          if (typeof data === 'object') return data;
          return JSON.parse(data);
        } catch (error) {
          console.error(`Failed to parse JSON for field ${fieldName} in POI ${poiId}:`, error.message);
          return defaultValue;
        }
      };

      // Format POIs - parse JSON fields with safe parsing
      const formattedPOIs = pois.map(poi => ({
        ...poi,
        opening_hours: safeJSONParse(poi.opening_hours, null, 'opening_hours', poi.id),
        amenities: safeJSONParse(poi.amenities, [], 'amenities', poi.id),
        accessibility_features: safeJSONParse(poi.accessibility_features, null, 'accessibility_features', poi.id),
        images: safeJSONParse(poi.images, [], 'images', poi.id),
        google_place_data: safeJSONParse(poi.google_place_data, null, 'google_place_data', poi.id),
        // Map MySQL fields to expected format
        status: poi.verified ? 'active' : 'pending',
        location: {
          city: poi.city,
          country: poi.country,
          region: poi.region,
          address: poi.address,
          postal_code: poi.postal_code,
          latitude: poi.latitude ? parseFloat(poi.latitude) : null,
          longitude: poi.longitude ? parseFloat(poi.longitude) : null
        },
        quality: {
          needsReview: !poi.verified
        }
      }));

      res.json({
        success: true,
        data: {
          pois: formattedPOIs,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Get POIs error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching POIs.'
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
      let whereClause = '';
      const params = [];

      // If user is POI owner, only show stats for their POIs
      if (req.adminUser.role === 'poi_owner') {
        const ownedPOIs = await AdminUser.getOwnedPOIs(req.adminUser.id);
        if (ownedPOIs.length === 0) {
          return res.json({
            success: true,
            data: {
              overview: {
                total: 0,
                active: 0,
                inactive: 0,
                pending: 0,
                needsReview: 0,
                avgRating: 0,
                totalViews: 0,
                totalBookings: 0
              },
              byCategory: []
            }
          });
        }
        whereClause = `WHERE id IN (${ownedPOIs.map(() => '?').join(', ')})`;
        params.push(...ownedPOIs);
      }

      // Get overview stats
      const statsQuery = `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN verified = 0 THEN 1 ELSE 0 END) as inactive,
          SUM(CASE WHEN verified = 0 THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN verified = 0 THEN 1 ELSE 0 END) as needsReview,
          AVG(rating) as avgRating,
          SUM(popularity_score) as totalViews,
          0 as totalBookings
        FROM POI
        ${whereClause}
      `;

      const [statsResult] = await db.execute(statsQuery, params);
      const stats = statsResult[0];

      // Get category breakdown
      const categoryQuery = `
        SELECT
          category as _id,
          COUNT(*) as count
        FROM POI
        ${whereClause}
        GROUP BY category
        ORDER BY count DESC
      `;

      const [categoryStats] = await db.execute(categoryQuery, params);

      res.json({
        success: true,
        data: {
          overview: {
            total: stats.total || 0,
            active: stats.active || 0,
            inactive: stats.inactive || 0,
            pending: stats.pending || 0,
            needsReview: stats.needsReview || 0,
            avgRating: parseFloat(stats.avgRating) || 0,
            totalViews: stats.totalViews || 0,
            totalBookings: stats.totalBookings || 0
          },
          byCategory: categoryStats
        }
      });

    } catch (error) {
      console.error('Get POI stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching POI statistics.'
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
      const [rows] = await db.execute(
        `SELECT
          id,
          google_placeid,
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
          opening_hours,
          phone,
          website,
          email,
          amenities,
          accessibility_features,
          images,
          thumbnail_url,
          verified,
          featured,
          popularity_score,
          last_updated,
          created_at
        FROM POI
        WHERE id = ?`,
        [req.params.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'POI not found.'
        });
      }

      const poi = rows[0];

      // Check if user can access this POI
      if (req.adminUser.role === 'poi_owner') {
        const canAccess = await AdminUser.canManagePOI(
          req.adminUser.id,
          poi.id,
          req.adminUser.role
        );

        if (!canAccess) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to access this POI.'
          });
        }
      }

      // Safe JSON parse helper
      const safeJSONParse = (data, defaultValue = null, fieldName = 'unknown') => {
        if (!data) return defaultValue;
        try {
          // If already an object, return it
          if (typeof data === 'object') return data;
          return JSON.parse(data);
        } catch (error) {
          console.error(`Failed to parse JSON for field ${fieldName} in POI ${poi.id}:`, error.message);
          console.error(`Data was:`, data?.substring ? data.substring(0, 100) : data);
          return defaultValue;
        }
      };

      // Format POI with safe parsing
      const formattedPOI = {
        ...poi,
        opening_hours: safeJSONParse(poi.opening_hours, null, 'opening_hours'),
        amenities: safeJSONParse(poi.amenities, [], 'amenities'),
        accessibility_features: safeJSONParse(poi.accessibility_features, null, 'accessibility_features'),
        images: safeJSONParse(poi.images, [], 'images'),
        status: poi.verified ? 'active' : 'pending',
        location: {
          city: poi.city,
          country: poi.country,
          region: poi.region,
          address: poi.address,
          postal_code: poi.postal_code,
          latitude: poi.latitude ? parseFloat(poi.latitude) : null,
          longitude: poi.longitude ? parseFloat(poi.longitude) : null
        },
        quality: {
          needsReview: !poi.verified
        }
      };

      res.json({
        success: true,
        data: {
          poi: formattedPOI
        }
      });

    } catch (error) {
      console.error('Get POI error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching POI.'
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

      // Extract and validate required fields
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
        google_place_data = null
      } = poiData;

      // Validate required fields
      if (!name || !category || latitude === undefined || longitude === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, category, latitude, longitude'
        });
      }

      // If POI owner, set verified to pending (0)
      const verified = req.adminUser.role === 'poi_owner' ? 0 : 1;

      // Generate google_placeid if not provided
      const finalGooglePlaceId = google_placeid || `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Insert POI
      const [result] = await db.execute(
        `INSERT INTO POI (
          google_placeid,
          google_place_data,
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
          opening_hours,
          phone,
          website,
          email,
          amenities,
          accessibility_features,
          images,
          thumbnail_url,
          verified,
          featured,
          popularity_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          finalGooglePlaceId,
          google_place_data ? JSON.stringify(google_place_data) : null,
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
          opening_hours ? JSON.stringify(opening_hours) : null,
          phone,
          website,
          email,
          JSON.stringify(amenities),
          accessibility_features ? JSON.stringify(accessibility_features) : null,
          JSON.stringify(images),
          thumbnail_url,
          verified,
          0, // featured
          0  // popularity_score
        ]
      );

      const poiId = result.insertId;

      // If POI owner, add to their owned POIs
      if (req.adminUser.role === 'poi_owner') {
        await AdminUser.addOwnedPOI(req.adminUser.id, poiId);
      }

      // Fetch the created POI
      const [rows] = await db.execute('SELECT * FROM POI WHERE id = ?', [poiId]);
      const poi = rows[0];

      res.status(201).json({
        success: true,
        message: 'POI created successfully.',
        data: {
          poi: {
            ...poi,
            opening_hours: poi.opening_hours ? JSON.parse(poi.opening_hours) : null,
            amenities: poi.amenities ? JSON.parse(poi.amenities) : [],
            accessibility_features: poi.accessibility_features ? JSON.parse(poi.accessibility_features) : null,
            images: poi.images ? JSON.parse(poi.images) : []
          }
        }
      });

    } catch (error) {
      console.error('Create POI error:', error);

      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          message: 'A POI with this Google Place ID already exists.'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error creating POI.'
      });
    }
  }
);

/**
 * @route   PUT /api/admin/pois/:id
 * @desc    Update POI
 * @access  Private (Admin with update permission or POI owner)
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

      // Check if POI exists
      const [existing] = await db.execute('SELECT id FROM POI WHERE id = ?', [poiId]);
      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'POI not found.'
        });
      }

      // Build update query
      const updateFields = [];
      const params = [];

      // Map of allowed fields
      const allowedFields = {
        name: 'name',
        description: 'description',
        category: 'category',
        subcategory: 'subcategory',
        poi_type: 'poi_type',
        latitude: 'latitude',
        longitude: 'longitude',
        address: 'address',
        city: 'city',
        region: 'region',
        country: 'country',
        postal_code: 'postal_code',
        rating: 'rating',
        review_count: 'review_count',
        price_level: 'price_level',
        phone: 'phone',
        website: 'website',
        email: 'email',
        thumbnail_url: 'thumbnail_url',
        featured: 'featured'
      };

      // Process scalar fields
      for (const [key, dbField] of Object.entries(allowedFields)) {
        if (updates[key] !== undefined) {
          updateFields.push(`${dbField} = ?`);
          params.push(updates[key]);
        }
      }

      // Process JSON fields
      if (updates.opening_hours !== undefined) {
        updateFields.push('opening_hours = ?');
        params.push(JSON.stringify(updates.opening_hours));
      }

      if (updates.amenities !== undefined) {
        updateFields.push('amenities = ?');
        params.push(JSON.stringify(updates.amenities));
      }

      if (updates.accessibility_features !== undefined) {
        updateFields.push('accessibility_features = ?');
        params.push(JSON.stringify(updates.accessibility_features));
      }

      if (updates.images !== undefined) {
        updateFields.push('images = ?');
        params.push(JSON.stringify(updates.images));
      }

      // If POI owner is updating, mark as unverified (needs review)
      if (req.adminUser.role === 'poi_owner') {
        updateFields.push('verified = ?');
        params.push(0);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update.'
        });
      }

      // Add POI ID to params
      params.push(poiId);

      // Execute update
      await db.execute(
        `UPDATE POI SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      // Fetch updated POI
      const [rows] = await db.execute('SELECT * FROM POI WHERE id = ?', [poiId]);
      const poi = rows[0];

      res.json({
        success: true,
        message: 'POI updated successfully.',
        data: {
          poi: {
            ...poi,
            opening_hours: poi.opening_hours ? JSON.parse(poi.opening_hours) : null,
            amenities: poi.amenities ? JSON.parse(poi.amenities) : [],
            accessibility_features: poi.accessibility_features ? JSON.parse(poi.accessibility_features) : null,
            images: poi.images ? JSON.parse(poi.images) : []
          }
        }
      });

    } catch (error) {
      console.error('Update POI error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating POI.'
      });
    }
  }
);

/**
 * @route   PATCH /api/admin/pois/:id/status
 * @desc    Update POI status
 * @access  Private (Admin or Reviewer)
 */
router.patch(
  '/:id/status',
  verifyAdminToken,
  requirePermission('pois', 'approve'),
  logActivity('update_status', 'poi'),
  async (req, res) => {
    try {
      const { status, reason = null } = req.body; // Add optional reason for rejection

      const validStatuses = ['active', 'inactive', 'pending', 'closed_temporarily', 'closed_permanently'];

      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      // Fetch current POI data BEFORE update (to compare status change)
      const [currentRows] = await db.execute('SELECT * FROM POI WHERE id = ?', [req.params.id]);

      if (currentRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'POI not found.'
        });
      }

      const currentPOI = currentRows[0];
      const oldVerified = currentPOI.verified;

      // Map status to verified field
      let verified;
      if (status === 'active') {
        verified = 1;
      } else {
        verified = 0;
      }

      // Update POI status
      const [result] = await db.execute(
        'UPDATE POI SET verified = ? WHERE id = ?',
        [verified, req.params.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'POI not found.'
        });
      }

      // Fetch updated POI
      const [rows] = await db.execute('SELECT * FROM POI WHERE id = ?', [req.params.id]);
      const poi = rows[0];

      // ✉️ EMAIL NOTIFICATION LOGIC
      // Send email if status changed and POI has an email contact
      const statusChanged = oldVerified !== verified;

      if (statusChanged && poi.email) {
        try {
          const approverName = `${req.adminUser.first_name} ${req.adminUser.last_name}`.trim() || req.adminUser.email;

          // Status: inactive/pending → active (APPROVAL)
          if (oldVerified === 0 && verified === 1) {
            console.log(`📧 Sending POI approval email to ${poi.email} for POI: ${poi.name}`);

            await emailService.sendPOIApprovalNotification({
              poiName: poi.name,
              poiId: poi.id,
              ownerEmail: poi.email, // POI contact email
              ownerName: null, // We don't have owner name in POI table
              approvedBy: approverName
            });
          }

          // Status: active → inactive/pending (REJECTION / NEEDS REVIEW)
          else if (oldVerified === 1 && verified === 0) {
            console.log(`📧 Sending POI rejection email to ${poi.email} for POI: ${poi.name}`);

            await emailService.sendPOIRejectionNotification({
              poiName: poi.name,
              poiId: poi.id,
              ownerEmail: poi.email,
              ownerName: null,
              rejectedBy: approverName,
              reason: reason || 'Your POI requires review. Please check the details and resubmit.'
            });
          }
        } catch (emailError) {
          // Log email error but don't fail the status update
          console.error('⚠️ Email notification failed (non-critical):', emailError.message);
        }
      } else if (statusChanged && !poi.email) {
        console.log(`⚠️ POI ${poi.id} status changed but no email available for notification`);
      }

      res.json({
        success: true,
        message: `POI status updated to ${status}.`,
        data: {
          poi: {
            ...poi,
            opening_hours: poi.opening_hours ? JSON.parse(poi.opening_hours) : null,
            amenities: poi.amenities ? JSON.parse(poi.amenities) : [],
            accessibility_features: poi.accessibility_features ? JSON.parse(poi.accessibility_features) : null,
            images: poi.images ? JSON.parse(poi.images) : []
          }
        }
      });

    } catch (error) {
      console.error('Update POI status error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating POI status.'
      });
    }
  }
);

/**
 * @route   DELETE /api/admin/pois/:id
 * @desc    Delete POI
 * @access  Private (Admin with delete permission only)
 */
router.delete(
  '/:id',
  verifyAdminToken,
  requirePermission('pois', 'delete'),
  logActivity('delete', 'poi'),
  async (req, res) => {
    try {
      const [result] = await db.execute(
        'DELETE FROM POI WHERE id = ?',
        [req.params.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'POI not found.'
        });
      }

      res.json({
        success: true,
        message: 'POI deleted successfully.',
        data: {
          deletedId: req.params.id
        }
      });

    } catch (error) {
      console.error('Delete POI error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error deleting POI.'
      });
    }
  }
);

/**
 * @route   PATCH /api/admin/pois/:id/verify
 * @desc    Verify POI (DMO verification)
 * @access  Private (Admin only)
 */
router.patch(
  '/:id/verify',
  verifyAdminToken,
  requirePermission('pois', 'approve'),
  logActivity('verify', 'poi'),
  async (req, res) => {
    try {
      const { verified } = req.body;

      // Update verified status
      const [result] = await db.execute(
        'UPDATE POI SET verified = ? WHERE id = ?',
        [verified === true ? 1 : 0, req.params.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'POI not found.'
        });
      }

      // Fetch updated POI
      const [rows] = await db.execute('SELECT * FROM POI WHERE id = ?', [req.params.id]);
      const poi = rows[0];

      res.json({
        success: true,
        message: verified ? 'POI verified successfully.' : 'POI verification removed.',
        data: {
          poi: {
            ...poi,
            opening_hours: poi.opening_hours ? JSON.parse(poi.opening_hours) : null,
            amenities: poi.amenities ? JSON.parse(poi.amenities) : [],
            accessibility_features: poi.accessibility_features ? JSON.parse(poi.accessibility_features) : null,
            images: poi.images ? JSON.parse(poi.images) : []
          }
        }
      });

    } catch (error) {
      console.error('Verify POI error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error verifying POI.'
      });
    }
  }
);

/**
 * @route   POST /api/admin/pois/bulk/action
 * @desc    Bulk operations on POIs
 * @access  Private (Admin only)
 */
router.post(
  '/bulk/action',
  verifyAdminToken,
  requirePermission('pois', 'update'),
  logActivity('bulk_action', 'pois'),
  async (req, res) => {
    try {
      const { poiIds, action, value } = req.body;

      if (!poiIds || !Array.isArray(poiIds) || poiIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'POI IDs array is required.'
        });
      }

      const placeholders = poiIds.map(() => '?').join(', ');

      switch (action) {
        case 'activate':
          const [activateResult] = await db.execute(
            `UPDATE POI SET verified = 1 WHERE id IN (${placeholders})`,
            poiIds
          );
          return res.json({
            success: true,
            message: `${activateResult.affectedRows} POIs activated successfully.`,
            data: {
              modifiedCount: activateResult.affectedRows
            }
          });

        case 'deactivate':
          const [deactivateResult] = await db.execute(
            `UPDATE POI SET verified = 0 WHERE id IN (${placeholders})`,
            poiIds
          );
          return res.json({
            success: true,
            message: `${deactivateResult.affectedRows} POIs deactivated successfully.`,
            data: {
              modifiedCount: deactivateResult.affectedRows
            }
          });

        case 'delete':
          if (!AdminUser.hasPermission(req.adminUser, 'pois', 'delete')) {
            return res.status(403).json({
              success: false,
              message: 'Permission denied for bulk delete.'
            });
          }
          const [deleteResult] = await db.execute(
            `DELETE FROM POI WHERE id IN (${placeholders})`,
            poiIds
          );
          return res.json({
            success: true,
            message: `${deleteResult.affectedRows} POIs deleted successfully.`,
            data: {
              count: deleteResult.affectedRows
            }
          });

        case 'mark_reviewed':
          const [reviewResult] = await db.execute(
            `UPDATE POI SET verified = 1 WHERE id IN (${placeholders})`,
            poiIds
          );
          return res.json({
            success: true,
            message: `${reviewResult.affectedRows} POIs marked as reviewed.`,
            data: {
              modifiedCount: reviewResult.affectedRows
            }
          });

        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid action.'
          });
      }

    } catch (error) {
      console.error('Bulk action error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error performing bulk action.'
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
    const connection = await db.getConnection();

    try {
      const { rows } = req.body;

      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No data rows provided for import.'
        });
      }

      // Start transaction
      await connection.beginTransaction();

      // Track results
      const results = {
        total: rows.length,
        successful: 0,
        failed: 0,
        errors: [],
        insertedIds: []
      };

      // Validation helper
      const validateRow = (row, index) => {
        const errors = [];

        // Required fields
        if (!row.name || row.name.trim() === '') {
          errors.push({ row: index + 1, field: 'name', message: 'Name is required' });
        }
        if (!row.category || row.category.trim() === '') {
          errors.push({ row: index + 1, field: 'category', message: 'Category is required' });
        }

        // Coordinates validation
        const lat = parseFloat(row.latitude);
        const lng = parseFloat(row.longitude);

        if (isNaN(lat) || lat < -90 || lat > 90) {
          errors.push({ row: index + 1, field: 'latitude', message: 'Valid latitude (-90 to 90) is required' });
        }
        if (isNaN(lng) || lng < -180 || lng > 180) {
          errors.push({ row: index + 1, field: 'longitude', message: 'Valid longitude (-180 to 180) is required' });
        }

        // Optional field validation
        if (row.price_level && row.price_level !== '') {
          const priceLevel = parseInt(row.price_level);
          if (isNaN(priceLevel) || priceLevel < 1 || priceLevel > 4) {
            errors.push({ row: index + 1, field: 'price_level', message: 'Price level must be 1-4 if provided' });
          }
        }

        if (row.rating && row.rating !== '') {
          const rating = parseFloat(row.rating);
          if (isNaN(rating) || rating < 0 || rating > 5) {
            errors.push({ row: index + 1, field: 'rating', message: 'Rating must be 0-5 if provided' });
          }
        }

        return errors;
      };

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        try {
          // Validate row
          const validationErrors = validateRow(row, i);
          if (validationErrors.length > 0) {
            results.errors.push(...validationErrors);
            results.failed++;
            continue;
          }

          // Check for duplicate (same name + city)
          const [existingPOI] = await connection.execute(
            'SELECT id, name FROM POI WHERE name = ? AND city = ? LIMIT 1',
            [row.name.trim(), row.city?.trim() || '']
          );

          if (existingPOI.length > 0) {
            results.errors.push({
              row: i + 1,
              field: 'name',
              message: `Duplicate POI found: "${row.name}" in ${row.city || 'Unknown city'} (ID: ${existingPOI[0].id})`
            });
            results.failed++;
            continue;
          }

          // Generate google_placeid (required field - use import-based ID)
          const googlePlaceId = `import_${Date.now()}_${i}`;

          // Prepare data for insert
          const insertData = {
            google_placeid: googlePlaceId,
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
            rating: row.rating && row.rating !== '' ? parseFloat(row.rating) : null,
            review_count: row.review_count && row.review_count !== '' ? parseInt(row.review_count) : null,
            price_level: row.price_level && row.price_level !== '' ? parseInt(row.price_level) : null,
            verified: row.verified === 'true' || row.verified === '1' || row.verified === 1 ? 1 : 0,
            featured: row.featured === 'true' || row.featured === '1' || row.featured === 1 ? 1 : 0,
            is_active: 1, // All imported POIs are active by default
            amenities: row.amenities ? JSON.stringify(row.amenities.split(',').map(a => a.trim()).filter(a => a)) : null,
            images: row.images ? JSON.stringify(row.images.split(',').map(img => img.trim()).filter(img => img)) : null
          };

          // Insert POI
          const [insertResult] = await connection.execute(
            `INSERT INTO POI (
              google_placeid, name, description, category, subcategory, poi_type,
              latitude, longitude, address, city, region, country, postal_code,
              phone, website, email, rating, review_count, price_level,
              verified, featured, is_active, amenities, images, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              insertData.google_placeid,
              insertData.name,
              insertData.description,
              insertData.category,
              insertData.subcategory,
              insertData.poi_type,
              insertData.latitude,
              insertData.longitude,
              insertData.address,
              insertData.city,
              insertData.region,
              insertData.country,
              insertData.postal_code,
              insertData.phone,
              insertData.website,
              insertData.email,
              insertData.rating,
              insertData.review_count,
              insertData.price_level,
              insertData.verified,
              insertData.featured,
              insertData.is_active,
              insertData.amenities,
              insertData.images
            ]
          );

          results.successful++;
          results.insertedIds.push(insertResult.insertId);

        } catch (rowError) {
          console.error(`Error processing row ${i + 1}:`, rowError);
          results.errors.push({
            row: i + 1,
            field: 'general',
            message: rowError.message || 'Unknown error occurred'
          });
          results.failed++;
        }
      }

      // Log import history
      const [historyResult] = await connection.execute(
        `INSERT INTO POI_ImportExportHistory (
          user_id, operation_type, file_name, total_rows, successful_rows,
          failed_rows, error_log, status, created_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          req.adminUser.id,
          'import',
          req.body.fileName || 'import.csv',
          results.total,
          results.successful,
          results.failed,
          JSON.stringify(results.errors),
          results.successful > 0 ? 'completed' : 'failed'
        ]
      );

      // Commit transaction
      await connection.commit();

      res.json({
        success: true,
        message: `Import completed: ${results.successful} POIs imported successfully, ${results.failed} failed.`,
        data: {
          importId: historyResult.insertId,
          summary: {
            total: results.total,
            successful: results.successful,
            failed: results.failed,
            insertedIds: results.insertedIds
          },
          errors: results.errors.slice(0, 50) // Limit errors in response to first 50
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('CSV Import error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during import: ' + error.message
      });
    } finally {
      connection.release();
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

      // Build WHERE clause
      const whereClauses = [];
      const params = [];

      if (operation_type) {
        whereClauses.push('operation_type = ?');
        params.push(operation_type);
      }

      const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Get total count
      const [countResult] = await db.execute(
        `SELECT COUNT(*) as total FROM POI_ImportExportHistory ${whereSQL}`,
        params
      );
      const total = countResult[0].total;

      // Get history records with user info
      const [history] = await db.execute(
        `SELECT
          h.*,
          u.email as user_email,
          u.first_name,
          u.last_name
        FROM POI_ImportExportHistory h
        LEFT JOIN AdminUsers u ON h.user_id = u.id
        ${whereSQL}
        ORDER BY h.created_at DESC
        LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), offset]
      );

      // Parse error_log JSON
      const formattedHistory = history.map(h => ({
        ...h,
        error_log: h.error_log ? JSON.parse(h.error_log) : []
      }));

      res.json({
        success: true,
        data: {
          history: formattedHistory,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Get import history error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching import history.'
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
      const [history] = await db.execute(
        `SELECT
          h.*,
          u.email as user_email,
          u.first_name,
          u.last_name
        FROM POI_ImportExportHistory h
        LEFT JOIN AdminUsers u ON h.user_id = u.id
        WHERE h.id = ?`,
        [req.params.id]
      );

      if (history.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Import history not found.'
        });
      }

      const record = history[0];
      record.error_log = record.error_log ? JSON.parse(record.error_log) : [];

      res.json({
        success: true,
        data: { history: record }
      });

    } catch (error) {
      console.error('Get import history detail error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching import details.'
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
      const {
        status,
        category,
        city,
        country,
        search,
        verified
      } = req.body;

      // Build WHERE clauses (same logic as GET / route)
      const whereClauses = [];
      const params = [];

      // If user is POI owner, only export their POIs
      if (req.adminUser.role === 'poi_owner') {
        const ownedPOIs = await AdminUser.getOwnedPOIs(req.adminUser.id);
        if (ownedPOIs.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No POIs to export.'
          });
        }
        whereClauses.push(`id IN (${ownedPOIs.map(() => '?').join(', ')})`);
        params.push(...ownedPOIs);
      }

      // Status filter
      if (status) {
        if (status === 'active') {
          whereClauses.push('verified = ?');
          params.push(1);
        } else if (status === 'inactive') {
          whereClauses.push('verified = ?');
          params.push(0);
        }
      }

      if (verified !== undefined && verified !== null && verified !== '') {
        whereClauses.push('verified = ?');
        params.push(verified === 'true' || verified === true || verified === 1 ? 1 : 0);
      }

      if (category) {
        whereClauses.push('category = ?');
        params.push(category);
      }

      if (city) {
        whereClauses.push('city LIKE ?');
        params.push(`%${city}%`);
      }

      if (country) {
        whereClauses.push('country = ?');
        params.push(country);
      }

      if (search) {
        whereClauses.push('(name LIKE ? OR description LIKE ? OR city LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Fetch POIs to export
      const [pois] = await db.execute(
        `SELECT
          id,
          google_placeid,
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
          phone,
          website,
          email,
          rating,
          review_count,
          price_level,
          verified,
          featured,
          popularity_score,
          opening_hours,
          amenities,
          images,
          thumbnail_url,
          created_at,
          last_updated
        FROM POI
        ${whereSQL}
        ORDER BY created_at DESC`,
        params
      );

      if (pois.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No POIs found matching the criteria.'
        });
      }

      // Helper to safely parse JSON and convert to CSV string
      const jsonToCSVString = (data) => {
        if (!data) return '';
        try {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          if (Array.isArray(parsed)) {
            return parsed.join(',');
          }
          if (typeof parsed === 'object') {
            return JSON.stringify(parsed).replace(/"/g, '""'); // Escape quotes for CSV
          }
          return String(parsed);
        } catch (error) {
          return '';
        }
      };

      // CSV Header
      const csvHeaders = [
        'id',
        'google_placeid',
        'name',
        'description',
        'category',
        'subcategory',
        'poi_type',
        'latitude',
        'longitude',
        'address',
        'city',
        'region',
        'country',
        'postal_code',
        'phone',
        'website',
        'email',
        'rating',
        'review_count',
        'price_level',
        'verified',
        'featured',
        'popularity_score',
        'opening_hours',
        'amenities',
        'images',
        'thumbnail_url',
        'created_at',
        'last_updated'
      ];

      // CSV escape helper - handles commas, quotes, newlines
      const escapeCSV = (value) => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // If contains comma, quote, or newline, wrap in quotes and escape existing quotes
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };

      // Build CSV content
      let csvContent = csvHeaders.join(',') + '\n';

      pois.forEach(poi => {
        const row = [
          poi.id,
          escapeCSV(poi.google_placeid),
          escapeCSV(poi.name),
          escapeCSV(poi.description),
          escapeCSV(poi.category),
          escapeCSV(poi.subcategory),
          escapeCSV(poi.poi_type),
          poi.latitude,
          poi.longitude,
          escapeCSV(poi.address),
          escapeCSV(poi.city),
          escapeCSV(poi.region),
          escapeCSV(poi.country),
          escapeCSV(poi.postal_code),
          escapeCSV(poi.phone),
          escapeCSV(poi.website),
          escapeCSV(poi.email),
          poi.rating || '',
          poi.review_count || '',
          poi.price_level || '',
          poi.verified ? 1 : 0,
          poi.featured ? 1 : 0,
          poi.popularity_score || '',
          escapeCSV(jsonToCSVString(poi.opening_hours)),
          escapeCSV(jsonToCSVString(poi.amenities)),
          escapeCSV(jsonToCSVString(poi.images)),
          escapeCSV(poi.thumbnail_url),
          poi.created_at || '',
          poi.last_updated || ''
        ];
        csvContent += row.join(',') + '\n';
      });

      // Log export history
      await db.execute(
        `INSERT INTO POI_ImportExportHistory (
          user_id, operation_type, file_name, total_rows, successful_rows,
          failed_rows, status, created_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          req.adminUser.id,
          'export',
          `poi-export-${Date.now()}.csv`,
          pois.length,
          pois.length,
          0,
          'completed'
        ]
      );

      // Set headers for file download
      const fileName = `poi-export-${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

      // Send CSV content
      res.send('\ufeff' + csvContent); // UTF-8 BOM for Excel compatibility

    } catch (error) {
      console.error('CSV Export error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during export: ' + error.message
      });
    }
  }
);

export default router;
