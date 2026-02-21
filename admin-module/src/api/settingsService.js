import client from './client.js';

export const settingsService = {
  getSettings: () =>
    client.get('/settings').then(r => r.data),

  getAuditLog: (params = {}) => {
    const qp = new URLSearchParams();
    if (params.page) qp.set('page', params.page);
    if (params.limit) qp.set('limit', params.limit);
    if (params.action) qp.set('action', params.action);
    const qs = qp.toString();
    return client.get(`/settings/audit-log${qs ? `?${qs}` : ''}`).then(r => r.data);
  },

  clearCache: (payload) =>
    client.post('/settings/cache/clear', payload).then(r => r.data),

  undoAction: (auditLogId) =>
    client.post(`/settings/undo/${auditLogId}`, { confirm: true }).then(r => r.data),

  getBranding: () =>
    client.get('/settings/branding').then(r => r.data),

  updateBranding: (destination, data) =>
    client.put(`/settings/branding/${destination}`, data).then(r => r.data)
};
