/**
 * POI Controller
 * ==============
 * Handles POI retrieval, filtering, and GeoJSON export
 */

const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Helper: Check if POI is currently open
 * @param {Object} openingHours - opening_hours JSON object
 * @returns {Boolean} - true if open now, false otherwise
 */
function isOpenNow(openingHours) {
  if (!openingHours || typeof openingHours !== 'object') {
    return false;
  }

  // Get current time in Amsterdam timezone (Europe/Amsterdam)
  const now = new Date();
  const amsterdamTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }));

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = dayNames[amsterdamTime.getDay()].toLowerCase();
  const currentTime = amsterdamTime.getHours() * 60 + amsterdamTime.getMinutes(); // Minutes since midnight

  const dayHours = openingHours[currentDay];

  // If no hours for today or empty array, POI is closed
  if (!dayHours || !Array.isArray(dayHours) || dayHours.length === 0) {
    return false;
  }

  // Check if current time falls within any of the time ranges
  for (const period of dayHours) {
    if (!period.open || !period.close) continue;

    // Parse time strings (format: "HH:MM")
    const [openHour, openMin] = period.open.split(':').map(Number);
    const [closeHour, closeMin] = period.close.split(':').map(Number);

    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;

    // Check if current time is within this period
    if (currentTime >= openTime && currentTime < closeTime) {
      return true;
    }
  }

  return false;
}

/**
 * GET /pois
 * Get POIs with filters
 */
