/**
 * User Controller - ENTERPRISE LEVEL
 * ==================================
 * Complete user profile, preferences, and interactions management
 * with full validation, error handling, and GDPR compliance
 */

const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /users/me
 * Get current user profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const users = await query(
      `SELECT
        id, uuid, email, name, avatar_url,
        onboarding_completed, onboarding_step,
        created_at, last_login
       FROM Users
       WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User profile not found'
        }
      });
    }

    const user = users[0];

    // Remove sensitive data
    delete user.id; // Only expose UUID

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    next(error);
  }
};

/**
 * PATCH /users/me
 * Update user profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, avatar_url } = req.body;

    // Validation
    const updates = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.length > 255) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_NAME',
            message: 'Name must be a string with max 255 characters'
          }
        });
      }
      updates.name = name;
    }

    if (avatar_url !== undefined) {
      if (typeof avatar_url !== 'string' || avatar_url.length > 500) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_AVATAR_URL',
            message: 'Avatar URL must be a string with max 500 characters'
          }
        });
      }
      // Validate URL format
      try {
        new URL(avatar_url);
        updates.avatar_url = avatar_url;
      } catch {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_URL_FORMAT',
            message: 'Avatar URL must be a valid URL'
          }
        });
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_UPDATES',
          message: 'No valid fields to update'
        }
      });
    }

    // Build dynamic UPDATE query
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), userId];

    await query(
      `UPDATE Users SET ${setClause}, updated_at = NOW() WHERE id = ?`,
      values
    );

    // Get updated user
    const [updatedUser] = await query(
      `SELECT uuid, email, name, avatar_url, onboarding_completed
       FROM Users WHERE id = ?`,
      [userId]
    );

    logger.info(`User profile updated: ${req.user.email}`);

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    next(error);
  }
};

/**
 * DELETE /users/me
 * Delete user account (GDPR Article 17 - Right to Erasure)
 */
exports.deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { confirmation } = req.body;

    // Require explicit confirmation
    if (confirmation !== 'DELETE_MY_DATA') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CONFIRMATION_REQUIRED',
          message: 'Account deletion requires confirmation. Send { "confirmation": "DELETE_MY_DATA" }'
        }
      });
    }

    // Use transaction for data integrity
    await transaction(async connection => {
      // Log GDPR deletion request
      await connection.execute(
        `INSERT INTO GDPR_Logs (user_id, user_email, action_type, action_details, ip_address, created_at)
         SELECT id, email, 'delete_data',
                JSON_OBJECT('confirmation', 'DELETE_MY_DATA', 'timestamp', NOW()),
                ?, NOW()
         FROM Users WHERE id = ?`,
        [req.ip, userId]
      );

      // Delete all user data (cascades via foreign keys)
      // Order: Sessions, User_Interactions, User_Preferences, Users
      await connection.execute('DELETE FROM Sessions WHERE user_id = ?', [userId]);
      await connection.execute('DELETE FROM User_Interactions WHERE user_id = ?', [userId]);
      await connection.execute('DELETE FROM User_Preferences WHERE user_id = ?', [userId]);
      await connection.execute('DELETE FROM Users WHERE id = ?', [userId]);
    });

    logger.info(`User account deleted (GDPR): ${req.user.email}`);

    // 204 No Content - account successfully deleted
    res.status(204).send();
  } catch (error) {
    logger.error('Delete account error:', error);
    next(error);
  }
};

/**
 * GET /users/me/preferences
 * Get user preferences
 */
exports.getPreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const prefs = await query(
      `SELECT
        travel_companion, interests, stay_type, visit_status,
        dietary_preferences, accessibility_needs,
        preferred_language, home_location,
        personality_type, ai_enabled,
        data_retention_days, data_retention_until,
        marketing_consent, analytics_consent,
        created_at, updated_at
       FROM User_Preferences
       WHERE user_id = ?`,
      [userId]
    );

    if (prefs.length === 0) {
      // Create default preferences if they don't exist
      await query(
        `INSERT INTO User_Preferences (user_id, preferred_language, created_at)
         VALUES (?, 'nl', NOW())`,
        [userId]
      );

      return res.json({
        success: true,
        data: {
          preferred_language: 'nl',
          ai_enabled: true,
          data_retention_days: 30,
          marketing_consent: false,
          analytics_consent: true
        }
      });
    }

    const preferences = prefs[0];

    // Parse JSON fields
    if (preferences.interests) {
      preferences.interests = typeof preferences.interests === 'string'
        ? JSON.parse(preferences.interests)
        : preferences.interests;
    }
    if (preferences.dietary_preferences) {
      preferences.dietary_preferences = typeof preferences.dietary_preferences === 'string'
        ? JSON.parse(preferences.dietary_preferences)
        : preferences.dietary_preferences;
    }
    if (preferences.accessibility_needs) {
      preferences.accessibility_needs = typeof preferences.accessibility_needs === 'string'
        ? JSON.parse(preferences.accessibility_needs)
        : preferences.accessibility_needs;
    }
    if (preferences.home_location) {
      preferences.home_location = typeof preferences.home_location === 'string'
        ? JSON.parse(preferences.home_location)
        : preferences.home_location;
    }

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    logger.error('Get preferences error:', error);
    next(error);
  }
};

/**
 * PATCH /users/me/preferences
 * Update user preferences (from onboarding or account settings)
 */
exports.updatePreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      travel_companion,
      interests,
      stay_type,
      visit_status,
      dietary_preferences,
      accessibility_needs,
      preferred_language,
      home_location,
      personality_type,
      ai_enabled,
      data_retention_days,
      marketing_consent,
      analytics_consent
    } = req.body;

    // Validation
    const validTravelCompanions = ['couple', 'family', 'solo', 'group'];
    const validStayTypes = ['pleasure', 'business'];
    const validVisitStatuses = ['first-time', 'returning', 'local'];
    const validLanguages = ['nl', 'en', 'de', 'es', 'sv'];
    const validPersonalities = ['cognitive', 'physical', 'social'];

    const updates = {};

    if (travel_companion !== undefined) {
      if (!validTravelCompanions.includes(travel_companion)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TRAVEL_COMPANION',
            message: `Travel companion must be one of: ${validTravelCompanions.join(', ')}`
          }
        });
      }
      updates.travel_companion = travel_companion;
    }

    if (interests !== undefined) {
      if (!Array.isArray(interests)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INTERESTS',
            message: 'Interests must be an array'
          }
        });
      }
      updates.interests = JSON.stringify(interests);
    }

    if (stay_type !== undefined) {
      if (!validStayTypes.includes(stay_type)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STAY_TYPE',
            message: `Stay type must be one of: ${validStayTypes.join(', ')}`
          }
        });
      }
      updates.stay_type = stay_type;
    }

    if (visit_status !== undefined) {
      if (!validVisitStatuses.includes(visit_status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_VISIT_STATUS',
            message: `Visit status must be one of: ${validVisitStatuses.join(', ')}`
          }
        });
      }
      updates.visit_status = visit_status;
    }

    if (dietary_preferences !== undefined) {
      if (!Array.isArray(dietary_preferences)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DIETARY_PREFERENCES',
            message: 'Dietary preferences must be an array'
          }
        });
      }
      updates.dietary_preferences = JSON.stringify(dietary_preferences);
    }

    if (accessibility_needs !== undefined) {
      if (!Array.isArray(accessibility_needs)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ACCESSIBILITY_NEEDS',
            message: 'Accessibility needs must be an array'
          }
        });
      }
      updates.accessibility_needs = JSON.stringify(accessibility_needs);
    }

    if (preferred_language !== undefined) {
      if (!validLanguages.includes(preferred_language)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_LANGUAGE',
            message: `Language must be one of: ${validLanguages.join(', ')}`
          }
        });
      }
      updates.preferred_language = preferred_language;
    }

    if (home_location !== undefined) {
      if (typeof home_location !== 'object') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_HOME_LOCATION',
            message: 'Home location must be an object with latitude, longitude, city'
          }
        });
      }
      updates.home_location = JSON.stringify(home_location);
    }

    if (personality_type !== undefined) {
      if (!validPersonalities.includes(personality_type)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PERSONALITY_TYPE',
            message: `Personality type must be one of: ${validPersonalities.join(', ')}`
          }
        });
      }
      updates.personality_type = personality_type;
    }

    if (ai_enabled !== undefined) {
      if (typeof ai_enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_AI_ENABLED',
            message: 'AI enabled must be a boolean'
          }
        });
      }
      updates.ai_enabled = ai_enabled;
    }

    if (data_retention_days !== undefined) {
      const days = parseInt(data_retention_days);
      if (isNaN(days) || days < 1 || days > 365) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DATA_RETENTION',
            message: 'Data retention days must be between 1 and 365'
          }
        });
      }
      updates.data_retention_days = days;
      updates.data_retention_until = `DATE_ADD(CURDATE(), INTERVAL ${days} DAY)`;
    }

    if (marketing_consent !== undefined) {
      if (typeof marketing_consent !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_MARKETING_CONSENT',
            message: 'Marketing consent must be a boolean'
          }
        });
      }
      updates.marketing_consent = marketing_consent;
    }

    if (analytics_consent !== undefined) {
      if (typeof analytics_consent !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ANALYTICS_CONSENT',
            message: 'Analytics consent must be a boolean'
          }
        });
      }
      updates.analytics_consent = analytics_consent;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_UPDATES',
          message: 'No valid fields to update'
        }
      });
    }

    // Check if preferences exist
    const existing = await query(
      'SELECT id FROM User_Preferences WHERE user_id = ?',
      [userId]
    );

    if (existing.length === 0) {
      // Insert new preferences
      const fields = ['user_id', ...Object.keys(updates)];
      const placeholders = fields.map(() => '?').join(', ');
      const values = [userId, ...Object.values(updates)];

      await query(
        `INSERT INTO User_Preferences (${fields.join(', ')}, created_at)
         VALUES (${placeholders}, NOW())`,
        values
      );
    } else {
      // Update existing preferences
      const setClause = Object.keys(updates)
        .map(key => key === 'data_retention_until' ? `${key} = ${updates[key]}` : `${key} = ?`)
        .join(', ');
      const values = Object.entries(updates)
        .filter(([key]) => key !== 'data_retention_until')
        .map(([, value]) => value);
      values.push(userId);

      await query(
        `UPDATE User_Preferences SET ${setClause}, updated_at = NOW() WHERE user_id = ?`,
        values
      );
    }

    // Get updated preferences
    const [updatedPrefs] = await query(
      'SELECT * FROM User_Preferences WHERE user_id = ?',
      [userId]
    );

    // Parse JSON fields
    if (updatedPrefs.interests) {
      updatedPrefs.interests = typeof updatedPrefs.interests === 'string'
        ? JSON.parse(updatedPrefs.interests)
        : updatedPrefs.interests;
    }
    if (updatedPrefs.dietary_preferences) {
      updatedPrefs.dietary_preferences = typeof updatedPrefs.dietary_preferences === 'string'
        ? JSON.parse(updatedPrefs.dietary_preferences)
        : updatedPrefs.dietary_preferences;
    }
    if (updatedPrefs.accessibility_needs) {
      updatedPrefs.accessibility_needs = typeof updatedPrefs.accessibility_needs === 'string'
        ? JSON.parse(updatedPrefs.accessibility_needs)
        : updatedPrefs.accessibility_needs;
    }

    logger.info(`User preferences updated: ${req.user.email}`);

    res.json({
      success: true,
      data: updatedPrefs
    });
  } catch (error) {
    logger.error('Update preferences error:', error);
    next(error);
  }
};

/**
 * GET /users/me/saved-pois
 * Get user's saved/favorite POIs
 */
exports.getSavedPOIs = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const savedPOIs = await query(
      `SELECT
        p.*,
        ui.created_at as saved_at
       FROM User_Interactions ui
       JOIN POI p ON ui.poi_id = p.id
       WHERE ui.user_id = ? AND ui.interaction_type = 'save'
       ORDER BY ui.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    // Parse JSON fields
    const parsedPOIs = savedPOIs.map(poi => ({
      ...poi,
      amenities: typeof poi.amenities === 'string' ? JSON.parse(poi.amenities) : poi.amenities,
      images: typeof poi.images === 'string' ? JSON.parse(poi.images) : poi.images,
      opening_hours: typeof poi.opening_hours === 'string' ? JSON.parse(poi.opening_hours) : poi.opening_hours
    }));

    res.json({
      success: true,
      data: parsedPOIs,
      meta: {
        count: parsedPOIs.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Get saved POIs error:', error);
    next(error);
  }
};

/**
 * POST /users/me/saved-pois
 * Save/bookmark a POI
 */
exports.savePOI = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { poi_id } = req.body;

    if (!poi_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'POI_ID_REQUIRED',
          message: 'POI ID is required'
        }
      });
    }

    // Check if POI exists
    const pois = await query('SELECT id, google_placeid FROM POI WHERE id = ?', [poi_id]);

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

    // Check if already saved
    const existing = await query(
      `SELECT id FROM User_Interactions
       WHERE user_id = ? AND poi_id = ? AND interaction_type = 'save'`,
      [userId, poi_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ALREADY_SAVED',
          message: 'POI is already saved'
        }
      });
    }

    // Save POI
    await query(
      `INSERT INTO User_Interactions
       (user_id, poi_id, google_placeid, interaction_type, created_at)
       VALUES (?, ?, ?, 'save', NOW())`,
      [userId, poi_id, google_placeid]
    );

    logger.info(`User saved POI: ${req.user.email} -> POI ${poi_id}`);

    res.status(201).json({
      success: true,
      data: {
        message: 'POI saved successfully',
        poi_id
      }
    });
  } catch (error) {
    logger.error('Save POI error:', error);
    next(error);
  }
};

/**
 * DELETE /users/me/saved-pois/:id
 * Remove saved/bookmarked POI
 */
exports.unsavePOI = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: poi_id } = req.params;

    const result = await query(
      `DELETE FROM User_Interactions
       WHERE user_id = ? AND poi_id = ? AND interaction_type = 'save'`,
      [userId, poi_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_SAVED',
          message: 'POI is not in your saved list'
        }
      });
    }

    logger.info(`User unsaved POI: ${req.user.email} -> POI ${poi_id}`);

    res.status(204).send();
  } catch (error) {
    logger.error('Unsave POI error:', error);
    next(error);
  }
};

/**
 * GET /users/me/history
 * Get user's interaction history
 */
exports.getInteractionHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT
        ui.*,
        p.name as poi_name,
        p.category as poi_category
      FROM User_Interactions ui
      JOIN POI p ON ui.poi_id = p.id
      WHERE ui.user_id = ?
    `;

    const params = [userId];

    if (type) {
      sql += ' AND ui.interaction_type = ?';
      params.push(type);
    }

    sql += ' ORDER BY ui.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const history = await query(sql, params);

    res.json({
      success: true,
      data: history,
      meta: {
        count: history.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Get interaction history error:', error);
    next(error);
  }
};
