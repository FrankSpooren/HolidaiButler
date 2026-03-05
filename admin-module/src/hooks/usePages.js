import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pageService } from '../api/pageService.js';

export function usePages(destinationId) {
  return useQuery({
    queryKey: ['pages', destinationId],
    queryFn: () => pageService.list(destinationId),
    staleTime: 30 * 1000,
    keepPreviousData: true
  });
}

export function usePage(id) {
  return useQuery({
    queryKey: ['page', id],
    queryFn: () => pageService.get(id),
    enabled: !!id,
    staleTime: 30 * 1000
  });
}

export function usePageCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => pageService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
    }
  });
}

export function usePageUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => pageService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      queryClient.invalidateQueries({ queryKey: ['page', variables.id] });
    }
  });
}

export function usePageDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => pageService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
    }
  });
}