exports.getPOIs = async (req, res, next) => {
  try {
    const {
      category,
      categories,  // NEW: Multi-category filtering (enterprise-grade)
      subcategory,
      lat,
      lon,
      radius = 10,
      min_rating,    // Rating minimum
      max_rating,    // NEW: Rating maximum
      price_level,   // Legacy: single price level (backward compatible)
      price_min,     // NEW: Price range minimum
      price_max,     // NEW: Price range maximum
      amenities,
      open_now,      // NEW: Open now filter
      sort,          // NEW: Sorting option (rating, name, distance, popularity)
      limit = 20,
      offset = 0,
      cursor,  // NEW: Cursor-based pagination (enterprise-grade)
      require_images  // NEW: Optional image filter for presentations
    } = req.query;

    let sql = 'SELECT * FROM POI WHERE is_active = TRUE';
    const params = [];

    // NEW: Optional image filtering (for professional presentation layers only)
    // Search and general browsing remain unfiltered for maximum results
    // EXCLUDE Google User Content URLs as they expire/are CORS-blocked
    if (require_images === 'true' || require_images === '1' || require_images === true) {
      sql += ' AND thumbnail_url IS NOT NULL AND thumbnail_url != ""';
      sql += ' AND thumbnail_url NOT LIKE "%googleusercontent.com%"';
      sql += ' AND thumbnail_url NOT LIKE "%lh3.google%"';
    }

    // Category filter (supports both single and multi-category)
    if (categories) {
      // Multi-category: categories=Food,Active (OR logic)
      const categoryArray = categories.split(',').map(c => c.trim());
      if (categoryArray.length > 0) {
        const placeholders = categoryArray.map(() => '?').join(',');
        sql += ` AND category IN (${placeholders})`;
        categoryArray.forEach(cat => params.push(cat));
      }
    } else if (category) {
      // Single category: category=Food (backward compatible)
      sql += ' AND category = ?';
      params.push(category);
    }

    // Subcategory filter
    if (subcategory) {
      sql += ' AND subcategory = ?';
      params.push(subcategory);
    }

    // Location filter (Haversine formula)
    if (lat && lon) {
      sql += ` AND (
        6371 * ACOS(
          COS(RADIANS(?)) *
          COS(RADIANS(latitude)) *
          COS(RADIANS(longitude) - RADIANS(?)) +
          SIN(RADIANS(?)) *
          SIN(RADIANS(latitude))
        )
      ) <= ?`;
      params.push(parseFloat(lat), parseFloat(lon), parseFloat(lat), parseFloat(radius));
    }

    // Rating filter (range-based: min and/or max)
    if (min_rating) {
      sql += ' AND rating >= ?';
      params.push(parseFloat(min_rating));
    }
    if (max_rating) {
      sql += ' AND rating <= ?';
      params.push(parseFloat(max_rating));
    }

    // Price level filter (enterprise: range-based with backward compatibility)
    if (price_min || price_max) {
      // NEW: Range-based filtering
      if (price_min) {
        sql += ' AND price_level >= ?';
        params.push(parseInt(price_min));
      }
      if (price_max) {
        sql += ' AND price_level <= ?';
        params.push(parseInt(price_max));
      }
    } else if (price_level) {
      // Legacy: exact match (backward compatible)
      sql += ' AND price_level = ?';
      params.push(parseInt(price_level));
    }

    // Amenities filter (JSON_CONTAINS)
    if (amenities) {
      const amenitiesArray = Array.isArray(amenities) ? amenities : [amenities];
      amenitiesArray.forEach(() => {
        sql += ' AND JSON_CONTAINS(amenities, ?)';
      });
      amenitiesArray.forEach(amenity => {
        params.push(JSON.stringify(amenity));
      });
    }

    // Cursor filter (Enterprise-grade pagination)
    // Performance: O(limit) regardless of page - 100x faster than OFFSET at scale
    if (cursor) {
      sql += ' AND id > ?';
      params.push(parseInt(cursor));
    }

    // Sorting logic (enterprise-grade with multiple options)
    // Format: sort=field or sort=field:direction
    // Supported: rating, name, distance, popularity
    let sortField = 'popularity'; // Default
    let sortDirection = null; // Will be set based on field

    if (sort) {
      const [field, direction] = sort.toLowerCase().split(':');
      sortField = field;
      // Set direction: explicit direction if provided, otherwise field-specific defaults
      if (direction === 'asc' || direction === 'desc') {
        sortDirection = direction.toUpperCase();
      } else {
        // Field-specific defaults:
        // - name: ASC (alphabetical A-Z)
        // - rating, popularity, distance: DESC (highest first, closest first)
        sortDirection = (sortField === 'name') ? 'ASC' : 'DESC';
      }
    } else {
      // No sort specified: default to popularity DESC
      sortDirection = 'DESC';
    }

    // Build ORDER BY clause
    switch (sortField) {
      case 'rating':
        sql += ` ORDER BY rating ${sortDirection}, popularity_score DESC`;
        break;

      case 'name':
        sql += ` ORDER BY name ${sortDirection}`;
        break;

      case 'distance':
        // Distance sorting requires lat/lon
        if (lat && lon) {
          sql += ` ORDER BY (
            6371 * ACOS(
              COS(RADIANS(?)) *
              COS(RADIANS(latitude)) *
              COS(RADIANS(longitude) - RADIANS(?)) +
              SIN(RADIANS(?)) *
              SIN(RADIANS(latitude))
            )
          ) ${sortDirection}`;
          params.push(parseFloat(lat), parseFloat(lon), parseFloat(lat));
        } else {
          // Fallback to popularity if no location provided
          sql += ' ORDER BY popularity_score DESC, rating DESC';
        }
        break;

      case 'popularity':
      default:
        // Default: popularity DESC, then rating DESC
        sql += ' ORDER BY popularity_score DESC, rating DESC';
        break;
    }

    // Pagination
    // Enterprise: Use cursor-based if cursor provided, otherwise offset (legacy)
    if (cursor) {
      // Cursor-based: O(limit) performance - enterprise standard
      sql += ' LIMIT ?';
      params.push(parseInt(limit));
    } else {
      // Offset-based: O(limit * offset) - for backward compatibility only
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));
    }

    // Execute query
    let pois = await query(sql, params);

    // Parse JSON fields
    pois = pois.map(poi => ({
      ...poi,
      amenities: typeof poi.amenities === 'string' ? JSON.parse(poi.amenities) : poi.amenities,
      images: typeof poi.images === 'string' ? JSON.parse(poi.images) : poi.images,
      opening_hours: typeof poi.opening_hours === 'string' ? JSON.parse(poi.opening_hours) : poi.opening_hours
    }));

    // Application-side filtering: open_now
    // Note: This is done post-query because MariaDB doesn't support JSON indexes efficiently
    // For production at scale, consider a computed column or separate hours table
    if (open_now === 'true' || open_now === '1' || open_now === true) {
      pois = pois.filter(poi => isOpenNow(poi.opening_hours));
    }

    // Get total count (without pagination and cursor filter)
    let countSql = sql.substring(0, sql.indexOf('ORDER BY'));
    countSql = countSql.replace('SELECT *', 'SELECT COUNT(*) as total');

    // Remove pagination params AND cursor filter for accurate total
    // Cursor mode: remove LIMIT (1) + cursor filter (1) = -2
    // Offset mode: remove LIMIT (1) + OFFSET (1) = -2
    // But we need to also remove the cursor id param if cursor is used
    let countParams;
    if (cursor) {
      // Remove cursor filter from SQL
      countSql = countSql.replace(/\s+AND\s+id\s+>\s+\?/i, '');
      countParams = params.slice(0, -2); // Remove cursor id + LIMIT
    } else {
      countParams = params.slice(0, -2); // Remove LIMIT + OFFSET
    }
    const [{ total }] = await query(countSql, countParams);

    // Calculate next cursor (enterprise pagination)
    const next_cursor = pois.length > 0 ? pois[pois.length - 1].id : null;
    const has_more = pois.length === parseInt(limit); // If we got full page, likely more exist

    res.json({
      success: true,
      data: pois,  // Already parsed above
      meta: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: pois.length,
        // Enterprise cursor pagination
        cursor: cursor || null,
        next_cursor: has_more ? next_cursor : null,
        has_more,
        pagination_type: cursor ? 'cursor' : 'offset'
      }
    });
  } catch (error) {
    logger.error('Get POIs error:', error);
    next(error);
  }
};

