import client from './client.js';

export const userService = {
  list: (params = {}) => client.get('/users', { params }).then(r => r.data),
  getById: (id) => client.get(`/users/${id}`).then(r => r.data),
  create: (data) => client.post('/users', data).then(r => r.data),
  update: (id, data) => client.put(`/users/${id}`, data).then(r => r.data),
  deactivate: (id) => client.put(`/users/${id}/deactivate`).then(r => r.data),
  remove: (id) => client.delete(`/users/${id}`, { data: { confirm: true } }).then(r => r.data),
  resetPassword: (id) => client.post(`/users/${id}/reset-password`).then(r => r.data)
};
