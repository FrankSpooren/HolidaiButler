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

export function useUndoAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (auditLogId) => settingsService.undoAction(auditLogId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-log'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    }
  });
}

export function useBranding() {
  return useQuery({
    queryKey: ['branding'],
    queryFn: () => settingsService.getBranding(),
    staleTime: 5 * 60 * 1000
  });
}

export function useUpdateBranding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ destination, data }) => settingsService.updateBranding(destination, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding'] });
    }
  });
}
