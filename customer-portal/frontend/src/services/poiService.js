/**
 * POI Service
 * API calls for Points of Interest
 */

import api from './api';

const POI_ENDPOINT = '/pois';

/**
 * Get all POIs with optional filters
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 20)
 * @param {string} params.category - Filter by category
 * @param {string} params.city - Filter by city
 * @param {string} params.search - Search term
 * @param {string} params.status - Filter by status (default: 'active')
 * @returns {Promise<Object>} POIs with pagination
 */
export const getPOIs = async (params = {}) => {
  const response = await api.get(POI_ENDPOINT, { params });
  return response.data;
};

/**
 * Get single POI by ID or slug
 * @param {string} idOrSlug - POI ID or slug
 * @returns {Promise<Object>} POI data
 */
export const getPOI = async (idOrSlug) => {
  const response = await api.get(`${POI_ENDPOINT}/${idOrSlug}`);
  return response.data;
};

/**
 * Get POIs by category
 * @param {string} category - Category name
 * @param {Object} params - Additional query parameters
 * @returns {Promise<Object>} POIs with pagination
 */
export const getPOIsByCategory = async (category, params = {}) => {
  return getPOIs({ ...params, category });
};

/**
 * Get POIs by city
 * @param {string} city - City name
 * @param {Object} params - Additional query parameters
 * @returns {Promise<Object>} POIs with pagination
 */
export const getPOIsByCity = async (city, params = {}) => {
  return getPOIs({ ...params, city });
};

/**
 * Search POIs
 * @param {string} query - Search query
 * @param {Object} params - Additional query parameters
 * @returns {Promise<Object>} Search results
 */
export const searchPOIs = async (query, params = {}) => {
  return getPOIs({ ...params, search: query });
};

/**
 * Get featured/premium POIs
 * @param {number} limit - Number of POIs to return
 * @returns {Promise<Object>} Featured POIs
 */
export const getFeaturedPOIs = async (limit = 6) => {
  const response = await api.get(`${POI_ENDPOINT}/featured`, {
    params: { limit },
  });
  return response.data;
};

/**
 * Get nearby POIs based on coordinates
 * @param {number} latitude - User latitude
 * @param {number} longitude - User longitude
 * @param {number} radius - Search radius in km (default: 10)
 * @returns {Promise<Object>} Nearby POIs
 */
export const getNearbyPOIs = async (latitude, longitude, radius = 10) => {
  const response = await api.get(`${POI_ENDPOINT}/nearby`, {
    params: { latitude, longitude, radius },
  });
  return response.data;
};

/**
 * Get POI categories
 * @returns {Promise<Object>} List of categories
 */
export const getCategories = async () => {
  const response = await api.get(`${POI_ENDPOINT}/categories`);
  return response.data;
};

/**
 * Get POI reviews
 * @param {string} poiId - POI ID
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Reviews with pagination
 */
export const getPOIReviews = async (poiId, params = {}) => {
  const response = await api.get(`${POI_ENDPOINT}/${poiId}/reviews`, { params });
  return response.data;
};

/**
 * Submit a review for a POI
 * @param {string} poiId - POI ID
 * @param {Object} reviewData - Review data
 * @returns {Promise<Object>} Created review
 */
export const submitReview = async (poiId, reviewData) => {
  const response = await api.post(`${POI_ENDPOINT}/${poiId}/reviews`, reviewData);
  return response.data;
};

export default {
  getPOIs,
  getPOI,
  getPOIsByCategory,
  getPOIsByCity,
  searchPOIs,
  getFeaturedPOIs,
  getNearbyPOIs,
  getCategories,
  getPOIReviews,
  submitReview,
};
