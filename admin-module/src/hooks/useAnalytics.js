import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../api/analyticsService.js';

export function useAnalyticsOverview(destination) {
  return useQuery({
    queryKey: ['analytics-overview', destination],
    queryFn: () => analyticsService.getOverview(destination),
    staleTime: 10 * 60 * 1000
  });
}

export function useChatbotAnalytics(destination, period = 30) {
  return useQuery({
    queryKey: ['analytics-chatbot', destination, period],
    queryFn: () => analyticsService.getChatbot(destination, period),
    staleTime: 5 * 60 * 1000
  });
}

export function useAnalyticsTrend(metric, destination, period = 30, enabled = true) {
  return useQuery({
    queryKey: ['analytics-trend', metric, destination, period],
    queryFn: () => analyticsService.getTrend(metric, destination, period),
    staleTime: 5 * 60 * 1000,
    enabled
  });
}

export function useAnalyticsSnapshot(destination) {
  return useQuery({
    queryKey: ['analytics-snapshot', destination],
    queryFn: () => analyticsService.getSnapshot(destination),
    staleTime: 5 * 60 * 1000
  });
}

export function usePageviewAnalytics(destination, period = 'month') {
  return useQuery({
    queryKey: ['analytics-pageviews', destination, period],
    queryFn: () => analyticsService.getPageviews(destination, period),
    staleTime: 5 * 60 * 1000
  });
}