/**
 * GET /pois/geojson
 * Export POIs as GeoJSON for map visualization
 *
 * NEW: Optimized for presentations - 5 random POIs per category with images
 */
exports.getPOIsGeoJSON = async (req, res, next) => {
  try {
    const {
      category,
      lat,
      lon,
      radius = 10,
      verified_only,
      limit_per_category = 5  // NEW: Limit POIs per category (default: 5)
    } = req.query;

    let sql = `SELECT
      id, google_placeid, name, description, category, subcategory,
      latitude, longitude, rating, price_level, thumbnail_url,
      amenities, verified, featured
      FROM POI WHERE is_active = TRUE`;

    const params = [];

    // NEW: Always require images for map view (professional presentation)
    // EXCLUDE Google User Content URLs as they expire/are CORS-blocked
    sql += ' AND thumbnail_url IS NOT NULL AND thumbnail_url != ""';
    sql += ' AND thumbnail_url NOT LIKE "%googleusercontent.com%"';
    sql += ' AND thumbnail_url NOT LIKE "%lh3.google%"';

    // Category filter
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    // Location filter (Calpe bounds: ~38.6-38.7 lat, ~0.0-0.1 lon)
    if (lat && lon) {
      sql += ` AND (
        6371 * ACOS(
          COS(RADIANS(?)) *
          COS(RADIANS(latitude)) *
          COS(RADIANS(longitude) - RADIANS(?)) +
          SIN(RADIANS(?)) *
          SIN(RADIANS(latitude))
        )
      ) <= ?`;
      params.push(parseFloat(lat), parseFloat(lon), parseFloat(lat), parseFloat(radius));
    } else {
      // NEW: Default to Calpe area if no location provided
      // Calpe bounds: lat 38.60-38.68, lon -0.05-0.15
      sql += ` AND latitude BETWEEN 38.60 AND 38.68`;
      sql += ` AND longitude BETWEEN -0.05 AND 0.15`;
    }

    // Verified filter
    if (verified_only === 'true') {
      sql += ' AND verified = TRUE';
    }

    sql += ' ORDER BY RAND()'; // Random order for variety

    const allPois = await query(sql, params);

    // NEW: Select N random POIs per category for balanced representation
    const poisPerCategory = {};
    const limitPerCat = parseInt(limit_per_category);

    allPois.forEach(poi => {
      const cat = poi.category;
      if (!poisPerCategory[cat]) {
        poisPerCategory[cat] = [];
      }
      // Only add if we haven't reached the limit for this category
      if (poisPerCategory[cat].length < limitPerCat) {
        poisPerCategory[cat].push(poi);
      }
    });

    // Flatten back to single array
    const selectedPois = Object.values(poisPerCategory).flat();

    // Convert to GeoJSON
    const geojson = {
      type: 'FeatureCollection',
      metadata: {
        generated: new Date().toISOString(),
        count: selectedPois.length,
        categories: Object.keys(poisPerCategory).length,
        limit_per_category: limitPerCat
      },
      features: selectedPois.map(poi => ({
        type: 'Feature',
        id: poi.id,
        geometry: {
          type: 'Point',
          coordinates: [parseFloat(poi.longitude), parseFloat(poi.latitude)]
        },
        properties: {
          id: poi.id,
          google_placeid: poi.google_placeid,
          name: poi.name,
          description: poi.description || '',
          category: poi.category,
          subcategory: poi.subcategory,
          rating: poi.rating ? parseFloat(poi.rating) : null,
          price_level: poi.price_level,
          thumbnail_url: poi.thumbnail_url,
          amenities: typeof poi.amenities === 'string' ? JSON.parse(poi.amenities) : poi.amenities,
          verified: Boolean(poi.verified),
          featured: Boolean(poi.featured)
        }
      }))
    };

    res.json(geojson);
  } catch (error) {
    logger.error('Get POIs GeoJSON error:', error);
    next(error);
  }
};

