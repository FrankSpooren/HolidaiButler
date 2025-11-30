/**
 * POIReviewCard - Individual review display component
 * Sprint 7.6 - Personalized Reviews System
 *
 * Features:
 * - Display individual review with travel party badge
 * - Sentiment indicator (positive/neutral/negative)
 * - Star rating display
 * - Review text with "Read more" for long reviews
 * - Helpful count and button
 * - Visit date and posted date
 * - Responsive, accessible, i18n ready
 */

import { useState } from 'react';
import type { Review } from '../types/review.types';
import {
  getSentimentBadge,
  getTravelPartyBadge,
  formatVisitDate,
  formatRelativeTime,
  truncateReviewText,
  getStarRating
} from '../utils/sentimentAnalysis';
import './POIReviewCard.css';

interface POIReviewCardProps {
  review: Review;
  onMarkHelpful: (reviewId: number) => void;
  isMarkingHelpful?: boolean;
}

export function POIReviewCard({
  review,
  onMarkHelpful,
  isMarkingHelpful = false
}: POIReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasMarkedHelpful, setHasMarkedHelpful] = useState(false);

  const sentimentBadge = getSentimentBadge(review.sentiment);
  const partyBadge = getTravelPartyBadge(review.travel_party_type);
  const stars = getStarRating(review.rating);
  const { truncated, isTruncated } = truncateReviewText(review.review_text, 200);

  const handleMarkHelpful = () => {
    if (!hasMarkedHelpful && !isMarkingHelpful) {
      onMarkHelpful(review.id);
      setHasMarkedHelpful(true);
    }
  };

  return (
    <article
      className={`poi-review-card poi-review-card--${review.sentiment}`}
      role="article"
      aria-label={`Review by ${review.user_name}`}
    >
      {/* Header: User info and badges */}
      <div className="poi-review-card__header">
        <div className="poi-review-card__user-info">
          <h3 className="poi-review-card__user-name">{review.user_name}</h3>
          <div className="poi-review-card__badges">
            <span
              className="poi-review-card__party-badge"
              style={{ backgroundColor: partyBadge.color }}
              role="status"
              aria-label={`Travel party: ${partyBadge.label}`}
            >
              <span className="poi-review-card__party-icon" aria-hidden="true">
                {partyBadge.icon}
              </span>
              {partyBadge.label}
            </span>
            <span
              className="poi-review-card__sentiment-badge"
              style={{ color: sentimentBadge.color }}
              role="status"
              aria-label={`Sentiment: ${sentimentBadge.label}`}
            >
              <span className="poi-review-card__sentiment-icon" aria-hidden="true">
                {sentimentBadge.icon}
              </span>
              {sentimentBadge.label}
            </span>
          </div>
        </div>

        {/* Star Rating */}
        <div className="poi-review-card__rating" role="img" aria-label={`Rating: ${review.rating} out of 5 stars`}>
          {stars.map((filled, index) => (
            <span
              key={index}
              className={`poi-review-card__star ${filled ? 'poi-review-card__star--filled' : ''}`}
              aria-hidden="true"
            >
              ★
            </span>
          ))}
        </div>
      </div>

      {/* Review Text */}
      <div className="poi-review-card__content">
        <p className="poi-review-card__text">
          {isExpanded ? review.review_text : truncated}
        </p>
        {isTruncated && (
          <button
            className="poi-review-card__read-more"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
          >
            {isExpanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {/* Footer: Dates and Helpful button */}
      <div className="poi-review-card__footer">
        <div className="poi-review-card__dates">
          <span className="poi-review-card__visit-date">
            {formatVisitDate(review.visit_date)}
          </span>
          <span className="poi-review-card__posted-date" aria-label={`Posted ${formatRelativeTime(review.created_at)}`}>
            · {formatRelativeTime(review.created_at)}
          </span>
        </div>

        <button
          className={`poi-review-card__helpful-btn ${hasMarkedHelpful ? 'poi-review-card__helpful-btn--marked' : ''}`}
          onClick={handleMarkHelpful}
          disabled={hasMarkedHelpful || isMarkingHelpful}
          aria-label={`Mark review as helpful. ${review.helpful_count} people found this helpful`}
        >
          <span className="poi-review-card__helpful-icon" aria-hidden="true">
            👍
          </span>
          <span className="poi-review-card__helpful-text">Helpful</span>
          <span className="poi-review-card__helpful-count">
            ({hasMarkedHelpful ? review.helpful_count + 1 : review.helpful_count})
          </span>
        </button>
      </div>
    </article>
  );
}
