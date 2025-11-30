import { ScoringConfig } from '../models/ScoringModels';
export declare const getScoringConfig: () => ScoringConfig;
export declare const getDefaultScoringWeights: () => {
    semanticSimilarity: number;
    userRating: number;
    distance: number;
    freshness: number;
    popularity: number;
    dietaryIntent: number;
    categoryRelevance: number;
    generalIntent: number;
};
export declare const getScoringConfigFromEnv: () => ScoringConfig;
//# sourceMappingURL=scoring.d.ts.map