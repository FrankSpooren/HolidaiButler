import { POIResult } from '../models/POIResult';
import { SmartScore, ScoringWeights, UserContext, ScoringConfig } from '../models/ScoringModels';
import { logger } from '../config/logger';
import { getScoringConfigFromEnv } from '../config/scoring';

export class ScoringService {
  private config: ScoringConfig;

  constructor() {
    this.config = getScoringConfigFromEnv();
  }

  calculateSmartScore(
    poi: POIResult,
    userContext: UserContext,
    weights: ScoringWeights = this.config.defaultWeights
  ): SmartScore {
    const breakdown = {
      semantic: poi.relevanceScore,
      rating: this.calculateRatingScore(poi),
      distance: this.calculateDistanceScore(poi, userContext),
      freshness: this.calculateFreshnessScore(poi),
      popularity: this.calculatePopularityScore(poi),
      dietaryIntent: this.calculateDietaryIntentScore(poi, userContext),
      categoryRelevance: this.calculateCategoryRelevanceScore(poi, userContext),
      generalIntent: this.calculateGeneralIntentScore(poi, userContext)
    };

    const totalScore = 
      breakdown.semantic * weights.semanticSimilarity +
      breakdown.rating * weights.userRating +
      breakdown.distance * weights.distance +
      breakdown.freshness * weights.freshness +
      breakdown.popularity * weights.popularity +
      breakdown.dietaryIntent * weights.dietaryIntent +
      breakdown.categoryRelevance * weights.categoryRelevance +
      breakdown.generalIntent * weights.generalIntent;

    return {
      totalScore,
      breakdown,
      metadata: {
        isOpen: this.checkIfOpen(poi),
        distanceKm: this.calculateDistance(poi, userContext),
        lastReviewDate: this.getLastReviewDate(poi)
      }
    };
  }

  private calculateRatingScore(poi: POIResult): number {
    if (!this.config.enableRatingScoring || !poi.metadata.rating) {
      return 0.5; // Neutral score
    }
    
    // Normalize rating from 0-5 to 0-1
    return Math.max(0, Math.min(1, poi.metadata.rating / 5));
  }

  private calculateDistanceScore(poi: POIResult, userContext: UserContext): number {
    if (!this.config.enableDistanceScoring || !userContext.currentLocation) {
      return 0.5; // Neutral score
    }

    const distance = this.calculateDistance(poi, userContext);
    if (distance === -1) return 0.5; // Unknown distance

    // Exponential decay: closer = higher score
    const maxDistance = userContext.preferences?.maxDistance || 50; // km
    return Math.exp(-distance / (maxDistance / 3));
  }

