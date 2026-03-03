/**
 * POIReviewFilters - Review filtering and sorting component
 * Sprint 7.6 - Personalized Reviews System
 *
 * Features:
 * - Travel party filter buttons (All, Couples, Families, Solo, Friends, Business)
 * - Sort dropdown (Most Recent, Most Helpful, Highest Rating, Lowest Rating)
 * - Sentiment filter (All, Positive, Neutral, Negative)
 * - Responsive, accessible, i18n ready
 */

import type { TravelPartyType, SentimentType, ReviewSortType } from '../types/review.types';
import { useLanguage } from '../../../i18n/LanguageContext';
import { getTravelPartyBadge, getSentimentBadge } from '../utils/sentimentAnalysis';
import './POIReviewFilters.css';

interface POIReviewFiltersProps {
  /** Current travel party filter */
  travelParty: TravelPartyType | 'all';
  /** Current sentiment filter */
  sentiment: SentimentType | 'all';
  /** Current sort option */
  sort: ReviewSortType;
  /** Callback when travel party filter changes */
  onTravelPartyChange: (party: TravelPartyType | 'all') => void;
  /** Callback when sentiment filter changes */
  onSentimentChange: (sentiment: SentimentType | 'all') => void;
  /** Callback when sort option changes */
  onSortChange: (sort: ReviewSortType) => void;
}

const TRAVEL_PARTY_OPTIONS: Array<TravelPartyType | 'all'> = [
  'all',
  'couples',
  'families',
  'solo',
  'friends',
  'business'
];

const SENTIMENT_OPTIONS: Array<SentimentType | 'all'> = [
  'all',
  'positive',
  'neutral',
  'negative'
];

export function POIReviewFilters({
  travelParty,
  sentiment,
  sort,
  onTravelPartyChange,
  onSentimentChange,
  onSortChange
}: POIReviewFiltersProps) {
  const { t } = useLanguage();

  const SORT_OPTIONS: Array<{ value: ReviewSortType; label: string }> = [
    { value: 'helpful', label: t.reviews.sort.helpful },
    { value: 'recent', label: t.reviews.sort.recent },
    { value: 'highRating', label: t.reviews.sort.highRating },
    { value: 'lowRating', label: t.reviews.sort.lowRating }
  ];

  return (
    <div className="poi-review-filters" role="group" aria-label="Review filters">
      {/* Travel Party Filters */}
      <div className="poi-review-filters__section">
        <h3 className="poi-review-filters__label">{t.reviews.filterByTraveler}</h3>
        <div
          className="poi-review-filters__buttons"
          role="group"
          aria-label="Filter by traveler type"
        >
          {TRAVEL_PARTY_OPTIONS.map((party) => {
            const isActive = travelParty === party;
            let badge;
            let label;

            if (party === 'all') {
              label = t.reviews.travelParty.all;
              badge = null;
            } else {
              badge = getTravelPartyBadge(party);
              label = t.reviews.travelParty[party as keyof typeof t.reviews.travelParty] || badge.label;
            }

            return (
              <button
                key={party}
                className={`poi-review-filters__btn ${
                  isActive ? 'poi-review-filters__btn--active' : ''
                } ${party === 'all' ? 'poi-review-filters__btn--all' : ''}`}
                style={
                  isActive && badge
                    ? { backgroundColor: badge.color, color: '#ffffff' }
                    : undefined
                }
                onClick={() => onTravelPartyChange(party)}
                aria-pressed={isActive}
                aria-label={`Filter by ${label}`}
              >
                {badge && (
                  <span className="poi-review-filters__icon" aria-hidden="true">
                    {badge.icon}
                  </span>
                )}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Row: Sentiment Filters + Sort Dropdown */}
      <div className="poi-review-filters__bottom">
        {/* Sentiment Filters */}
        <div className="poi-review-filters__section">
          <h3 className="poi-review-filters__label">{t.reviews.filterBySentiment}</h3>
          <div
            className="poi-review-filters__buttons"
            role="group"
            aria-label="Filter by sentiment"
          >
            {SENTIMENT_OPTIONS.map((sentimentOption) => {
              const isActive = sentiment === sentimentOption;
              let badge;
              let label;

              if (sentimentOption === 'all') {
                label = t.reviews.allReviews;
                badge = null;
              } else {
                badge = getSentimentBadge(sentimentOption);
                label = t.reviews.sentiment[sentimentOption as keyof typeof t.reviews.sentiment] || badge.label;
              }

              return (
                <button
                  key={sentimentOption}
                  className={`poi-review-filters__btn poi-review-filters__btn--sentiment ${
                    isActive ? 'poi-review-filters__btn--active' : ''
                  } ${sentimentOption === 'all' ? 'poi-review-filters__btn--all' : ''}`}
                  style={
                    isActive && badge
                      ? { borderColor: badge.color, color: badge.color }
                      : undefined
                  }
                  onClick={() => onSentimentChange(sentimentOption)}
                  aria-pressed={isActive}
                  aria-label={`Filter by ${label}`}
                >
                  {badge && (
                    <span className="poi-review-filters__icon" aria-hidden="true">
                      {badge.icon}
                    </span>
                  )}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sort Dropdown */}
        <div className="poi-review-filters__section poi-review-filters__section--sort">
          <label htmlFor="review-sort" className="poi-review-filters__label">
            {t.reviews.sortBy}
          </label>
          <select
            id="review-sort"
            className="poi-review-filters__select"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as ReviewSortType)}
            aria-label="Sort reviews by"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
