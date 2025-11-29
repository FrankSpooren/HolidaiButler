/**
 * API Service - Centralized API communication
 */

import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3006/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID
    config.headers['X-Request-ID'] = crypto.randomUUID();

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken
          });

          localStorage.setItem('accessToken', data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);

          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Show error toast
    const message = error.response?.data?.error || error.message || 'An error occurred';
    if (error.response?.status !== 401) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

// ============================================
// AUTH API
// ============================================

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  verify2FA: (code) => api.post('/auth/verify-2fa', { code }),
  setup2FA: () => api.post('/auth/setup-2fa'),
  enable2FA: (code) => api.post('/auth/enable-2fa', { code }),
  disable2FA: (code) => api.post('/auth/disable-2fa', { code })
};

// ============================================
// DEALS API
// ============================================

export const dealsAPI = {
  getAll: (params) => api.get('/deals', { params }),
  getById: (id) => api.get(`/deals/${id}`),
  create: (data) => api.post('/deals', data),
  update: (id, data) => api.put(`/deals/${id}`, data),
  delete: (id) => api.delete(`/deals/${id}`),
  updateStage: (id, stageId, options = {}) =>
    api.patch(`/deals/${id}/stage`, { stageId, ...options }),
  addActivity: (id, activity) => api.post(`/deals/${id}/activities`, activity),
  getActivities: (id) => api.get(`/deals/${id}/activities`),
  addNote: (id, note) => api.post(`/deals/${id}/notes`, note),
  getNotes: (id) => api.get(`/deals/${id}/notes`),
  getTimeline: (id) => api.get(`/deals/${id}/timeline`),
  duplicate: (id) => api.post(`/deals/${id}/duplicate`),
  bulkUpdate: (ids, data) => api.patch('/deals/bulk', { ids, ...data }),
  bulkDelete: (ids) => api.delete('/deals/bulk', { data: { ids } }),
  getForecast: (params) => api.get('/deals/forecast', { params }),
  getKanban: (pipelineId) => api.get(`/deals/kanban/${pipelineId}`)
};

// ============================================
// PIPELINES API
// ============================================

export const pipelinesAPI = {
  getAll: () => api.get('/pipelines'),
  getById: (id) => api.get(`/pipelines/${id}`),
  create: (data) => api.post('/pipelines', data),
  update: (id, data) => api.put(`/pipelines/${id}`, data),
  delete: (id) => api.delete(`/pipelines/${id}`),
  getStages: (id) => api.get(`/pipelines/${id}/stages`),
  addStage: (id, stage) => api.post(`/pipelines/${id}/stages`, stage),
  updateStage: (pipelineId, stageId, data) =>
    api.put(`/pipelines/${pipelineId}/stages/${stageId}`, data),
  deleteStage: (pipelineId, stageId) =>
    api.delete(`/pipelines/${pipelineId}/stages/${stageId}`),
  reorderStages: (id, stages) => api.patch(`/pipelines/${id}/stages/reorder`, { stages })
};

// ============================================
// ACCOUNTS API
// ============================================

export const accountsAPI = {
  getAll: (params) => api.get('/accounts', { params }),
  getById: (id) => api.get(`/accounts/${id}`),
  create: (data) => api.post('/accounts', data),
  update: (id, data) => api.put(`/accounts/${id}`, data),
  delete: (id) => api.delete(`/accounts/${id}`),
  getContacts: (id) => api.get(`/accounts/${id}/contacts`),
  getDeals: (id) => api.get(`/accounts/${id}/deals`),
  getActivities: (id) => api.get(`/accounts/${id}/activities`),
  getHealthScore: (id) => api.get(`/accounts/${id}/health`),
  merge: (sourceId, targetId) => api.post('/accounts/merge', { sourceId, targetId })
};

// ============================================
// CONTACTS API
// ============================================

