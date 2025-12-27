import apiClient from '@/shared/utils/api';
import type { POI, POISearchParams, POIResponse } from '../types/poi.types';

export const poiService = {
  /**
   * Get all POIs with optional filtering
   * @param params - Search parameters including optional language (lang)
   */
  async getPOIs(params?: POISearchParams): Promise<POIResponse> {
    const { data } = await apiClient.get<POIResponse>('/pois', { params });
    return data;
  },

  /**
   * Get a single POI by ID
   * @param id - POI ID (MySQL numeric ID or Google Place ID string)
   * @param lang - Optional language code (en, nl, de, es, sv, pl)
   */
  async getPOIById(id: number | string, lang?: string): Promise<POI> {
    const params = lang ? { lang } : {};
    const { data } = await apiClient.get<{ data: POI }>(`/pois/${id}`, { params });
    return data.data;
  },

  /**
   * Search POIs with advanced features (fuzzy matching, highlighting)
   * @param params - Search parameters including optional language (lang)
   */
  async searchPOIs(params: POISearchParams): Promise<POIResponse> {
    const { data } = await apiClient.get<POIResponse>('/pois/search', { params });
    return data;
  },

  /**
   * Get POIs by category
   * @param category - Category name
   * @param params - Additional search parameters including optional language (lang)
   */
  async getPOIsByCategory(category: string, params?: Omit<POISearchParams, 'category'>): Promise<POIResponse> {
    const { data } = await apiClient.get<POIResponse>('/pois', {
      params: { ...params, category },
    });
    return data;
  },

  /**
   * Get autocomplete suggestions with POI data
   * @param query - Search query
   */
  async getAutocomplete(query: string): Promise<Array<{ id: number; name: string; category: string }>> {
    const { data } = await apiClient.get<{ data: Array<{ id: number; name: string; category: string }> }>('/pois/autocomplete', {
      params: { q: query },
    });
    return data.data;
  },

  /**
   * Get POIs as GeoJSON for map display
   * @param params - Search parameters including optional language (lang)
   */
  async getGeoJSON(params?: POISearchParams): Promise<any> {
    const { data } = await apiClient.get('/pois/geojson', { params });
    return data;
  },
};

export default poiService;
