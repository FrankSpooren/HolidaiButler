import client from './client.js';

export const partnerService = {
  list: (destinationId, params = {}) =>
    client.get('/partners', {
      params: { destinationId, ...params }
    }).then(r => r.data),

  getById: (id, destinationId) =>
    client.get(`/partners/${id}`, {
      params: { destinationId }
    }).then(r => r.data),

  create: (data) =>
    client.post('/partners', data).then(r => r.data),

  update: (id, data) =>
    client.put(`/partners/${id}`, data).then(r => r.data),

  updateStatus: (id, data) =>
    client.put(`/partners/${id}/status`, data).then(r => r.data),

  getStats: (destinationId) =>
    client.get('/partners/stats', {
      params: { destinationId }
    }).then(r => r.data),

  getTransactions: (id, destinationId, params = {}) =>
    client.get(`/partners/${id}/transactions`, {
      params: { destinationId, ...params }
    }).then(r => r.data)
};
