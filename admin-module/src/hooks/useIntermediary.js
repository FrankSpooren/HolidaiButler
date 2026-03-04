import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { intermediaryService } from '../api/intermediaryService.js';

export function useIntermediaryList(destinationId, filters = {}) {
  return useQuery({
    queryKey: ['intermediary', destinationId, filters],
    queryFn: () => intermediaryService.list(destinationId, filters),
    enabled: !!destinationId,
    staleTime: 30 * 1000,
    keepPreviousData: true
  });
}

export function useIntermediaryDetail(id, destinationId) {
  return useQuery({
    queryKey: ['intermediary-detail', id, destinationId],
    queryFn: () => intermediaryService.getById(id, destinationId),
    enabled: !!id && !!destinationId,
    staleTime: 30 * 1000
  });
}

export function useIntermediaryStats(destinationId, dateFilters = {}) {
  return useQuery({
    queryKey: ['intermediary-stats', destinationId, dateFilters],
    queryFn: () => intermediaryService.getStats(destinationId, dateFilters),
    enabled: !!destinationId,
    staleTime: 60 * 1000
  });
}

export function useIntermediaryFunnel(destinationId, dateFilters = {}) {
  return useQuery({
    queryKey: ['intermediary-funnel', destinationId, dateFilters],
    queryFn: () => intermediaryService.getFunnel(destinationId, dateFilters),
    enabled: !!destinationId,
    staleTime: 60 * 1000
  });
}

export function useIntermediaryCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => intermediaryService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intermediary'] });
      queryClient.invalidateQueries({ queryKey: ['intermediary-stats'] });
      queryClient.invalidateQueries({ queryKey: ['partner-transactions'] });
    }
  });
}

export function useIntermediaryConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => intermediaryService.consent(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['intermediary'] });
      queryClient.invalidateQueries({ queryKey: ['intermediary-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['partner-transactions'] });
    }
  });
}

export function useIntermediaryConfirm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => intermediaryService.confirm(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['intermediary'] });
      queryClient.invalidateQueries({ queryKey: ['intermediary-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['intermediary-stats'] });
      queryClient.invalidateQueries({ queryKey: ['partner-transactions'] });
    }
  });
}

export function useIntermediaryShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => intermediaryService.share(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['intermediary'] });
      queryClient.invalidateQueries({ queryKey: ['intermediary-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['partner-transactions'] });
    }
  });
}

export function useIntermediaryCancel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => intermediaryService.cancel(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['intermediary'] });
      queryClient.invalidateQueries({ queryKey: ['intermediary-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['intermediary-stats'] });
      queryClient.invalidateQueries({ queryKey: ['partner-transactions'] });
    }
  });
}
