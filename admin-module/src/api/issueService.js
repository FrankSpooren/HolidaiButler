import client from './client.js';

export const issueService = {
  list: (params = {}) => {
    const qp = new URLSearchParams();
    if (params.page) qp.set('page', params.page);
    if (params.limit) qp.set('limit', params.limit);
    if (params.status) qp.set('status', params.status);
    if (params.severity) qp.set('severity', params.severity);
    if (params.agent) qp.set('agent', params.agent);
    const qs = qp.toString();
    return client.get(`/issues${qs ? `?${qs}` : ''}`).then(r => r.data);
  },

  stats: () => client.get('/issues/stats').then(r => r.data),

  getById: (issueId) => client.get(`/issues/${issueId}`).then(r => r.data),

  updateStatus: (issueId, data) =>
    client.put(`/issues/${issueId}/status`, data).then(r => r.data)
};
