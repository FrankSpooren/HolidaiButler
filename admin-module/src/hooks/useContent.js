import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import contentService from '../api/contentService.js';

// === Suggestions ===

export function useContentSuggestions(destinationId, { status, limit = 50, offset = 0 } = {}) {
  return useQuery({
    queryKey: ['content-suggestions', destinationId, status, limit, offset],
    queryFn: () => contentService.getSuggestions(destinationId, { status, limit, offset }),
    staleTime: 2 * 60 * 1000,
    enabled: !!destinationId,
  });
}

export function useGenerateSuggestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (destinationId) => contentService.generateSuggestions(destinationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-suggestions'] }),
  });
}

export function useUpdateSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => contentService.updateSuggestion(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-suggestions'] }),
  });
}

// === Content Items ===

export function useContentItems(destinationId, { status, limit = 50, offset = 0 } = {}) {
  return useQuery({
    queryKey: ['content-items', destinationId, status, limit, offset],
    queryFn: () => contentService.getItems(destinationId, { status, limit, offset }),
    staleTime: 2 * 60 * 1000,
    enabled: !!destinationId,
  });
}

export function useContentItem(id) {
  return useQuery({
    queryKey: ['content-item', id],
    queryFn: () => contentService.getItem(id),
    staleTime: 1 * 60 * 1000,
    enabled: !!id,
  });
}

export function useGenerateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => contentService.generateItem(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-items'] });
      qc.invalidateQueries({ queryKey: ['content-suggestions'] });
    },
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => contentService.updateItem(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['content-items'] });
      qc.invalidateQueries({ queryKey: ['content-item', id] });
    },
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => contentService.deleteItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-items'] }),
  });
}

export function useTranslateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, targetLang }) => contentService.translateItem(id, targetLang),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['content-item', id] }),
  });
}

export function useItemSeo(id) {
  return useQuery({
    queryKey: ['content-item-seo', id],
    queryFn: () => contentService.getItemSeo(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}
