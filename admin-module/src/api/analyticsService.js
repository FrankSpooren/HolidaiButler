import client from './client.js';

export const analyticsService = {
  getOverview: () =>
    client.get('/analytics').then(r => r.data),

  exportCsv: (type = 'summary') =>
    client.get(`/analytics/export?type=${type}`, { responseType: 'blob' }).then(r => r.data)
};
