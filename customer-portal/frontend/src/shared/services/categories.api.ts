/**
 * Categories API Client
 */

import type { CategoriesResponse, Category } from '../types/category.types';

// Helper to detect if running in production
const getApiBaseUrl = (): string => {
  // First check environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // In production (not localhost), use relative URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isCodespaces = hostname.includes('.app.github.dev');

    if (!isLocalhost && !isCodespaces) {
      return '/api/v1';
    }
  }

  // Default to localhost for local development
  return 'http://localhost:3003/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

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
