/**
 * ENTERPRISE-GRADE CATEGORY CONFIGURATION
 * ========================================
 * Single source of truth for all POI categories
 * Database category names must match EXACTLY
 *
 * ICON SOURCES:
 * - Located: frontend/public/assets/category-icons/
 * - Original source: holibot-widget/TEST en print screens/Iconen/
 * - Format: PNG, 96-100px
 */

export interface CategoryConfig {
  /** Database category name (EXACT match required) */
  name: string;
  /** URL-friendly ID */
  id: string;
  /** Icon path (relative to /assets/) */
  icon: string;
  /** Gradient color for visual identity */
  color: string;
  /** Translation key */
  translationKey?: string;
}

/**
 * MASTER CATEGORY MAPPING
 * Based on actual database categories
 *
 * CALPE: English category names (verified 2025-11-07)
 * TEXEL: Dutch category names (verified 2026-01-29 from poi_texel_insert.sql)
 *
 * CRITICAL: Icons must be consistent across all components
 * Icon files copied from holibot-widget project - DO NOT change paths
 */
export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  // ============================================
  // CALPE CATEGORIES (English)
  // ============================================
  'Active': {
    name: 'Active',
    id: 'active',
    icon: '/assets/category-icons/active.png',
    color: 'linear-gradient(135deg, #016193, #1a709d)',
  },
  'Beaches & Nature': {
    name: 'Beaches & Nature',
    id: 'beaches',
    icon: '/assets/category-icons/beaches-nature.png',
    color: 'linear-gradient(135deg, #b4942e, #bb9e42)',
  },
  'Culture & History': {
    name: 'Culture & History',
    id: 'culture',
    icon: '/assets/category-icons/culture-history.png',
    color: 'linear-gradient(135deg, #253444, #3a4856)',
  },
  'Recreation': {
    name: 'Recreation',
    id: 'recreation',
    icon: '/assets/category-icons/recreation.png',
    color: 'linear-gradient(135deg, #354f48, #49605a)',
  },
  'Food & Drinks': {
    name: 'Food & Drinks',
    id: 'food',
    icon: '/assets/category-icons/food-drinks.png',
    color: 'linear-gradient(135deg, #4f766b, #608379)',
  },
  'Health & Wellbeing': {
    name: 'Health & Wellbeing',
    id: 'health',
    icon: '/assets/category-icons/health-wellbeing.png',
    color: 'linear-gradient(135deg, #004568, #195777)',
  },
  'Shopping': {
    name: 'Shopping',
    id: 'shopping',
    icon: '/assets/category-icons/shopping.png',
    color: 'linear-gradient(135deg, #b4892e, #bb9442)',
  },
  'Practical': {
    name: 'Practical',
    id: 'practical',
    icon: '/assets/category-icons/practical.png',
    color: 'linear-gradient(135deg, #016193, #1a709d)',
  },
  'Accommodation (do not communicate)': {
    name: 'Accommodation (do not communicate)',
    id: 'accommodation',
    icon: '/assets/category-icons/accommodation.png',
    color: 'linear-gradient(135deg, #7FA594, #5E8B7E)',
  },

  // ============================================
  // TEXEL CATEGORIES (Dutch - from POI database)
  // Verified from poi_texel_insert.sql 2026-01-29
  // ============================================

  // Food & Drinks
  'Restaurant': {
    name: 'Restaurant',
    id: 'restaurant',
    icon: '/assets/category-icons/food-drinks.png',
    color: 'linear-gradient(135deg, #4f766b, #608379)',
  },
  'Italiaans restaurant': {
    name: 'Italiaans restaurant',
    id: 'italiaans-restaurant',
    icon: '/assets/category-icons/food-drinks.png',
    color: 'linear-gradient(135deg, #4f766b, #608379)',
  },
  'Catering': {
    name: 'Catering',
    id: 'catering',
    icon: '/assets/category-icons/food-drinks.png',
    color: 'linear-gradient(135deg, #4f766b, #608379)',
  },
  'Maaltijdbezorging': {
    name: 'Maaltijdbezorging',
    id: 'maaltijdbezorging',
    icon: '/assets/category-icons/food-drinks.png',
    color: 'linear-gradient(135deg, #4f766b, #608379)',
  },
  'Wijngaard': {
    name: 'Wijngaard',
    id: 'wijngaard',
    icon: '/assets/category-icons/food-drinks.png',
    color: 'linear-gradient(135deg, #4f766b, #608379)',
  },

  // Nature & Beaches
  'Strand': {
    name: 'Strand',
    id: 'strand',
    icon: '/assets/category-icons/beaches-nature.png',
    color: 'linear-gradient(135deg, #b4942e, #bb9e42)',
  },
  'Nationaal park': {
    name: 'Nationaal park',
    id: 'nationaal-park',
    icon: '/assets/category-icons/beaches-nature.png',
    color: 'linear-gradient(135deg, #b4942e, #bb9e42)',
  },
  'Dune': {
    name: 'Dune',
    id: 'dune',
    icon: '/assets/category-icons/beaches-nature.png',
    color: 'linear-gradient(135deg, #b4942e, #bb9e42)',
  },
  'Eiland': {
    name: 'Eiland',
    id: 'eiland',
    icon: '/assets/category-icons/beaches-nature.png',
    color: 'linear-gradient(135deg, #b4942e, #bb9e42)',
  },

  // Culture & Attractions
  'Lokaal historisch museum': {
    name: 'Lokaal historisch museum',
    id: 'museum',
    icon: '/assets/category-icons/culture-history.png',
    color: 'linear-gradient(135deg, #253444, #3a4856)',
  },
  'Toeristische attractie': {
    name: 'Toeristische attractie',
    id: 'toeristische-attractie',
    icon: '/assets/category-icons/culture-history.png',
    color: 'linear-gradient(135deg, #253444, #3a4856)',
  },

  // Recreation
  'Aquarium': {
    name: 'Aquarium',
    id: 'aquarium',
    icon: '/assets/category-icons/recreation.png',
    color: 'linear-gradient(135deg, #354f48, #49605a)',
  },

  // Shopping
  'Supermarkt': {
    name: 'Supermarkt',
    id: 'supermarkt',
    icon: '/assets/category-icons/shopping.png',
    color: 'linear-gradient(135deg, #b4892e, #bb9442)',
  },

  // Texel Accommodation (filtered out but needed for color mapping)
  'Hotel': {
    name: 'Hotel',
    id: 'hotel',
    icon: '/assets/category-icons/accommodation.png',
    color: 'linear-gradient(135deg, #7FA594, #5E8B7E)',
  },
  'Motel': {
    name: 'Motel',
    id: 'motel',
    icon: '/assets/category-icons/accommodation.png',
    color: 'linear-gradient(135deg, #7FA594, #5E8B7E)',
  },
  'Herberg': {
    name: 'Herberg',
    id: 'herberg',
    icon: '/assets/category-icons/accommodation.png',
    color: 'linear-gradient(135deg, #7FA594, #5E8B7E)',
  },
  'Bed & Breakfast': {
    name: 'Bed & Breakfast',
    id: 'bed-breakfast',
    icon: '/assets/category-icons/accommodation.png',
    color: 'linear-gradient(135deg, #7FA594, #5E8B7E)',
  },
  'Appartementencomplex': {
    name: 'Appartementencomplex',
    id: 'appartementencomplex',
    icon: '/assets/category-icons/accommodation.png',
    color: 'linear-gradient(135deg, #7FA594, #5E8B7E)',
  },
  'Vakantieappartement': {
    name: 'Vakantieappartement',
    id: 'vakantieappartement',
    icon: '/assets/category-icons/accommodation.png',
    color: 'linear-gradient(135deg, #7FA594, #5E8B7E)',
  },
  'Vakantiepark': {
    name: 'Vakantiepark',
    id: 'vakantiepark',
    icon: '/assets/category-icons/accommodation.png',
    color: 'linear-gradient(135deg, #7FA594, #5E8B7E)',
  },
  'Vakantiewoningverhuur': {
    name: 'Vakantiewoningverhuur',
    id: 'vakantiewoningverhuur',
    icon: '/assets/category-icons/accommodation.png',
    color: 'linear-gradient(135deg, #7FA594, #5E8B7E)',
  },
  'Kampeerterrein': {
    name: 'Kampeerterrein',
    id: 'kampeerterrein',
    icon: '/assets/category-icons/accommodation.png',
    color: 'linear-gradient(135deg, #7FA594, #5E8B7E)',
  },
  'Binnenovernachting': {
    name: 'Binnenovernachting',
    id: 'binnenovernachting',
    icon: '/assets/category-icons/accommodation.png',
    color: 'linear-gradient(135deg, #7FA594, #5E8B7E)',
  },
} as const;

/**
 * Get category config by database name
 */
export function getCategoryByName(name: string): CategoryConfig | undefined {
  return CATEGORY_CONFIG[name];
}

/**
 * Get category icon by database name
 * Returns fallback icon if category not found
 */
export function getCategoryIcon(categoryName: string): string {
  return CATEGORY_CONFIG[categoryName]?.icon || '📍';
}

/**
 * Get category color by database name
 * Returns fallback color if category not found
 */
export function getCategoryColor(categoryName: string): string {
  return CATEGORY_CONFIG[categoryName]?.color || 'linear-gradient(135deg, #7FA594, #5E8B7E)';
}

/**
 * Get all vacation-focused categories (excludes Accommodation)
 */
export function getVacationCategories(): CategoryConfig[] {
  return Object.values(CATEGORY_CONFIG).filter(
    cat => cat.name !== 'Accommodation (do not communicate)'
  );
}

/**
 * Export as array for iteration (excludes Accommodation)
 */
export const CATEGORIES_ARRAY = getVacationCategories();
