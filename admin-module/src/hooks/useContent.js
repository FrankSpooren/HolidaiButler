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

export function useImproveItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => contentService.improveItem(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['content-items'] });
      qc.invalidateQueries({ queryKey: ['content-item', id] });
      qc.invalidateQueries({ queryKey: ['content-item-seo', id] });
    },
  });
}

// === Calendar & Scheduling (Fase C) ===

export function useContentCalendar(destinationId, { month, year } = {}) {
  return useQuery({
    queryKey: ['content-calendar', destinationId, month, year],
    queryFn: () => contentService.getCalendar(destinationId, { month, year }),
    staleTime: 1 * 60 * 1000,
    enabled: !!destinationId,
  });
}

export function useScheduleItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => contentService.scheduleItem(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-items'] });
      qc.invalidateQueries({ queryKey: ['content-calendar'] });
    },
  });
}

export function usePublishNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => contentService.publishNow(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-items'] });
      qc.invalidateQueries({ queryKey: ['content-calendar'] });
    },
  });
}

export function useCancelSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => contentService.cancelSchedule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-items'] });
      qc.invalidateQueries({ queryKey: ['content-calendar'] });
    },
  });
}

export function useRescheduleItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => contentService.rescheduleItem(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-items'] });
      qc.invalidateQueries({ queryKey: ['content-calendar'] });
    },
  });
}

// === Performance (Fase C) ===

export function usePerformanceSummary(destinationId, { days = 30 } = {}) {
  return useQuery({
    queryKey: ['content-performance-summary', destinationId, days],
    queryFn: () => contentService.getPerformanceSummary(destinationId, { days }),
    staleTime: 5 * 60 * 1000,
    enabled: !!destinationId,
  });
}

export function usePerformanceDetail(id) {
  return useQuery({
    queryKey: ['content-performance-detail', id],
    queryFn: () => contentService.getPerformanceDetail(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

// === Analytics (Fase D) ===

export function useAnalyticsOverview(destinationId, { days = 30 } = {}) {
  return useQuery({
    queryKey: ['content-analytics-overview', destinationId, days],
    queryFn: () => contentService.getAnalyticsOverview(destinationId, { days }),
    staleTime: 5 * 60 * 1000,
    enabled: !!destinationId,
  });
}

export function useAnalyticsItems(destinationId, opts = {}) {
  return useQuery({
    queryKey: ['content-analytics-items', destinationId, opts],
    queryFn: () => contentService.getAnalyticsItems(destinationId, opts),
    staleTime: 5 * 60 * 1000,
    enabled: !!destinationId,
  });
}

export function useAnalyticsPlatforms(destinationId, { days = 30 } = {}) {
  return useQuery({
    queryKey: ['content-analytics-platforms', destinationId, days],
    queryFn: () => contentService.getAnalyticsPlatforms(destinationId, { days }),
    staleTime: 5 * 60 * 1000,
    enabled: !!destinationId,
  });
}

// === Social Accounts (Fase C) ===

export function useSocialAccounts(destinationId) {
  return useQuery({
    queryKey: ['social-accounts', destinationId],
    queryFn: () => contentService.getSocialAccounts(destinationId),
    staleTime: 5 * 60 * 1000,
    enabled: !!destinationId,
  });
}

export function useDisconnectAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => contentService.disconnectAccount(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-accounts'] }),
  });
}

export function useRefreshAccountToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => contentService.refreshAccountToken(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-accounts'] }),
  });
}

// === Seasonal Config (Fase C) ===

export function useSeasons(destinationId) {
  return useQuery({
    queryKey: ['content-seasons', destinationId],
    queryFn: () => contentService.getSeasons(destinationId),
    staleTime: 5 * 60 * 1000,
    enabled: !!destinationId,
  });
}

export function useCurrentSeason(destinationId) {
  return useQuery({
    queryKey: ['content-season-current', destinationId],
    queryFn: () => contentService.getCurrentSeason(destinationId),
    staleTime: 5 * 60 * 1000,
    enabled: !!destinationId,
  });
}

export function useCreateSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => contentService.createSeason(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-seasons'] }),
  });
}

export function useUpdateSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => contentService.updateSeason(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-seasons'] }),
  });
}

export function useDeleteSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => contentService.deleteSeason(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-seasons'] }),
  });
}

export function useActivateSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => contentService.activateSeason(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-seasons'] });
      qc.invalidateQueries({ queryKey: ['content-season-current'] });
    },
  });
}
