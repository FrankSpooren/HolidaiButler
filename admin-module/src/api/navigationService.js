import client from './client.js';

export const navigationService = {
  getDestinations: () =>
    client.get('/destinations').then(r => r.data),

  update: (destinationId, navItems) =>
    client.put(`/destinations/${destinationId}/navigation`, { nav_items: navItems }).then(r => r.data)
};
