/**
 * JWT Configuration
 * Enterprise-level JWT token management
 */

const jwt = require('jsonwebtoken');

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';

// Token Expiry Times
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';  // 15 minutes
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';  // 7 days

/**
 * Generate Access Token
 * @param {Object} payload - User data to encode
 * @returns {String} JWT access token
 */
function generateAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'holidaibutler-api',
    audience: 'holidaibutler-client'
  });
}

/**
 * Generate Refresh Token
 * @param {Object} payload - User data to encode
 * @returns {String} JWT refresh token
 */
function generateRefreshToken(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: 'holidaibutler-api',
    audience: 'holidaibutler-client'
  });
}

/**
 * Verify Access Token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded payload
 * @throws {Error} If token is invalid or expired
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'holidaibutler-api',
      audience: 'holidaibutler-client'
    });
  } catch (error) {
    throw new Error(`Invalid access token: ${error.message}`);
  }
}

/**
 * Verify Refresh Token
 * @param {String} token - JWT refresh token to verify
 * @returns {Object} Decoded payload
 * @throws {Error} If token is invalid or expired
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'holidaibutler-api',
      audience: 'holidaibutler-client'
    });
  } catch (error) {
    throw new Error(`Invalid refresh token: ${error.message}`);
  }
}

/**
 * Decode Token Without Verification
 * Useful for inspecting expired tokens
 * @param {String} token - JWT token
 * @returns {Object} Decoded payload
 */
function decodeToken(token) {
  return jwt.decode(token);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  JWT_SECRET,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY
};
