export interface ScoringWeights {
  semanticSimilarity: number;    // 0.3 (30%)
  userRating: number;           // 0.2 (20%)
  distance: number;            // 0.2 (20%)
  freshness: number;           // 0.1 (10%) - recent reviews
  popularity: number;          // 0.1 (10%) - visit frequency
  dietaryIntent: number;       // 0.05 (5%) - dietary preference matching
  categoryRelevance: number;   // 0.05 (5%) - category relevance for dietary needs
  generalIntent: number;       // 0.1 (10%) - general intent boosting
}

export interface SmartScore {
  totalScore: number;
  breakdown: {
    semantic: number;
    rating: number;
    distance: number;
    freshness: number;
    popularity: number;
    dietaryIntent: number;
    categoryRelevance: number;
    generalIntent: number;
  };
  metadata: {
    isOpen: boolean;
    distanceKm: number;
    lastReviewDate: Date | null;
  };
}

export interface UserContext {
  currentLocation?: { lat: number, lng: number };
  currentTime: Date;
  preferences?: {
    maxDistance?: number;
    minRating?: number;
    priceRange?: 'budget' | 'mid' | 'luxury';
  };
  dietaryIntent?: DietaryIntent;
  generalIntent?: any; // Will be imported from GeneralIntentService
}

export interface DietaryIntent {
  type: 'vegetarian' | 'vegan' | 'gluten-free' | 'halal' | 'kosher' | 'keto' | 'paleo' | 'none';
  confidence: number;
  keywords: string[];
}

export interface ScoringConfig {
  defaultWeights: ScoringWeights;
  enableDistanceScoring: boolean;
  enableRatingScoring: boolean;
  enableFreshnessScoring: boolean;
  enablePopularityScoring: boolean;
  enableDietaryIntentScoring: boolean;
  enableCategoryRelevanceScoring: boolean;
  enableGeneralIntentScoring: boolean;
}

export interface ScoringMetrics {
  searchTime: number;
  embeddingTime: number;
  scoringTime: number;
  totalResults: number;
  avgTimePerResult: number;
}

export interface CacheStats {
  size: number;
  hitRate: number;
  missCount: number;
  hitCount: number;
}
