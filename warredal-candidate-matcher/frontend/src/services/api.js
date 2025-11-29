import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== Auth ====================

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// ==================== Vacancies ====================

export const vacancyAPI = {
  getAll: (params) => api.get('/vacancies', { params }),
  getById: (id) => api.get(`/vacancies/${id}`),
  create: (data) => api.post('/vacancies', data),
  update: (id, data) => api.put(`/vacancies/${id}`, data),
  delete: (id) => api.delete(`/vacancies/${id}`),
  getStats: (id) => api.get(`/vacancies/${id}/stats`),

  // Criteria
  getCriteria: (vacancyId) => api.get(`/vacancies/${vacancyId}/criteria`),
  addCriterion: (vacancyId, data) => api.post(`/vacancies/${vacancyId}/criteria`, data),
  updateCriterion: (vacancyId, criterionId, data) =>
    api.put(`/vacancies/${vacancyId}/criteria/${criterionId}`, data),
  deleteCriterion: (vacancyId, criterionId) =>
    api.delete(`/vacancies/${vacancyId}/criteria/${criterionId}`),
};

// ==================== Candidates ====================

export const candidateAPI = {
  getAll: (params) => api.get('/candidates', { params }),
  getById: (id) => api.get(`/candidates/${id}`),
  create: (data) => api.post('/candidates', data),
  update: (id, data) => api.put(`/candidates/${id}`, data),
  delete: (id) => api.delete(`/candidates/${id}`),

  // Scraping
  scrape: (data) => api.post('/candidates/scrape', data),
  search: (data) => api.post('/candidates/search', data),

  // Export
  export: (vacancyId) =>
    api.get(`/candidates/export/${vacancyId}`, {
      responseType: 'blob',
    }),
};

// ==================== Messaging ====================

export const messagingAPI = {
  getAll: (params) => api.get('/messages', { params }),
  getById: (id) => api.get(`/messages/${id}`),
  update: (id, data) => api.put(`/messages/${id}`, data),
  delete: (id) => api.delete(`/messages/${id}`),

  // Generation
  generate: (data) => api.post('/messages/generate', data),
  generateBatch: (data) => api.post('/messages/generate-batch', data),

  // Sending
  send: (id) => api.post(`/messages/${id}/send`),

  // Outreach
  getOutreach: (candidateId) => api.get(`/messages/outreach/${candidateId}`),

  // Status
  getStatus: () => api.get('/messaging/status'),
};

export default api;
