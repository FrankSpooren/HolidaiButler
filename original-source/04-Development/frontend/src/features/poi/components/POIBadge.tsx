/**
 * POIBadge - Category, Verified, and Popular badge component
 *
 * Usage:
 * <POIBadge type="category" category="Food & Drinks" />
 * <POIBadge type="verified" />
 * <POIBadge type="popular" />
 *
 * Design Requirements:
 * - Category badge: Colored chip with gradient from categoryConfig
 * - Verified badge: Green checkmark + "Verified" text
 * - Popular badge: Star icon + "Popular" text (rating > 4.5 && review_count > 50)
 * - Responsive, accessible, i18n ready
 */

import { getCategoryColor } from '../../../shared/config/categoryConfig';
import './POIBadge.css';

interface POIBadgeProps {
  /** Badge type */
  type: 'category' | 'verified' | 'popular';
  /** Category name (required for type="category") */
  category?: string;
  /** Optional custom className */
  className?: string;
}

export function POIBadge({ type, category, className = '' }: POIBadgeProps) {
  // Category badge
  if (type === 'category' && category) {
    const categoryColor = getCategoryColor(category);

    return (
      <span
        className={`poi-badge poi-badge-category ${className}`}
        style={{ background: categoryColor }}
        role="status"
        aria-label={`Category: ${category}`}
      >
        {category}
      </span>
    );
  }

  // Verified badge
  if (type === 'verified') {
    return (
      <span
        className={`poi-badge poi-badge-verified ${className}`}
        role="status"
        aria-label="Verified location"
      >
        <span className="poi-badge-icon" aria-hidden="true">✓</span>
        Verified
      </span>
    );
  }

  // Popular badge
  if (type === 'popular') {
    return (
      <span
        className={`poi-badge poi-badge-popular ${className}`}
        role="status"
        aria-label="Popular destination"
      >
        <span className="poi-badge-icon" aria-hidden="true">⭐</span>
        Popular
      </span>
    );
  }

  return null;
}
