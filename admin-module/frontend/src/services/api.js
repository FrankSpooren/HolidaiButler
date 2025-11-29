import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003/api/admin';
const RESERVATIONS_API_URL = import.meta.env.VITE_RESERVATIONS_API_URL || 'http://localhost:5003/api';

// Create axios instance for admin API
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Create axios instance for reservations API (separate microservice)
const reservationsApi = axios.create({
  baseURL: RESERVATIONS_API_URL,
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

// Request interceptor for reservations API - add token
reservationsApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for reservations API
reservationsApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Redirect to login on auth failure
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminRefreshToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/login';
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

// ============================================
// RESERVATIONS MODULE APIs (Port 3006)
// ============================================

// Restaurant API
export const restaurantAPI = {
  getAll: async (params = {}) => {
    const response = await reservationsApi.get('/restaurants', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await reservationsApi.get(`/restaurants/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await reservationsApi.post('/restaurants', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await reservationsApi.put(`/restaurants/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await reservationsApi.delete(`/restaurants/${id}`);
    return response.data;
  },

  updateOperatingHours: async (id, data) => {
    const response = await reservationsApi.put(`/restaurants/${id}/operating-hours`, data);
    return response.data;
  },

  getStats: async (id) => {
    const response = await reservationsApi.get(`/restaurants/${id}/stats`);
    return response.data;
  }
};

// Table Management API
export const tableAPI = {
  getAll: async (restaurantId, params = {}) => {
    const response = await reservationsApi.get(`/restaurants/${restaurantId}/tables`, { params });
    return response.data;
  },

  getById: async (restaurantId, tableId) => {
    const response = await reservationsApi.get(`/restaurants/${restaurantId}/tables/${tableId}`);
    return response.data;
  },

  create: async (restaurantId, data) => {
    const response = await reservationsApi.post(`/restaurants/${restaurantId}/tables`, data);
    return response.data;
  },

  update: async (restaurantId, tableId, data) => {
    const response = await reservationsApi.put(`/restaurants/${restaurantId}/tables/${tableId}`, data);
    return response.data;
  },

  delete: async (restaurantId, tableId) => {
    const response = await reservationsApi.delete(`/restaurants/${restaurantId}/tables/${tableId}`);
    return response.data;
  },

  updateStatus: async (restaurantId, tableId, status) => {
    const response = await reservationsApi.patch(`/restaurants/${restaurantId}/tables/${tableId}/status`, { status });
    return response.data;
  },

  bulkUpdate: async (restaurantId, tables) => {
    const response = await reservationsApi.put(`/restaurants/${restaurantId}/tables/bulk`, { tables });
    return response.data;
  }
};

// Reservation API
export const reservationAPI = {
  getAll: async (params = {}) => {
    const response = await reservationsApi.get('/reservations', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await reservationsApi.get(`/reservations/${id}`);
    return response.data;
  },

  getByReference: async (reference) => {
    const response = await reservationsApi.get(`/reservations/reference/${reference}`);
    return response.data;
  },

  create: async (data) => {
    const response = await reservationsApi.post('/reservations', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await reservationsApi.put(`/reservations/${id}`, data);
    return response.data;
  },

  updateStatus: async (id, status, reason = null) => {
    const response = await reservationsApi.patch(`/reservations/${id}/status`, { status, reason });
    return response.data;
  },

  confirm: async (id) => {
    const response = await reservationsApi.post(`/reservations/${id}/confirm`);
    return response.data;
  },

  cancel: async (id, reason) => {
    const response = await reservationsApi.post(`/reservations/${id}/cancel`, { reason });
    return response.data;
  },

  noShow: async (id) => {
    const response = await reservationsApi.post(`/reservations/${id}/no-show`);
    return response.data;
  },

  seat: async (id, tableId) => {
    const response = await reservationsApi.post(`/reservations/${id}/seat`, { table_id: tableId });
    return response.data;
  },

  complete: async (id) => {
    const response = await reservationsApi.post(`/reservations/${id}/complete`);
    return response.data;
  },

  assignTable: async (id, tableId) => {
    const response = await reservationsApi.patch(`/reservations/${id}/table`, { table_id: tableId });
    return response.data;
  },

  getByRestaurant: async (restaurantId, params = {}) => {
    const response = await reservationsApi.get(`/restaurants/${restaurantId}/reservations`, { params });
    return response.data;
  },

  getTodayStats: async (restaurantId) => {
    const response = await reservationsApi.get(`/restaurants/${restaurantId}/reservations/today-stats`);
    return response.data;
  }
};

// Guest CRM API
export const guestAPI = {
  getAll: async (params = {}) => {
    const response = await reservationsApi.get('/guests', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await reservationsApi.get(`/guests/${id}`);
    return response.data;
  },

  search: async (query) => {
    const response = await reservationsApi.get('/guests/search', { params: { q: query } });
    return response.data;
  },

  create: async (data) => {
    const response = await reservationsApi.post('/guests', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await reservationsApi.put(`/guests/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await reservationsApi.delete(`/guests/${id}`);
    return response.data;
  },

  getHistory: async (id) => {
    const response = await reservationsApi.get(`/guests/${id}/history`);
    return response.data;
  },

  addNote: async (id, note) => {
    const response = await reservationsApi.post(`/guests/${id}/notes`, { note });
    return response.data;
  },

  updatePreferences: async (id, preferences) => {
    const response = await reservationsApi.put(`/guests/${id}/preferences`, preferences);
    return response.data;
  },

  updateTags: async (id, tags) => {
    const response = await reservationsApi.put(`/guests/${id}/tags`, { tags });
    return response.data;
  },

  getStats: async (id) => {
    const response = await reservationsApi.get(`/guests/${id}/stats`);
    return response.data;
  }
};

// Waitlist API
export const waitlistAPI = {
  getAll: async (restaurantId, params = {}) => {
    const response = await reservationsApi.get(`/restaurants/${restaurantId}/waitlist`, { params });
    return response.data;
  },

  getPosition: async (restaurantId, id) => {
    const response = await reservationsApi.get(`/restaurants/${restaurantId}/waitlist/${id}/position`);
    return response.data;
  },

  add: async (restaurantId, data) => {
    const response = await reservationsApi.post(`/restaurants/${restaurantId}/waitlist`, data);
    return response.data;
  },

  update: async (restaurantId, id, data) => {
    const response = await reservationsApi.put(`/restaurants/${restaurantId}/waitlist/${id}`, data);
    return response.data;
  },

  remove: async (restaurantId, id) => {
    const response = await reservationsApi.delete(`/restaurants/${restaurantId}/waitlist/${id}`);
    return response.data;
  },

  notify: async (restaurantId, id) => {
    const response = await reservationsApi.post(`/restaurants/${restaurantId}/waitlist/${id}/notify`);
    return response.data;
  },

  convertToReservation: async (restaurantId, id, reservationData) => {
    const response = await reservationsApi.post(`/restaurants/${restaurantId}/waitlist/${id}/convert`, reservationData);
    return response.data;
  },

  updatePriority: async (restaurantId, id, priority) => {
    const response = await reservationsApi.patch(`/restaurants/${restaurantId}/waitlist/${id}/priority`, { priority });
    return response.data;
  }
};

// Availability API
export const availabilityAPI = {
  getSlots: async (restaurantId, date, partySize) => {
    const response = await reservationsApi.get(`/availability/${restaurantId}/slots`, {
      params: { date, party_size: partySize }
    });
    return response.data;
  },

  getCalendar: async (restaurantId, startDate, endDate) => {
    const response = await reservationsApi.get(`/availability/${restaurantId}/calendar`, {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },

  blockSlot: async (restaurantId, date, timeSlot, reason) => {
    const response = await reservationsApi.post(`/availability/${restaurantId}/block`, {
      date, time_slot: timeSlot, reason
    });
    return response.data;
  },

  unblockSlot: async (restaurantId, date, timeSlot) => {
    const response = await reservationsApi.delete(`/availability/${restaurantId}/block`, {
      params: { date, time_slot: timeSlot }
    });
    return response.data;
  },

  updateCapacity: async (restaurantId, date, timeSlot, capacity) => {
    const response = await reservationsApi.patch(`/availability/${restaurantId}/capacity`, {
      date, time_slot: timeSlot, total_capacity: capacity
    });
    return response.data;
  }
};

// Floor Plan API
export const floorPlanAPI = {
  getAll: async (restaurantId) => {
    const response = await reservationsApi.get(`/restaurants/${restaurantId}/floor-plans`);
    return response.data;
  },

  getById: async (restaurantId, id) => {
    const response = await reservationsApi.get(`/restaurants/${restaurantId}/floor-plans/${id}`);
    return response.data;
  },

  getActive: async (restaurantId) => {
    const response = await reservationsApi.get(`/restaurants/${restaurantId}/floor-plans/active`);
    return response.data;
  },

  create: async (restaurantId, data) => {
    const response = await reservationsApi.post(`/restaurants/${restaurantId}/floor-plans`, data);
    return response.data;
  },

  update: async (restaurantId, id, data) => {
    const response = await reservationsApi.put(`/restaurants/${restaurantId}/floor-plans/${id}`, data);
    return response.data;
  },

  delete: async (restaurantId, id) => {
    const response = await reservationsApi.delete(`/restaurants/${restaurantId}/floor-plans/${id}`);
    return response.data;
  },

  setActive: async (restaurantId, id) => {
    const response = await reservationsApi.post(`/restaurants/${restaurantId}/floor-plans/${id}/activate`);
    return response.data;
  },

  updateLayout: async (restaurantId, id, layout) => {
    const response = await reservationsApi.put(`/restaurants/${restaurantId}/floor-plans/${id}/layout`, { layout });
    return response.data;
  }
};

// Reservations Monitoring API
export const reservationsMonitoringAPI = {
  getHealth: async () => {
    const response = await reservationsApi.get('/monitoring/health');
    return response.data;
  },

  getStats: async () => {
    const response = await reservationsApi.get('/monitoring/stats');
    return response.data;
  },

  getDashboard: async () => {
    const response = await reservationsApi.get('/monitoring/dashboard');
    return response.data;
  }
};

// ============================================
// ADDITIONAL MODULE APIs (Stubs for compatibility)
// ============================================

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
  create: async (data) => {
    const response = await api.post('/users', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/users/stats');
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
  create: async (data) => {
    const response = await api.post('/bookings', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/bookings/${id}`, data);
    return response.data;
  },
  cancel: async (id, reason) => {
    const response = await api.post(`/bookings/${id}/cancel`, { reason });
    return response.data;
  },
  confirm: async (id) => {
    const response = await api.post(`/bookings/${id}/confirm`);
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/bookings/stats');
    return response.data;
  }
};

// Events API (Ticketing module)
const ticketingApi = axios.create({
  baseURL: import.meta.env.VITE_TICKETING_API_URL || 'http://localhost:5004/api/v1/tickets',
  headers: { 'Content-Type': 'application/json' }
});

export const eventsAPI = {
  getAll: async (params = {}) => {
    const response = await ticketingApi.get('/events', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await ticketingApi.get(`/events/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await ticketingApi.post('/events', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await ticketingApi.put(`/events/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await ticketingApi.delete(`/events/${id}`);
    return response.data;
  },
  getStats: async () => {
    const response = await ticketingApi.get('/events/stats');
    return response.data;
  }
};

// Tickets API
export const ticketsAPI = {
  getAll: async (params = {}) => {
    const response = await ticketingApi.get('/', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await ticketingApi.get(`/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await ticketingApi.post('/', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await ticketingApi.put(`/${id}`, data);
    return response.data;
  },
  cancel: async (id) => {
    const response = await ticketingApi.post(`/${id}/cancel`);
    return response.data;
  },
  validate: async (code) => {
    const response = await ticketingApi.post('/validate', { code });
    return response.data;
  }
};

// POIs API (alias for poiAPI)
export const poisAPI = poiAPI;

// Transactions API (Payment module)
const paymentApi = axios.create({
  baseURL: import.meta.env.VITE_PAYMENT_API_URL || 'http://localhost:5002/api/v1/payments',
  headers: { 'Content-Type': 'application/json' }
});

export const transactionsAPI = {
  getAll: async (params = {}) => {
    const response = await paymentApi.get('/transactions', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await paymentApi.get(`/transactions/${id}`);
    return response.data;
  },
  refund: async (id, amount) => {
    const response = await paymentApi.post(`/transactions/${id}/refund`, { amount });
    return response.data;
  },
  getStats: async () => {
    const response = await paymentApi.get('/transactions/stats');
    return response.data;
  }
};

// Reservations API (alias for reservationAPI)
export const reservationsAPI = reservationAPI;

// Agenda API (Agenda module)
const agendaApi = axios.create({
  baseURL: import.meta.env.VITE_AGENDA_API_URL || 'http://localhost:5005/api',
  headers: { 'Content-Type': 'application/json' }
});

// Add auth interceptor for agenda API
agendaApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const agendaAPI = {
  getAll: async (params = {}) => {
    const response = await agendaApi.get('/agenda', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await agendaApi.get(`/agenda/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await agendaApi.post('/agenda', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await agendaApi.put(`/agenda/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await agendaApi.delete(`/agenda/${id}`);
    return response.data;
  },
  getByDateRange: async (startDate, endDate) => {
    const response = await agendaApi.get('/agenda/range', {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },
  getUpcoming: async (limit = 10) => {
    const response = await agendaApi.get('/agenda/upcoming', { params: { limit } });
    return response.data;
  },
  getStats: async () => {
    const response = await agendaApi.get('/agenda/stats');
    return response.data;
  }
};

export { reservationsApi, agendaApi };
export default api;
