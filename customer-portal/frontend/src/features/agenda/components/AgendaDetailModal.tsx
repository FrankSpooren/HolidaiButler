/**
 * AgendaDetailModal - Large modal displaying full event details
 * Matches POIDetailModal design exactly
 */

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Navigation, Heart, Share2, Printer, Calendar, Clock, MapPin, ExternalLink, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { nl, enUS, es, de, sv, pl } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { useLanguage } from '@/i18n/LanguageContext';
import { agendaService, type AgendaEvent } from '../services/agendaService';
import { useVisited } from '@/shared/contexts/VisitedContext';
import { useAgendaFavorites } from '@/shared/contexts/AgendaFavoritesContext';
import './AgendaDetailModal.css';

interface AgendaDetailModalProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: string; // The date from the agenda card that was clicked
}

const dateLocales: Record<string, Locale> = {
  nl: nl,
  en: enUS,
  es: es,
  de: de,
  sv: sv,
  pl: pl,
};

// Category configuration
const categoryConfig: Record<string, { label: string; color: string }> = {
  culture: { label: 'Culture & History', color: '#9C59B8' },
  exhibitions: { label: 'Culture & History', color: '#9C59B8' },
  festivals: { label: 'Recreation', color: '#E67E22' },
  music: { label: 'Recreation', color: '#E67E22' },
  markets: { label: 'Shopping', color: '#F39C12' },
  'food-drink': { label: 'Food & Drinks', color: '#27AE60' },
  'active-sports': { label: 'Active', color: '#3498DB' },
  nature: { label: 'Beaches & Nature', color: '#1ABC9C' },
  family: { label: 'Recreation', color: '#E67E22' },
  tours: { label: 'Culture & History', color: '#9C59B8' },
  workshops: { label: 'Recreation', color: '#E67E22' },
  entertainment: { label: 'Recreation', color: '#E67E22' },
  relaxation: { label: 'Health & Wellbeing', color: '#E91E63' },
  folklore: { label: 'Culture & History', color: '#9C59B8' },
  beach: { label: 'Beaches & Nature', color: '#1ABC9C' },
};

