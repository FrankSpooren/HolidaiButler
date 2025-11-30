/**
 * OAuth Controller
 * =================
 * Handles Facebook and Apple ID OAuth authentication
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate JWT tokens for authenticated user
 */
function generateTokens(user) {
  const accessToken = jwt.sign(
    {
      userId: user.id,
      uuid: user.uuid,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      uuid: user.uuid,
      type: 'refresh'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );

  return { accessToken, refreshToken };
}

/**
 * POST /auth/oauth/facebook
 * Handle Facebook OAuth callback
 *
 * Expected body: { accessToken: string }
 * The accessToken is from Facebook SDK on frontend
 */
exports.facebookAuth = async (req, res, next) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ACCESS_TOKEN',
          message: 'Facebook access token is required'
        }
      });
    }

    // Verify Facebook token and get user info
    const fbResponse = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
    );

    const fbUser = fbResponse.data;

    if (!fbUser.id) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_FB_TOKEN',
          message: 'Invalid Facebook access token'
        }
      });
    }

    // Check if user exists with this Facebook ID
    const existingUsers = await query(
      `SELECT id, uuid, email, name, onboarding_completed
       FROM Users
       WHERE oauth_provider = 'facebook' AND oauth_id = ?`,
      [fbUser.id]
    );

    let user;
    let isNewUser = false;

    if (existingUsers.length > 0) {
      // User exists - login
      user = existingUsers[0];
      logger.info(`Facebook user logged in: ${user.email}`);
    } else {
      // Check if email already exists (user might have registered with email)
      if (fbUser.email) {
        const emailUsers = await query(
          'SELECT id FROM Users WHERE email = ?',
          [fbUser.email]
        );

        if (emailUsers.length > 0) {
          // Link Facebook to existing account
          await query(
            `UPDATE Users
             SET oauth_provider = 'facebook',
                 oauth_id = ?,
                 oauth_profile = ?,
                 auth_method = 'both'
             WHERE email = ?`,
            [fbUser.id, JSON.stringify(fbUser), fbUser.email]
          );

          user = emailUsers[0];
          const updatedUsers = await query(
            `SELECT id, uuid, email, name, onboarding_completed
             FROM Users WHERE id = ?`,
            [user.id]
          );
          user = updatedUsers[0];

          logger.info(`Facebook account linked to existing user: ${fbUser.email}`);
        }
      }

      if (!user) {
        // Create new user with Facebook
        const uuid = uuidv4();
        const result = await query(
          `INSERT INTO Users (
            uuid, email, name,
            oauth_provider, oauth_id, oauth_profile,
            auth_method, email_verified,
            created_at
          ) VALUES (?, ?, ?, 'facebook', ?, ?, 'oauth', true, NOW())`,
          [
            uuid,
            fbUser.email || `facebook_${fbUser.id}@holidaibutler.com`,
            fbUser.name || 'Facebook User',
            fbUser.id,
            JSON.stringify(fbUser)
          ]
        );

        const userId = result.insertId;
        isNewUser = true;

        // Create user preferences with defaults
        await query(
          `INSERT INTO User_Preferences (user_id, preferred_language, created_at)
           VALUES (?, ?, NOW())`,
          [userId, 'nl']
        );

        user = {
          id: userId,
          uuid,
          email: fbUser.email || `facebook_${fbUser.id}@holidaibutler.com`,
          name: fbUser.name || 'Facebook User',
          onboarding_completed: false
        };

        logger.info(`New Facebook user created: ${user.email}`);
      }
    }

    // Generate JWT tokens
    const { accessToken: jwtAccessToken, refreshToken: jwtRefreshToken } = generateTokens(user);

    // Store refresh token in Sessions
    await query(
      `INSERT INTO Sessions (user_id, refresh_token, expires_at, created_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())`,
      [user.id, jwtRefreshToken]
    );

    // Update last login
    await query(
      'UPDATE Users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          uuid: user.uuid,
          email: user.email,
          name: user.name,
          onboarding_completed: Boolean(user.onboarding_completed),
          isNewUser
        },
        accessToken: jwtAccessToken,
        refreshToken: jwtRefreshToken
      }
    });
  } catch (error) {
    if (error.response?.status === 400 || error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'FB_AUTH_FAILED',
          message: 'Facebook authentication failed. Please try again.'
        }
      });
    }

    logger.error('Facebook OAuth error:', error);
    next(error);
  }
};

