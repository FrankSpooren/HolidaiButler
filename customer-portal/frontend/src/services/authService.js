/**
 * Auth Service
 * API calls for authentication and user management
 */

import api, { setTokens, clearTokens, getToken } from './api';

const AUTH_ENDPOINT = '/auth';

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User data and tokens
 */
export const login = async (email, password) => {
  const response = await api.post(`${AUTH_ENDPOINT}/login`, {
    email,
    password,
  });

  const { user, accessToken, refreshToken } = response.data;
  setTokens(accessToken, refreshToken);

  return { user, accessToken };
};

/**
 * Register new user
 * @param {Object} userData - User registration data
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password
 * @param {string} userData.name - User name
 * @returns {Promise<Object>} Created user data
 */
export const register = async (userData) => {
  const response = await api.post(`${AUTH_ENDPOINT}/register`, userData);

  const { user, accessToken, refreshToken } = response.data;
  setTokens(accessToken, refreshToken);

  return { user, accessToken };
};

/**
 * Logout user
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    await api.post(`${AUTH_ENDPOINT}/logout`);
  } catch (error) {
    // Continue with local logout even if API fails
    console.error('Logout API error:', error);
  } finally {
    clearTokens();
  }
};

/**
 * Get current user profile
 * @returns {Promise<Object>} User profile data
 */
export const getProfile = async () => {
  const response = await api.get(`${AUTH_ENDPOINT}/me`);
  return response.data;
};

/**
 * Update user profile
 * @param {Object} profileData - Profile update data
 * @returns {Promise<Object>} Updated user data
 */
export const updateProfile = async (profileData) => {
  const response = await api.put(`${AUTH_ENDPOINT}/profile`, profileData);
  return response.data;
};

/**
 * Change password
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Success response
 */
export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.put(`${AUTH_ENDPOINT}/password`, {
    currentPassword,
    newPassword,
  });
  return response.data;
};

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Promise<Object>} Success response
 */
export const requestPasswordReset = async (email) => {
  const response = await api.post(`${AUTH_ENDPOINT}/forgot-password`, { email });
  return response.data;
};

/**
 * Reset password with token
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Success response
 */
export const resetPassword = async (token, newPassword) => {
  const response = await api.post(`${AUTH_ENDPOINT}/reset-password`, {
    token,
    newPassword,
  });
  return response.data;
};

/**
 * Verify email with token
 * @param {string} token - Verification token
 * @returns {Promise<Object>} Success response
 */
export const verifyEmail = async (token) => {
  const response = await api.post(`${AUTH_ENDPOINT}/verify-email`, { token });
  return response.data;
};

/**
 * Resend verification email
 * @returns {Promise<Object>} Success response
 */
export const resendVerificationEmail = async () => {
  const response = await api.post(`${AUTH_ENDPOINT}/resend-verification`);
  return response.data;
};

/**
 * Update onboarding status
 * @param {number} step - Current onboarding step
 * @param {boolean} completed - Whether onboarding is completed
 * @returns {Promise<Object>} Updated user data
 */
export const updateOnboarding = async (step, completed = false) => {
  const response = await api.put(`${AUTH_ENDPOINT}/onboarding`, {
    step,
    completed,
  });
  return response.data;
};

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return !!getToken();
};

/**
 * Google OAuth login
 * @param {string} credential - Google OAuth credential
 * @returns {Promise<Object>} User data and tokens
 */
export const googleLogin = async (credential) => {
  const response = await api.post(`${AUTH_ENDPOINT}/google`, { credential });

  const { user, accessToken, refreshToken } = response.data;
  setTokens(accessToken, refreshToken);

  return { user, accessToken };
};

/**
 * Facebook OAuth login
 * @param {string} accessToken - Facebook access token
 * @returns {Promise<Object>} User data and tokens
 */
export const facebookLogin = async (accessToken) => {
  const response = await api.post(`${AUTH_ENDPOINT}/facebook`, { accessToken });

  const { user, accessToken: token, refreshToken } = response.data;
  setTokens(token, refreshToken);

  return { user, accessToken: token };
};

export default {
  login,
  register,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  updateOnboarding,
  isAuthenticated,
  googleLogin,
  facebookLogin,
};
