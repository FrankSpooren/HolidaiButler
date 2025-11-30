export interface POI {
  id: number;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  level3_type: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  rating: number | null;
  review_count: number | null;
  price_level: number | null;
  verified: boolean;
  featured: boolean;
  popularity_score: number | null;
  opening_hours: any | null;
  thumbnail_url: string | null;
  images: string[] | null;
  amenities: string[] | null;
  accessibility_features: string[] | null;
  enriched_tile_description: string | null;
  enriched_detail_description: string | null;
  content_quality_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface POISearchParams {
  q?: string;
  category?: string;
  subcategory?: string;
  fuzzy?: boolean;
  highlight?: boolean;
  min_rating?: number;
  max_rating?: number;
  open_now?: boolean;
  price_min?: number;
  price_max?: number;
  sort?: string;
  limit?: number;
  offset?: number;
  require_images?: boolean; // NEW: Optional filter for POIs with images (presentation mode)
}

export interface POIResponse {
  success: boolean;
  data: POI[];
  meta?: {
    total: number;
    limit: number;
    offset: number;
    count: number;
    cursor: string | null;
    next_cursor: number | null;
    has_more: boolean;
    pagination_type: string;
  };
}
