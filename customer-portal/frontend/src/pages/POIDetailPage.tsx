/**
 * POIDetailPage - Single POI detail view with live data
 *
 * Route: /pois/:id
 * Layout: RootLayout
 * Auth: Public
 *
 * Features:
 * - Live data from backend API
 * - Hero image with title and category
 * - Action buttons (Call, Website, Directions, Save)
 * - Description and details
 * - Contact information
 * - Opening hours
 * - 2-column desktop layout
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { poiService } from '../features/poi/services/poiService';
import { getCategoryIcon, getCategoryColor } from '../shared/config/categoryConfig';
import { POIAirbnbGallery } from '../features/poi/components/POIAirbnbGallery';
import { POIImageLightbox } from '../features/poi/components/POIImageLightbox';
import { POIBadge } from '../features/poi/components/POIBadge';
import { POIReviewSection } from '../features/poi/components/POIReviewSection';
import { POIActionButtons } from '../features/poi/components/POIActionButtons';
import { useVisited } from '../shared/contexts/VisitedContext';
import './POIDetailPage.css';

export function POIDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { markPOIVisited } = useVisited();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const { data: poi, isLoading, error } = useQuery({
    queryKey: ['poi', id],
    queryFn: () => poiService.getPOIById(Number(id)),
    enabled: !!id,
  });

  // Track POI visit when data is loaded
  useEffect(() => {
    if (poi?.id) {
      markPOIVisited(poi.id);
    }
  }, [poi?.id, markPOIVisited]);

  // Handle opening lightbox at specific image index
  const handleOpenLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Handle closing lightbox
  const handleCloseLightbox = () => {
    setLightboxOpen(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="poi-loading">
        <div className="poi-loading-spinner">⏳</div>
        <p style={{ marginTop: '16px', color: '#6B7280' }}>Loading POI details...</p>
      </div>
    );
  }

  // Error state
  if (error || !poi) {
    return (
      <div className="poi-error">
        <div className="poi-error-icon">⚠️</div>
        <h2 className="poi-error-title">POI Not Found</h2>
        <p className="poi-error-message">
          {error instanceof Error ? error.message : 'The POI you are looking for does not exist.'}
        </p>
        <Link to="/pois" className="poi-action-btn poi-action-btn-primary" style={{ display: 'inline-flex' }}>
          ← Back to POIs
        </Link>
      </div>
    );
  }

  // getCategoryIcon and getCategoryColor imported from centralized config
  // Ensures consistent icons across all components

  const formatPhone = (phone: string | null) => {
    if (!phone) return null;
    return phone.replace(/\s/g, '');
  };

  const openDirections = () => {
    if (poi.latitude && poi.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${poi.latitude},${poi.longitude}`, '_blank');
    }
  };

  const callPhone = () => {
    if (poi.phone) {
      window.location.href = `tel:${formatPhone(poi.phone)}`;
    }
  };

  const openWebsite = () => {
    if (poi.website) {
      window.open(poi.website, '_blank');
    }
  };

  // Handle back navigation - returns to previous page (preserves view mode state)
  const handleBack = () => {
    navigate(-1);
  };

  // Extract first complete sentence (ends with . ! or ?)
  const getFirstSentence = (text: string): string => {
    const match = text.match(/^[^.!?]+[.!?]/);
    return match ? match[0].trim() : text;
  };

  // Safely parse opening_hours - handles both string and object types
  // Converts array format [{open, close}] to string format "10:00-19:00"
  const parseOpeningHours = (openingHours: string | Record<string, any> | null | undefined): Record<string, string> | null => {
    if (!openingHours) return null;

    let parsedData: any = openingHours;

    // If it's a string, try to parse it
    if (typeof openingHours === 'string') {
      try {
        parsedData = JSON.parse(openingHours);
      } catch (error) {
        console.error('Failed to parse opening_hours:', error);
        return null;
      }
    }

    // If it's not an object at this point, return null
    if (typeof parsedData !== 'object' || Array.isArray(parsedData)) {
      return null;
    }

    // Convert array format to string format
    const result: Record<string, string> = {};
    for (const [day, hours] of Object.entries(parsedData)) {
      if (Array.isArray(hours)) {
        if (hours.length === 0) {
          result[day] = 'Closed';
        } else {
          // Convert array of {open, close} objects to string
          result[day] = hours
            .map((slot: any) => {
              if (slot && typeof slot === 'object' && slot.open && slot.close) {
                return `${slot.open}-${slot.close}`;
              }
              return '';
            })
            .filter(Boolean)
            .join(', ');
        }
      } else if (typeof hours === 'string') {
        result[day] = hours;
      } else {
        result[day] = 'Closed';
      }
    }

    return result;
  };

  // Safely parse array fields - handles both string and array types
  const parseArrayField = (field: string | string[] | null | undefined): string[] => {
    if (!field) return [];

    // If it's already an array, return it directly
    if (Array.isArray(field)) {
      return field;
    }

    // If it's a string, try to parse it
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        // If parsing fails, it might be a single value
        return [field];
      }
    }

    return [];
  };

  // Generate highlights based on category
  const getHighlights = (category: string): string[] => {
    const highlightMap: Record<string, string[]> = {
      'Active': ['Outdoor activities', 'Adventure sports', 'Physical fitness'],
      'Beaches & Nature': ['Scenic views', 'Relaxation', 'Natural beauty'],
      'Culture & History': ['Historical significance', 'Cultural heritage', 'Educational'],
      'Recreation': ['Entertainment', 'Family-friendly', 'Fun activities'],
      'Food & Drinks': ['Local cuisine', 'Dining experience', 'Taste & flavor'],
      'Health & Wellbeing': ['Wellness', 'Self-care', 'Health services'],
      'Shopping': ['Shopping experience', 'Local products', 'Retail therapy'],
      'Practical': ['Essential services', 'Convenience', 'Practical needs'],
    };
    return highlightMap[category] || ['Great experience', 'Worth visiting', 'Popular choice'];
  };

  // Generate "Perfect for" based on category
  const getPerfectFor = (category: string): string[] => {
    const perfectForMap: Record<string, string[]> = {
      'Active': ['Sports enthusiasts', 'Adventure seekers', 'Fitness lovers'],
      'Beaches & Nature': ['Beach lovers', 'Nature enthusiasts', 'Photographers'],
      'Culture & History': ['History buffs', 'Culture lovers', 'Educational trips'],
      'Recreation': ['Families', 'Groups', 'Entertainment seekers'],
      'Food & Drinks': ['Foodies', 'Culinary explorers', 'Social dining'],
      'Health & Wellbeing': ['Wellness seekers', 'Spa lovers', 'Health conscious'],
      'Shopping': ['Shoppers', 'Souvenir hunters', 'Fashion lovers'],
      'Practical': ['Travelers', 'Local residents', 'Anyone needing services'],
    };
    return perfectForMap[category] || ['All visitors', 'Travelers', 'Local explorers'];
  };

  // Get budget label from price level
  const getBudgetLabel = (priceLevel: number | null): string | null => {
    if (!priceLevel) return null;
    const budgetMap: Record<number, string> = {
      1: 'Budget-friendly',
      2: 'Mid-range',
      3: 'Upscale',
      4: 'Luxury',
    };
    return budgetMap[priceLevel] || null;
  };

  // Calculate "Open now" status
  const getOpeningStatus = (openingHours: Record<string, string> | null): {
    status: 'open' | 'closed' | 'closing_soon' | 'unknown';
    message: string;
    color: string;
  } => {
    if (!openingHours || Object.keys(openingHours).length === 0) {
      return { status: 'unknown', message: '', color: '#9CA3AF' };
    }

    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[now.getDay()];
    const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

    const todayHours = openingHours[currentDay];
    if (!todayHours) {
      return { status: 'closed', message: 'Closed today', color: '#DC2626' };
    }

    // Parse hours (assume format like "10:00-19:00" or array of objects)
    const parseTime = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    // Handle string format "10:00-19:00"
    if (typeof todayHours === 'string') {
      const [open, close] = todayHours.split('-').map(parseTime);
      if (currentTime >= open && currentTime < close) {
        // Check if closing soon (within 1 hour)
        if (close - currentTime <= 60) {
          const closeTime = `${Math.floor(close / 60)}:${String(close % 60).padStart(2, '0')}`;
          return { status: 'closing_soon', message: `Closes at ${closeTime}`, color: '#F59E0B' };
        }
        return { status: 'open', message: 'Open now', color: '#10B981' };
      }
      return { status: 'closed', message: 'Closed', color: '#DC2626' };
    }

    return { status: 'unknown', message: '', color: '#9CA3AF' };
  };

  return (
    <div className="poi-detail-container">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="poi-back-button"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          marginBottom: '12px',
          background: 'transparent',
          border: 'none',
          color: '#7FA594',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#F3F4F6';
          e.currentTarget.style.borderRadius = '8px';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <span style={{ fontSize: '18px' }}>←</span>
        Back
      </button>

      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/pois">POIs</Link>
        <span>/</span>
        <span>{poi.name}</span>
      </div>

      {/* Hero Section */}
      <div className="poi-hero">
        <div className="poi-hero-image">
          <POIAirbnbGallery
            images={poi.images || []}
            thumbnailUrl={poi.thumbnail_url}
            poiName={poi.name}
            categoryColor={getCategoryColor(poi.category)}
            categoryIcon={getCategoryIcon(poi.category)}
            onShowAll={() => handleOpenLightbox(0)}
            onImageClick={handleOpenLightbox}
          />
        </div>
        <div className="poi-hero-content">
          {/* Badges */}
          <div className="poi-badges-container">
            <POIBadge type="category" category={poi.category} />
            {poi.verified === 1 && <POIBadge type="verified" />}
            {poi.rating > 4.5 && poi.review_count > 50 && <POIBadge type="popular" />}
          </div>

          <h1 className="poi-title">{poi.name}</h1>

          <div className="poi-meta">
            {poi.rating && typeof poi.rating === 'number' && poi.rating > 0 && (
              <div className="poi-meta-item">
                <span className="poi-meta-icon">⭐</span>
                <span>{poi.rating.toFixed(1)}</span>
              </div>
            )}
            {poi.price_level && typeof poi.price_level === 'number' && poi.price_level > 0 && (
              <div className="poi-meta-item">
                <span className="poi-meta-icon">💰</span>
                <span>{'€'.repeat(poi.price_level)}</span>
              </div>
            )}
            {poi.latitude && poi.longitude && (
              <div className="poi-meta-item">
                <span className="poi-meta-icon">📍</span>
                <span>{poi.address || 'Calpe, Spain'}</span>
              </div>
            )}
          </div>

          {/* Primary Action Buttons (Sprint 7.7) */}
          <POIActionButtons poi={poi} />

          {/* Secondary Action Buttons */}
          <div className="poi-actions" style={{ marginTop: '16px' }}>
            {poi.phone && (
              <button className="poi-action-btn poi-action-btn-secondary" onClick={callPhone}>
                📞 Call
              </button>
            )}
            {poi.latitude && poi.longitude && (
              <button className="poi-action-btn poi-action-btn-secondary" onClick={openDirections}>
                🗺️ Directions
              </button>
            )}
            <button className="poi-action-btn poi-action-btn-secondary">
              ❤️ Save
            </button>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="poi-content">
        {/* 2-Column Layout for About/Hours and Contact/Details */}
        <div className="poi-columns">
          {/* Left Column - About & Opening Hours */}
          <div className="poi-column-left">
            {/* About Section - Enhanced with Highlights and Perfect For */}
            {poi.description && (
            <div className="poi-section">
              <h2 className="poi-section-title">About</h2>

              {/* Description with Read More */}
              <div className="poi-description-container">
                <p className="poi-description">
                  {descriptionExpanded
                    ? poi.description
                    : getFirstSentence(poi.description)}
                </p>
                {poi.description !== getFirstSentence(poi.description) && (
                  <button
                    className="poi-read-more-btn"
                    onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                    aria-expanded={descriptionExpanded}
                  >
                    {descriptionExpanded ? 'Read less' : 'Read more'}
                  </button>
                )}
              </div>

              {/* Highlights */}
              <div className="poi-highlights" style={{ marginTop: '20px' }}>
                <h3 className="poi-subsection-title">Highlights</h3>
                <ul className="poi-highlights-list">
                  {getHighlights(poi.category).map((highlight, index) => (
                    <li key={index} className="poi-highlight-item">
                      <span className="poi-highlight-icon">✓</span>
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Perfect For */}
              <div className="poi-perfect-for" style={{ marginTop: '20px' }}>
                <h3 className="poi-subsection-title">Perfect for</h3>
                <div className="poi-perfect-for-tags">
                  {getPerfectFor(poi.category).map((tag, index) => (
                    <span key={index} className="poi-perfect-for-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Opening Hours */}
          {(() => {
            const parsedHours = parseOpeningHours(poi.opening_hours);
            const openingStatus = getOpeningStatus(parsedHours);

            return parsedHours && Object.keys(parsedHours).length > 0 ? (
              <div className="poi-section">
                <div className="poi-section-header">
                  <h2 className="poi-section-title">Opening Hours</h2>
                  {openingStatus.message && (
                    <span
                      className="poi-opening-status"
                      style={{
                        color: openingStatus.color,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                      }}
                    >
                      <span
                        className="poi-status-dot"
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: openingStatus.color,
                        }}
                        aria-hidden="true"
                      />
                      {openingStatus.message}
                    </span>
                  )}
                </div>
                <div className="opening-hours-list">
                  {Object.entries(parsedHours).map(([day, hours]) => (
                    <div key={day} className="opening-hours-item">
                      <span className="opening-hours-day">{day}</span>
                      <span className="opening-hours-time">{hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}
          </div>

          {/* Right Column - Contact & Details */}
          <div className="poi-column-right">
            {/* Contact Information */}
            <div className="poi-section">
            <h2 className="poi-section-title">Contact</h2>
            <div className="contact-info">
              {poi.address && (
                <div className="contact-item">
                  <span className="contact-icon">📍</span>
                  <span className="contact-text">{poi.address}</span>
                </div>
              )}
              {poi.phone && (
                <div className="contact-item">
                  <span className="contact-icon">📞</span>
                  <span className="contact-text">{poi.phone}</span>
                </div>
              )}
              {poi.email && (
                <div className="contact-item">
                  <span className="contact-icon">✉️</span>
                  <span className="contact-text">{poi.email}</span>
                </div>
              )}
              {poi.website && (
                <div className="contact-item">
                  <span className="contact-icon">🌐</span>
                  <a
                    href={poi.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-text"
                    style={{ color: '#7FA594', textDecoration: 'none' }}
                  >
                    Visit Website
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Additional Info - Details */}
          {(() => {
            const accessibilityFeatures = parseArrayField(poi.accessibility_features);
            const amenities = parseArrayField(poi.amenities);
            const hasDetails = accessibilityFeatures.length > 0 || amenities.length > 0 || poi.price_level;

            return (
              <div className="poi-section">
                <h2 className="poi-section-title">Details</h2>
                <div className="contact-info">
                  {accessibilityFeatures.includes('wheelchair_accessible') && (
                    <div className="contact-item">
                      <span className="contact-icon">♿</span>
                      <span className="contact-text">Wheelchair Accessible</span>
                    </div>
                  )}
                  {amenities.includes('wifi') && (
                    <div className="contact-item">
                      <span className="contact-icon">📶</span>
                      <span className="contact-text">Free WiFi Available</span>
                    </div>
                  )}
                  {amenities.includes('credit_cards') && (
                    <div className="contact-item">
                      <span className="contact-icon">💳</span>
                      <span className="contact-text">Accepts Credit Cards</span>
                    </div>
                  )}
                  {poi.price_level && (
                    <div className="contact-item">
                      <span className="contact-icon">💰</span>
                      <span className="contact-text">
                        {getBudgetLabel(poi.price_level) || 'Price Level'}: {'€'.repeat(poi.price_level)}
                      </span>
                    </div>
                  )}
                  {!hasDetails && (
                    <div className="contact-item">
                      <span className="contact-icon">ℹ️</span>
                      <span className="contact-text">No additional details available</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          </div>
        </div>

        {/* Reviews Section - Full Width Below Columns (Sprint 7.6) */}
        <div className="poi-section poi-reviews-section">
          <h2 className="poi-section-title">Reviews</h2>
          <POIReviewSection poiId={poi.id} />
        </div>
      </div>

      {/* Lightbox for full-screen image viewing */}
      {poi.images && poi.images.length > 0 && (
        <POIImageLightbox
          images={poi.images}
          initialIndex={lightboxIndex}
          poiName={poi.name}
          isOpen={lightboxOpen}
          onClose={handleCloseLightbox}
        />
      )}
      {!poi.images && poi.thumbnail_url && (
        <POIImageLightbox
          images={[poi.thumbnail_url]}
          initialIndex={0}
          poiName={poi.name}
          isOpen={lightboxOpen}
          onClose={handleCloseLightbox}
        />
      )}
    </div>
  );
}