/**
 * POST /auth/oauth/apple
 * Handle Apple ID OAuth callback
 *
 * Expected body: { identityToken: string, user?: { name?: { firstName, lastName }, email } }
 * The identityToken is from Apple Sign In on frontend
 */
exports.appleAuth = async (req, res, next) => {
  try {
    const { identityToken, user: appleUserData } = req.body;

    if (!identityToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_IDENTITY_TOKEN',
          message: 'Apple identity token is required'
        }
      });
    }

    // Decode JWT (Apple ID token) to get user info
    // Note: In production, you should verify the token signature with Apple's public keys
    const decoded = jwt.decode(identityToken);

    if (!decoded || !decoded.sub) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_APPLE_TOKEN',
          message: 'Invalid Apple identity token'
        }
      });
    }

    const appleUserId = decoded.sub; // Apple user ID
    const appleEmail = decoded.email || (appleUserData?.email);

    // Build user name from appleUserData if available
    let userName = 'Apple User';
    if (appleUserData?.name) {
      userName = `${appleUserData.name.firstName || ''} ${appleUserData.name.lastName || ''}`.trim() || 'Apple User';
    }

    // Check if user exists with this Apple ID
    const existingUsers = await query(
      `SELECT id, uuid, email, name, onboarding_completed
       FROM Users
       WHERE oauth_provider = 'apple' AND oauth_id = ?`,
      [appleUserId]
    );

    let user;
    let isNewUser = false;

    if (existingUsers.length > 0) {
      // User exists - login
      user = existingUsers[0];
      logger.info(`Apple user logged in: ${user.email}`);
    } else {
      // Check if email already exists (user might have registered with email)
      if (appleEmail) {
        const emailUsers = await query(
          'SELECT id FROM Users WHERE email = ?',
          [appleEmail]
        );

        if (emailUsers.length > 0) {
          // Link Apple ID to existing account
          await query(
            `UPDATE Users
             SET oauth_provider = 'apple',
                 oauth_id = ?,
                 oauth_profile = ?,
                 auth_method = 'both'
             WHERE email = ?`,
            [appleUserId, JSON.stringify({ sub: appleUserId, email: appleEmail }), appleEmail]
          );

          user = emailUsers[0];
          const updatedUsers = await query(
            `SELECT id, uuid, email, name, onboarding_completed
             FROM Users WHERE id = ?`,
            [user.id]
          );
          user = updatedUsers[0];

          logger.info(`Apple ID linked to existing user: ${appleEmail}`);
        }
      }

      if (!user) {
        // Create new user with Apple ID
        const uuid = uuidv4();
        const result = await query(
          `INSERT INTO Users (
            uuid, email, name,
            oauth_provider, oauth_id, oauth_profile,
            auth_method, email_verified,
            created_at
          ) VALUES (?, ?, ?, 'apple', ?, ?, 'oauth', true, NOW())`,
          [
            uuid,
            appleEmail || `apple_${appleUserId}@holidaibutler.com`,
            userName,
            appleUserId,
            JSON.stringify({ sub: appleUserId, email: appleEmail })
          ]
        );

        const userId = result.insertId;
        isNewUser = true;

        // Create user preferences with defaults
        await query(
          `INSERT INTO User_Preferences (user_id, preferred_language, created_at)
           VALUES (?, ?, NOW())`,
          [userId, 'nl']
        );

        user = {
          id: userId,
          uuid,
          email: appleEmail || `apple_${appleUserId}@holidaibutler.com`,
          name: userName,
          onboarding_completed: false
        };

        logger.info(`New Apple user created: ${user.email}`);
      }
    }

    // Generate JWT tokens
    const { accessToken: jwtAccessToken, refreshToken: jwtRefreshToken } = generateTokens(user);

    // Store refresh token in Sessions
    await query(
      `INSERT INTO Sessions (user_id, refresh_token, expires_at, created_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())`,
      [user.id, jwtRefreshToken]
    );

    // Update last login
    await query(
      'UPDATE Users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          uuid: user.uuid,
          email: user.email,
          name: user.name,
          onboarding_completed: Boolean(user.onboarding_completed),
          isNewUser
        },
        accessToken: jwtAccessToken,
        refreshToken: jwtRefreshToken
      }
    });
  } catch (error) {
    logger.error('Apple OAuth error:', error);

    return res.status(401).json({
      success: false,
      error: {
        code: 'APPLE_AUTH_FAILED',
        message: 'Apple authentication failed. Please try again.'
      }
    });
  }
};
