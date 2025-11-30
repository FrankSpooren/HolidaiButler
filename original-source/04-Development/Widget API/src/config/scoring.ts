import { ScoringConfig } from '../models/ScoringModels';

export const getScoringConfig = (): ScoringConfig => ({
  defaultWeights: JSON.parse(process.env.DEFAULT_SCORING_WEIGHTS || '{"semanticSimilarity":0.25,"userRating":0.2,"distance":0.2,"freshness":0.1,"popularity":0.1,"dietaryIntent":0.05,"categoryRelevance":0.05,"generalIntent":0.2}'),
  enableDistanceScoring: true,
  enableRatingScoring: true,
  enableFreshnessScoring: true,
  enablePopularityScoring: true,
  enableDietaryIntentScoring: true,
  enableCategoryRelevanceScoring: true,
  enableGeneralIntentScoring: true
});

export const getDefaultScoringWeights = () => ({
  semanticSimilarity: 0.25,
  userRating: 0.2,
  distance: 0.2,
  freshness: 0.1,
  popularity: 0.1,
  dietaryIntent: 0.05,
  categoryRelevance: 0.05,
  generalIntent: 0.2
});

export const getScoringConfigFromEnv = () => {
  return getScoringConfig();
};
