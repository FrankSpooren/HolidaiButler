/**
 * Review Types
 * Sprint 7.6 - Personalized Reviews System
 *
 * Type definitions for the review system including travel party types,
 * sentiment analysis, and review filtering.
 */

/**
 * Travel party type enum
 * Represents different types of travelers who can leave reviews
 */
export type TravelPartyType = 'couples' | 'families' | 'solo' | 'friends' | 'business';

/**
 * Sentiment type enum
 * Represents the overall sentiment of a review (positive, neutral, negative)
 */
export type SentimentType = 'positive' | 'neutral' | 'negative';

/**
 * Review sort type enum
 * Different ways to sort reviews
 */
export type ReviewSortType = 'recent' | 'helpful' | 'highRating' | 'lowRating';

/**
 * Individual review interface
 * Represents a single review from a user
 */
export interface Review {
  id: number;
  poi_id: number;
  user_name: string;
  travel_party_type: TravelPartyType;
  rating: number;
  review_text: string;
  sentiment: SentimentType;
  helpful_count: number;
  visit_date: string;
  created_at: string;
}

/**
 * Review summary interface
 * Aggregated statistics about all reviews for a POI
 */
export interface ReviewSummary {
  average_rating: number;
  total_count: number;
  sentiment_breakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  party_breakdown: {
    couples: number;
    families: number;
    solo: number;
    friends: number;
    business: number;
  };
}

/**
 * Review filters interface
 * Used to filter and sort reviews
 */
export interface ReviewFilters {
  travel_party?: TravelPartyType | 'all';
  sentiment?: SentimentType | 'all';
  sort: ReviewSortType;
  limit?: number;
  offset?: number;
}

/**
 * Review API response interface
 * Response structure from the backend API
 */
export interface ReviewsResponse {
  success: boolean;
  data: Review[];
  total: number;
  filters: ReviewFilters;
}

/**
 * Review summary API response interface
 */
export interface ReviewSummaryResponse {
  success: boolean;
  data: ReviewSummary;
}

/**
 * Helper type for travel party badge configuration
 */
export interface TravelPartyBadgeConfig {
  type: TravelPartyType;
  label: string;
  color: string;
  icon?: string;
}

/**
 * Helper type for sentiment badge configuration
 */
export interface SentimentBadgeConfig {
  type: SentimentType;
  label: string;
  color: string;
  icon: string;
}
