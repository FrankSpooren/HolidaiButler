import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { poiService } from '../api/poiService.js';

export function usePOIList(filters = {}) {
  return useQuery({
    queryKey: ['pois', filters],
    queryFn: () => poiService.list(filters),
    staleTime: 60 * 1000,
    keepPreviousData: true
  });
}

export function usePOIStats() {
  return useQuery({
    queryKey: ['poi-stats'],
    queryFn: () => poiService.stats(),
    staleTime: 5 * 60 * 1000
  });
}

export function usePOIDetail(id) {
  return useQuery({
    queryKey: ['poi-detail', id],
    queryFn: () => poiService.getById(id),
    enabled: !!id,
    staleTime: 30 * 1000
  });
}

export function usePOIUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => poiService.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pois'] });
      queryClient.invalidateQueries({ queryKey: ['poi-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['poi-stats'] });
    }
  });
}

export function usePOICategories(destination) {
  return useQuery({
    queryKey: ['poi-categories', destination],
    queryFn: () => poiService.categories(destination !== 'all' ? destination : undefined),
    staleTime: 5 * 60 * 1000
  });
}

export function usePOIImageReorder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ poiId, imageIds }) => poiService.reorderImages(poiId, imageIds),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['poi-detail', variables.poiId] });
    }
  });
}

export function usePOIImageDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ poiId, imageId }) => poiService.deleteImage(poiId, imageId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['poi-detail', variables.poiId] });
      queryClient.invalidateQueries({ queryKey: ['poi-stats'] });
    }
  });
}
