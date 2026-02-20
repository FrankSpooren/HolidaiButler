import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../api/dashboardService.js';

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => dashboardService.getKPIs(),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: () => dashboardService.getHealth(),
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000
  });
}
