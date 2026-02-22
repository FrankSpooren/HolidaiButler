import { DESTINATION_COLORS } from '../theme.js';

export const DESTINATIONS = [
  { id: 1, code: 'calpe', name: 'Calpe', flag: '🇪🇸', color: DESTINATION_COLORS.calpe },
  { id: 2, code: 'texel', name: 'Texel', flag: '🇳🇱', color: DESTINATION_COLORS.texel }
];

export function getDestinationColor(code) {
  return DESTINATION_COLORS[code] || '#888';
}

export function getDestinationById(id) {
  return DESTINATIONS.find(d => d.id === id);
}
