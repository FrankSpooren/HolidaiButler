import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const client = axios.create({
  baseURL: `${API_BASE}/api/v1/admin-portal`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor: attach JWT
client.interceptors.request.use((config) => {
  const stored = localStorage.getItem('hb-admin-auth');
  if (stored) {
    try {
      const { accessToken } = JSON.parse(stored);
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    } catch { /* ignore parse errors */ }
  }
  return config;
});

// Response interceptor: handle 401 with token refresh
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return client(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const stored = localStorage.getItem('hb-admin-auth');
        const { refreshToken } = JSON.parse(stored || '{}');

        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(
          `${API_BASE}/api/v1/admin-portal/auth/refresh`,
          { refreshToken }
        );

        const newToken = data.data.accessToken;
        const authData = JSON.parse(localStorage.getItem('hb-admin-auth') || '{}');
        authData.accessToken = newToken;
        localStorage.setItem('hb-admin-auth', JSON.stringify(authData));

        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('hb-admin-auth');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default client;
