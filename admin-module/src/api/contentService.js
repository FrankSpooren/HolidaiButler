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

  improveItem(id) {
    return client.post(`/content/items/${id}/improve`).then(r => r.data);
  },

  // === Calendar & Scheduling (Fase C) ===

  getCalendar(destinationId, { month, year } = {}) {
    const params = { destination_id: destinationId };
    if (month) params.month = month;
    if (year) params.year = year;
    return client.get('/content/calendar', { params }).then(r => r.data);
  },

  scheduleItem(id, data) {
    return client.post(`/content/items/${id}/schedule`, data).then(r => r.data);
  },

  publishNow(id, data) {
    return client.post(`/content/items/${id}/publish-now`, data).then(r => r.data);
  },

  cancelSchedule(id) {
    return client.delete(`/content/items/${id}/schedule`).then(r => r.data);
  },

  rescheduleItem(id, data) {
    return client.patch(`/content/items/${id}/reschedule`, data).then(r => r.data);
  },

  // === Performance (Fase C) ===

  getPerformanceSummary(destinationId, { days = 30 } = {}) {
    const params = { destination_id: destinationId, days };
    return client.get('/content/performance/summary', { params }).then(r => r.data);
  },

  getPerformanceDetail(id) {
    return client.get(`/content/performance/${id}`).then(r => r.data);
  },

  // === Social Accounts (Fase C) ===

  getSocialAccounts(destinationId) {
    return client.get('/content/social-accounts', { params: { destination_id: destinationId } }).then(r => r.data);
  },

  connectLinkedIn(data) {
    return client.post('/content/social-accounts/connect/linkedin', data).then(r => r.data);
  },

  disconnectAccount(id) {
    return client.delete(`/content/social-accounts/${id}`).then(r => r.data);
  },

  refreshAccountToken(id) {
    return client.post(`/content/social-accounts/${id}/refresh`).then(r => r.data);
  },

  // === Analytics (Fase D) ===

  getAnalyticsOverview(destinationId, { days = 30 } = {}) {
    return client.get('/content/analytics/overview', { params: { destination_id: destinationId, days } }).then(r => r.data);
  },

  getAnalyticsItems(destinationId, { days = 30, limit = 50, offset = 0, sort_by = 'engagement', content_type } = {}) {
    const params = { destination_id: destinationId, days, limit, offset, sort_by };
    if (content_type) params.content_type = content_type;
    return client.get('/content/analytics/items', { params }).then(r => r.data);
  },

  getAnalyticsPlatforms(destinationId, { days = 30 } = {}) {
    return client.get('/content/analytics/platforms', { params: { destination_id: destinationId, days } }).then(r => r.data);
  },

  // === Seasonal Config (Fase C) ===

  getSeasons(destinationId) {
    return client.get('/content/seasons', { params: { destination_id: destinationId } }).then(r => r.data);
  },

  getCurrentSeason(destinationId) {
    return client.get('/content/seasons/current', { params: { destination_id: destinationId } }).then(r => r.data);
  },

  createSeason(data) {
    return client.post('/content/seasons', data).then(r => r.data);
  },

  updateSeason(id, data) {
    return client.patch(`/content/seasons/${id}`, data).then(r => r.data);
  },

  deleteSeason(id) {
    return client.delete(`/content/seasons/${id}`).then(r => r.data);
  },

  activateSeason(id) {
    return client.post(`/content/seasons/${id}/activate`).then(r => r.data);
  },
};

export default contentService;
