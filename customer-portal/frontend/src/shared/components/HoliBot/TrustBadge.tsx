import './TrustBadge.css';

interface TrustBadgeProps {
  rating?: number;
  reviewCount?: number;
  verified?: boolean;
}

export function TrustBadge({ rating, reviewCount, verified }: TrustBadgeProps) {
  // Convert rating to number if it's a string
  const numericRating = typeof rating === 'string' ? parseFloat(rating) : rating;
  const numericReviewCount = typeof reviewCount === 'string' ? parseInt(reviewCount, 10) : reviewCount;

  if (!numericRating || isNaN(numericRating)) return null;

  const stars = Math.round(numericRating * 2) / 2;
  const fullStars = Math.floor(stars);
  const hasHalfStar = stars % 1 !== 0;

  return (
    <div className="trust-badge">
      <div className="trust-badge-stars">
        {Array.from({ length: fullStars }).map((_, i) => (
          <span key={`full-${i}`} className="star-full">⭐</span>
        ))}
        {hasHalfStar && <span className="star-half">⭐</span>}
      </div>
      <span className="trust-badge-rating">{numericRating.toFixed(1)}</span>
      {numericReviewCount && numericReviewCount > 0 && (
        <span className="trust-badge-reviews">({numericReviewCount})</span>
      )}
      {verified && (
        <span className="trust-badge-verified" title="Verified">✓</span>
      )}
    </div>
  );
}
