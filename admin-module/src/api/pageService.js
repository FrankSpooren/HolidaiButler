import client from './client.js';

export const pageService = {
  list: (destinationId) => {
    const params = destinationId ? `?destination=${destinationId}` : '';
    return client.get(`/pages${params}`).then(r => r.data);
  },

  get: (id) =>
    client.get(`/pages/${id}`).then(r => r.data),

  create: (data) =>
    client.post('/pages', data).then(r => r.data),

  update: (id, data) =>
    client.put(`/pages/${id}`, data).then(r => r.data),

  delete: (id) =>
    client.delete(`/pages/${id}`).then(r => r.data)
};
