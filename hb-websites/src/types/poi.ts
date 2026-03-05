export interface POI {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  category: string;
  subcategory?: string;
  rating?: number;
  reviewCount?: number;
  review_count?: number;
  latitude?: number;
  longitude?: number;
  address?: string;
  phone?: string;
  website?: string;
  tier?: number;
  images?: string[];
  thumbnail_url?: string;
  opening_hours_json?: string;
}

export interface Review {
  id: number;
  poi_id: number;
  author_name: string;
  rating: number;
  text?: string;
  publish_date?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
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
