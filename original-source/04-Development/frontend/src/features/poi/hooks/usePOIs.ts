import { useQuery } from '@tanstack/react-query';
import { poiService } from '../services/poiService';
import type { POISearchParams } from '../types/poi.types';

/**
 * Hook to fetch POIs with optional filtering
 */
export function usePOIs(params?: POISearchParams) {
  return useQuery({
    queryKey: ['pois', params],
    queryFn: () => poiService.getPOIs(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes (cache time)
  });
}

/**
 * Hook to fetch a single POI by ID
 */
export function usePOI(id: number) {
  return useQuery({
    queryKey: ['poi', id],
    queryFn: () => poiService.getPOIById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to search POIs with advanced features
 */
export function usePOISearch(params: POISearchParams) {
  return useQuery({
    queryKey: ['pois', 'search', params],
    queryFn: () => poiService.searchPOIs(params),
    enabled: !!(params.q || params.category), // Only run if query or category provided
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get POIs by category
 */
export function usePOIsByCategory(category: string, params?: Omit<POISearchParams, 'category'>) {
  return useQuery({
    queryKey: ['pois', 'category', category, params],
    queryFn: () => poiService.getPOIsByCategory(category, params),
    enabled: !!category,
    staleTime: 5 * 60 * 1000,
  });
}
