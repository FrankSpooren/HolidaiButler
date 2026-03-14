import client from './client.js';

/**
 * Content Studio API service
 */
const contentService = {
  /**
   * Get trending keywords list
   */
  getTrending(destinationId, { period = '30d', market, language, limit = 50, offset = 0 } = {}) {
    const params = { destination_id: destinationId, period, limit, offset };
    if (market) params.market = market;
    if (language) params.language = language;
    return client.get('/content/trending', { params }).then(r => r.data);
  },

  /**
   * Get trending summary (charts, word cloud data)
   */
  getTrendingSummary(destinationId, { period = '30d' } = {}) {
    return client.get('/content/trending/summary', { params: { destination_id: destinationId, period } }).then(r => r.data);
  },

  /**
   * Manually add a trending keyword
   */
  addManualTrend(data) {
    return client.post('/content/trending/manual', data).then(r => r.data);
  },
};

export default contentService;
