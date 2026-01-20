import apiClient from '@/shared/utils/api';
import type { POI, POISearchParams, POIResponse } from '../types/poi.types';

export const poiService = {
  /**
   * Get all POIs with optional filtering
   */
  async getPOIs(params?: POISearchParams): Promise<POIResponse> {
    const { data } = await apiClient.get<POIResponse>('/pois', { params });
    return data;
  },

  /**
   * Get a single POI by ID
   */
  async getPOIById(id: number): Promise<POI> {
    const { data } = await apiClient.get<{ data: POI }>(`/pois/${id}`);
    return data.data;
  },

  /**
   * Search POIs with advanced features (fuzzy matching, highlighting)
   */
  async searchPOIs(params: POISearchParams): Promise<POIResponse> {
    const { data } = await apiClient.get<POIResponse>('/pois/search', { params });
    return data;
  },

  /**
   * Get POIs by category
   */
  async getPOIsByCategory(category: string, params?: Omit<POISearchParams, 'category'>): Promise<POIResponse> {
    const { data } = await apiClient.get<POIResponse>('/pois', {
      params: { ...params, category },
    });
    return data;
  },

  /**
   * Get autocomplete suggestions with POI data
   */
  async getAutocomplete(query: string): Promise<Array<{ id: number; name: string; category: string }>> {
    const { data } = await apiClient.get<{ data: Array<{ id: number; name: string; category: string }> }>('/pois/autocomplete', {
      params: { q: query },
    });
    return data.data;
  },

  /**
   * Get POIs as GeoJSON for map display
   */
  async getGeoJSON(params?: POISearchParams): Promise<any> {
    const { data } = await apiClient.get('/pois/geojson', { params });
    return data;
  },
};

export default poiService;
