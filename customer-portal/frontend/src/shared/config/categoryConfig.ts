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
 *
 * MULTI-DESTINATION:
 * - Calpe categories: English names (Active, Beaches & Nature, etc.)
 * - Texel categories: Dutch names (Actief, Natuur, etc.)
 * - destination.categories.enabled controls which categories to show
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
  /** Destination this category belongs to (optional, empty = all) */
  destination?: string;
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
  // TEXEL CATEGORIES (7 button categories)
  // Database verified 2026-02-02: Actief(57), Cultuur & Historie(96),
  // Eten & Drinken(138), Natuur(98), Winkelen(160), Gezondheid(75), Praktisch(296)
  // ============================================

  // Actief - Orange (#FF6B00)
  'Actief': {
    name: 'Actief',
    id: 'actief',
    icon: '/assets/category-icons/active.png',
    color: 'linear-gradient(135deg, #FF6B00, #FF8533)',
  },

  // Cultuur & Historie - Blue (#004B87)
  'Cultuur & Historie': {
    name: 'Cultuur & Historie',
    id: 'cultuur',
    icon: '/assets/category-icons/culture-history.png',
    color: 'linear-gradient(135deg, #004B87, #0066B3)',
  },

  // Eten & Drinken - Red (#E53935)
  'Eten & Drinken': {
    name: 'Eten & Drinken',
    id: 'eten',
    icon: '/assets/category-icons/food-drinks.png',
    color: 'linear-gradient(135deg, #E53935, #EF5350)',
  },

  // Gezondheid & Verzorging - Green (#43A047)
  'Gezondheid & Verzorging': {
    name: 'Gezondheid & Verzorging',
    id: 'gezondheid',
    icon: '/assets/category-icons/health-wellbeing.png',
    color: 'linear-gradient(135deg, #43A047, #66BB6A)',
  },

  // Natuur - Light Green (#7CB342)
  'Natuur': {
    name: 'Natuur',
    id: 'natuur',
    icon: '/assets/category-icons/beaches-nature.png',
    color: 'linear-gradient(135deg, #7CB342, #9CCC65)',
  },

  // Praktisch - Gray (#607D8B)
  'Praktisch': {
    name: 'Praktisch',
    id: 'praktisch',
    icon: '/assets/category-icons/practical.png',
    color: 'linear-gradient(135deg, #607D8B, #78909C)',
  },

  // Winkelen - Purple (#AB47BC)
  'Winkelen': {
    name: 'Winkelen',
    id: 'winkelen',
    icon: '/assets/category-icons/shopping.png',
    color: 'linear-gradient(135deg, #AB47BC, #BA68C8)',
  },

  // Texel Accommodation (filtered out from display)
  'Accommodation': {
    name: 'Accommodation',
    id: 'accommodation',
    icon: '/assets/category-icons/accommodation.png',
    color: 'linear-gradient(135deg, #7FA594, #5E8B7E)',
  },

  // ===========================================
  // TEXEL CATEGORIES (Dutch names, specific colors)
  // ===========================================

  // 1. Actief - Orange (#FF6B00)
  'Actief': {
    name: 'Actief',
    id: 'actief',
    icon: '/assets/category-icons/active.png',
    color: 'linear-gradient(135deg, #FF6B00, #FF8533)',
    destination: 'texel',
  },

  // 2. Cultuur & Historie - Dark Blue (#004B87)
  'Cultuur & Historie': {
    name: 'Cultuur & Historie',
    id: 'cultuur',
    icon: '/assets/category-icons/culture-history.png',
    color: 'linear-gradient(135deg, #004B87, #0066B3)',
    destination: 'texel',
  },

  // 3. Eten & Drinken - Red (#E53935)
  'Eten & Drinken': {
    name: 'Eten & Drinken',
    id: 'eten',
    icon: '/assets/category-icons/food-drinks.png',
    color: 'linear-gradient(135deg, #E53935, #EF5350)',
    destination: 'texel',
  },

  // 4. Gezondheid & Verzorging - Green (#43A047)
  'Gezondheid & Verzorging': {
    name: 'Gezondheid & Verzorging',
    id: 'gezondheid',
    icon: '/assets/category-icons/health-wellbeing.png',
    color: 'linear-gradient(135deg, #43A047, #66BB6A)',
    destination: 'texel',
  },

  // 5. Natuur - Light Green (#7CB342)
  'Natuur': {
    name: 'Natuur',
    id: 'natuur',
    icon: '/assets/category-icons/beaches-nature.png',
    color: 'linear-gradient(135deg, #7CB342, #9CCC65)',
    destination: 'texel',
  },

  // 6. Praktisch - Grey (#607D8B)
  'Praktisch': {
    name: 'Praktisch',
    id: 'praktisch',
    icon: '/assets/category-icons/practical.png',
    color: 'linear-gradient(135deg, #607D8B, #78909C)',
    destination: 'texel',
  },

  // 7. Winkelen - Purple (#AB47BC)
  'Winkelen': {
    name: 'Winkelen',
    id: 'winkelen',
    icon: '/assets/category-icons/shopping.png',
    color: 'linear-gradient(135deg, #AB47BC, #BA68C8)',
    destination: 'texel',
  },

  // Texel Accommodation (hidden)
  'Accommodatie': {
    name: 'Accommodatie',
    id: 'accommodatie',
    icon: '/assets/category-icons/accommodation.png',
    color: 'linear-gradient(135deg, #00CAFF, #00A3CC)',
    destination: 'texel',
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
 * Get all vacation-focused categories (excludes Accommodation for all destinations)
 */
export function getVacationCategories(): CategoryConfig[] {
  return Object.values(CATEGORY_CONFIG).filter(
    cat => cat.name !== 'Accommodation (do not communicate)' && cat.name !== 'Accommodatie'
  );
}

/**
 * Get categories for a specific destination
 * @param destinationId - 'calpe' or 'texel'
 */
export function getCategoriesForDestination(destinationId: string): CategoryConfig[] {
  return Object.values(CATEGORY_CONFIG).filter(cat => {
    // Exclude accommodation categories
    if (cat.name === 'Accommodation (do not communicate)' || cat.name === 'Accommodatie') {
      return false;
    }
    // Include if no destination specified (shared) or matches the destination
    return !cat.destination || cat.destination === destinationId;
  });
}

/**
 * Export as array for iteration (excludes Accommodation)
 * Note: This includes ALL categories - destination filtering happens in POILandingPage
 */
export const CATEGORIES_ARRAY = getVacationCategories();
