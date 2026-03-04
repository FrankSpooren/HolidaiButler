import client from './client.js';

export const intermediaryService = {
  list: (destinationId, params = {}) =>
    client.get('/intermediary', {
      params: { destinationId, ...params }
    }).then(r => r.data),

  getById: (id, destinationId) =>
    client.get(`/intermediary/${id}`, {
      params: { destinationId }
    }).then(r => r.data),

  create: (data) =>
    client.post('/intermediary', data).then(r => r.data),

  consent: (id, data) =>
    client.put(`/intermediary/${id}/consent`, data).then(r => r.data),

  confirm: (id, data) =>
    client.put(`/intermediary/${id}/confirm`, data).then(r => r.data),

  share: (id, data) =>
    client.put(`/intermediary/${id}/share`, data).then(r => r.data),

  cancel: (id, data) =>
    client.put(`/intermediary/${id}/cancel`, data).then(r => r.data),

  getQR: (id, destinationId) =>
    client.get(`/intermediary/${id}/qr`, {
      params: { destinationId }
    }).then(r => r.data),

  getStats: (destinationId, params = {}) =>
    client.get('/intermediary/stats', {
      params: { destinationId, ...params }
    }).then(r => r.data),

  getFunnel: (destinationId, params = {}) =>
    client.get('/intermediary/funnel', {
      params: { destinationId, ...params }
    }).then(r => r.data),

  exportTransactions: (destinationId, params = {}) =>
    client.get('/intermediary/export/transactions', {
      params: { destinationId, ...params },
      responseType: 'blob'
    })
};
