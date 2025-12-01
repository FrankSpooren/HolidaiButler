import React from 'react';
import type { POI } from '../types/poi.types';
import { MapPin, Star, Phone, Globe } from 'lucide-react';

interface POICardProps {
  poi: POI;
  onClick?: () => void;
}

export const POICard: React.FC<POICardProps> = ({ poi, onClick }) => {
  // Format rating to 1 decimal place
  const formattedRating = poi.rating ? poi.rating.toFixed(1) : null;

  // Price level indicator (€ to €€€€)
  const priceIndicator = poi.price_level ? '€'.repeat(poi.price_level) : null;

  // Convert POI name to title case (first letter of each word capitalized)
  const toTitleCase = (str: string) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formattedName = toTitleCase(poi.name);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-card border border-border-light p-4 shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer active:scale-98 md:hover:translate-y-[-2px]"
    >
      {/* POI Image Placeholder */}
      <div className="w-full h-40 bg-bg-gray rounded-lg mb-3 flex items-center justify-center overflow-hidden">
        {poi.images && poi.images.length > 0 ? (
          <img
            src={poi.images[0]}
            alt={poi.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <MapPin className="w-12 h-12 text-text-tertiary" />
        )}
      </div>

      {/* POI Content */}
      <div className="space-y-2">
        {/* Category Badge */}
        {poi.category && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-holibot-accent bg-holibot-accent/10 px-3 py-1 rounded-chip whitespace-nowrap">
              {poi.category}
            </span>
            {poi.verified && (
              <span className="text-xs font-medium text-verified-navy bg-verified-navy/10 px-3 py-1 rounded-chip whitespace-nowrap">
                Verified
              </span>
            )}
          </div>
        )}

        {/* POI Name */}
        <h3 className="text-base font-semibold text-text-primary line-clamp-2 min-h-touch-lg">
          {formattedName}
        </h3>

        {/* Rating & Price */}
        <div className="flex items-center gap-3 text-sm">
          {formattedRating && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-rating-gold text-rating-gold" />
              <span className="font-medium text-text-primary">{formattedRating}</span>
            </div>
          )}
          {priceIndicator && (
            <span className="text-text-secondary font-medium">{priceIndicator}</span>
          )}
        </div>

        {/* Address */}
        {(poi.address || poi.city) && (
          <div className="flex items-start gap-1 text-sm text-text-secondary">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-1">
              {poi.address && poi.city ? `${poi.address}, ${poi.city}` : poi.address || poi.city}
            </span>
          </div>
        )}

        {/* Enriched Tile Description */}
        {(poi.enriched_tile_description || poi.description) && (
          <p className="text-sm text-text-secondary line-clamp-2">
            {poi.enriched_tile_description || poi.description}
          </p>
        )}

        {/* Quick Actions */}
        <div className="flex items-center gap-2 pt-2">
          {poi.phone && (
            <button
              className="flex-1 min-h-touch py-2 px-3 bg-bg-hover text-text-primary rounded-button text-sm font-medium hover:bg-border-light transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `tel:${poi.phone}`;
              }}
            >
              <Phone className="w-4 h-4 inline mr-1" />
              Call
            </button>
          )}
          {poi.website && (
            <button
              className="flex-1 min-h-touch py-2 px-3 bg-bg-hover text-text-primary rounded-button text-sm font-medium hover:bg-border-light transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                window.open(poi.website!, '_blank');
              }}
            >
              <Globe className="w-4 h-4 inline mr-1" />
              Website
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default POICard;