/**
 * GET /pois/:id
 * Get POI details by ID
 */
exports.getPOIById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const pois = await query('SELECT * FROM POI WHERE id = ? AND is_active = TRUE', [id]);

    if (pois.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'POI_NOT_FOUND',
          message: 'POI not found'
        }
      });
    }

    const poi = pois[0];

    // Parse JSON fields
    poi.amenities = typeof poi.amenities === 'string' ? JSON.parse(poi.amenities) : poi.amenities;
    poi.images = typeof poi.images === 'string' ? JSON.parse(poi.images) : poi.images;
    poi.opening_hours = typeof poi.opening_hours === 'string' ? JSON.parse(poi.opening_hours) : poi.opening_hours;

    res.json({
      success: true,
      data: poi
    });
  } catch (error) {
    logger.error('Get POI by ID error:', error);
    next(error);
  }
};

/**
 * GET /pois/google/:placeid
 * Get POI by Google Place ID
 */
exports.getPOIByGooglePlaceId = async (req, res, next) => {
  try {
    const { placeid } = req.params;

    const pois = await query('SELECT * FROM POI WHERE google_placeid = ? AND is_active = TRUE', [placeid]);

    if (pois.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'POI_NOT_FOUND',
          message: 'POI not found'
        }
      });
    }

    const poi = pois[0];

    // Parse JSON fields
    poi.amenities = typeof poi.amenities === 'string' ? JSON.parse(poi.amenities) : poi.amenities;
    poi.images = typeof poi.images === 'string' ? JSON.parse(poi.images) : poi.images;
    poi.opening_hours = typeof poi.opening_hours === 'string' ? JSON.parse(poi.opening_hours) : poi.opening_hours;

    res.json({
      success: true,
      data: poi
    });
  } catch (error) {
    logger.error('Get POI by Google Place ID error:', error);
    next(error);
  }
};

/**
 * GET /pois/:id/qna
 * Get Q&A for specific POI
 */
exports.getPOIQnA = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { language = 'nl' } = req.query;

    // First, get the POI to get its google_placeid
    const pois = await query('SELECT google_placeid FROM POI WHERE id = ? AND is_active = TRUE', [id]);

    if (pois.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'POI_NOT_FOUND',
          message: 'POI not found'
        }
      });
    }

    const { google_placeid } = pois[0];

    // Get Q&A for this POI
    const qnas = await query(
      `SELECT * FROM QnA
       WHERE google_placeid = ? AND language = ?
       ORDER BY helpful_count DESC, created_at DESC`,
      [google_placeid, language]
    );

    res.json({
      success: true,
      data: qnas
    });
  } catch (error) {
    logger.error('Get POI Q&A error:', error);
    next(error);
  }
};