  private calculateFreshnessScore(poi: POIResult): number {
    if (!this.config.enableFreshnessScoring) {
      return 0.5; // Neutral score
    }

    const lastReviewDate = this.getLastReviewDate(poi);
    if (!lastReviewDate) return 0.3; // No review data

    const daysSinceReview = (Date.now() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Recent reviews get higher scores
    if (daysSinceReview < 30) return 1.0;
    if (daysSinceReview < 90) return 0.8;
    if (daysSinceReview < 365) return 0.6;
    return 0.4;
  }

  private calculatePopularityScore(poi: POIResult): number {
    if (!this.config.enablePopularityScoring) {
      return 0.5; // Neutral score
    }

    // Use QA content length as popularity proxy
    const qaContentLength = poi.metadata.qaContent?.length || 0;
    const amenitiesCount = poi.metadata.amenities?.length || 0;
    
    // Combine factors for popularity score
    const popularity = Math.min(1, (qaContentLength * 0.1 + amenitiesCount * 0.05));
    return Math.max(0.1, popularity);
  }

  private calculateDietaryIntentScore(poi: POIResult, userContext: UserContext): number {
    if (!this.config.enableDietaryIntentScoring || !userContext.dietaryIntent) {
      return 0.5; // Neutral score
    }

    const dietaryIntent = userContext.dietaryIntent;
    const poiText = this.getPOIText(poi).toLowerCase();
    
    // Define dietary keywords for each intent type
    const dietaryKeywords = {
      'vegetarian': ['vegetarian', 'veggie', 'plant-based', 'plant', 'herbivore', 'meat-free', 'vegetable', 'salad', 'green'],
      'vegan': ['vegan', 'plant-based', 'dairy-free', 'egg-free', 'animal-free', 'cruelty-free'],
      'gluten-free': ['gluten-free', 'gluten free', 'celiac', 'wheat-free', 'gf'],
      'halal': ['halal', 'muslim', 'islamic', 'permissible'],
      'kosher': ['kosher', 'jewish', 'hechsher'],
      'keto': ['keto', 'ketogenic', 'low-carb', 'low carb', 'high-fat'],
      'paleo': ['paleo', 'paleolithic', 'caveman', 'primal']
    };

    const keywords = dietaryKeywords[dietaryIntent.type as keyof typeof dietaryKeywords] || [];
    let matchCount = 0;
    let totalKeywords = keywords.length;

    // Check for keyword matches in POI text
    for (const keyword of keywords) {
      if (poiText.includes(keyword)) {
        matchCount++;
      }
    }

    // Calculate base score from keyword matches
    let baseScore = totalKeywords > 0 ? matchCount / totalKeywords : 0.5;
    
    // Boost score based on confidence
    const confidenceBoost = dietaryIntent.confidence * 0.3;
    baseScore = Math.min(1, baseScore + confidenceBoost);

    // Special boosts for specific categories
    if (dietaryIntent.type === 'vegetarian' || dietaryIntent.type === 'vegan') {
      if (poi.category?.toLowerCase().includes('coffee') || 
          poi.category?.toLowerCase().includes('cafe') ||
          poi.title?.toLowerCase().includes('plant')) {
        baseScore = Math.min(1, baseScore + 0.4);
      }
    }

    return Math.max(0.1, baseScore);
  }

  // New method for general intent boosting
  private calculateGeneralIntentScore(poi: POIResult, userContext: UserContext): number {
    if (!userContext.generalIntent) {
      return 0.5; // Neutral score
    }

    const intentResult = userContext.generalIntent;
    const poiText = this.getPOIText(poi).toLowerCase();
    
    let totalBoost = 0;
    let boostCount = 0;
    
    for (const boost of intentResult.boosts) {
      let matchScore = 0;
      let totalKeywords = boost.keywords.length;
      
      // Check for keyword matches in POI text
      for (const keyword of boost.keywords) {
        if (poiText.includes(keyword)) {
          matchScore++;
        }
      }
      
      // Calculate boost based on matches and confidence
      const baseBoost = matchScore > 0 ? boost.boostFactor : 0.1; // Small boost even without direct matches
      const confidenceBoost = baseBoost * boost.confidence;
      
      totalBoost += confidenceBoost;
      boostCount++;
    }
    
    return boostCount > 0 ? Math.min(1, totalBoost / boostCount) : 0.5;
  }

  private calculateCategoryRelevanceScore(poi: POIResult, userContext: UserContext): number {
    if (!this.config.enableCategoryRelevanceScoring || !userContext.dietaryIntent) {
      return 0.5; // Neutral score
    }

    const dietaryIntent = userContext.dietaryIntent;
    const category = poi.category?.toLowerCase() || '';
    
    // Define category relevance for dietary preferences
    const categoryRelevance = {
      'vegetarian': {
        'coffee shop': 0.9,
        'cafe': 0.9,
        'restaurant': 0.7,
        'indian restaurant': 0.8,
        'mediterranean restaurant': 0.8,
        'asian restaurant': 0.7,
        'vegetarian restaurant': 1.0,
        'vegan restaurant': 1.0
      },
      'vegan': {
        'coffee shop': 0.8,
        'cafe': 0.8,
        'restaurant': 0.6,
        'indian restaurant': 0.7,
        'mediterranean restaurant': 0.7,
        'asian restaurant': 0.6,
        'vegetarian restaurant': 0.9,
        'vegan restaurant': 1.0
      },
      'gluten-free': {
        'restaurant': 0.6,
        'cafe': 0.7,
        'coffee shop': 0.6,
        'mediterranean restaurant': 0.8,
        'asian restaurant': 0.5
      },
      'halal': {
        'restaurant': 0.7,
        'indian restaurant': 0.9,
        'mediterranean restaurant': 0.8,
        'middle eastern restaurant': 1.0,
        'turkish restaurant': 0.9
      },
      'kosher': {
        'restaurant': 0.6,
        'jewish restaurant': 1.0,
        'mediterranean restaurant': 0.7
      }
    };

    const relevanceMap = categoryRelevance[dietaryIntent.type as keyof typeof categoryRelevance];
    if (!relevanceMap) return 0.5;

    // Find best matching category
    let bestMatch = 0.5;
    for (const [catPattern, score] of Object.entries(relevanceMap)) {
      if (category.includes(catPattern)) {
        bestMatch = Math.max(bestMatch, score as number);
      }
    }

    return bestMatch;
  }

  private getPOIText(poi: POIResult): string {
    const parts = [
      poi.title || '',
      poi.subtitle || '',
      poi.category || '',
      poi.metadata?.description || '',
      poi.metadata?.amenities?.join(' ') || ''
    ];
    return parts.join(' ').toLowerCase();
  }

  private calculateDistance(poi: POIResult, userContext: UserContext): number {
    if (!userContext.currentLocation) return -1;
    
    // Extract coordinates from POI metadata
    const poiCoords = this.extractCoordinates(poi);
    if (!poiCoords) return -1;

    // Calculate distance using Haversine formula
    return this.haversineDistance(
      userContext.currentLocation.lat,
      userContext.currentLocation.lng,
      poiCoords.lat,
      poiCoords.lng
    );
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI/180);
  }

