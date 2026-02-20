import client from './client.js';

export const authService = {
  login: (email, password) =>
    client.post('/auth/login', { email, password }).then(r => r.data),

  refresh: (refreshToken) =>
    client.post('/auth/refresh', { refreshToken }).then(r => r.data),

  logout: (refreshToken) =>
    client.post('/auth/logout', { refreshToken }).then(r => r.data),

  getMe: () =>
    client.get('/auth/me').then(r => r.data)
};
