/**
 * Onboarding Controller (ES Module)
 * User onboarding flow (Steps 1-5) with state management
 */

import { mysqlSequelize } from '../config/database.js';
import logger from '../utils/logger.js';

const { QueryTypes } = (await import('sequelize')).default;

/**
 * Execute raw SQL query
 */
async function query(sql, params = []) {
  return mysqlSequelize.query(sql, {
    replacements: params,
    type: QueryTypes.SELECT
  });
}

/**
 * GET /onboarding/status
 * Get user's onboarding progress
 */
export const getStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const users = await query(
      `SELECT onboarding_completed, onboarding_step
       FROM Users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    const user = users[0];

    // Get saved onboarding data from preferences
    const prefs = await query(
      `SELECT
        travel_companion, interests, stay_type, visit_status,
        dietary_preferences, accessibility_needs
       FROM User_Preferences WHERE user_id = ?`,
      [userId]
    );

    const onboardingData = prefs.length > 0 ? {
      step1: prefs[0].travel_companion ? { travel_companion: prefs[0].travel_companion } : null,
      step2: prefs[0].interests ? { interests: JSON.parse(prefs[0].interests) } : null,
      step3: prefs[0].stay_type || prefs[0].visit_status ? {
        stay_type: prefs[0].stay_type,
        visit_status: prefs[0].visit_status
      } : null,
      step4: prefs[0].dietary_preferences || prefs[0].accessibility_needs ? {
        dietary_preferences: prefs[0].dietary_preferences ? JSON.parse(prefs[0].dietary_preferences) : null,
        accessibility_needs: prefs[0].accessibility_needs ? JSON.parse(prefs[0].accessibility_needs) : null
      } : null
    } : null;

    res.json({
      success: true,
      data: {
        completed: Boolean(user.onboarding_completed),
        currentStep: user.onboarding_step || 0,
        data: onboardingData
      }
    });
  } catch (error) {
    logger.error('Get onboarding status error:', error);
    next(error);
  }
};

/**
 * POST /onboarding/step/:stepNumber
 * Save onboarding step data
 */
export const saveStep = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { stepNumber } = req.params;
    const stepNum = parseInt(stepNumber);

    // Validate step number
    if (isNaN(stepNum) || stepNum < 1 || stepNum > 5) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STEP_NUMBER',
          message: 'Step number must be between 1 and 5'
        }
      });
    }

    // Process step data based on step number
    const updateData = {};
    let valid = true;
    let errorMessage = '';

    switch (stepNum) {
      case 1: {
        const { travel_companion } = req.body;
        const validCompanions = ['couple', 'family', 'solo', 'group'];

        if (!travel_companion || !validCompanions.includes(travel_companion)) {
          valid = false;
          errorMessage = `Travel companion must be one of: ${validCompanions.join(', ')}`;
        } else {
          updateData.travel_companion = travel_companion;
        }
        break;
      }

      case 2: {
        const { interests } = req.body;

        if (!Array.isArray(interests) || interests.length === 0) {
          valid = false;
          errorMessage = 'At least one interest must be selected';
        } else if (interests.length > 8) {
          valid = false;
          errorMessage = 'Maximum 8 interests allowed';
        } else {
          updateData.interests = JSON.stringify(interests);
        }
        break;
      }

      case 3: {
        const { stay_type, visit_status } = req.body;
        const validStayTypes = ['pleasure', 'business'];
        const validVisitStatuses = ['first-time', 'returning', 'local'];

        if (!stay_type || !validStayTypes.includes(stay_type)) {
          valid = false;
          errorMessage = `Stay type must be one of: ${validStayTypes.join(', ')}`;
        } else if (!visit_status || !validVisitStatuses.includes(visit_status)) {
          valid = false;
          errorMessage = `Visit status must be one of: ${validVisitStatuses.join(', ')}`;
        } else {
          updateData.stay_type = stay_type;
          updateData.visit_status = visit_status;
        }
        break;
      }

      case 4: {
        const { dietary_preferences, accessibility_needs } = req.body;

        if (dietary_preferences !== undefined) {
          if (!Array.isArray(dietary_preferences)) {
            valid = false;
            errorMessage = 'Dietary preferences must be an array';
          } else {
            updateData.dietary_preferences = JSON.stringify(dietary_preferences);
          }
        }

        if (accessibility_needs !== undefined) {
          if (!Array.isArray(accessibility_needs)) {
            valid = false;
            errorMessage = 'Accessibility needs must be an array';
          } else {
            updateData.accessibility_needs = JSON.stringify(accessibility_needs);
          }
        }
        break;
      }

      case 5: {
        valid = true;
        break;
      }

      default:
        valid = false;
        errorMessage = 'Invalid step number';
    }

    if (!valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STEP_DATA',
          message: errorMessage
        }
      });
    }

    // Save step data to User_Preferences
    if (Object.keys(updateData).length > 0) {
      const existing = await query(
        'SELECT id FROM User_Preferences WHERE user_id = ?',
        [userId]
      );

      if (existing.length === 0) {
        const fields = ['user_id', ...Object.keys(updateData)];
        const placeholders = fields.map(() => '?').join(', ');
        const values = [userId, ...Object.values(updateData)];

        await mysqlSequelize.query(
          `INSERT INTO User_Preferences (${fields.join(', ')}, created_at)
           VALUES (${placeholders}, NOW())`,
          { replacements: values }
        );
      } else {
        const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updateData), userId];

        await mysqlSequelize.query(
          `UPDATE User_Preferences SET ${setClause}, updated_at = NOW() WHERE user_id = ?`,
          { replacements: values }
        );
      }
    }

    // Update user's onboarding step
    await mysqlSequelize.query(
      'UPDATE Users SET onboarding_step = ?, updated_at = NOW() WHERE id = ?',
      { replacements: [stepNum, userId] }
    );

    logger.info(`Onboarding step ${stepNum} saved: ${req.user.email}`);

    res.json({
      success: true,
      data: {
        message: `Step ${stepNum} saved successfully`,
        nextStep: stepNum < 5 ? stepNum + 1 : null,
        completed: stepNum === 5
      }
    });
  } catch (error) {
    logger.error('Save onboarding step error:', error);
    next(error);
  }
};

/**
 * POST /onboarding/complete
 * Mark onboarding as complete
 */
export const complete = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Mark onboarding as complete
    await mysqlSequelize.query(
      `UPDATE Users
       SET onboarding_completed = TRUE,
           onboarding_step = 5,
           updated_at = NOW()
       WHERE id = ?`,
      { replacements: [userId] }
    );

    logger.info(`Onboarding completed: ${req.user.email}`);

    res.json({
      success: true,
      data: {
        message: 'Onboarding completed successfully',
        completed: true
      }
    });
  } catch (error) {
    logger.error('Complete onboarding error:', error);
    next(error);
  }
};

export default {
  getStatus,
  saveStep,
  complete
};