  private extractCoordinates(poi: POIResult): { lat: number, lng: number } | null {
    // First try to get from metadata coordinates
    if (poi.metadata.coordinates) {
      return poi.metadata.coordinates;
    }

    // Try to extract from location string (this is a placeholder implementation)
    // In a real implementation, you would parse the location string or have coordinates in metadata
    const locationMatch = poi.metadata.location?.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
    if (locationMatch && locationMatch[1] && locationMatch[2]) {
      return {
        lat: parseFloat(locationMatch[1]),
        lng: parseFloat(locationMatch[2])
      };
    }

    return null;
  }

  private checkIfOpen(poi: POIResult): boolean {
    // Placeholder implementation for opening hours checking
    // In a real implementation, you would check current time against opening hours
    if (poi.metadata.openingHours) {
      // Implement opening hours logic here
      return true; // Placeholder
    }
    return true; // Default to open if no hours specified
  }

  private getLastReviewDate(poi: POIResult): Date | null {
    // Extract from QA content or metadata
    if (poi.metadata.lastReviewDate) {
      return poi.metadata.lastReviewDate;
    }

    // Try to extract from QA content (placeholder)
    if (poi.metadata.qaContent && poi.metadata.qaContent.length > 0) {
      // Look for date information in QA content
      // This is a placeholder - you would implement actual date extraction
      return new Date(); // Placeholder
    }

    return null;
  }

  getDefaultWeights(): ScoringWeights {
    return this.config.defaultWeights;
  }

  getConfig(): ScoringConfig {
    return this.config;
  }

  // Method to calculate scoring metrics for performance monitoring
  calculateScoringMetrics(results: POIResult[], scoringTime: number): any {
    const totalResults = results.length;
    const avgTimePerResult = scoringTime / totalResults;
    
    return {
      totalResults,
      scoringTime,
      avgTimePerResult,
      scoringEfficiency: totalResults / scoringTime // results per ms
    };
  }
}
