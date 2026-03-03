import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerService } from '../api/partnerService.js';

export function usePartnerList(destinationId, filters = {}) {
  return useQuery({
    queryKey: ['partners', destinationId, filters],
    queryFn: () => partnerService.list(destinationId, filters),
    enabled: !!destinationId,
    staleTime: 30 * 1000,
    keepPreviousData: true
  });
}

export function usePartnerDetail(id, destinationId) {
  return useQuery({
    queryKey: ['partner-detail', id, destinationId],
    queryFn: () => partnerService.getById(id, destinationId),
    enabled: !!id && !!destinationId,
    staleTime: 30 * 1000
  });
}

export function usePartnerStats(destinationId) {
  return useQuery({
    queryKey: ['partner-stats', destinationId],
    queryFn: () => partnerService.getStats(destinationId),
    enabled: !!destinationId,
    staleTime: 60 * 1000
  });
}

export function usePartnerCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => partnerService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['partner-stats'] });
    }
  });
}

export function usePartnerUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => partnerService.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['partner-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['partner-stats'] });
    }
  });
}

export function usePartnerUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => partnerService.updateStatus(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['partner-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['partner-stats'] });
    }
  });
}

export function usePartnerTransactions(id, destinationId, filters = {}) {
  return useQuery({
    queryKey: ['partner-transactions', id, destinationId, filters],
    queryFn: () => partnerService.getTransactions(id, destinationId, filters),
    enabled: !!id && !!destinationId,
    staleTime: 30 * 1000,
    keepPreviousData: true
  });
}
