import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003/api/admin';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('adminRefreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken
          });

          const { accessToken } = response.data.data;
          localStorage.setItem('adminToken', accessToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminRefreshToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    return response.data;
  }
};

// POI API
export const poiAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/pois', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/pois/${id}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/pois/stats');
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/pois', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/pois/${id}`, data);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/pois/${id}/status`, { status });
    return response.data;
  },

  verify: async (id, data) => {
    const response = await api.patch(`/pois/${id}/verify`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/pois/${id}`);
    return response.data;
  },

  bulkAction: async (poiIds, action, value) => {
    const response = await api.post('/pois/bulk/action', { poiIds, action, value });
    return response.data;
  }
};

// Upload API
export const uploadAPI = {
  uploadFile: async (file, type = 'pois') => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/upload/${type}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  uploadMultiple: async (files, type = 'pois') => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await api.post(`/upload/${type}/multiple`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  deleteFile: async (type, filename) => {
    const response = await api.delete(`/upload/${type}/${filename}`);
    return response.data;
  },

  listFiles: async (type) => {
    const response = await api.get(`/upload/${type}`);
    return response.data;
  }
};

// Platform API
export const platformAPI = {
  getConfig: async () => {
    const response = await api.get('/platform');
    return response.data;
  },

  updateBranding: async (data) => {
    const response = await api.put('/platform/branding', data);
    return response.data;
  },

  updateContent: async (data) => {
    const response = await api.put('/platform/content', data);
    return response.data;
  },

  updateContact: async (data) => {
    const response = await api.put('/platform/contact', data);
    return response.data;
  },

  updateLegal: async (data) => {
    const response = await api.put('/platform/legal', data);
    return response.data;
  },

  updateSettings: async (data) => {
    const response = await api.put('/platform/settings', data);
    return response.data;
  },

  updateFeatures: async (data) => {
    const response = await api.put('/platform/features', data);
    return response.data;
  }
};

// Users API
export const usersAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/users/stats');
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/users', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/users/${id}/status`, { status });
    return response.data;
  },

  resetPassword: async (id, newPassword) => {
    const response = await api.patch(`/users/${id}/password`, { newPassword });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  getActivity: async (id, params = {}) => {
    const response = await api.get(`/users/${id}/activity`, { params });
    return response.data;
  },

  assignPOIs: async (id, poiIds) => {
    const response = await api.post(`/users/${id}/assign-pois`, { poiIds });
    return response.data;
  }
};

export default api;
