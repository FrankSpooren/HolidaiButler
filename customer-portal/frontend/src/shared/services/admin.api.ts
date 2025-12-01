/**
 * Admin API Client
 * Integration with Admin Module (port :3003)
 * POI management, user administration, analytics
 */

import { API_CONFIG } from '../config/apiConfig';

const { baseUrl, endpoints } = API_CONFIG.admin;

export interface AdminPOI {
  id: string;
  name: string;
  description?: string;
  category: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  website?: string;
  images?: string[];
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'editor' | 'viewer' | 'partner';
  isActive: boolean;
  createdAt: string;
}

export interface AnalyticsSummary {
  totalPOIs: number;
  totalUsers: number;
  totalBookings: number;
  totalRevenue: number;
  period: string;
}

class AdminAPI {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async getPOIs(params?: { category?: string; isActive?: boolean; search?: string; limit?: number; offset?: number }): Promise<{ success: boolean; pois?: AdminPOI[]; total?: number; error?: string }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.category) queryParams.append('category', params.category);
      if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const url = `${baseUrl}${endpoints.pois}${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, { method: 'GET', headers: this.getAuthHeaders() });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Admin service unavailable' };
    }
  }

  async createPOI(data: Partial<AdminPOI>): Promise<{ success: boolean; poi?: AdminPOI; error?: string }> {
    try {
      const response = await fetch(`${baseUrl}${endpoints.pois}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Admin service unavailable' };
    }
  }

  async updatePOI(poiId: string, data: Partial<AdminPOI>): Promise<{ success: boolean; poi?: AdminPOI; error?: string }> {
    try {
      const response = await fetch(`${baseUrl}${endpoints.pois}/${poiId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Admin service unavailable' };
    }
  }

  async deletePOI(poiId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${baseUrl}${endpoints.pois}/${poiId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Admin service unavailable' };
    }
  }

  async getUsers(params?: { role?: string; isActive?: boolean; limit?: number }): Promise<{ success: boolean; users?: AdminUser[]; error?: string }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.role) queryParams.append('role', params.role);
      if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `${baseUrl}${endpoints.users}${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, { method: 'GET', headers: this.getAuthHeaders() });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Admin service unavailable' };
    }
  }

  async getAnalytics(period: 'day' | 'week' | 'month' = 'month'): Promise<{ success: boolean; analytics?: AnalyticsSummary; error?: string }> {
    try {
      const response = await fetch(`${baseUrl}${endpoints.analytics}?period=${period}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Admin service unavailable' };
    }
  }
}

export const adminApi = new AdminAPI();
export default adminApi;
