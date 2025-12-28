/**
 * Categories API Client
 */

import type { CategoriesResponse, Category } from '../types/category.types';

// Production fallback - use relative URL (Apache proxy)
const isProduction = typeof window !== 'undefined' && window.location.hostname.includes('holidaibutler.com');
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (isProduction ? '/api/v1' : 'http://localhost:3001/api/v1');

export const categoriesApi = {
  async getAll(language: string = 'nl'): Promise<Category[]> {
    const response = await fetch(`${API_BASE_URL}/categories?language=${language}`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    const data: CategoriesResponse = await response.json();
    return data.data;
  },

  async getById(id: number, language: string = 'nl'): Promise<Category> {
    const response = await fetch(`${API_BASE_URL}/categories/${id}?language=${language}`);
    if (!response.ok) throw new Error('Failed to fetch category');
    const data = await response.json();
    return data.data;
  },

  async getPOIsInCategory(id: number, params?: Record<string, string>): Promise<any[]> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await fetch(`${API_BASE_URL}/categories/${id}/pois${queryString}`);
    if (!response.ok) throw new Error('Failed to fetch POIs');
    const data = await response.json();
    return data.data;
  }
};
