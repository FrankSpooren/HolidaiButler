import { Star, StarHalf } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';

interface POIRatingProps {
  /** Rating value (0-5) */
  rating: number | null;
  /** Number of reviews (optional) */
  reviewCount?: number | null;
  /** Display size: 'small' | 'medium' | 'large' */
  size?: 'small' | 'medium' | 'large';
  /** Show rating number (default: true) */
  showNumber?: boolean;
  /** Show review count (default: true if reviewCount provided) */
  showReviewCount?: boolean;
  /** Custom CSS class */
  className?: string;
}

/**
 * POIRating - Enterprise rating component with star visualization
 *
 * Features:
 * - Accurate star display (filled/half/empty)
 * - Configurable sizes
 * - Review count display
 * - No reviews handling (shows "Geen reviews beschikbaar")
 * - Accessible design
 */
export function POIRating({
  rating,
  reviewCount,
  size = 'medium',
  showNumber = true,
  showReviewCount = true,
  className = ''
}: POIRatingProps) {
  const { t } = useLanguage();

  // Size configurations
  const sizes = {
    small: { star: 12, text: '12px', gap: '4px' },
    medium: { star: 16, text: '14px', gap: '6px' },
    large: { star: 20, text: '16px', gap: '8px' }
  };

  const config = sizes[size];

  // Calculate star states with safe type conversion
  // Handle null, undefined, strings, and numbers
  const parseRating = (value: number | null | undefined): number => {
    // Explicitly check for null/undefined
    if (value === null || value === undefined || value === '') return 0;

    // Convert to number (handles both number and string types)
    const parsed = Number(value);

    // Validate and clamp between 0-5
    if (isNaN(parsed) || parsed === 0) return 0;
    return Math.max(0, Math.min(5, parsed));
  };

  const ratingValue = parseRating(rating);

  // CRITICAL FIX: Only show "No reviews" if BOTH rating AND review_count are missing/0
  // If rating exists, show it even if review_count is 0 (common for newly added POIs)
  const hasNoRating = !rating || rating === 0 || ratingValue === 0;

  // Show "No reviews available" ONLY when there's truly no rating data
  if (hasNoRating) {
    return (
      <div
        className={`poi-rating ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: config.gap,
          fontFamily: 'Inter, sans-serif'
        }}
      >
        <span
          style={{
            fontSize: config.text,
            color: '#9CA3AF',
            fontStyle: 'italic'
          }}
        >
          {t?.poi?.noReviews || 'Geen reviews beschikbaar'}
        </span>
      </div>
    );
  }

  const fullStars = Math.floor(ratingValue);
  const hasHalfStar = ratingValue % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div
      className={`poi-rating ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: config.gap,
        fontFamily: 'Inter, sans-serif'
      }}
      role="img"
      aria-label={`Rating: ${ratingValue.toFixed(1)} out of 5 stars${reviewCount ? `, ${reviewCount} reviews` : ''}`}
    >
      {/* Rating number - only show if rating exists */}
      {showNumber && ratingValue > 0 && (
        <span
          style={{
            fontSize: config.text,
            fontWeight: 600,
            color: '#1F2937'
          }}
        >
          {ratingValue.toFixed(1)}
        </span>
      )}

      {/* Star visualization */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px'
        }}
      >
        {/* Filled stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            size={config.star}
            fill="#F59E0B"
            stroke="#F59E0B"
            strokeWidth={2}
          />
        ))}

        {/* Half star */}
        {hasHalfStar && (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {/* Empty star background */}
            <Star
              size={config.star}
              fill="none"
              stroke="#F59E0B"
              strokeWidth={2}
            />
            {/* Half star overlay */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '50%',
                height: '100%',
                overflow: 'hidden'
              }}
            >
              <Star
                size={config.star}
                fill="#F59E0B"
                stroke="#F59E0B"
                strokeWidth={2}
              />
            </div>
          </div>
        )}

        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            size={config.star}
            fill="none"
            stroke="#D1D5DB"
            strokeWidth={2}
          />
        ))}
      </div>

      {/* Review count - only show if > 0 to avoid confusing "(0)" displays */}
      {showReviewCount && reviewCount !== null && reviewCount !== undefined && reviewCount > 0 && (
        <span
          style={{
            fontSize: config.text,
            color: '#6B7280',
            fontWeight: 400
          }}
        >
          ({reviewCount.toLocaleString()})
        </span>
      )}
    </div>
  );
}
