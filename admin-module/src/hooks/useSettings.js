import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '../api/settingsService.js';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsService.getSettings(),
    staleTime: 60 * 1000
  });
}

export function useAuditLog(filters = {}) {
  return useQuery({
    queryKey: ['audit-log', filters],
    queryFn: () => settingsService.getAuditLog(filters),
    staleTime: 30 * 1000,
    keepPreviousData: true
  });
}

export function useClearCache() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => settingsService.clearCache(payload),
    onSuccess: () => {
      queryClient.invalidateQueries();
    }
  });
}
