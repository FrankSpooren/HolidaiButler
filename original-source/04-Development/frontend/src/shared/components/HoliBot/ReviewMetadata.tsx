import './ReviewMetadata.css';

interface ReviewMetadataProps {
  reviewCount?: number;
  popularityScore?: number;
  priceLevel?: number;
}

export function ReviewMetadata({ reviewCount, popularityScore, priceLevel }: ReviewMetadataProps) {
  return (
    <div className="review-metadata">
      {reviewCount && reviewCount > 0 && (
        <span className="metadata-item">
          💬 {reviewCount} reviews
        </span>
      )}
      {popularityScore && popularityScore > 70 && (
        <span className="metadata-item metadata-popular">
          🔥 Popular
        </span>
      )}
      {priceLevel && (
        <span className="metadata-item">
          {'€'.repeat(priceLevel)}
        </span>
      )}
    </div>
  );
}
