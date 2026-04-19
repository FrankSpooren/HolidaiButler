import client from './client.js';

export const analyticsService = {
  getOverview: (destination) =>
    client.get('/analytics', { params: destination ? { destination } : {} }).then(r => r.data),

  getChatbot: (destination, period = 30) =>
    client.get('/analytics/chatbot', { params: { ...(destination && { destination }), period } }).then(r => r.data),

  getTrend: (metric, destination, period = 30) =>
    client.get(`/analytics/trend/${metric}`, { params: { ...(destination && { destination }), period } }).then(r => r.data),

  getSnapshot: (destination) =>
    client.get('/analytics/snapshot', { params: destination ? { destination } : {} }).then(r => r.data),

  getPageviews: (destination, period = 'month') =>
    client.get('/analytics/pageviews', { params: { ...(destination && { destination }), period } }).then(r => r.data),

  getWebsite: (destination, period = 30) =>
    client.get('/analytics/website', { params: { ...(destination && { destination }), period } }).then(r => r.data),

  exportCsv: (type = 'summary', destination) =>
    client.get('/analytics/export', {
      params: { type, ...(destination && { destination }) },
      responseType: 'blob'
    }).then(r => r.data),
  getReport: (destination, period = 'last_month', start, end) =>
    client.get('/analytics/report', { params: { ...(destination && { destination }), period, ...(start && { start }), ...(end && { end }) } }).then(r => r.data),
};
