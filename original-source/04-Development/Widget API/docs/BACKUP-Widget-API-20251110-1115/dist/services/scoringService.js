"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoringService = void 0;
const scoring_1 = require("../config/scoring");
class ScoringService {
    constructor() {
        this.config = (0, scoring_1.getScoringConfigFromEnv)();
    }
    calculateSmartScore(poi, userContext, weights = this.config.defaultWeights) {
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
        const totalScore = breakdown.semantic * weights.semanticSimilarity +
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
    calculateRatingScore(poi) {
        if (!this.config.enableRatingScoring || !poi.metadata.rating) {
            return 0.5;
        }
        return Math.max(0, Math.min(1, poi.metadata.rating / 5));
    }
    calculateDistanceScore(poi, userContext) {
        if (!this.config.enableDistanceScoring || !userContext.currentLocation) {
            return 0.5;
        }
        const distance = this.calculateDistance(poi, userContext);
        if (distance === -1)
            return 0.5;
        const maxDistance = userContext.preferences?.maxDistance || 50;
        return Math.exp(-distance / (maxDistance / 3));
    }
    calculateFreshnessScore(poi) {
        if (!this.config.enableFreshnessScoring) {
            return 0.5;
        }
        const lastReviewDate = this.getLastReviewDate(poi);
        if (!lastReviewDate)
            return 0.3;
        const daysSinceReview = (Date.now() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceReview < 30)
            return 1.0;
        if (daysSinceReview < 90)
            return 0.8;
        if (daysSinceReview < 365)
            return 0.6;
        return 0.4;
    }
    calculatePopularityScore(poi) {
        if (!this.config.enablePopularityScoring) {
            return 0.5;
        }
        const qaContentLength = poi.metadata.qaContent?.length || 0;
        const amenitiesCount = poi.metadata.amenities?.length || 0;
        const popularity = Math.min(1, (qaContentLength * 0.1 + amenitiesCount * 0.05));
        return Math.max(0.1, popularity);
    }
    calculateDietaryIntentScore(poi, userContext) {
        if (!this.config.enableDietaryIntentScoring || !userContext.dietaryIntent) {
            return 0.5;
        }
        const dietaryIntent = userContext.dietaryIntent;
        const poiText = this.getPOIText(poi).toLowerCase();
        const dietaryKeywords = {
            'vegetarian': ['vegetarian', 'veggie', 'plant-based', 'plant', 'herbivore', 'meat-free', 'vegetable', 'salad', 'green'],
            'vegan': ['vegan', 'plant-based', 'dairy-free', 'egg-free', 'animal-free', 'cruelty-free'],
            'gluten-free': ['gluten-free', 'gluten free', 'celiac', 'wheat-free', 'gf'],
            'halal': ['halal', 'muslim', 'islamic', 'permissible'],
            'kosher': ['kosher', 'jewish', 'hechsher'],
            'keto': ['keto', 'ketogenic', 'low-carb', 'low carb', 'high-fat'],
            'paleo': ['paleo', 'paleolithic', 'caveman', 'primal']
        };
        const keywords = dietaryKeywords[dietaryIntent.type] || [];
        let matchCount = 0;
        let totalKeywords = keywords.length;
        for (const keyword of keywords) {
            if (poiText.includes(keyword)) {
                matchCount++;
            }
        }
        let baseScore = totalKeywords > 0 ? matchCount / totalKeywords : 0.5;
        const confidenceBoost = dietaryIntent.confidence * 0.3;
        baseScore = Math.min(1, baseScore + confidenceBoost);
        if (dietaryIntent.type === 'vegetarian' || dietaryIntent.type === 'vegan') {
            if (poi.category?.toLowerCase().includes('coffee') ||
                poi.category?.toLowerCase().includes('cafe') ||
                poi.title?.toLowerCase().includes('plant')) {
                baseScore = Math.min(1, baseScore + 0.4);
            }
        }
        return Math.max(0.1, baseScore);
    }
    calculateGeneralIntentScore(poi, userContext) {
        if (!userContext.generalIntent) {
            return 0.5;
        }
        const intentResult = userContext.generalIntent;
        const poiText = this.getPOIText(poi).toLowerCase();
        let totalBoost = 0;
        let boostCount = 0;
        for (const boost of intentResult.boosts) {
            let matchScore = 0;
            let totalKeywords = boost.keywords.length;
            for (const keyword of boost.keywords) {
                if (poiText.includes(keyword)) {
                    matchScore++;
                }
            }
            const baseBoost = matchScore > 0 ? boost.boostFactor : 0.1;
            const confidenceBoost = baseBoost * boost.confidence;
            totalBoost += confidenceBoost;
            boostCount++;
        }
        return boostCount > 0 ? Math.min(1, totalBoost / boostCount) : 0.5;
    }
    calculateCategoryRelevanceScore(poi, userContext) {
        if (!this.config.enableCategoryRelevanceScoring || !userContext.dietaryIntent) {
            return 0.5;
        }
        const dietaryIntent = userContext.dietaryIntent;
        const category = poi.category?.toLowerCase() || '';
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
        const relevanceMap = categoryRelevance[dietaryIntent.type];
        if (!relevanceMap)
            return 0.5;
        let bestMatch = 0.5;
        for (const [catPattern, score] of Object.entries(relevanceMap)) {
            if (category.includes(catPattern)) {
                bestMatch = Math.max(bestMatch, score);
            }
        }
        return bestMatch;
    }
    getPOIText(poi) {
        const parts = [
            poi.title || '',
            poi.subtitle || '',
            poi.category || '',
            poi.metadata?.description || '',
            poi.metadata?.amenities?.join(' ') || ''
        ];
        return parts.join(' ').toLowerCase();
    }
    calculateDistance(poi, userContext) {
        if (!userContext.currentLocation)
            return -1;
        const poiCoords = this.extractCoordinates(poi);
        if (!poiCoords)
            return -1;
        return this.haversineDistance(userContext.currentLocation.lat, userContext.currentLocation.lng, poiCoords.lat, poiCoords.lng);
    }
    haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    extractCoordinates(poi) {
        if (poi.metadata.coordinates) {
            return poi.metadata.coordinates;
        }
        const locationMatch = poi.metadata.location?.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
        if (locationMatch && locationMatch[1] && locationMatch[2]) {
            return {
                lat: parseFloat(locationMatch[1]),
                lng: parseFloat(locationMatch[2])
            };
        }
        return null;
    }
    checkIfOpen(poi) {
        if (poi.metadata.openingHours) {
            return true;
        }
        return true;
    }
    getLastReviewDate(poi) {
        if (poi.metadata.lastReviewDate) {
            return poi.metadata.lastReviewDate;
        }
        if (poi.metadata.qaContent && poi.metadata.qaContent.length > 0) {
            return new Date();
        }
        return null;
    }
    getDefaultWeights() {
        return this.config.defaultWeights;
    }
    getConfig() {
        return this.config;
    }
    calculateScoringMetrics(results, scoringTime) {
        const totalResults = results.length;
        const avgTimePerResult = scoringTime / totalResults;
        return {
            totalResults,
            scoringTime,
            avgTimePerResult,
            scoringEfficiency: totalResults / scoringTime
        };
    }
}
exports.ScoringService = ScoringService;
//# sourceMappingURL=scoringService.js.map