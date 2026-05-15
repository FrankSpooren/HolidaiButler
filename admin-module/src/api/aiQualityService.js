import client from './client.js';

const BASE = '/brand-sources/ai-quality';

export const aiQualityService = {
  /** Samenvatting (totals + by_operation + recent_failures) */
  getSummary: (destination, days = 30) =>
    client.get(BASE, { params: { destinationId: destination, days } }).then((r) => r.data),

  /** Dagelijkse trend (passed/failed/pass_rate/hallucination_rate per dag) */
  getTrend: (destination, days = 30) =>
    client.get(`${BASE}/trend`, { params: { destinationId: destination, days } }).then((r) => r.data),

  /** Top-N ungrounded entities (frequentie-ranked) */
  getTopEntities: (destination, days = 30, limit = 10) =>
    client.get(`${BASE}/top-entities`, { params: { destinationId: destination, days, limit } }).then((r) => r.data),

  /** Retry-rate metrics (avg retries, success rate na retry) */
  getRetryStats: (destination, days = 30) =>
    client.get(`${BASE}/retry-stats`, { params: { destinationId: destination, days } }).then((r) => r.data),

  /** CSV download URL — frontend opent met window.open ofwel client.get blob */
  exportCsvUrl: (destination, days = 30) =>
    `${client.defaults.baseURL || ''}${BASE}/export.csv?destinationId=${destination}&days=${days}`,
};
