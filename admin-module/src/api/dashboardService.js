import client from './client.js';

export const dashboardService = {
  getKPIs: () =>
    client.get('/dashboard').then(r => r.data),

  getHealth: () =>
    client.get('/health').then(r => r.data)
};
