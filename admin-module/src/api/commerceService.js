import client from './client.js';

export const commerceService = {
  getDashboard: (destinationId, from, to) =>
    client.get('/commerce/dashboard', {
      params: { destinationId, ...(from && { from }), ...(to && { to }) }
    }).then(r => r.data),

  getDailyReport: (destinationId, from, to) =>
    client.get('/commerce/reports/daily', {
      params: { destinationId, from, to }
    }).then(r => r.data),

  getWeeklyReport: (destinationId, from, to) =>
    client.get('/commerce/reports/weekly', {
      params: { destinationId, from, to }
    }).then(r => r.data),

  getMonthlyReport: (destinationId, year) =>
    client.get('/commerce/reports/monthly', {
      params: { destinationId, year }
    }).then(r => r.data),

  getReconciliation: (destinationId, date) =>
    client.get('/commerce/reports/reconciliation', {
      params: { destinationId, date }
    }).then(r => r.data),

  getAlerts: (destinationId) =>
    client.get('/commerce/alerts', {
      params: { destinationId }
    }).then(r => r.data),

  getTopPOIs: (destinationId, from, to, metric = 'revenue', limit = 10) =>
    client.get('/commerce/top-pois', {
      params: { destinationId, from, to, metric, limit }
    }).then(r => r.data),

  exportTransactions: (destinationId, from, to) =>
    client.get('/commerce/export/transactions', {
      params: { destinationId, from, to },
      responseType: 'blob'
    }),

  exportReservations: (destinationId, from, to) =>
    client.get('/commerce/export/reservations', {
      params: { destinationId, from, to },
      responseType: 'blob'
    }),

  exportTicketOrders: (destinationId, from, to) =>
    client.get('/commerce/export/tickets', {
      params: { destinationId, from, to },
      responseType: 'blob'
    })
};
