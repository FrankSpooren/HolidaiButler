import client from './client.js';

export const poiService = {
  list: (params = {}) => {
    const qp = new URLSearchParams();
    if (params.page) qp.set('page', params.page);
    if (params.limit) qp.set('limit', params.limit);
    if (params.search) qp.set('search', params.search);
    if (params.destination && params.destination !== 'all') qp.set('destination', params.destination);
    if (params.category) qp.set('category', params.category);
    if (params.hasContent) qp.set('hasContent', params.hasContent);
    if (params.isActive) qp.set('isActive', params.isActive);
    if (params.sort) qp.set('sort', params.sort);
    if (params.order) qp.set('order', params.order);
    const qs = qp.toString();
    return client.get(`/pois${qs ? `?${qs}` : ''}`).then(r => r.data);
  },

  stats: () =>
    client.get('/pois/stats').then(r => r.data),

  getById: (id) =>
    client.get(`/pois/${id}`).then(r => r.data),

  update: (id, data) =>
    client.put(`/pois/${id}`, data).then(r => r.data),

  categories: (destination) =>
    client.get('/pois/categories', { params: destination ? { destination } : {} }).then(r => r.data),

  reorderImages: (poiId, imageIds) =>
    client.put(`/pois/${poiId}/images`, { imageIds }).then(r => r.data),

  deleteImage: (poiId, imageId) =>
    client.delete(`/pois/${poiId}/images/${imageId}`).then(r => r.data)
};
