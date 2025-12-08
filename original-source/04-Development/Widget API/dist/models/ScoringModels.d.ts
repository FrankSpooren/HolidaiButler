export interface ScoringWeights {
    semanticSimilarity: number;
    userRating: number;
    distance: number;
    freshness: number;
    popularity: number;
    dietaryIntent: number;
    categoryRelevance: number;
    generalIntent: number;
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
    currentLocation?: {
        lat: number;
        lng: number;
    };
    currentTime: Date;
    preferences?: {
        maxDistance?: number;
        minRating?: number;
        priceRange?: 'budget' | 'mid' | 'luxury';
    };
    dietaryIntent?: DietaryIntent;
    generalIntent?: any;
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
//# sourceMappingURL=ScoringModels.d.ts.map