export const contactsAPI = {
  getAll: (params) => api.get('/contacts', { params }),
  getById: (id) => api.get(`/contacts/${id}`),
  create: (data) => api.post('/contacts', data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  delete: (id) => api.delete(`/contacts/${id}`),
  getActivities: (id) => api.get(`/contacts/${id}/activities`),
  addActivity: (id, activity) => api.post(`/contacts/${id}/activities`, activity),
  merge: (sourceId, targetId) => api.post('/contacts/merge', { sourceId, targetId }),
  bulkUpdate: (ids, data) => api.patch('/contacts/bulk', { ids, ...data }),
  bulkDelete: (ids) => api.delete('/contacts/bulk', { data: { ids } })
};

// ============================================
// LEADS API
// ============================================

export const leadsAPI = {
  getAll: (params) => api.get('/leads', { params }),
  getById: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  delete: (id) => api.delete(`/leads/${id}`),
  convert: (id, data) => api.post(`/leads/${id}/convert`, data),
  qualify: (id, score) => api.patch(`/leads/${id}/qualify`, { score }),
  disqualify: (id, reason) => api.patch(`/leads/${id}/disqualify`, { reason }),
  bulkConvert: (ids, data) => api.post('/leads/bulk-convert', { ids, ...data })
};

// ============================================
// CAMPAIGNS API
// ============================================

export const campaignsAPI = {
  getAll: (params) => api.get('/campaigns', { params }),
  getById: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  delete: (id) => api.delete(`/campaigns/${id}`),
  getLeads: (id) => api.get(`/campaigns/${id}/leads`),
  getMetrics: (id) => api.get(`/campaigns/${id}/metrics`),
  launch: (id) => api.post(`/campaigns/${id}/launch`),
  pause: (id) => api.post(`/campaigns/${id}/pause`),
  complete: (id) => api.post(`/campaigns/${id}/complete`)
};

// ============================================
// ACTIVITIES API
// ============================================

export const activitiesAPI = {
  getAll: (params) => api.get('/activities', { params }),
  getById: (id) => api.get(`/activities/${id}`),
  create: (data) => api.post('/activities', data),
  update: (id, data) => api.put(`/activities/${id}`, data),
  delete: (id) => api.delete(`/activities/${id}`),
  complete: (id, outcome) => api.patch(`/activities/${id}/complete`, { outcome }),
  reschedule: (id, scheduledAt) => api.patch(`/activities/${id}/reschedule`, { scheduledAt })
};

// ============================================
// TASKS API
// ============================================

export const tasksAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  complete: (id) => api.patch(`/tasks/${id}/complete`),
  reopen: (id) => api.patch(`/tasks/${id}/reopen`),
  getMyTasks: (params) => api.get('/tasks/my', { params }),
  getOverdue: () => api.get('/tasks/overdue')
};

// ============================================
// TEAMS API
// ============================================

export const teamsAPI = {
  getAll: () => api.get('/teams'),
  getById: (id) => api.get(`/teams/${id}`),
  create: (data) => api.post('/teams', data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  delete: (id) => api.delete(`/teams/${id}`),
  getMembers: (id) => api.get(`/teams/${id}/members`),
  addMember: (id, userId, role) => api.post(`/teams/${id}/members`, { userId, role }),
  removeMember: (id, userId) => api.delete(`/teams/${id}/members/${userId}`),
  updateMemberRole: (id, userId, role) =>
    api.patch(`/teams/${id}/members/${userId}`, { role })
};

// ============================================
// USERS API
// ============================================

export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  activate: (id) => api.patch(`/users/${id}/activate`),
  deactivate: (id) => api.patch(`/users/${id}/deactivate`),
  updateRole: (id, role) => api.patch(`/users/${id}/role`, { role }),
  getSessions: (id) => api.get(`/users/${id}/sessions`),
  revokeSessions: (id) => api.delete(`/users/${id}/sessions`)
};

// ============================================
// SHARED INBOX API
// ============================================

