import axios from 'axios';

// Helper to detect and construct Codespaces URL
const getCodespacesUrl = (port: number): string | null => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Check if running in GitHub Codespaces
    if (hostname.includes('.app.github.dev')) {
      // Extract the codespace name (everything before the port in the hostname)
      // Format: <codespace-name>-<port>.app.github.dev
      const match = hostname.match(/^(.+)-\d+\.app\.github\.dev$/);
      if (match) {
        return `https://${match[1]}-${port}.app.github.dev`;
      }
    }
  }
  return null;
};

// API base URL from environment variables
// Uses Platform Core API Gateway
// In Codespaces, automatically construct the correct forwarded URL
const getApiBaseUrl = (): string => {
  // First check environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Check for Codespaces environment
  const codespacesUrl = getCodespacesUrl(3001);
  if (codespacesUrl) {
    return `${codespacesUrl}/api/v1`;
  }

  // Production fallback - use relative URL (Apache reverse proxy handles routing)
  // Support multiple destination domains (holidaibutler.com, texelmaps.nl, etc.)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('holidaibutler.com') || hostname.includes('texelmaps.nl')) {
      return '/api/v1';
    }
  }

  // Default to localhost for local development only
  return 'http://localhost:3001/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

// Get destination ID from build-time environment variable
const getDestinationId = (): string => {
  return import.meta.env.VITE_DESTINATION_ID || 'calpe';
};

// Create axios instance with destination header
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-Destination-ID': getDestinationId(),
  },
});

// Request interceptor: Add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage (will be replaced with Zustand store)
    const token = localStorage.getItem('accessToken');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as any;

    // If 401 and haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          // No refresh token, redirect to login
          window.location.href = '/login';
          return Promise.reject(error);
        }

        // Try to refresh the token
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        // Store new tokens
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
