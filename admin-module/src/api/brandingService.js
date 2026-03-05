import client from './client.js';

export const brandingService = {
  getDestinations: () =>
    client.get('/destinations').then(r => r.data),

  updateBranding: (destinationId, data) =>
    client.put(`/destinations/${destinationId}/branding`, data).then(r => r.data),

  uploadLogo: (destination, file) => {
    const formData = new FormData();
    formData.append('logo', file);
    return client.post(`/settings/branding/${destination}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  }
};
