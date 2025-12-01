/**
 * POI Types - Backend API Response
 */

export interface POI {
  id: number;
  name: string;
  category: string;
  subcategory?: string;
  description: string;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  website?: string;
  email?: string;
  rating?: number;
  review_count?: number;
  price_level?: number;
  popularity_score?: number;
  amenities?: string[];
  images?: string[];
  opening_hours?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface POISearchParams {
  category?: string;
  lat?: number;
  lon?: number;
  radius?: number;
  min_rating?: number;
  limit?: number;
  offset?: number;
}
