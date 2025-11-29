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

// Events API
export const eventsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/events', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/events/${id}`);
    return response.data;
  },

  getStats: async (params = {}) => {
    const response = await api.get('/events/stats', { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/events', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/events/${id}`, data);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/events/${id}/status`, { status });
    return response.data;
  },

  publish: async (id) => {
    const response = await api.post(`/events/${id}/publish`);
    return response.data;
  },

  duplicate: async (id) => {
    const response = await api.post(`/events/${id}/duplicate`);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/events/${id}`);
    return response.data;
  },

  bulkDelete: async (eventIds) => {
    const response = await api.post('/events/bulk-delete', { eventIds });
    return response.data;
  },

  bulkUpdateStatus: async (eventIds, status) => {
    const response = await api.post('/events/bulk-update-status', { eventIds, status });
    return response.data;
  }
};

// Reservations API
export const reservationsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/reservations', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/reservations/${id}`);
    return response.data;
  },

  getStats: async (params = {}) => {
    const response = await api.get('/reservations/stats', { params });
    return response.data;
  },

  getToday: async (params = {}) => {
    const response = await api.get('/reservations/today', { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/reservations', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/reservations/${id}`, data);
    return response.data;
  },

  confirm: async (id) => {
    const response = await api.post(`/reservations/${id}/confirm`);
    return response.data;
  },

  seat: async (id, tableInfo) => {
    const response = await api.post(`/reservations/${id}/seat`, { tableInfo });
    return response.data;
  },

  complete: async (id, revenueData) => {
    const response = await api.post(`/reservations/${id}/complete`, { revenueData });
    return response.data;
  },

  cancel: async (id, reason, cancelledBy) => {
    const response = await api.post(`/reservations/${id}/cancel`, { reason, cancelledBy });
    return response.data;
  },

  noShow: async (id, notes) => {
    const response = await api.post(`/reservations/${id}/no-show`, { notes });
    return response.data;
  },

  addNote: async (id, note) => {
    const response = await api.post(`/reservations/${id}/notes`, { note });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/reservations/${id}`);
    return response.data;
  }
};

// Tickets API
export const ticketsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/tickets', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
  },

  getStats: async (params = {}) => {
    const response = await api.get('/tickets/stats', { params });
    return response.data;
  },

  validate: async (ticketNumber) => {
    const response = await api.get(`/tickets/validate/${ticketNumber}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/tickets', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/tickets/${id}`, data);
    return response.data;
  },

  use: async (id, scanInfo) => {
    const response = await api.post(`/tickets/${id}/use`, { scanInfo });
    return response.data;
  },

  cancel: async (id, reason, cancelledBy, refund) => {
    const response = await api.post(`/tickets/${id}/cancel`, { reason, cancelledBy, refund });
    return response.data;
  },

  transfer: async (id, newHolder, reason) => {
    const response = await api.post(`/tickets/${id}/transfer`, { newHolder, reason });
    return response.data;
  },

  resend: async (id, method) => {
    const response = await api.post(`/tickets/${id}/resend`, { method });
    return response.data;
  },

  addNote: async (id, note) => {
    const response = await api.post(`/tickets/${id}/notes`, { note });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/tickets/${id}`);
    return response.data;
  },

  bulkCancel: async (ticketIds, reason) => {
    const response = await api.post('/tickets/bulk-cancel', { ticketIds, reason });
    return response.data;
  }
};

// Bookings API
export const bookingsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/bookings', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },

  getStats: async (params = {}) => {
    const response = await api.get('/bookings/stats', { params });
    return response.data;
  },

  getToday: async (params = {}) => {
    const response = await api.get('/bookings/today', { params });
    return response.data;
  },

  getByCustomer: async (customerId) => {
    const response = await api.get(`/bookings/customer/${customerId}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/bookings', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/bookings/${id}`, data);
    return response.data;
  },

  confirm: async (id, transactionId) => {
    const response = await api.post(`/bookings/${id}/confirm`, { transactionId });
    return response.data;
  },

  complete: async (id) => {
    const response = await api.post(`/bookings/${id}/complete`);
    return response.data;
  },

  cancel: async (id, reason, cancelledBy, refundAmount) => {
    const response = await api.post(`/bookings/${id}/cancel`, { reason, cancelledBy, refundAmount });
    return response.data;
  },

  addNote: async (id, note) => {
    const response = await api.post(`/bookings/${id}/notes`, { note });
    return response.data;
  },

  resendConfirmation: async (id) => {
    const response = await api.post(`/bookings/${id}/resend-confirmation`);
    return response.data;
  },

  bulkUpdateStatus: async (bookingIds, status) => {
    const response = await api.post('/bookings/bulk-update-status', { bookingIds, status });
    return response.data;
  }
};

// Transactions API
export const transactionsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/transactions', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/transactions/${id}`);
    return response.data;
  },

  getStats: async (params = {}) => {
    const response = await api.get('/transactions/stats', { params });
    return response.data;
  },

  getToday: async (params = {}) => {
    const response = await api.get('/transactions/today', { params });
    return response.data;
  },

  getPendingReviews: async () => {
    const response = await api.get('/transactions/pending-reviews');
    return response.data;
  },

  getUnreconciled: async (params = {}) => {
    const response = await api.get('/transactions/unreconciled', { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/transactions', data);
    return response.data;
  },

  refund: async (id, amount, reason, refundMethod) => {
    const response = await api.post(`/transactions/${id}/refund`, { amount, reason, refundMethod });
    return response.data;
  },

  initiateDispute: async (id, reason, evidence) => {
    const response = await api.post(`/transactions/${id}/dispute`, { reason, evidence });
    return response.data;
  },

  resolveDispute: async (id, resolution, won) => {
    const response = await api.post(`/transactions/${id}/dispute/resolve`, { resolution, won });
    return response.data;
  },

  flagForReview: async (id, reason) => {
    const response = await api.post(`/transactions/${id}/flag-review`, { reason });
    return response.data;
  },

  approveReview: async (id, notes) => {
    const response = await api.post(`/transactions/${id}/approve-review`, { notes });
    return response.data;
  },

  reconcile: async (id, batchId, settlementDate) => {
    const response = await api.post(`/transactions/${id}/reconcile`, { batchId, settlementDate });
    return response.data;
  },

  addNote: async (id, note, isInternal) => {
    const response = await api.post(`/transactions/${id}/notes`, { note, isInternal });
    return response.data;
  },

  bulkReconcile: async (transactionIds, batchId, settlementDate) => {
    const response = await api.post('/transactions/bulk-reconcile', { transactionIds, batchId, settlementDate });
    return response.data;
  },

  export: async (params = {}) => {
    const response = await api.get('/transactions/export', { params });
    return response.data;
  }
};

export default api;
