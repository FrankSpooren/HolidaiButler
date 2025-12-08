/**
 * POIComparisonModal - Side-by-side comparison of 2-3 POIs
 *
 * Sprint 8.0: POI Comparison Feature
 *
 * Features:
 * - Full-screen modal with close button
 * - Side-by-side comparison table
 * - Images, ratings, prices, descriptions
 * - Contact information
 * - Reviews summary
 * - Responsive design
 */

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { poiService } from '../services/poiService';
import { useLanguage } from '../../../i18n/LanguageContext';
import { POIRating } from './POIRating';
import { POIBadge } from './POIBadge';
import './POIComparisonModal.css';

interface POIComparisonModalProps {
  poiIds: number[];
  isOpen: boolean;
  onClose: () => void;
}

export function POIComparisonModal({ poiIds, isOpen, onClose }: POIComparisonModalProps) {
  const { t } = useLanguage();

  // Fetch all POIs
  const poisQueries = poiIds.map(id =>
    useQuery({
      queryKey: ['poi', id],
      queryFn: () => poiService.getPOIById(id),
      enabled: isOpen && !!id,
    })
  );

  const pois = poisQueries.map(q => q.data).filter(Boolean);
  const isLoading = poisQueries.some(q => q.isLoading);
  const hasError = poisQueries.some(q => q.error);

  // Close on ESC key and prevent body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getBudgetLabel = (priceLevel: number | null): string => {
    if (!priceLevel) return '-';
    const labels: Record<number, string> = {
      1: t.poi.budgetLabels.budget,
      2: t.poi.budgetLabels.midRange,
      3: t.poi.budgetLabels.upscale,
      4: t.poi.budgetLabels.luxury,
    };
    return labels[priceLevel] || '-';
  };

  return (
    <div className="comparison-modal-overlay" onClick={onClose}>
      <div className="comparison-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="comparison-modal-header">
          <h2 className="comparison-modal-title">
            {t.poi.comparison.compareTitle || 'Compare POIs'}
          </h2>
          <button
            onClick={onClose}
            className="comparison-modal-close"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="comparison-modal-content">
          {isLoading && (
            <div className="comparison-loading">
              <div className="comparison-loading-spinner">⏳</div>
              <p>{t.common.loading}</p>
            </div>
          )}

          {hasError && (
            <div className="comparison-error">
              <p>{t.poi.loadingStates?.notFound || 'Error loading POIs for comparison'}</p>
            </div>
          )}

          {!isLoading && !hasError && pois.length > 0 && (
            <div className="comparison-table-wrapper">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th className="comparison-table-label"></th>
                    {pois.map((poi) => poi && (
                      <th key={poi.id} className="comparison-table-poi">
                        <div className="comparison-poi-header">
                          {/* POI Image */}
                          <div className="comparison-poi-image">
                            {poi.images && poi.images.length > 0 ? (
                              <img src={poi.images[0]} alt={poi.name} />
                            ) : poi.thumbnail_url ? (
                              <img src={poi.thumbnail_url} alt={poi.name} />
                            ) : (
                              <div className="comparison-poi-no-image">📍</div>
                            )}
                          </div>

                          {/* POI Name & Category */}
                          <h3 className="comparison-poi-name">{poi.name}</h3>
                          <div className="comparison-poi-badges">
                            <POIBadge type="category" category={poi.category} />
                            {poi.verified && <POIBadge type="verified" />}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {/* Rating */}
                  <tr>
                    <td className="comparison-table-label">{'Rating'}</td>
                    {pois.map((poi) => poi && (
                      <td key={poi.id} className="comparison-table-value">
                        <POIRating rating={poi.rating} size="medium" showReviewCount={false} />
                        {poi.review_count && (
                          <div className="comparison-review-count">
                            {poi.review_count} {t.reviews?.noReviews ? 'reviews' : 'reviews'}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Price Level */}
                  <tr>
                    <td className="comparison-table-label">{t.poi.budgetLabels?.priceLevel || 'Price'}</td>
                    {pois.map((poi) => poi && (
                      <td key={poi.id} className="comparison-table-value">
                        <div className="comparison-price">
                          {poi.price_level ? '€'.repeat(poi.price_level) : '-'}
                          <div className="comparison-price-label">
                            {getBudgetLabel(poi.price_level)}
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Description */}
                  <tr>
                    <td className="comparison-table-label">{t.poi.about || 'Description'}</td>
                    {pois.map((poi) => poi && (
                      <td key={poi.id} className="comparison-table-value">
                        <div className="comparison-description">
                          {poi.description
                            ? poi.description.length > 150
                              ? `${poi.description.substring(0, 150)}...`
                              : poi.description
                            : '-'}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Address */}
                  <tr>
                    <td className="comparison-table-label">{'Address'}</td>
                    {pois.map((poi) => poi && (
                      <td key={poi.id} className="comparison-table-value">
                        {poi.address || '-'}
                      </td>
                    ))}
                  </tr>

                  {/* Phone */}
                  <tr>
                    <td className="comparison-table-label">{'Phone'}</td>
                    {pois.map((poi) => poi && (
                      <td key={poi.id} className="comparison-table-value">
                        {poi.phone ? (
                          <a href={`tel:${poi.phone}`} className="comparison-link">
                            {poi.phone}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Website */}
                  <tr>
                    <td className="comparison-table-label">{'Website'}</td>
                    {pois.map((poi) => poi && (
                      <td key={poi.id} className="comparison-table-value">
                        {poi.website ? (
                          <a
                            href={poi.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="comparison-link"
                          >
                            {t.poi.visitWebsite || 'Visit website'}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Opening Hours Summary */}
                  <tr>
                    <td className="comparison-table-label">{t.poi.openingHours || 'Hours'}</td>
                    {pois.map((poi) => poi && (
                      <td key={poi.id} className="comparison-table-value">
                        {poi.opening_hours ? (
                          <div className="comparison-hours-indicator">✓ {t.poi.openingStatus?.available || 'Available'}</div>
                        ) : (
                          '-'
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Amenities */}
                  <tr>
                    <td className="comparison-table-label">{t.poi.amenities?.title || 'Amenities'}</td>
                    {pois.map((poi) => {
                      if (!poi) return null;
                      const amenities: string[] = [];
                      if (poi.accessibility_features && poi.accessibility_features.includes('wheelchair_accessible')) {
                        amenities.push('♿ Wheelchair');
                      }
                      if (poi.amenities) {
                        if (poi.amenities.includes('wifi')) amenities.push('📶 WiFi');
                        if (poi.amenities.includes('credit_cards')) amenities.push('💳 Cards');
                      }

                      return (
                        <td key={poi.id} className="comparison-table-value">
                          {amenities.length > 0 ? (
                            <div className="comparison-amenities">
                              {amenities.map((amenity, index) => (
                                <div key={index} className="comparison-amenity-item">
                                  {amenity}
                                </div>
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="comparison-modal-footer">
          <p className="comparison-modal-hint">
            {t.poi.comparison.hint || 'Select 2-3 POIs to compare their features side-by-side'}
          </p>
        </div>
      </div>
    </div>
  );
}
