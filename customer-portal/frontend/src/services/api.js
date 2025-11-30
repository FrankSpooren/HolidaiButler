/**
 * API Service Configuration
 * Centralized Axios client for all API requests
 * Aligned with platform-core API Gateway
 */

import axios from 'axios';

// ============================================================================
// API Configuration
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const TICKETING_API_URL = import.meta.env.VITE_TICKETING_API || 'http://localhost:3004';
const PAYMENT_API_URL = import.meta.env.VITE_PAYMENT_API || 'http://localhost:3005';

// Token storage key
const TOKEN_KEY = 'holidaibutler_token';
const REFRESH_TOKEN_KEY = 'holidaibutler_refresh_token';

// ============================================================================
// Axios Instance - Main API
// ============================================================================

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// Axios Instance - Ticketing API
// ============================================================================

const ticketingApi = axios.create({
  baseURL: `${TICKETING_API_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// Axios Instance - Payment API
// ============================================================================

const paymentApi = axios.create({
  baseURL: `${PAYMENT_API_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// Token Management
// ============================================================================

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const setTokens = (accessToken, refreshToken = null) => {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
};

export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// ============================================================================
// Request Interceptor - Add Auth Token
// ============================================================================

const addAuthInterceptor = (instance) => {
  instance.interceptors.request.use(
    (config) => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
};

// Add interceptors to all instances
addAuthInterceptor(api);
addAuthInterceptor(ticketingApi);
addAuthInterceptor(paymentApi);

// ============================================================================
// Response Interceptor - Handle Errors & Token Refresh
// ============================================================================

const addResponseInterceptor = (instance) => {
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Handle 401 Unauthorized - Token expired
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
              refreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data;
            setTokens(accessToken, newRefreshToken);

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return instance(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed - clear tokens and redirect to login
          clearTokens();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
};

// Add response interceptors
addResponseInterceptor(api);
addResponseInterceptor(ticketingApi);
addResponseInterceptor(paymentApi);

// ============================================================================
// Export API Instances
// ============================================================================

export { api, ticketingApi, paymentApi };
export default api;
