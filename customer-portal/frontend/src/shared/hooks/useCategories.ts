/**
 * useCategories Hook - React Query integration
 */

import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '../services/categories.api';
import type { Category, PersonalityType } from '../types/category.types';

export function useCategories(language: string = 'nl') {
  return useQuery({
    queryKey: ['categories', language],
    queryFn: () => categoriesApi.getAll(language),
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useCategoryById(id: number, language: string = 'nl') {
  return useQuery({
    queryKey: ['category', id, language],
    queryFn: () => categoriesApi.getById(id, language),
    enabled: !!id,
  });
}

/**
 * Filter categories by personality
 */
export function filterCategoriesByPersonality(
  categories: Category[],
  personality: PersonalityType
): Category[] {
  const mappings: Record<PersonalityType, string[]> = {
    auto: [], // Show all
    adventurous: ['Active', 'Water Sports', 'Hiking', 'Sports & Fitness'],
    relaxed: ['Beaches & Nature', 'Wellness & Treatments', 'Breakfast & Coffee'],
    cultural: ['Shopping', 'Markets', 'Food & Drinks'],
    nature: ['Beaches & Nature', 'Hiking', 'Viewpoints & Nature'],
  };

  if (personality === 'auto' || !mappings[personality]) {
    return categories;
  }

  const preferred = mappings[personality];
  return categories.filter(cat =>
    preferred.some(p => cat.name.includes(p) || cat.slug.includes(p.toLowerCase()))
  );
}