export const sharedInboxAPI = {
  getInboxes: () => api.get('/shared-inbox'),
  getInboxById: (id) => api.get(`/shared-inbox/${id}`),
  createInbox: (data) => api.post('/shared-inbox', data),
  updateInbox: (id, data) => api.put(`/shared-inbox/${id}`, data),
  deleteInbox: (id) => api.delete(`/shared-inbox/${id}`),
  getMessages: (inboxId, params) => api.get(`/shared-inbox/${inboxId}/messages`, { params }),
  getMessage: (inboxId, messageId) => api.get(`/shared-inbox/${inboxId}/messages/${messageId}`),
  sendMessage: (inboxId, data) => api.post(`/shared-inbox/${inboxId}/messages`, data),
  assignMessage: (inboxId, messageId, userId) =>
    api.patch(`/shared-inbox/${inboxId}/messages/${messageId}/assign`, { userId }),
  markAsRead: (inboxId, messageId) =>
    api.patch(`/shared-inbox/${inboxId}/messages/${messageId}/read`),
  archive: (inboxId, messageId) =>
    api.patch(`/shared-inbox/${inboxId}/messages/${messageId}/archive`),
  reply: (inboxId, messageId, content) =>
    api.post(`/shared-inbox/${inboxId}/messages/${messageId}/reply`, { content })
};

// ============================================
// NOTIFICATIONS API
// ============================================

export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  updatePreferences: (preferences) => api.put('/notifications/preferences', preferences),
  getPreferences: () => api.get('/notifications/preferences')
};

// ============================================
// REPORTS API
// ============================================

export const reportsAPI = {
  getDashboard: (params) => api.get('/reports/dashboard', { params }),
  getSalesPerformance: (params) => api.get('/reports/sales-performance', { params }),
  getPipelineMetrics: (params) => api.get('/reports/pipeline', { params }),
  getTeamPerformance: (params) => api.get('/reports/team-performance', { params }),
  getActivityReport: (params) => api.get('/reports/activities', { params }),
  getConversionReport: (params) => api.get('/reports/conversion', { params }),
  getForecast: (params) => api.get('/reports/forecast', { params }),
  getLeaderboard: (params) => api.get('/reports/leaderboard', { params }),
  exportReport: (type, params) => api.get(`/reports/export/${type}`, {
    params,
    responseType: 'blob'
  })
};

// ============================================
// IMPORT/EXPORT API
// ============================================

export const importExportAPI = {
  importData: (formData, options) => api.post('/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...options
  }),
  getImportJobs: () => api.get('/import/jobs'),
  getImportJob: (id) => api.get(`/import/jobs/${id}`),
  cancelImport: (id) => api.delete(`/import/jobs/${id}`),
  validateImport: (formData) => api.post('/import/validate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  exportData: (type, params) => api.post('/export', { type, ...params }),
  getExportJobs: () => api.get('/export/jobs'),
  getExportJob: (id) => api.get(`/export/jobs/${id}`),
  downloadExport: (id) => api.get(`/export/jobs/${id}/download`, { responseType: 'blob' })
};

// ============================================
// PRODUCTS API
// ============================================

export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getCategories: () => api.get('/products/categories')
};

// ============================================
// QUOTES API
// ============================================

export const quotesAPI = {
  getAll: (params) => api.get('/quotes', { params }),
  getById: (id) => api.get(`/quotes/${id}`),
  create: (data) => api.post('/quotes', data),
  update: (id, data) => api.put(`/quotes/${id}`, data),
  delete: (id) => api.delete(`/quotes/${id}`),
  send: (id) => api.post(`/quotes/${id}/send`),
  accept: (id) => api.patch(`/quotes/${id}/accept`),
  reject: (id, reason) => api.patch(`/quotes/${id}/reject`, { reason }),
  duplicate: (id) => api.post(`/quotes/${id}/duplicate`),
  generatePDF: (id) => api.get(`/quotes/${id}/pdf`, { responseType: 'blob' })
};

// ============================================
// HEALTH CHECK
// ============================================

export const healthAPI = {
  check: () => api.get('/health'),
  detailed: () => api.get('/health/detailed')
};

export default api;
