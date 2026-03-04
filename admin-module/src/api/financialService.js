import client from './client.js';

export const financialService = {
  // Dashboard
  getDashboard: (destinationId, from, to) =>
    client.get('/financial/dashboard', {
      params: { destinationId, ...(from && { from }), ...(to && { to }) }
    }).then(r => r.data),

  // Monthly report
  getMonthlyReport: (destinationId, year) =>
    client.get('/financial/reports/monthly', {
      params: { destinationId, year }
    }).then(r => r.data),

  // Settlements
  getSettlements: (destinationId, filters = {}) =>
    client.get('/financial/settlements', {
      params: { destinationId, ...filters }
    }).then(r => r.data),

  getSettlementById: (id, destinationId) =>
    client.get(`/financial/settlements/${id}`, {
      params: { destinationId }
    }).then(r => r.data),

  createSettlement: (data) =>
    client.post('/financial/settlements', data).then(r => r.data),

  approveSettlement: (id) =>
    client.put(`/financial/settlements/${id}/approve`).then(r => r.data),

  processSettlement: (id) =>
    client.put(`/financial/settlements/${id}/process`).then(r => r.data),

  cancelSettlement: (id, reason) =>
    client.put(`/financial/settlements/${id}/cancel`, { reason }).then(r => r.data),

  // Payouts
  getPayouts: (destinationId, filters = {}) =>
    client.get('/financial/payouts', {
      params: { destinationId, ...filters }
    }).then(r => r.data),

  getPayoutById: (id, destinationId) =>
    client.get(`/financial/payouts/${id}`, {
      params: { destinationId }
    }).then(r => r.data),

  markPayoutPaid: (id, paidReference) =>
    client.put(`/financial/payouts/${id}/paid`, { paidReference }).then(r => r.data),

  markPayoutFailed: (id, failureReason) =>
    client.put(`/financial/payouts/${id}/failed`, { failureReason }).then(r => r.data),

  // Credit Notes
  getCreditNotes: (destinationId, filters = {}) =>
    client.get('/financial/credit-notes', {
      params: { destinationId, ...filters }
    }).then(r => r.data),

  getCreditNoteById: (id, destinationId) =>
    client.get(`/financial/credit-notes/${id}`, {
      params: { destinationId }
    }).then(r => r.data),

  createCreditNote: (data) =>
    client.post('/financial/credit-notes', data).then(r => r.data),

  finalizeCreditNote: (id) =>
    client.put(`/financial/credit-notes/${id}/finalize`).then(r => r.data),

  // Audit log
  getAuditLog: (destinationId, filters = {}) =>
    client.get('/financial/audit-log', {
      params: { destinationId, ...filters }
    }).then(r => r.data),

  // CSV Exports
  exportPayouts: (destinationId, from, to) =>
    client.get('/financial/export/payouts', {
      params: { destinationId, from, to },
      responseType: 'blob'
    }),

  exportCreditNotes: (destinationId, from, to) =>
    client.get('/financial/export/credit-notes', {
      params: { destinationId, from, to },
      responseType: 'blob'
    }),

  exportTaxSummary: (destinationId, year) =>
    client.get('/financial/export/tax-summary', {
      params: { destinationId, year },
      responseType: 'blob'
    })
};
