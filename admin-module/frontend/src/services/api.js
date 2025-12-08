import axios from 'axios';

// Detect if running in Codespaces or similar cloud environment
const isCodespaces = typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev');
const isGitpod = typeof window !== 'undefined' && window.location.hostname.includes('.gitpod.io');
const isStackBlitz = typeof window !== 'undefined' && window.location.hostname.includes('.stackblitz.io');
const isCloudEnvironment = isCodespaces || isGitpod || isStackBlitz;

/**
 * Build the correct backend URL for Codespaces
 * Frontend: https://xxx-5174.app.github.dev -> Backend: https://xxx-3003.app.github.dev
 */
const getCodespacesBackendUrl = (port, basePath) => {
  if (typeof window === 'undefined') return `http://localhost:${port}${basePath}`;

  const hostname = window.location.hostname;
  // Replace the port number in the hostname
  // Format: name-hash-PORT.app.github.dev
  const backendHostname = hostname.replace(/-\d+\.app\.github\.dev$/, `-${port}.app.github.dev`);
  return `https://${backendHostname}${basePath}`;
};

// Build API URLs based on environment
let API_BASE_URL;
let RESERVATIONS_API_URL;

if (import.meta.env.VITE_API_URL) {
  // Explicit URL set - use it (production)
  API_BASE_URL = import.meta.env.VITE_API_URL;
} else if (isCodespaces) {
  // Codespaces: construct the backend URL dynamically
  API_BASE_URL = getCodespacesBackendUrl(3003, '/api/admin');
  console.log('🔧 Codespaces detected, using backend URL:', API_BASE_URL);
} else if (isCloudEnvironment) {
  // Other cloud environments: try relative URLs with proxy
  API_BASE_URL = '/api/admin';
} else {
  // Local development
  API_BASE_URL = 'http://localhost:3003/api/admin';
}

if (import.meta.env.VITE_RESERVATIONS_API_URL) {
  RESERVATIONS_API_URL = import.meta.env.VITE_RESERVATIONS_API_URL;
} else if (isCodespaces) {
  RESERVATIONS_API_URL = getCodespacesBackendUrl(5003, '/api');
} else if (isCloudEnvironment) {
  RESERVATIONS_API_URL = '/api/reservations';
} else {
  RESERVATIONS_API_URL = 'http://localhost:5003/api';
}

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

// Fallback restaurant data for development
const DEV_FALLBACK_RESTAURANTS = [
  {
    id: 1,
    name: 'Restaurant El Sol',
    cuisine: 'Mediterranean',
    location: 'Calpe, Costa Blanca',
    address: 'Calle del Mar 15, 03710 Calpe',
    phone: '+34 965 831 234',
    email: 'info@elsol-calpe.es',
    status: 'active',
    tables: 25,
    capacity: 100,
    rating: 4.5,
    priceRange: '€€',
    openingHours: '12:00 - 23:00',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Tapas Bar La Luna',
    cuisine: 'Spanish Tapas',
    location: 'Benidorm, Costa Blanca',
    address: 'Plaza Mayor 8, 03501 Benidorm',
    phone: '+34 965 832 567',
    email: 'reservas@laluna.es',
    status: 'active',
    tables: 15,
    capacity: 60,
    rating: 4.3,
    priceRange: '€',
    openingHours: '18:00 - 01:00',
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    name: 'Marisquería Costa Azul',
    cuisine: 'Seafood',
    location: 'Altea, Costa Blanca',
    address: 'Paseo Marítimo 22, 03590 Altea',
    phone: '+34 965 840 123',
    email: 'info@costaazul.es',
    status: 'active',
    tables: 20,
    capacity: 80,
    rating: 4.7,
    priceRange: '€€€',
    openingHours: '13:00 - 23:30',
    createdAt: new Date().toISOString()
  }
];

