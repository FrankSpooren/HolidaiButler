import client from './client.js';

/**
 * Content Studio API service
 */
const contentService = {
  // === Trending ===

  getTrending(destinationId, { period = '30d', market, language, limit = 50, offset = 0 } = {}) {
    const params = { destination_id: destinationId, period, limit, offset };
    if (market) params.market = market;
    if (language) params.language = language;
    return client.get('/content/trending', { params }).then(r => r.data);
  },

  getTrendingSummary(destinationId, { period = '30d' } = {}) {
    return client.get('/content/trending/summary', { params: { destination_id: destinationId, period } }).then(r => r.data);
  },

  addManualTrend(data) {
    return client.post('/content/trending/manual', data).then(r => r.data);
  },

  // === Suggestions ===

  getSuggestions(destinationId, { status, limit = 50, offset = 0 } = {}) {
    const params = { destination_id: destinationId, limit, offset };
    if (status) params.status = status;
    return client.get('/content/suggestions', { params }).then(r => r.data);
  },

  generateSuggestions(destinationId) {
    return client.post('/content/suggestions/generate', { destination_id: destinationId }).then(r => r.data);
  },

  updateSuggestion(id, data) {
    return client.patch(`/content/suggestions/${id}`, data).then(r => r.data);
  },

  // === Content Items ===

  getItems(destinationId, { status, limit = 50, offset = 0 } = {}) {
    const params = { destination_id: destinationId, limit, offset };
    if (status) params.status = status;
    return client.get('/content/items', { params }).then(r => r.data);
  },

  getItem(id) {
    return client.get(`/content/items/${id}`).then(r => r.data);
  },

  generateItem(data) {
    return client.post('/content/items/generate', data).then(r => r.data);
  },

  updateItem(id, data) {
    return client.patch(`/content/items/${id}`, data).then(r => r.data);
  },

  deleteItem(id) {
    return client.delete(`/content/items/${id}`).then(r => r.data);
  },

  translateItem(id, targetLang) {
    return client.post(`/content/items/${id}/translate`, { target_lang: targetLang }).then(r => r.data);
  },

  getItemSeo(id) {
    return client.get(`/content/items/${id}/seo`).then(r => r.data);
  },
};

export default contentService;
