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

  deleteTrending(id) {
    return client.delete(`/content/trending/${id}`).then(r => r.data);
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
    return client.post('/content/suggestions/generate', { destination_id: destinationId }, { timeout: 120000 }).then(r => r.data);
  },

  updateSuggestion(id, data) {
    return client.patch(`/content/suggestions/${id}`, data).then(r => r.data);
  },

  createSuggestion(data) {
    return client.post('/content/suggestions', data).then(r => r.data);
  },

  // === Content Concepts ===

  getConcepts(destinationId, { status, limit = 50, offset = 0 } = {}) {
    const params = { destination_id: destinationId, limit, offset };
    if (status) params.status = status;
    return client.get('/content/concepts', { params }).then(r => r.data);
  },

  getConcept(conceptId) {
    return client.get(`/content/concepts/${conceptId}`).then(r => r.data);
  },

  generateConcept(data) {
    return client.post('/content/concepts/generate', data, { timeout: 300000 }).then(r => r.data);
  },

  deleteConcept(conceptId) {
    return client.delete(`/content/concepts/${conceptId}`).then(r => r.data);
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
    return client.post('/content/items/generate', data, { timeout: 120000 }).then(r => r.data);
  },

  generateCampaign(data) {
    return client.post('/content/campaigns/generate', data, { timeout: 300000 }).then(r => r.data);
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

  getItemSeo(id, platform) {
    const params = platform ? { platform } : {};
    return client.get(`/content/items/${id}/seo`, { params }).then(r => r.data);
  },

  improveItem(id) {
    return client.post(`/content/items/${id}/improve`, {}, { timeout: 120000 }).then(r => r.data);
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

  connectMeta(data) {
    return client.post('/content/social-accounts/connect/meta', data).then(r => r.data);
  },

  connectLinkedIn(data) {
    return client.post('/content/social-accounts/connect/linkedin', data).then(r => r.data);
  },

  connectPinterest(data) {
    return client.post('/content/social-accounts/connect/pinterest', data).then(r => r.data);
  },

  connectYouTube(data) {
    return client.post('/content/social-accounts/connect/youtube', data).then(r => r.data);
  },

  disconnectAccount(id) {
    return client.delete(`/content/social-accounts/${id}`).then(r => r.data);
  },

  refreshAccountToken(id) {
    return client.post(`/content/social-accounts/${id}/refresh`).then(r => r.data);
  },

  updateSocialAccount(id, data) {
    return client.patch(`/content/social-accounts/${id}`, data).then(r => r.data);
  },

  getSocialPlatforms(destinationId) {
    return client.get('/content/social-platforms', { params: { destination_id: destinationId } }).then(r => r.data);
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

  // === Wave 5: Enterprise Workflow & Intelligence ===

  getComments(itemId) {
    return client.get(`/content/items/${itemId}/comments`).then(r => r.data);
  },

  addComment(itemId, comment) {
    return client.post(`/content/items/${itemId}/comments`, { comment }).then(r => r.data);
  },

  getRevisions(itemId) {
    return client.get(`/content/items/${itemId}/revisions`).then(r => r.data);
  },

  restoreRevision(itemId, revisionId) {
    return client.post(`/content/items/${itemId}/revisions/${revisionId}/restore`).then(r => r.data);
  },

  getApprovalLog(itemId) {
    return client.get(`/content/items/${itemId}/approval-log`).then(r => r.data);
  },

  getPillars(destinationId) {
    return client.get('/content/pillars', { params: { destination_id: destinationId } }).then(r => r.data);
  },

  createPillar(data) {
    return client.post('/content/pillars', data).then(r => r.data);
  },

  updatePillar(id, data) {
    return client.patch(`/content/pillars/${id}`, data).then(r => r.data);
  },

  deletePillar(id) {
    return client.delete(`/content/pillars/${id}`).then(r => r.data);
  },

  getPillarBalance(destinationId) {
    return client.get('/content/pillars/balance', { params: { destination_id: destinationId } }).then(r => r.data);
  },

  getBestTimes(destinationId, platform, market) {
    const params = { destination_id: destinationId, platform };
    if (market) params.market = market;
    return client.get('/content/best-times', { params }).then(r => r.data);
  },

  generateHashtags(itemId, category) {
    return client.post(`/content/items/${itemId}/hashtags`, { category }).then(r => r.data);
  },

  bulkApprove(ids) {
    return client.post('/content/bulk/approve', { ids }).then(r => r.data);
  },

  bulkReject(ids, reason) {
    return client.post('/content/bulk/reject', { ids, reason }).then(r => r.data);
  },

  bulkSchedule(ids, scheduled_at) {
    return client.post('/content/bulk/schedule', { ids, scheduled_at }).then(r => r.data);
  },

  bulkDelete(ids) {
    return client.post('/content/bulk/delete', { ids }).then(r => r.data);
  },

  // === Wave 6: Platform Completion ===

  getTemplates(destinationId) {
    return client.get('/content/templates', { params: { destination_id: destinationId } }).then(r => r.data);
  },

  retryPublish(itemId) {
    return client.post(`/content/items/${itemId}/retry-publish`).then(r => r.data);
  },

  getBrandScore(itemId) {
    return client.get(`/content/items/${itemId}/brand-score`).then(r => r.data);
  },

  brandCheck(data) {
    return client.post('/content/brand-check', data).then(r => r.data);
  },

  repurposeItem(id, targetPlatforms) {
    return client.post(`/content/items/${id}/repurpose`, { target_platforms: targetPlatforms }, { timeout: 120000 }).then(r => r.data);
  },

  shareToDestination(itemId, targetDestinationId) {
    return client.post(`/content/items/${itemId}/share-to-destination`, { destination_id: targetDestinationId }, { timeout: 120000 }).then(r => r.data);
  },

  generateFromPOI(poiId, data) {
    return client.post('/content/generate-from-poi', { poi_id: poiId, ...data }, { timeout: 600000 }).then(r => r.data);
  },

  // === Image Management (Blok 2) ===

  attachImages(itemId, mediaIds) {
    return client.post(`/content/items/${itemId}/images`, { media_ids: mediaIds }).then(r => r.data);
  },

  detachImage(itemId, mediaId) {
    return client.delete(`/content/items/${itemId}/images/${mediaId}`).then(r => r.data);
  },

  suggestImages(data) {
    return client.post('/content/images/suggest', data).then(r => r.data);
  },

  searchUnsplash(query, perPage = 6) {
    return client.post('/content/images/unsplash', { query, per_page: perPage }).then(r => r.data);
  },

  searchPexels(query, perPage = 6) {
    return client.post('/content/images/pexels', { query, per_page: perPage }).then(r => r.data);
  },

  searchFlickr(query, perPage = 6) {
    return client.post('/content/images/flickr', { query, per_page: perPage }).then(r => r.data);
  },

  formatImage(imagePath, platform, format = 'post') {
    return client.post('/content/images/format', { image_path: imagePath, platform, format }).then(r => r.data);
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
