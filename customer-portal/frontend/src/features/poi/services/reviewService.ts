/**
 * Review Service
 * Sprint 7.6 - Personalized Reviews System
 *
 * API service for fetching and managing POI reviews
 */

import apiClient from '@/shared/utils/api';
import type {
  Review,
  ReviewSummary,
  ReviewFilters,
  ReviewsResponse,
  ReviewSummaryResponse
} from '../types/review.types';

export const reviewService = {
  /**
   * Get reviews for a specific POI with filtering and sorting
   * @param poiId - POI ID
   * @param filters - Review filters (travel party, sentiment, sort, pagination)
   * @returns Promise with reviews data
   */
  async getReviews(poiId: number, filters: ReviewFilters): Promise<ReviewsResponse> {
    const params = new URLSearchParams();

    if (filters.travel_party && filters.travel_party !== 'all') {
      params.append('travel_party', filters.travel_party);
    }
    if (filters.sentiment && filters.sentiment !== 'all') {
      params.append('sentiment', filters.sentiment);
    }
    params.append('sort', filters.sort);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const { data } = await apiClient.get<ReviewsResponse>(
      `/pois/${poiId}/reviews?${params}`
    );
    return data;
  },

  /**
   * Get review summary statistics for a POI
   * @param poiId - POI ID
   * @returns Promise with review summary data
   */
  async getReviewSummary(poiId: number): Promise<ReviewSummary> {
    const { data } = await apiClient.get<ReviewSummaryResponse>(
      `/pois/${poiId}/reviews/summary`
    );
    return data.data;
  },

  /**
   * Get review insights (common keywords/themes) for a POI
   * @param poiId - POI ID
   * @returns Promise with review insights
   */
  async getReviewInsights(poiId: number): Promise<{
    insights: Array<{ keyword: string; count: number; label: string }>;
    sample_size: number;
  }> {
    const { data } = await apiClient.get<{
      success: boolean;
      data: {
        insights: Array<{ keyword: string; count: number; label: string }>;
        sample_size: number;
      };
    }>(`/pois/${poiId}/reviews/insights`);
    return data.data;
  },

  /**
   * Mark a review as helpful
   * @param poiId - POI ID
   * @param reviewId - Review ID
   * @returns Promise with updated helpful count
   */
  async markHelpful(poiId: number, reviewId: number): Promise<{ id: number; helpful_count: number }> {
    const { data } = await apiClient.post<{
      success: boolean;
      data: { id: number; helpful_count: number };
    }>(`/pois/${poiId}/reviews/${reviewId}/helpful`);
    return data.data;
  }
};
