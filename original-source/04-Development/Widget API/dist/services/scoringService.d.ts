import { POIResult } from '../models/POIResult';
import { SmartScore, ScoringWeights, UserContext, ScoringConfig } from '../models/ScoringModels';
export declare class ScoringService {
    private config;
    constructor();
    calculateSmartScore(poi: POIResult, userContext: UserContext, weights?: ScoringWeights): SmartScore;
    private calculateRatingScore;
    private calculateDistanceScore;
    private calculateFreshnessScore;
    private calculatePopularityScore;
    private calculateDietaryIntentScore;
    private calculateGeneralIntentScore;
    private calculateCategoryRelevanceScore;
    private getPOIText;
    private calculateDistance;
    private haversineDistance;
    private toRadians;
    private extractCoordinates;
    private checkIfOpen;
    private getLastReviewDate;
    getDefaultWeights(): ScoringWeights;
    getConfig(): ScoringConfig;
    calculateScoringMetrics(results: POIResult[], scoringTime: number): any;
}
//# sourceMappingURL=scoringService.d.ts.map