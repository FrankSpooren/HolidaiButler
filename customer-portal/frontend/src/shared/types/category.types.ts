/**
 * Category Types - Backend API Response
 */

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  level: 1 | 2 | 3;
  icon_url: string | null;
  color: string | null;
  order_index: number;
  translations: {
    nl: string;
    en: string;
    de: string;
    es: string;
    sv?: string;
  };
  display_name: string;
  children?: Category[];
  created_at: string;
}

export interface CategoriesResponse {
  success: boolean;
  data: Category[];
  meta: {
    total: number;
    language: string;
  };
}

export type PersonalityType = 'auto' | 'adventurous' | 'relaxed' | 'cultural' | 'nature';

export interface PersonalityMapping {
  personality: PersonalityType;
  preferredCategories: string[];
  boostCategories?: string[];
  excludeCategories?: string[];
}
