import client from './client.js';

export const reviewService = {
  list: (params = {}) => {
    const qp = new URLSearchParams();
    if (params.page) qp.set('page', params.page);
    if (params.limit) qp.set('limit', params.limit);
    if (params.search) qp.set('search', params.search);
    if (params.destination && params.destination !== 'all') qp.set('destination', params.destination);
    if (params.rating) qp.set('rating', params.rating);
    if (params.sentiment) qp.set('sentiment', params.sentiment);
    if (params.archived) qp.set('archived', params.archived);
    if (params.poi_id) qp.set('poi_id', params.poi_id);
    if (params.dateFrom) qp.set('dateFrom', params.dateFrom);
    if (params.dateTo) qp.set('dateTo', params.dateTo);
    const qs = qp.toString();
    return client.get(`/reviews${qs ? `?${qs}` : ''}`).then(r => r.data);
  },

  getById: (id) =>
    client.get(`/reviews/${id}`).then(r => r.data),

  update: (id, data) =>
    client.put(`/reviews/${id}`, data).then(r => r.data)
};
