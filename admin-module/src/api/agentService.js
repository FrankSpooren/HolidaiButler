import client from './client.js';

export const fetchAgentStatus = async (params = {}) => {
  const { category, destination, refresh } = params;
  const queryParams = new URLSearchParams();
  if (category && category !== 'all') queryParams.set('category', category);
  if (destination && destination !== 'all') queryParams.set('destination', destination);
  if (refresh) queryParams.set('refresh', 'true');
  const qs = queryParams.toString();
  return client.get(`/agents/status${qs ? `?${qs}` : ''}`);
};
