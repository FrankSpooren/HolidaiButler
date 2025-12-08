/**
 * Q&A Controller - ENTERPRISE LEVEL
 * =================================
 * Questions & Answers management for POIs
 * Linked via google_placeid with full validation
 */

const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /qna
 * Get Q&As with filters
 */
exports.getQnAs = async (req, res, next) => {
  try {
    const {
      google_placeid,
      language = 'nl',
      category,
      verified_only,
      limit = 20,
      offset = 0
    } = req.query;

    let sql = 'SELECT * FROM QnA WHERE 1=1';
    const params = [];

    // Google Place ID filter (primary link to POI)
    if (google_placeid) {
      sql += ' AND google_placeid = ?';
      params.push(google_placeid);
    }

    // Language filter
    if (language) {
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
      sql += ' AND language = ?';
      params.push(language);
    }

    // Category filter
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    // Verified filter
    if (verified_only === 'true') {
      sql += ' AND verified = TRUE';
    }

    // Order by helpful count and creation date
    sql += ' ORDER BY helpful_count DESC, created_at DESC';

    // Pagination
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const qnas = await query(sql, params);

    // Get total count
    let countSql = sql.substring(0, sql.indexOf('ORDER BY'));
    countSql = countSql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countParams = params.slice(0, -2);
    const [{ total }] = await query(countSql, countParams);

    res.json({
      success: true,
      data: qnas,
      meta: {
        total,
        count: qnas.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Get Q&As error:', error);
    next(error);
  }
};

/**
 * POST /qna
 * Add new Q&A for a POI
 * Requires authentication
 */
exports.addQnA = async (req, res, next) => {
  try {
    const {
      google_placeid,
      question,
      answer,
      category,
      language = 'nl'
    } = req.body;

    // Validation
    if (!google_placeid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'GOOGLE_PLACEID_REQUIRED',
          message: 'Google Place ID is required'
        }
      });
    }

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'QUESTION_ANSWER_REQUIRED',
          message: 'Both question and answer are required'
        }
      });
    }

    if (typeof question !== 'string' || question.length < 5 || question.length > 500) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUESTION',
          message: 'Question must be between 5 and 500 characters'
        }
      });
    }

    if (typeof answer !== 'string' || answer.length < 5 || answer.length > 2000) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ANSWER',
          message: 'Answer must be between 5 and 2000 characters'
        }
      });
    }

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

    // Verify that POI exists with this google_placeid
    const pois = await query(
      'SELECT id FROM POI WHERE google_placeid = ?',
      [google_placeid]
    );

    if (pois.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'POI_NOT_FOUND',
          message: 'No POI found with this Google Place ID'
        }
      });
    }

    // Insert Q&A
    const result = await query(
      `INSERT INTO QnA
       (google_placeid, question, answer, category, language, source, verified, created_at)
       VALUES (?, ?, ?, ?, ?, 'manual', FALSE, NOW())`,
      [google_placeid, question, answer, category || null, language]
    );

    logger.info(`New Q&A added: ${req.user.email} -> ${google_placeid}`);

    // Return created Q&A
    const [newQnA] = await query(
      'SELECT * FROM QnA WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: newQnA
    });
  } catch (error) {
    // Check for foreign key constraint violation
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVALID_GOOGLE_PLACEID',
          message: 'Google Place ID does not match any POI'
        }
      });
    }

    logger.error('Add Q&A error:', error);
    next(error);
  }
};
