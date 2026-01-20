/**
 * POIReviewSection - Container for reviews section
 * Sprint 7.6 - Personalized Reviews System
 *
 * Features:
 * - Review summary with average rating and breakdowns
 * - Integrates filters and review cards
 * - Pagination for large review lists
 * - Loading and error states
 * - Empty state when no reviews
 * - Responsive, accessible, i18n ready
 */

import { useState, useEffect } from 'react';
import { Edit } from 'lucide-react';
import { POIReviewCard } from './POIReviewCard';
import { POIReviewFilters } from './POIReviewFilters';
import { WriteReviewModal } from './WriteReviewModal';
import type {
  Review,
  ReviewSummary,
  ReviewFilters,
  TravelPartyType,
  SentimentType,
  ReviewSortType
} from '../types/review.types';
import { reviewService } from '../services/reviewService';
import { calculatePercentage } from '../utils/sentimentAnalysis';
import './POIReviewSection.css';

interface POIReviewSectionProps {
  /** POI ID to fetch reviews for */
  poiId: number;
  /** POI name for the review modal */
  poiName?: string;
  /** Optional initial travel party filter */
  initialTravelParty?: TravelPartyType | 'all';
}

export function POIReviewSection({
  poiId,
  poiName = 'This Place',
  initialTravelParty = 'all'
}: POIReviewSectionProps) {
  // State for reviews and summary
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [writeReviewModalOpen, setWriteReviewModalOpen] = useState(false);

  // State for filters
  const [filters, setFilters] = useState<ReviewFilters>({
    travel_party: initialTravelParty,
    sentiment: 'all',
    sort: 'helpful',
    limit: 10,
    offset: 0
  });

  // State for pagination
  const [totalReviews, setTotalReviews] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // State for helpful marking
  const [markingHelpfulId, setMarkingHelpfulId] = useState<number | null>(null);

  // Fetch reviews and summary
  useEffect(() => {
    fetchReviews();
    fetchSummary();
  }, [poiId, filters.travel_party, filters.sentiment, filters.sort, filters.offset]);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await reviewService.getReviews(poiId, filters);
      setReviews(response.data);
      setTotalReviews(response.total);
      setHasMore(response.data.length === filters.limit!);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load reviews. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const summaryData = await reviewService.getReviewSummary(poiId);
      setSummary(summaryData);
    } catch (err) {
      console.error('Error fetching review summary:', err);
    }
  };

  const handleTravelPartyChange = (party: TravelPartyType | 'all') => {
    setFilters({ ...filters, travel_party: party, offset: 0 });
  };

  const handleSentimentChange = (sentiment: SentimentType | 'all') => {
    setFilters({ ...filters, sentiment, offset: 0 });
  };

  const handleSortChange = (sort: ReviewSortType) => {
    setFilters({ ...filters, sort, offset: 0 });
  };

  const handleLoadMore = () => {
    setFilters({ ...filters, offset: (filters.offset || 0) + (filters.limit || 10) });
  };

  const handleMarkHelpful = async (reviewId: number) => {
    try {
      setMarkingHelpfulId(reviewId);
      await reviewService.markHelpful(poiId, reviewId);
      // Update the review in the list
      setReviews(reviews.map(review =>
        review.id === reviewId
          ? { ...review, helpful_count: review.helpful_count + 1 }
          : review
      ));
    } catch (err) {
      console.error('Error marking review as helpful:', err);
    } finally {
      setMarkingHelpfulId(null);
    }
  };

  // Loading state
  if (isLoading && reviews.length === 0) {
    return (
      <div className="poi-review-section">
        <div className="poi-review-section__loading">
          <div className="poi-review-section__spinner" aria-label="Loading reviews"></div>
          <p>Loading reviews...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && reviews.length === 0) {
    return (
      <div className="poi-review-section">
        <div className="poi-review-section__error" role="alert">
          <p>{error}</p>
          <button onClick={fetchReviews} className="poi-review-section__retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!isLoading && reviews.length === 0 && !error) {
    return (
      <div className="poi-review-section">
        <div className="poi-review-section__empty">
          <span className="poi-review-section__empty-icon" aria-hidden="true">📝</span>
          <h3>No reviews yet</h3>
          <p>Be the first to share your experience!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="poi-review-section">
      {/* Write Review Button */}
      <div className="poi-review-section__write-review-container">
        <button
          className="poi-review-section__write-review-btn"
          onClick={() => setWriteReviewModalOpen(true)}
        >
          <Edit size={18} />
          <span>Write a Review</span>
        </button>
      </div>

      {/* Review Summary */}
      {summary && summary.total_count > 0 && (
        <div className="poi-review-section__summary">
          <div className="poi-review-section__summary-header">
            <div className="poi-review-section__summary-rating">
              <span className="poi-review-section__rating-value">
                {summary.average_rating}
              </span>
              <div className="poi-review-section__rating-stars">
                <span className="poi-review-section__stars" aria-label={`Average rating: ${summary.average_rating} out of 5 stars`}>
                  ★★★★★
                </span>
                <span className="poi-review-section__total-count">
                  {summary.total_count} {summary.total_count === 1 ? 'review' : 'reviews'}
                </span>
              </div>
            </div>

            {/* Sentiment Breakdown */}
            <div className="poi-review-section__summary-breakdown">
              <div className="poi-review-section__breakdown-item">
                <span className="poi-review-section__breakdown-label">
                  <span className="poi-review-section__sentiment-dot poi-review-section__sentiment-dot--positive"></span>
                  Positive
                </span>
                <div className="poi-review-section__breakdown-bar">
                  <div
                    className="poi-review-section__breakdown-fill poi-review-section__breakdown-fill--positive"
                    style={{ width: `${calculatePercentage(summary.sentiment_breakdown.positive, summary.total_count)}%` }}
                  ></div>
                </div>
                <span className="poi-review-section__breakdown-value">
                  {calculatePercentage(summary.sentiment_breakdown.positive, summary.total_count)}%
                </span>
              </div>
              <div className="poi-review-section__breakdown-item">
                <span className="poi-review-section__breakdown-label">
                  <span className="poi-review-section__sentiment-dot poi-review-section__sentiment-dot--neutral"></span>
                  Neutral
                </span>
                <div className="poi-review-section__breakdown-bar">
                  <div
                    className="poi-review-section__breakdown-fill poi-review-section__breakdown-fill--neutral"
                    style={{ width: `${calculatePercentage(summary.sentiment_breakdown.neutral, summary.total_count)}%` }}
                  ></div>
                </div>
                <span className="poi-review-section__breakdown-value">
                  {calculatePercentage(summary.sentiment_breakdown.neutral, summary.total_count)}%
                </span>
              </div>
              <div className="poi-review-section__breakdown-item">
                <span className="poi-review-section__breakdown-label">
                  <span className="poi-review-section__sentiment-dot poi-review-section__sentiment-dot--negative"></span>
                  Negative
                </span>
                <div className="poi-review-section__breakdown-bar">
                  <div
                    className="poi-review-section__breakdown-fill poi-review-section__breakdown-fill--negative"
                    style={{ width: `${calculatePercentage(summary.sentiment_breakdown.negative, summary.total_count)}%` }}
                  ></div>
                </div>
                <span className="poi-review-section__breakdown-value">
                  {calculatePercentage(summary.sentiment_breakdown.negative, summary.total_count)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <POIReviewFilters
        travelParty={filters.travel_party || 'all'}
        sentiment={filters.sentiment || 'all'}
        sort={filters.sort}
        onTravelPartyChange={handleTravelPartyChange}
        onSentimentChange={handleSentimentChange}
        onSortChange={handleSortChange}
      />

      {/* Review Grid */}
      <div className="poi-review-section__grid">
        {reviews.map((review) => (
          <POIReviewCard
            key={review.id}
            review={review}
            onMarkHelpful={handleMarkHelpful}
            isMarkingHelpful={markingHelpfulId === review.id}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="poi-review-section__load-more">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="poi-review-section__load-more-btn"
          >
            {isLoading ? 'Loading...' : 'Load More Reviews'}
          </button>
        </div>
      )}

      {/* Write Review Modal */}
      <WriteReviewModal
        poiId={poiId}
        poiName={poiName}
        isOpen={writeReviewModalOpen}
        onClose={() => setWriteReviewModalOpen(false)}
        onSubmitSuccess={() => {
          fetchReviews();
          fetchSummary();
        }}
      />
    </div>
  );
}
