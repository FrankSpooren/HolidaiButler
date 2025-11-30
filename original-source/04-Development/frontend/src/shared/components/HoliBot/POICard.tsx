import type { POI } from '../../types/poi.types';
import { TrustBadge } from './TrustBadge';
import { ReviewMetadata } from './ReviewMetadata';
import './POICard.css';

interface POICardProps {
  poi: POI;
  onClick?: () => void;
}

export function POICard({ poi, onClick }: POICardProps) {
  const imageUrl = poi.images && poi.images.length > 0 ? poi.images[0] : null;

  return (
    <div className="poi-card" onClick={onClick}>
      {imageUrl && (
        <div className="poi-card-image" style={{ backgroundImage: `url(${imageUrl})` }} />
      )}
      <div className="poi-card-content">
        <h3 className="poi-card-title">{poi.name}</h3>
        <p className="poi-card-category">{poi.category}</p>

        {poi.description && (
          <p className="poi-card-description">{poi.description.slice(0, 100)}...</p>
        )}

        <TrustBadge
          rating={poi.rating}
          reviewCount={poi.review_count}
          verified={poi.popularity_score && poi.popularity_score > 80}
        />

        <ReviewMetadata
          reviewCount={poi.review_count}
          popularityScore={poi.popularity_score}
          priceLevel={poi.price_level}
        />

        {poi.website && (
          <a
            href={poi.website}
            target="_blank"
            rel="noopener noreferrer"
            className="poi-card-link"
            onClick={(e) => e.stopPropagation()}
          >
            Visit Website →
          </a>
        )}
      </div>
    </div>
  );
}
