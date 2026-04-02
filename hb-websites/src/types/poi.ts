export interface POI {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  category: string;
  subcategory?: string;
  level3_type?: string;
  city?: string;
  region?: string;
  country?: string;
  address?: string;
  postal_code?: string;
  rating?: number;
  reviewCount?: number;
  review_count?: number;
  price_level?: number | string;
  menu_url?: string | null;
  booking_url?: string | null;
  reservation_url?: string | null;
  live_busyness_text?: string | null;
  live_busyness_percent?: number | null;
  google_category?: string | null;
  review_tags?: Array<{ title: string; count: number }>;
  people_also_search?: Array<{ title: string; score: number; reviews: number }>;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  email?: string;
  tier?: number;
  images?: string[];
  thumbnail_url?: string;
  amenities?: string[];
  accessibility_features?: string[];
  opening_hours?: Record<string, Array<{ open: string; close: string }>> | Array<{ day: string; hours: string }> | null;
  enriched_tile_description?: string;
  enriched_detail_description?: string;
  enriched_highlights?: string[];
  enriched_target_audience?: string;
  popular_times?: Record<string, number[]> | null;
  parking?: Record<string, unknown> | string | null;
  service_options?: Record<string, boolean> | null;
  reviews_distribution?: Record<string, number> | null;
  google_placeid?: string;
  verified?: boolean;
  featured?: boolean;
  popularity_score?: number;
  status?: string;
  _language?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Review {
  id: number;
  poi_id: number;
  user_name: string;
  travel_party_type?: string;
  rating: number;
  review_text?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  helpful_count?: number;
  visit_date?: string;
  created_at?: string;
}

export interface Category {
  category: string;
  count: number;
}

export interface I18nString {
  [locale: string]: string;
}

export interface EventLocation {
  name: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
}

export interface AgendaEvent {
  id: number;
  title: I18nString | string;
  description?: I18nString | string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  location?: EventLocation | string;
  primaryCategory?: string;
  images?: Array<{ url: string; isPrimary?: boolean }>;
  url?: string;
  pricing?: { isFree?: boolean };
  status?: string;
}

export interface Ticket {
  id: number;
  name: string;
  description: string;
  price_cents: number;
  currency: string;
  category: string;
  available_quantity: number;
  max_per_order: number;
  image_url: string;
  valid_from?: string;
  valid_until?: string;
}

export interface ReservationSlot {
  id: number;
  time: string;
  duration_minutes: number;
  available_seats: number;
  max_seats: number;
  price_cents: number | null;
  special_notes: string | null;
}
