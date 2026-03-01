import axios from 'axios';

/**
 * Agenda API Service
 * Handles all API calls to the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/api/agenda';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add language header
    const language = localStorage.getItem('language') || 'nl';
    config.params = {
      ...config.params,
      lang: language,
    };
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

/**
 * Event API endpoints
 */
export const agendaAPI = {
  /**
   * Get events with filtering
   * @param {Object} filters - Filter parameters
   * @returns {Promise} Events and pagination
   */
  getEvents: async (filters = {}) => {
    try {
      const response = await api.get('/events', { params: filters });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get event by ID
   * @param {String} eventId - Event ID
   * @returns {Promise} Event data
   */
  getEventById: async (eventId) => {
    try {
      const response = await api.get(`/events/${eventId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get event by slug
   * @param {String} slug - Event slug
   * @returns {Promise} Event data
   */
  getEventBySlug: async (slug) => {
    try {
      const response = await api.get(`/events/slug/${slug}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get featured events
   * @param {Number} limit - Max number of events
   * @returns {Promise} Featured events
   */
  getFeaturedEvents: async (limit = 10) => {
    try {
      const response = await api.get('/events/featured', { params: { limit } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get event statistics
   * @returns {Promise} Statistics
   */
  getStatistics: async () => {
    try {
      const response = await api.get('/stats');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default agendaAPI;
