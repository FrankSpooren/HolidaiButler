/**
 * Category Controller - ENTERPRISE LEVEL
 * ======================================
 * POI category hierarchy management (3 levels: main, sub, type)
 */

const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /categories
 * Get all categories with hierarchical structure
 */
exports.getCategories = async (req, res, next) => {
  try {
    const { language = 'nl', level } = req.query;

    // Validate language
    const validLanguages = ['nl', 'en', 'de', 'es', 'sv'];
    if (!validLanguages.includes(language)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_LANGUAGE',
          message: `Language must be one of: ${validLanguages.join(', ')}`
        }
      });
    }

    let sql = 'SELECT * FROM Categories';
    const params = [];

    // Filter by level if specified
    if (level) {
      const levelNum = parseInt(level);
      if (isNaN(levelNum) || levelNum < 1 || levelNum > 3) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_LEVEL',
            message: 'Level must be 1 (main), 2 (sub), or 3 (type)'
          }
        });
      }
      sql += ' WHERE level = ?';
      params.push(levelNum);
    }

    sql += ' ORDER BY level, order_index, name';

    const categories = await query(sql, params);

    // Parse translations
    const parsedCategories = categories.map(cat => {
      const translations = typeof cat.translations === 'string'
        ? JSON.parse(cat.translations)
        : cat.translations;

      return {
        ...cat,
        display_name: translations && translations[language] ? translations[language] : cat.name,
        translations
      };
    });

    // Build hierarchical structure
    const hierarchy = buildCategoryHierarchy(parsedCategories);

    res.json({
      success: true,
      data: hierarchy,
      meta: {
        total: categories.length,
        language
      }
    });
  } catch (error) {
    logger.error('Get categories error:', error);
    next(error);
  }
};

/**
 * GET /categories/:id
 * Get specific category with details
 */
exports.getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { language = 'nl' } = req.query;

    const categories = await query(
      'SELECT * FROM Categories WHERE id = ?',
      [id]
    );

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found'
        }
      });
    }

    const category = categories[0];

    // Parse translations
    const translations = typeof category.translations === 'string'
      ? JSON.parse(category.translations)
      : category.translations;

    category.display_name = translations && translations[language]
      ? translations[language]
      : category.name;
    category.translations = translations;

    // Get parent category if exists
    if (category.parent_id) {
      const [parent] = await query(
        'SELECT id, name, translations FROM Categories WHERE id = ?',
        [category.parent_id]
      );

      if (parent) {
        const parentTranslations = typeof parent.translations === 'string'
          ? JSON.parse(parent.translations)
          : parent.translations;

        category.parent = {
          id: parent.id,
          name: parent.name,
          display_name: parentTranslations && parentTranslations[language]
            ? parentTranslations[language]
            : parent.name
        };
      }
    }

    // Get child categories
    const children = await query(
      'SELECT id, name, translations FROM Categories WHERE parent_id = ? ORDER BY order_index, name',
      [category.id]
    );

    category.children = children.map(child => {
      const childTranslations = typeof child.translations === 'string'
        ? JSON.parse(child.translations)
        : child.translations;

      return {
        id: child.id,
        name: child.name,
        display_name: childTranslations && childTranslations[language]
          ? childTranslations[language]
          : child.name
      };
    });

    // Get POI count in this category
    const [{ count: poi_count }] = await query(
      'SELECT COUNT(*) as count FROM POI WHERE category = ?',
      [category.name]
    );

    category.poi_count = poi_count;

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    logger.error('Get category by ID error:', error);
    next(error);
  }
};

/**
 * GET /categories/:id/pois
 * Get POIs in specific category
 */
exports.getPOIsInCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      lat,
      lon,
      radius = 10,
      min_rating,
      limit = 20,
      offset = 0
    } = req.query;

    // Get category
    const categories = await query(
      'SELECT name, slug FROM Categories WHERE id = ?',
      [id]
    );

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found'
        }
      });
    }

    const { name: categoryName } = categories[0];

    // Build query
    let sql = 'SELECT * FROM POI WHERE category = ?';
    const params = [categoryName];

    // Location filter
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

    // Rating filter
    if (min_rating) {
      sql += ' AND rating >= ?';
      params.push(parseFloat(min_rating));
    }

    // Order by
    if (lat && lon) {
      sql += ` ORDER BY (
        6371 * ACOS(
          COS(RADIANS(?)) *
          COS(RADIANS(latitude)) *
          COS(RADIANS(longitude) - RADIANS(?)) +
          SIN(RADIANS(?)) *
          SIN(RADIANS(latitude))
        )
      ) ASC`;
      params.push(parseFloat(lat), parseFloat(lon), parseFloat(lat));
    } else {
      sql += ' ORDER BY popularity_score DESC, rating DESC';
    }

    // Pagination
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const pois = await query(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM POI WHERE category = ?';
    const countParams = [categoryName];

    if (lat && lon) {
      countSql += ` AND (
        6371 * ACOS(
          COS(RADIANS(?)) *
          COS(RADIANS(latitude)) *
          COS(RADIANS(longitude) - RADIANS(?)) +
          SIN(RADIANS(?)) *
          SIN(RADIANS(latitude))
        )
      ) <= ?`;
      countParams.push(parseFloat(lat), parseFloat(lon), parseFloat(lat), parseFloat(radius));
    }

    if (min_rating) {
      countSql += ' AND rating >= ?';
      countParams.push(parseFloat(min_rating));
    }

    const [{ total }] = await query(countSql, countParams);

    // Parse JSON fields
    const parsedPOIs = pois.map(poi => ({
      ...poi,
      amenities: typeof poi.amenities === 'string' ? JSON.parse(poi.amenities) : poi.amenities,
      images: typeof poi.images === 'string' ? JSON.parse(poi.images) : poi.images,
      opening_hours: typeof poi.opening_hours === 'string' ? JSON.parse(poi.opening_hours) : poi.opening_hours
    }));

    res.json({
      success: true,
      data: parsedPOIs,
      meta: {
        category: categoryName,
        total,
        count: parsedPOIs.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Get POIs in category error:', error);
    next(error);
  }
};

/**
 * Helper function to build category hierarchy
 */
function buildCategoryHierarchy(categories) {
  // Separate by level
  const level1 = categories.filter(c => c.level === 1);
  const level2 = categories.filter(c => c.level === 2);
  const level3 = categories.filter(c => c.level === 3);

  // Build hierarchy
  const hierarchy = level1.map(cat1 => {
    const children2 = level2.filter(c => c.parent_id === cat1.id).map(cat2 => {
      const children3 = level3.filter(c => c.parent_id === cat2.id);
      return {
        ...cat2,
        children: children3.length > 0 ? children3 : undefined
      };
    });

    return {
      ...cat1,
      children: children2.length > 0 ? children2 : undefined
    };
  });

  return hierarchy;
}
