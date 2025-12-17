import { useQuery, useQueries } from '@tanstack/react-query';
import { poiService } from '../services/poiService';
import type { POI, POISearchParams } from '../types/poi.types';
import { useLanguage } from '../../../i18n/LanguageContext';

/**
 * Hook to fetch POIs with optional filtering
 * Automatically includes current language for translated content
 */
export function usePOIs(params?: POISearchParams) {
  const { language } = useLanguage();

  // Include language in params for translated content
  const paramsWithLang = {
    ...params,
    lang: params?.lang || language,
  };

  return useQuery({
    queryKey: ['pois', paramsWithLang],
    queryFn: () => poiService.getPOIs(paramsWithLang),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes (cache time)
  });
}

/**
 * Hook to fetch a single POI by ID
 * Automatically includes current language for translated content
 */
export function usePOI(id: number) {
  const { language } = useLanguage();

  return useQuery({
    queryKey: ['poi', id, language],
    queryFn: () => poiService.getPOIById(id, language),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to search POIs with advanced features
 * Automatically includes current language for translated content
 */
export function usePOISearch(params: POISearchParams) {
  const { language } = useLanguage();

  const paramsWithLang = {
    ...params,
    lang: params?.lang || language,
  };

  return useQuery({
    queryKey: ['pois', 'search', paramsWithLang],
    queryFn: () => poiService.searchPOIs(paramsWithLang),
    enabled: !!(params.q || params.category), // Only run if query or category provided
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get POIs by category
 * Automatically includes current language for translated content
 */
export function usePOIsByCategory(category: string, params?: Omit<POISearchParams, 'category'>) {
  const { language } = useLanguage();

  const paramsWithLang = {
    ...params,
    lang: (params as any)?.lang || language,
  };

  return useQuery({
    queryKey: ['pois', 'category', category, paramsWithLang],
    queryFn: () => poiService.getPOIsByCategory(category, paramsWithLang),
    enabled: !!category,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch multiple POIs by their IDs
 * Uses parallel queries for efficient fetching
 * Automatically includes current language for translated content
 */
export function usePOIsByIds(ids: number[]) {
  const { language } = useLanguage();

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['poi', id, language],
      queryFn: () => poiService.getPOIById(id, language),
      enabled: !!id,
      staleTime: 10 * 60 * 1000,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const data: POI[] = queries
    .filter((q) => q.data)
    .map((q) => q.data as POI);

  return {
    data,
    isLoading,
    isError,
    queries,
  };
}