export function AgendaDetailModal({ eventId, isOpen, onClose, selectedDate }: AgendaDetailModalProps) {
  const { t, language } = useLanguage();
  const { markEventVisited } = useVisited();
  const { isAgendaFavorite, toggleAgendaFavorite } = useAgendaFavorites();
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const locale = dateLocales[language] || nl;

  const { data: eventData, isLoading, error } = useQuery({
    queryKey: ['agenda-event', eventId],
    queryFn: () => agendaService.getEventById(eventId),
    enabled: isOpen && !!eventId,
  });

  const event = eventData?.data;

  // Close on ESC key and prevent body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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

  // Reset state when event changes
  useEffect(() => {
    setDescriptionExpanded(false);
  }, [eventId]);

  // Track event visit when data is loaded
  useEffect(() => {
    if (event?._id && isOpen) {
      markEventVisited(event._id);
    }
  }, [event?._id, isOpen, markEventVisited]);

  if (!isOpen) return null;

  // Get localized content
  const getLocalizedText = (field: Record<string, string> | string | undefined): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[language] || field.nl || field.en || '';
  };

  const title = getLocalizedText(event?.title);
  const description = getLocalizedText(event?.description);
  const longDescription = getLocalizedText(event?.longDescription) || description;

  // Format dates - use selectedDate if provided, otherwise fallback to event.startDate
  const displayDate = selectedDate || event?.startDate;
  const formatEventDate = (dateStr: string) => format(new Date(dateStr), 'EEEE d MMMM yyyy', { locale });
  const formatEventTime = (dateStr: string) => format(new Date(dateStr), 'HH:mm', { locale });

  // Get category
  const category = event ? (categoryConfig[event.primaryCategory] || { label: 'Event', color: '#7FA594' }) : null;

  // Get primary image
  const primaryImage = event?.images?.find((img) => img.isPrimary)?.url || event?.images?.[0]?.url;

  // Handlers
  const openDirections = () => {
    if (event?.location?.coordinates) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${event.location.coordinates.lat},${event.location.coordinates.lng}`,
        '_blank'
      );
    } else if (event?.location?.address) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location.address)}`,
        '_blank'
      );
    }
  };

  const handleShare = async () => {
    const url = event?.url || window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: description, url });
        setShareMessage('Shared successfully!');
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      setShareMessage('Link copied to clipboard!');
    }
    setTimeout(() => setShareMessage(null), 3000);
  };

  // Use displayDate for favorites - this is the selectedDate or event.startDate
  // Check if event is saved on ANY date (for visual indicator)
  const isSaved = isAgendaFavorite(eventId);

  const handleSave = () => {
    toggleAgendaFavorite(eventId, displayDate);
    setShareMessage(isSaved ? 'Removed from favorites' : 'Added to favorites!');
    setTimeout(() => setShareMessage(null), 2000);
  };

  const handlePrint = () => window.print();

  const openExternalUrl = () => {
    if (event?.url) window.open(event.url, '_blank');
  };

  // Description truncation
  const shouldTruncate = longDescription.length > 300;
  const displayText = descriptionExpanded || !shouldTruncate
    ? longDescription
    : longDescription.substring(0, 300) + '...';

  // Highlights based on category
  const getHighlights = (): string[] => {
    const highlights: Record<string, string[]> = {
      culture: ['Historical significance', 'Cultural experience', 'Educational'],
      festivals: ['Live entertainment', 'Local traditions', 'Community event'],
      music: ['Live performances', 'Great atmosphere', 'Musical variety'],
      markets: ['Local products', 'Artisan goods', 'Fresh produce'],
      'food-drink': ['Local cuisine', 'Authentic flavors', 'Gastronomic experience'],
      'active-sports': ['Physical activity', 'Outdoor fun', 'Sports entertainment'],
      nature: ['Natural beauty', 'Scenic views', 'Outdoor experience'],
      family: ['Family-friendly', 'Kid activities', 'All ages welcome'],
      relaxation: ['Wellness focus', 'Relaxing atmosphere', 'Mindful activities'],
    };
    return highlights[event?.primaryCategory || ''] || ['Unique experience', 'Local event', 'Community gathering'];
  };

  // Perfect for based on category
  const getPerfectFor = (): string[] => {
    const perfectFor: Record<string, string[]> = {
      culture: ['History lovers', 'Culture enthusiasts', 'Curious travelers'],
      festivals: ['Families', 'Party lovers', 'Social gatherings'],
      music: ['Music fans', 'Night owls', 'Concert goers'],
      markets: ['Shoppers', 'Foodies', 'Bargain hunters'],
      'food-drink': ['Foodies', 'Couples', 'Culinary explorers'],
      'active-sports': ['Sports fans', 'Active travelers', 'Fitness enthusiasts'],
      nature: ['Nature lovers', 'Photographers', 'Peaceful seekers'],
      family: ['Families', 'Children', 'Group outings'],
      relaxation: ['Wellness seekers', 'Stressed travelers', 'Self-care fans'],
    };
    return perfectFor[event?.primaryCategory || ''] || ['Everyone', 'Tourists', 'Locals'];
  };

  const modalContent = (
    <div className="agenda-detail-overlay" onClick={onClose}>
      <div className="agenda-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button onClick={onClose} className="agenda-detail-close" aria-label="Close">
          <X size={28} />
        </button>

        {/* Modal Content */}
        <div className="agenda-detail-content" ref={modalContentRef}>
          {isLoading && (
            <div className="agenda-loading">
              <div className="agenda-loading-spinner">⏳</div>
              <p>Loading event details...</p>
            </div>
          )}

          {error && (
            <div className="agenda-error">
              <div className="agenda-error-icon">⚠️</div>
              <h2>Event not found</h2>
              <p>The requested event could not be loaded.</p>
            </div>
          )}

          {event && (
            <>
              {/* Hero Section */}
              <div className="agenda-hero">
                <div className="agenda-hero-image">
                  {primaryImage ? (
                    <img src={primaryImage} alt={title} />
                  ) : (
                    <div className="agenda-hero-placeholder" style={{ background: category?.color }}>
                      <Calendar size={64} />
                    </div>
                  )}
                </div>
                <div className="agenda-hero-content">
                  {/* Badge - Only category and featured, NO FREE badge */}
                  <div className="agenda-badges">
                    <span className="agenda-badge" style={{ background: category?.color }}>
                      {category?.label}
                    </span>
                    {event.featured && (
                      <span className="agenda-badge agenda-badge-featured">Featured</span>
                    )}
                  </div>

                  <h1 className="agenda-detail-title">{title}</h1>

                  {/* Meta Info */}
                  <div className="agenda-meta">
                    <div className="agenda-meta-item">
                      <Calendar size={18} />
                      <span>{displayDate ? formatEventDate(displayDate) : ''}</span>
                    </div>
                    {!event.allDay && displayDate && (
                      <div className="agenda-meta-item">
                        <Clock size={18} />
                        <span>{formatEventTime(displayDate)}</span>
                      </div>
                    )}
                    {event.location?.name && (
                      <div className="agenda-meta-item">
                        <MapPin size={18} />
                        <span>{event.location.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="agenda-actions-row">
                    <button className="agenda-action-button" onClick={openDirections}>
                      <Navigation size={18} />
                      <span>Directions</span>
                    </button>
                    <button className="agenda-action-button" onClick={handleShare}>
                      <Share2 size={18} />
                      <span>Share</span>
                    </button>
                    <button
                      className={`agenda-action-button ${isSaved ? 'saved' : ''}`}
                      onClick={handleSave}
                    >
                      <Heart size={18} fill={isSaved ? 'currentColor' : 'none'} />
                      <span>{isSaved ? 'Saved' : 'Save'}</span>
                    </button>
                    <button className="agenda-action-button" onClick={handlePrint}>
                      <Printer size={18} />
                      <span>Print</span>
                    </button>
                  </div>

                  {/* Share Message Toast */}
                  {shareMessage && (
                    <div className="agenda-toast">{shareMessage}</div>
                  )}
                </div>
              </div>

              {/* Content Sections */}
              <div className="agenda-sections">
                {/* Left Column */}
                <div className="agenda-main-column">
                  {/* About Section */}
                  <div className="agenda-section">
                    <h2 className="agenda-section-title">About</h2>
                    <p className="agenda-description-text">{displayText}</p>
                    {shouldTruncate && (
                      <button
                        className="agenda-read-more"
                        onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                      >
                        {descriptionExpanded ? 'Read less' : 'Read more'}
                      </button>
                    )}

                    {/* Highlights */}
                    <div className="agenda-highlights">
                      <h3 className="agenda-subsection-title">Highlights</h3>
                      <ul className="agenda-highlights-list">
                        {getHighlights().map((highlight, index) => (
                          <li key={index} className="agenda-highlight-item">
                            <Check size={16} className="agenda-check-icon" />
                            {highlight}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Perfect For */}
                    <div className="agenda-perfect-for">
                      <h3 className="agenda-subsection-title">Perfect for</h3>
                      <div className="agenda-tags">
                        {getPerfectFor().map((tag, index) => (
                          <span key={index} className="agenda-tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* All Dates Section */}
                  {event.allDates && event.allDates.length > 1 && (
                    <div className="agenda-section">
                      <h2 className="agenda-section-title">All Dates</h2>
                      <div className="agenda-dates-list">
                        {event.allDates.slice(0, 10).map((dateInfo, index) => (
                          <div key={index} className="agenda-date-item">
                            <Calendar size={14} />
                            <span>{dateInfo.date}</span>
                            {dateInfo.time && <span className="agenda-date-time">{dateInfo.time}</span>}
                          </div>
                        ))}
                        {event.allDates.length > 10 && (
                          <p className="agenda-more-dates">+ {event.allDates.length - 10} more dates</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Reviews Section - Placeholder for future implementation */}
                  <div className="agenda-section agenda-reviews-section">
                    <h2 className="agenda-section-title">Reviews</h2>
                    <div className="agenda-reviews-placeholder">
                      <span className="agenda-reviews-placeholder-icon">💬</span>
                      <p className="agenda-reviews-placeholder-text">Reviews coming soon</p>
                      <p className="agenda-reviews-placeholder-subtext">Share your experience after attending this event</p>
                    </div>
                  </div>
                </div>

                {/* Right Column - Sidebar */}
                <div className="agenda-sidebar">
                  {/* Contact/Location */}
                  <div className="agenda-section">
                    <h2 className="agenda-section-title">Contact</h2>
                    <div className="agenda-contact-info">
                      {event.location?.name && (
                        <div className="agenda-contact-item">
                          <span className="agenda-contact-icon">📍</span>
                          <span>{event.location.name}</span>
                        </div>
                      )}
                      {event.location?.address && (
                        <div className="agenda-contact-item">
                          <span className="agenda-contact-icon">🏠</span>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="agenda-contact-link"
                          >
                            {event.location.address}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details - NO pricing info until real data available */}
                  <div className="agenda-section">
                    <h2 className="agenda-section-title">Details</h2>
                    <div className="agenda-contact-info">
                      <div className="agenda-contact-item">
                        <span className="agenda-contact-icon">💰</span>
                        <span>Check website for prices</span>
                      </div>
                      {event.targetAudience && event.targetAudience.length > 0 && (
                        <div className="agenda-contact-item">
                          <span className="agenda-contact-icon">👥</span>
                          <span>{event.targetAudience.join(', ')}</span>
                        </div>
                      )}
                      {event.timeOfDay && (
                        <div className="agenda-contact-item">
                          <span className="agenda-contact-icon">🕐</span>
                          <span>{event.timeOfDay}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* External Link Button */}
                  {event.url && (
                    <button className="agenda-external-btn" onClick={openExternalUrl}>
                      <ExternalLink size={18} />
                      <span>Visit Website</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default AgendaDetailModal;
