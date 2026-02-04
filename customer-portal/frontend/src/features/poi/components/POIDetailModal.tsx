/**
 * POIDetailModal - Large modal displaying full POI details
 *
 * Sprint 7.7: Advanced POI Features
 *
 * Features:
 * - Large full-screen modal with close button
 * - Scrollable content starting at image section
 * - ESC key and click-outside to close
 * - Prevents body scroll when open
 * - Responsive design
 * - All POI detail content (images, info, reviews, etc.)
 */

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Phone, Navigation, Heart, Share2, Printer, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { poiService } from '../services/poiService';
import { getCategoryIcon, getCategoryColor } from '../../../shared/config/categoryConfig';
import { shareContent, generatePOIShareURL } from '../../../shared/utils/share';
import { useLanguage } from '../../../i18n/LanguageContext';
import { useFavorites } from '../../../shared/contexts/FavoritesContext';
import { POIAirbnbGallery } from './POIAirbnbGallery';
import { POIImageLightbox } from './POIImageLightbox';
import { POIBadge } from './POIBadge';
import { POIReviewSection } from './POIReviewSection';
import './POIDetailModal.css';

interface POIDetailModalProps {
  poiId: number | string;
  isOpen: boolean;
  onClose: () => void;
}

export function POIDetailModal({ poiId, isOpen, onClose }: POIDetailModalProps) {
  const { t, language } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const numericPoiId = typeof poiId === 'string' ? parseInt(poiId, 10) : poiId;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);


  const { data: poi, isLoading, error } = useQuery({
    queryKey: ['poi', poiId, language],
    queryFn: () => poiService.getPOIById(poiId, language),
    enabled: isOpen && !!poiId,
  });

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

  // Scroll to image section when modal opens
  useEffect(() => {
    if (isOpen && poi && modalContentRef.current) {
      // Small delay to ensure content is rendered
      setTimeout(() => {
        modalContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen, poiId]); // Use poiId instead of poi to prevent infinite re-renders

  // Reset description expanded state when POI changes
  useEffect(() => {
    setDescriptionExpanded(false);
  }, [poiId]);

  // Handle opening lightbox at specific image index
  const handleOpenLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Handle closing lightbox
  const handleCloseLightbox = () => {
    setLightboxOpen(false);
  };

  if (!isOpen) return null;

  // Safely parse opening_hours
  const parseOpeningHours = (openingHours: string | Record<string, any> | null | undefined): Record<string, string> | null => {
    if (!openingHours) return null;

    let parsedData: any = openingHours;

    if (typeof openingHours === 'string') {
      try {
        parsedData = JSON.parse(openingHours);
      } catch (error) {
        console.error('Failed to parse opening_hours:', error);
        return null;
      }
    }

    if (typeof parsedData !== 'object' || Array.isArray(parsedData)) {
      return null;
    }

    const result: Record<string, string> = {};
    for (const [day, hours] of Object.entries(parsedData)) {
      if (Array.isArray(hours)) {
        if (hours.length === 0) {
          result[day] = t.poi.openingStatus.closed;
        } else {
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
        result[day] = t.poi.openingStatus.closed;
      }
    }

    return result;
  };

  // Safely parse array fields
  const parseArrayField = (field: string | string[] | null | undefined): string[] => {
    if (!field) return [];

    if (Array.isArray(field)) {
      return field;
    }

    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [field];
      }
    }

    return [];
  };

  // Map POI category name to translation key
  const getCategoryKey = (category: string): 'active' | 'beaches' | 'culture' | 'recreation' | 'food' | 'health' | 'shopping' | 'practical' | 'default' => {
    const categoryMap: Record<string, 'active' | 'beaches' | 'culture' | 'recreation' | 'food' | 'health' | 'shopping' | 'practical'> = {
      'Active': 'active',
      'Beaches & Nature': 'beaches',
      'Culture & History': 'culture',
      'Recreation': 'recreation',
      'Food & Drinks': 'food',
      'Health & Wellbeing': 'health',
      'Shopping': 'shopping',
      'Practical': 'practical',
    };
    return categoryMap[category] || 'default';
  };

  // Generate highlights based on category
  const getHighlights = (category: string): string[] => {
    const categoryKey = getCategoryKey(category);
    return [...t.poi.categoryHighlights[categoryKey]];
  };

  // Generate "Perfect for" based on category
  const getPerfectFor = (category: string): string[] => {
    const categoryKey = getCategoryKey(category);
    return [...t.poi.categoryPerfectFor[categoryKey]];
  };

  // Get budget label from price level
  const getBudgetLabel = (priceLevel: number | null): string | null => {
    if (!priceLevel) return null;
    const budgetMap: Record<number, string> = {
      1: t.poi.budgetLabels.budget,
      2: t.poi.budgetLabels.midRange,
      3: t.poi.budgetLabels.upscale,
      4: t.poi.budgetLabels.luxury,
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
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const todayHours = openingHours[currentDay];
    if (!todayHours) {
      return { status: 'closed', message: t.poi.openingStatus.closedToday, color: '#DC2626' };
    }

    const parseTime = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    if (typeof todayHours === 'string') {
      const [open, close] = todayHours.split('-').map(parseTime);
      if (currentTime >= open && currentTime < close) {
        if (close - currentTime <= 60) {
          const closeTime = `${Math.floor(close / 60)}:${String(close % 60).padStart(2, '0')}`;
          return { status: 'closing_soon', message: `${t.poi.openingStatus.closesAt} ${closeTime}`, color: '#F59E0B' };
        }
        return { status: 'open', message: t.poi.openingStatus.open, color: '#10B981' };
      }
      return { status: 'closed', message: t.poi.openingStatus.closed, color: '#DC2626' };
    }

    return { status: 'unknown', message: '', color: '#9CA3AF' };
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return null;
    return phone.replace(/\s/g, '');
  };

  const callPhone = () => {
    if (poi?.phone) {
      window.location.href = `tel:${formatPhone(poi.phone)}`;
    }
  };

  const openDirections = () => {
    if (poi?.latitude && poi?.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${poi.latitude},${poi.longitude}`, '_blank');
    }
  };

  const handleShare = async () => {
    if (!poi) return;
    const url = generatePOIShareURL(poi.id);
    const result = await shareContent({
      title: poi.name,
      text: poi.enriched_tile_description || poi.description || `Check out ${poi.name} in Calpe!`,
      url
    });

    if (result.success) {
      if (result.method === 'clipboard') {
        setShareMessage(t.poi.shareCopied || 'Link copied to clipboard!');
      } else {
        setShareMessage(t.poi.shareSuccess || 'Shared successfully!');
      }
      setTimeout(() => setShareMessage(null), 3000);
    }
  };

  const handleToggleSave = () => {
    toggleFavorite(numericPoiId);

    if (isFavorite(numericPoiId)) {
      setShareMessage(t.poi.removedFromFavorites || 'Removed from favorites');
    } else {
      setShareMessage(t.poi.addedToFavorites || 'Added to favorites!');
    }

    setTimeout(() => setShareMessage(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculate description display values
  const fullDescription = poi?.enriched_detail_description || poi?.description || '';
  const shouldTruncate = fullDescription.length > 300;
  const displayText = (descriptionExpanded || !shouldTruncate)
    ? fullDescription
    : fullDescription.substring(0, 300) + '...';

  const handleToggleDescription = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDescriptionExpanded(prev => !prev);
  };

  const modalContent = (
    <div
      className="poi-detail-modal-overlay"
      onClick={onClose}
    >
      <div
        className="poi-detail-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="poi-detail-modal-close"
          aria-label="Close"
        >
          <X size={28} />
        </button>

        {/* Modal Content */}
        <div className="poi-detail-modal-content" ref={modalContentRef}>
          {isLoading && (
            <div className="poi-loading">
              <div className="poi-loading-spinner">⏳</div>
              <p style={{ marginTop: '16px', color: '#6B7280' }}>{t.poi.loadingStates.loadingDetails}</p>
            </div>
          )}

          {error && (
            <div className="poi-error">
              <div className="poi-error-icon">⚠️</div>
              <h2 className="poi-error-title">{t.poi.loadingStates.notFound}</h2>
              <p className="poi-error-message">
                {error instanceof Error ? error.message : t.poi.loadingStates.notFoundDescription}
              </p>
            </div>
          )}

          {poi && (
            <>
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
                    {Boolean(poi.verified) && <POIBadge type="verified" />}
                    {poi.rating && poi.rating > 4.5 && poi.review_count && poi.review_count > 50 && <POIBadge type="popular" />}
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
                    {(() => {
                      const parsedHours = parseOpeningHours(poi.opening_hours);
                      const openingStatus = getOpeningStatus(parsedHours);
                      return openingStatus.message && (
                        <div className="poi-meta-item" style={{ color: openingStatus.color, fontWeight: '600' }}>
                          <span className="poi-status-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: openingStatus.color }} />
                          <span>{openingStatus.message}</span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Action Buttons */}
                  <div className="poi-actions">
                    {poi.latitude && poi.longitude && (
                      <button className="poi-action-btn" onClick={openDirections}>
                        <Navigation size={18} />
                        <span>{t.poi.directions || 'Directions'}</span>
                      </button>
                    )}
                    <button className="poi-action-btn" onClick={handleShare}>
                      <Share2 size={18} />
                      <span>{t.poi.share || 'Share'}</span>
                    </button>
                    <button
                      className={`poi-action-btn ${isFavorite(numericPoiId) ? 'saved' : ''}`}
                      onClick={handleToggleSave}
                    >
                      <Heart size={18} fill={isFavorite(numericPoiId) ? 'currentColor' : 'none'} />
                      <span>{isFavorite(numericPoiId) ? (t.poi.saved || 'Saved') : (t.poi.save || 'Save')}</span>
                    </button>
                    <button className="poi-action-btn" onClick={handlePrint}>
                      <Printer size={18} />
                      <span>{t.poi.print || 'Print'}</span>
                    </button>
                  </div>

                  {/* Share Message Toast */}
                  {shareMessage && (
                    <div className="poi-toast">{shareMessage}</div>
                  )}
                </div>
              </div>

              {/* Content Sections - 2-Column Layout */}
              <div className="poi-content">
                {/* 2-Column Layout Wrapper */}
                <div className="poi-columns-wrapper" style={{ display: 'contents' }}>
                  {/* Left Column - Main Content */}
                  <div className="poi-column-main">
                    {/* About Section */}
                    {(poi.enriched_detail_description || poi.description) && (
                      <div className="poi-section">
                        <h2 className="poi-section-title">{t.poi.about || 'About'}</h2>

                        {/* Description with Read More */}
                        <div className="poi-description-container">
                          <p
                            className="poi-description"
                            style={{
                              whiteSpace: 'pre-wrap',
                              margin: 0,
                              maxHeight: 'none',
                              overflow: 'visible',
                              display: 'block',
                              WebkitLineClamp: 'unset',
                              WebkitBoxOrient: 'unset',
                              textOverflow: 'unset'
                            }}
                          >
                            {displayText}
                          </p>
                          {shouldTruncate && (
                            <button
                              className="poi-read-more-btn"
                              onClick={handleToggleDescription}
                              aria-expanded={descriptionExpanded}
                              type="button"
                              style={{
                                display: 'block',
                                marginTop: '12px',
                                color: '#30c59b',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                border: 'none',
                                background: 'none',
                                padding: '8px 0',
                                fontSize: '14px',
                                fontWeight: '600'
                              }}
                            >
                              {descriptionExpanded ? (t.poi.readLess || 'Lees minder') : (t.poi.readMore || 'Lees meer')}
                            </button>
                          )}
                        </div>

                        {/* Highlights */}
                        <div className="poi-highlights" style={{ marginTop: '20px' }}>
                          <h3 className="poi-subsection-title">{t.poi.highlights || 'Highlights'}</h3>
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
                          <h3 className="poi-subsection-title">{t.poi.perfectFor || 'Perfect for'}</h3>
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

                      return parsedHours && Object.keys(parsedHours).length > 0 ? (
                        <div className="poi-section">
                          <h2 className="poi-section-title">{t.poi.openingHours || 'Opening Hours'}</h2>
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

                    {/* Reviews Section - Full width on mobile, part of left column on desktop */}
                    <div className="poi-section poi-reviews-desktop">
                      <h2 className="poi-section-title">{t.reviews.title || 'Reviews'}</h2>
                      <POIReviewSection poiId={poi.id} poiName={poi.name} />
                    </div>
                  </div>

                  {/* Right Column - Sidebar */}
                  <div className="poi-column-sidebar">
                    {/* Contact Information */}
                    <div className="poi-section">
                      <h2 className="poi-section-title">{t.poi.contact || 'Contact'}</h2>
                      <div className="contact-info">
                        {poi.address && (
                          <div className="contact-item">
                            <span className="contact-icon">📍</span>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(poi.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="contact-link"
                            >
                              {poi.address}
                            </a>
                          </div>
                        )}
                        {poi.phone && (
                          <div className="contact-item">
                            <span className="contact-icon">📞</span>
                            <a
                              href={`tel:${formatPhone(poi.phone)}`}
                              className="contact-link"
                            >
                              {poi.phone}
                            </a>
                          </div>
                        )}
                        {poi.email && (
                          <div className="contact-item">
                            <span className="contact-icon">✉️</span>
                            <span className="contact-text">{poi.email}</span>
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
                          <h2 className="poi-section-title">{t.poi.details || 'Details'}</h2>
                          <div className="contact-info">
                            {accessibilityFeatures.includes('wheelchair_accessible') && (
                              <div className="contact-item">
                                <span className="contact-icon">♿</span>
                                <span className="contact-text">{t.poi.amenities.wheelchairAccessible}</span>
                              </div>
                            )}
                            {amenities.includes('wifi') && (
                              <div className="contact-item">
                                <span className="contact-icon">📶</span>
                                <span className="contact-text">{t.poi.amenities.freeWifi}</span>
                              </div>
                            )}
                            {amenities.includes('credit_cards') && (
                              <div className="contact-item">
                                <span className="contact-icon">💳</span>
                                <span className="contact-text">{t.poi.amenities.creditCards}</span>
                              </div>
                            )}
                            {poi.price_level && (
                              <div className="contact-item">
                                <span className="contact-icon">💰</span>
                                <span className="contact-text">
                                  {getBudgetLabel(poi.price_level) || t.poi.budgetLabels.priceLevel}: {'€'.repeat(poi.price_level)}
                                </span>
                              </div>
                            )}
                            {!hasDetails && (
                              <div className="contact-item">
                                <span className="contact-icon">ℹ️</span>
                                <span className="contact-text">{t.poi.amenities.noDetails}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* External Website Button - Prominent CTA */}
                    {poi.website && (
                      <button
                        className="poi-external-btn"
                        onClick={() => window.open(poi.website, '_blank')}
                      >
                        <ExternalLink size={18} />
                        <span>{t.poi.visitWebsite || 'Visit Website'}</span>
                      </button>
                    )}
                  </div>
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
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Use React Portal to render modal outside of widget container
  return createPortal(modalContent, document.body);
}