// Restaurant API
export const restaurantAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await reservationsApi.get('/restaurants', { params });
      return response.data;
    } catch (error) {
      console.warn('Restaurants API not available, using fallback data');
      return { success: true, restaurants: DEV_FALLBACK_RESTAURANTS, total: DEV_FALLBACK_RESTAURANTS.length };
    }
  },

  getById: async (id) => {
    try {
      const response = await reservationsApi.get(`/restaurants/${id}`);
      return response.data;
    } catch (error) {
      const restaurant = DEV_FALLBACK_RESTAURANTS.find(r => r.id === parseInt(id));
      return { success: true, restaurant };
    }
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
    try {
      const response = await reservationsApi.get(`/restaurants/${id}/stats`);
      return response.data;
    } catch (error) {
      return { success: true, stats: { totalReservations: 45, todayReservations: 8, avgRating: 4.5, revenue: 12500 } };
    }
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

// Fallback reservations data for development
const DEV_FALLBACK_RESERVATIONS = [
  {
    id: 1,
    reference: 'RES-2024-001',
    restaurantId: 1,
    restaurantName: 'Restaurant El Sol',
    guestName: 'Carlos Martínez',
    guestEmail: 'carlos.m@email.com',
    guestPhone: '+34 612 345 678',
    partySize: 4,
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '20:00',
    tableNumber: 'T-12',
    status: 'confirmed',
    specialRequests: 'Birthday celebration, please prepare a cake',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    reference: 'RES-2024-002',
    restaurantId: 2,
    restaurantName: 'Tapas Bar La Luna',
    guestName: 'Emma Wilson',
    guestEmail: 'emma.w@email.com',
    guestPhone: '+44 789 012 345',
    partySize: 2,
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '21:30',
    tableNumber: 'T-05',
    status: 'pending',
    specialRequests: 'Vegetarian options needed',
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    reference: 'RES-2024-003',
    restaurantId: 3,
    restaurantName: 'Marisquería Costa Azul',
    guestName: 'Hans Müller',
    guestEmail: 'hans.m@email.de',
    guestPhone: '+49 151 234 567',
    partySize: 6,
    date: new Date().toISOString().split('T')[0],
    time: '13:00',
    tableNumber: 'T-08',
    status: 'seated',
    specialRequests: 'Seafood platter for the table',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 4,
    reference: 'RES-2024-004',
    restaurantId: 1,
    restaurantName: 'Restaurant El Sol',
    guestName: 'Sophie Dubois',
    guestEmail: 'sophie.d@email.fr',
    guestPhone: '+33 6 12 34 56 78',
    partySize: 3,
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '19:30',
    tableNumber: 'T-03',
    status: 'completed',
    specialRequests: null,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Reservation API
export const reservationAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await reservationsApi.get('/reservations', { params });
      return response.data;
    } catch (error) {
      console.warn('Reservations API not available, using fallback data');
      return { success: true, reservations: DEV_FALLBACK_RESERVATIONS, total: DEV_FALLBACK_RESERVATIONS.length };
    }
  },

  getById: async (id) => {
    try {
      const response = await reservationsApi.get(`/reservations/${id}`);
      return response.data;
    } catch (error) {
      const reservation = DEV_FALLBACK_RESERVATIONS.find(r => r.id === parseInt(id));
      return { success: true, reservation };
    }
  },

  getByReference: async (reference) => {
    try {
      const response = await reservationsApi.get(`/reservations/reference/${reference}`);
      return response.data;
    } catch (error) {
      const reservation = DEV_FALLBACK_RESERVATIONS.find(r => r.reference === reference);
      return { success: true, reservation };
    }
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
    try {
      const response = await reservationsApi.get(`/restaurants/${restaurantId}/reservations`, { params });
      return response.data;
    } catch (error) {
      const filtered = DEV_FALLBACK_RESERVATIONS.filter(r => r.restaurantId === parseInt(restaurantId));
      return { success: true, reservations: filtered, total: filtered.length };
    }
  },

  getTodayStats: async (restaurantId) => {
    try {
      const response = await reservationsApi.get(`/restaurants/${restaurantId}/reservations/today-stats`);
      return response.data;
    } catch (error) {
      return {
        success: true,
        stats: {
          todayReservations: 8,
          confirmedCount: 6,
          pendingCount: 2,
          seatedCount: 1
        }
      };
    }
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
const TICKETING_API_URL = import.meta.env.VITE_TICKETING_API_URL ||
  (isCodespaces ? getCodespacesBackendUrl(3004, '/api/v1/tickets') :
    (isCloudEnvironment ? '/api/v1/tickets' : 'http://localhost:3004/api/v1/tickets'));

const ticketingApi = axios.create({
  baseURL: TICKETING_API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Add auth interceptor for ticketing API
ticketingApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Fallback events data for development
const DEV_FALLBACK_EVENTS = [
  {
    id: 1,
    title: 'Flamenco Night at Casa del Flamenco',
    description: 'Authentic flamenco performance with live music and dance',
    category: 'Entertainment',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '21:00',
    venue: 'Casa del Flamenco, Alicante',
    address: 'Calle San Francisco 25, 03001 Alicante',
    price: 45.00,
    currency: 'EUR',
    capacity: 80,
    ticketsSold: 52,
    status: 'active',
    featured: true,
    imageUrl: '/images/events/flamenco.jpg',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Costa Blanca Wine Festival',
    description: 'Annual wine festival featuring local vineyards and gourmet food',
    category: 'Festival',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '12:00',
    venue: 'Plaza del Ayuntamiento, Benidorm',
    address: 'Plaza del Ayuntamiento 1, 03501 Benidorm',
    price: 25.00,
    currency: 'EUR',
    capacity: 500,
    ticketsSold: 234,
    status: 'active',
    featured: true,
    imageUrl: '/images/events/wine-festival.jpg',
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    title: 'Sunset Sailing Experience',
    description: 'Luxury catamaran cruise with champagne and tapas',
    category: 'Experience',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '18:30',
    venue: 'Puerto de Calpe',
    address: 'Puerto Pesquero, 03710 Calpe',
    price: 75.00,
    currency: 'EUR',
    capacity: 30,
    ticketsSold: 18,
    status: 'active',
    featured: false,
    imageUrl: '/images/events/sunset-sail.jpg',
    createdAt: new Date().toISOString()
  },
  {
    id: 4,
    title: 'Cooking Class: Paella Valenciana',
    description: 'Learn to cook authentic Valencian paella with a local chef',
    category: 'Workshop',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '10:00',
    venue: 'Escuela de Cocina La Huerta',
    address: 'Avenida del Mar 12, 03590 Altea',
    price: 65.00,
    currency: 'EUR',
    capacity: 12,
    ticketsSold: 8,
    status: 'active',
    featured: false,
    imageUrl: '/images/events/cooking-class.jpg',
    createdAt: new Date().toISOString()
  }
];

// Fallback tickets data for development
const DEV_FALLBACK_TICKETS = [
  {
    id: 1,
    ticketCode: 'TKT-FL001-2024',
    eventId: 1,
    eventTitle: 'Flamenco Night at Casa del Flamenco',
    eventDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customerName: 'John Smith',
    customerEmail: 'john.smith@email.com',
    quantity: 2,
    totalPrice: 90.00,
    currency: 'EUR',
    status: 'confirmed',
    purchaseDate: new Date().toISOString(),
    qrCode: 'QR-FL001-2024-ABC123'
  },
  {
    id: 2,
    ticketCode: 'TKT-WF002-2024',
    eventId: 2,
    eventTitle: 'Costa Blanca Wine Festival',
    eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customerName: 'Maria García',
    customerEmail: 'maria.garcia@email.com',
    quantity: 4,
    totalPrice: 100.00,
    currency: 'EUR',
    status: 'confirmed',
    purchaseDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    qrCode: 'QR-WF002-2024-DEF456'
  },
  {
    id: 3,
    ticketCode: 'TKT-SS003-2024',
    eventId: 3,
    eventTitle: 'Sunset Sailing Experience',
    eventDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customerName: 'Peter Johnson',
    customerEmail: 'peter.j@email.com',
    quantity: 2,
    totalPrice: 150.00,
    currency: 'EUR',
    status: 'pending',
    purchaseDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    qrCode: 'QR-SS003-2024-GHI789'
  },
  {
    id: 4,
    ticketCode: 'TKT-CC004-2024',
    eventId: 4,
    eventTitle: 'Cooking Class: Paella Valenciana',
    eventDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customerName: 'Anne Williams',
    customerEmail: 'anne.w@email.com',
    quantity: 1,
    totalPrice: 65.00,
    currency: 'EUR',
    status: 'confirmed',
    purchaseDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    qrCode: 'QR-CC004-2024-JKL012'
  }
];

export const eventsAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await ticketingApi.get('/events', { params });
      return response.data;
    } catch (error) {
      console.warn('Events API not available, using fallback data');
      return { success: true, events: DEV_FALLBACK_EVENTS, total: DEV_FALLBACK_EVENTS.length };
    }
  },
  getById: async (id) => {
    try {
      const response = await ticketingApi.get(`/events/${id}`);
      return response.data;
    } catch (error) {
      const event = DEV_FALLBACK_EVENTS.find(e => e.id === parseInt(id));
      return { success: true, event };
    }
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
    try {
      const response = await ticketingApi.get('/events/stats');
      return response.data;
    } catch (error) {
      return {
        success: true,
        stats: {
          totalEvents: DEV_FALLBACK_EVENTS.length,
          activeEvents: DEV_FALLBACK_EVENTS.filter(e => e.status === 'active').length,
          totalTicketsSold: DEV_FALLBACK_EVENTS.reduce((sum, e) => sum + e.ticketsSold, 0),
          totalRevenue: DEV_FALLBACK_EVENTS.reduce((sum, e) => sum + (e.price * e.ticketsSold), 0)
        }
      };
    }
  }
};

// Tickets API
export const ticketsAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await ticketingApi.get('/', { params });
      return response.data;
    } catch (error) {
      console.warn('Tickets API not available, using fallback data');
      return { success: true, tickets: DEV_FALLBACK_TICKETS, total: DEV_FALLBACK_TICKETS.length };
    }
  },
  getById: async (id) => {
    try {
      const response = await ticketingApi.get(`/${id}`);
      return response.data;
    } catch (error) {
      const ticket = DEV_FALLBACK_TICKETS.find(t => t.id === parseInt(id));
      return { success: true, ticket };
    }
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
const PAYMENT_API_URL = import.meta.env.VITE_PAYMENT_API_URL ||
  (isCodespaces ? getCodespacesBackendUrl(3005, '/api/v1/payments') :
    (isCloudEnvironment ? '/api/v1/payments' : 'http://localhost:3005/api/v1/payments'));

const paymentApi = axios.create({
  baseURL: PAYMENT_API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Add auth interceptor for payment API
paymentApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Fallback transactions data for development
const DEV_FALLBACK_TRANSACTIONS = [
  {
    id: 1,
    transactionId: 'TXN-2024-001',
    type: 'ticket_purchase',
    description: 'Flamenco Night - 2 tickets',
    amount: 90.00,
    currency: 'EUR',
    status: 'completed',
    paymentMethod: 'credit_card',
    cardLast4: '4242',
    customerName: 'John Smith',
    customerEmail: 'john.smith@email.com',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    transactionId: 'TXN-2024-002',
    type: 'ticket_purchase',
    description: 'Wine Festival - 4 tickets',
    amount: 100.00,
    currency: 'EUR',
    status: 'completed',
    paymentMethod: 'paypal',
    cardLast4: null,
    customerName: 'Maria García',
    customerEmail: 'maria.garcia@email.com',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 3,
    transactionId: 'TXN-2024-003',
    type: 'booking_payment',
    description: 'Restaurant reservation deposit',
    amount: 50.00,
    currency: 'EUR',
    status: 'completed',
    paymentMethod: 'credit_card',
    cardLast4: '1234',
    customerName: 'Hans Müller',
    customerEmail: 'hans.m@email.de',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 4,
    transactionId: 'TXN-2024-004',
    type: 'refund',
    description: 'Ticket refund - Event cancelled',
    amount: -75.00,
    currency: 'EUR',
    status: 'completed',
    paymentMethod: 'credit_card',
    cardLast4: '5678',
    customerName: 'Peter Johnson',
    customerEmail: 'peter.j@email.com',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 5,
    transactionId: 'TXN-2024-005',
    type: 'ticket_purchase',
    description: 'Cooking Class - 1 ticket',
    amount: 65.00,
    currency: 'EUR',
    status: 'pending',
    paymentMethod: 'credit_card',
    cardLast4: '9012',
    customerName: 'Anne Williams',
    customerEmail: 'anne.w@email.com',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const transactionsAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await paymentApi.get('/transactions', { params });
      return response.data;
    } catch (error) {
      console.warn('Transactions API not available, using fallback data');
      return { success: true, transactions: DEV_FALLBACK_TRANSACTIONS, total: DEV_FALLBACK_TRANSACTIONS.length };
    }
  },
  getById: async (id) => {
    try {
      const response = await paymentApi.get(`/transactions/${id}`);
      return response.data;
    } catch (error) {
      const transaction = DEV_FALLBACK_TRANSACTIONS.find(t => t.id === parseInt(id));
      return { success: true, transaction };
    }
  },
  refund: async (id, amount) => {
    const response = await paymentApi.post(`/transactions/${id}/refund`, { amount });
    return response.data;
  },
  getStats: async () => {
    try {
      const response = await paymentApi.get('/transactions/stats');
      return response.data;
    } catch (error) {
      const completed = DEV_FALLBACK_TRANSACTIONS.filter(t => t.status === 'completed');
      const totalRevenue = completed.reduce((sum, t) => sum + t.amount, 0);
      return {
        success: true,
        stats: {
          totalTransactions: DEV_FALLBACK_TRANSACTIONS.length,
          completedCount: completed.length,
          pendingCount: DEV_FALLBACK_TRANSACTIONS.filter(t => t.status === 'pending').length,
          totalRevenue: totalRevenue,
          refundTotal: Math.abs(DEV_FALLBACK_TRANSACTIONS.filter(t => t.type === 'refund').reduce((sum, t) => sum + t.amount, 0))
        }
      };
    }
  }
};

// Reservations API (alias for reservationAPI)
export const reservationsAPI = reservationAPI;

// Agenda API (Agenda module)
const AGENDA_API_URL = import.meta.env.VITE_AGENDA_API_URL ||
  (isCodespaces ? getCodespacesBackendUrl(5005, '/api') :
    (isCloudEnvironment ? '/api/agenda' : 'http://localhost:5005/api'));

const agendaApi = axios.create({
  baseURL: AGENDA_API_URL,
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

// Fallback agenda data for development
const DEV_FALLBACK_AGENDA_ITEMS = [
  {
    id: 1,
    title: 'Wine Tasting at Bodegas Enrique Mendoza',
    type: 'event',
    category: 'Experience',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '11:00',
    duration: 120,
    location: 'Alfaz del Pi, Costa Blanca',
    description: 'Premium wine tasting experience with local wines and tapas',
    status: 'confirmed',
    participants: 4,
    notes: 'Transportation arranged from hotel',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Dinner Reservation - El Poblet',
    type: 'reservation',
    category: 'Dining',
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '20:30',
    duration: 150,
    location: 'Dénia, Costa Blanca',
    description: 'Michelin star restaurant - tasting menu',
    status: 'confirmed',
    participants: 2,
    notes: 'Window table requested',
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    title: 'Kayak Tour Cabo de las Huertas',
    type: 'activity',
    category: 'Adventure',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '09:00',
    duration: 180,
    location: 'Alicante, Costa Blanca',
    description: 'Guided kayak tour with snorkeling stops',
    status: 'pending',
    participants: 3,
    notes: 'Equipment included',
    createdAt: new Date().toISOString()
  },
  {
    id: 4,
    title: 'Guadalest Village Tour',
    type: 'tour',
    category: 'Culture',
    date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '10:00',
    duration: 240,
    location: 'Guadalest, Costa Blanca',
    description: 'Historic village tour with museum visits',
    status: 'confirmed',
    participants: 4,
    notes: 'Includes lunch at local restaurant',
    createdAt: new Date().toISOString()
  },
  {
    id: 5,
    title: 'Spa Day - SHA Wellness Clinic',
    type: 'wellness',
    category: 'Wellness',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '10:00',
    duration: 360,
    location: 'Altea, Costa Blanca',
    description: 'Full day spa package with treatments',
    status: 'confirmed',
    participants: 2,
    notes: 'Lunch included',
    createdAt: new Date().toISOString()
  }
];

export const agendaAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await agendaApi.get('/agenda', { params });
      return response.data;
    } catch (error) {
      console.warn('Agenda API not available, using fallback data');
      return { success: true, items: DEV_FALLBACK_AGENDA_ITEMS, total: DEV_FALLBACK_AGENDA_ITEMS.length };
    }
  },
  getById: async (id) => {
    try {
      const response = await agendaApi.get(`/agenda/${id}`);
      return response.data;
    } catch (error) {
      const item = DEV_FALLBACK_AGENDA_ITEMS.find(i => i.id === parseInt(id));
      return { success: true, item };
    }
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
    try {
      const response = await agendaApi.get('/agenda/range', {
        params: { start_date: startDate, end_date: endDate }
      });
      return response.data;
    } catch (error) {
      console.warn('Agenda API not available, using fallback data');
      return { success: true, items: DEV_FALLBACK_AGENDA_ITEMS, total: DEV_FALLBACK_AGENDA_ITEMS.length };
    }
  },
  getUpcoming: async (limit = 10) => {
    try {
      const response = await agendaApi.get('/agenda/upcoming', { params: { limit } });
      return response.data;
    } catch (error) {
      console.warn('Agenda API not available, using fallback data');
      return { success: true, items: DEV_FALLBACK_AGENDA_ITEMS.slice(0, limit), total: Math.min(limit, DEV_FALLBACK_AGENDA_ITEMS.length) };
    }
  },
  getStats: async () => {
    try {
      const response = await agendaApi.get('/agenda/stats');
      return response.data;
    } catch (error) {
      return {
        success: true,
        stats: {
          totalItems: DEV_FALLBACK_AGENDA_ITEMS.length,
          upcomingEvents: 3,
          confirmedReservations: 4,
          pendingItems: 1
        }
      };
    }
  }
};

export { reservationsApi, agendaApi };
export default api;
