import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../api/analyticsService.js';

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => analyticsService.getOverview(),
    staleTime: 10 * 60 * 1000
  });
}
