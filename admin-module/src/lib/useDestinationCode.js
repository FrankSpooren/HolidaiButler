/**
 * useDestinationCode(destinationId) — resolve destination code (bv 'bute', 'calpe')
 * uit een numeric destinationId via destinationStore.destinations array.
 * Returns null als nog niet beschikbaar.
 */
import useDestinationStore from '../stores/destinationStore.js';

export default function useDestinationCode(destinationId) {
  const destinations = useDestinationStore((s) => s.destinations);
  if (!destinationId || !Array.isArray(destinations) || destinations.length === 0) return null;
  const match = destinations.find((d) => Number(d.id) === Number(destinationId));
  return match?.code || null;
}
