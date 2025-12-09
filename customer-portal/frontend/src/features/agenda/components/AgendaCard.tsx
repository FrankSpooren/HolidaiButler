import React from 'react';
import { format } from 'date-fns';
import { nl, enUS, es, de, sv, pl } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { Calendar, MapPin, Star, Heart } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import type { AgendaEvent } from '../services/agendaService';
import './AgendaCard.css';

/**
 * AgendaCard Component
 * Displays event in POI Grid style - matching POILandingPage cards exactly
 */

interface AgendaCardProps {
  event: AgendaEvent;
  onClick?: () => void;
  onSave?: (eventId: string) => void;
  isSaved?: boolean;
  distance?: string;
}

const dateLocales: Record<string, Locale> = {
  nl: nl,
  en: enUS,
  es: es,
  de: de,
  sv: sv,
  pl: pl,
};

// Category configuration matching POI categories
const categoryConfig: Record<string, { label: string; color: string; icon: string }> = {
  culture: { label: 'Culture & History', color: '#9C59B8', icon: '🏛️' },
  exhibitions: { label: 'Culture & History', color: '#9C59B8', icon: '🎨' },
  festivals: { label: 'Recreation', color: '#E67E22', icon: '🎉' },
  music: { label: 'Recreation', color: '#E67E22', icon: '🎵' },
  markets: { label: 'Shopping', color: '#F39C12', icon: '🛒' },
  'food-drink': { label: 'Food & Drinks', color: '#27AE60', icon: '🍽️' },
  'active-sports': { label: 'Active', color: '#3498DB', icon: '⚽' },
  nature: { label: 'Beaches & Nature', color: '#1ABC9C', icon: '🌿' },
  family: { label: 'Recreation', color: '#E67E22', icon: '👨‍👩‍👧' },
  tours: { label: 'Culture & History', color: '#9C59B8', icon: '🚶' },
  workshops: { label: 'Recreation', color: '#E67E22', icon: '🎓' },
  entertainment: { label: 'Recreation', color: '#E67E22', icon: '🎭' },
  relaxation: { label: 'Health & Wellbeing', color: '#E91E63', icon: '🧘' },
  folklore: { label: 'Culture & History', color: '#9C59B8', icon: '💃' },
  beach: { label: 'Beaches & Nature', color: '#1ABC9C', icon: '🏖️' },
};

export const AgendaCard: React.FC<AgendaCardProps> = ({
  event,
  onClick,
  onSave,
  isSaved = false,
  distance
}) => {
  const { language } = useLanguage();
  const locale = dateLocales[language] || nl;

  // Get localized title
  const title = typeof event.title === 'string'
    ? event.title
    : event.title?.[language] || event.title?.nl || event.title?.en || 'Event';

  // Get localized description
  const description = typeof event.description === 'string'
    ? event.description
    : event.description?.[language] || event.description?.nl || event.description?.en || '';

  // Format date
  const startDate = new Date(event.startDate);
  const dateDisplay = format(startDate, 'd MMM yyyy', { locale });

  // Get primary image
  const primaryImage = event.images?.find((img) => img.isPrimary)?.url || event.images?.[0]?.url;

  // Get category config
  const category = categoryConfig[event.primaryCategory] || {
    label: 'Event',
    color: '#7FA594',
    icon: '📅',
  };

  // Truncate description to first sentence
  const truncateDescription = (text: string): string => {
    if (!text) return '';
    const match = text.match(/^[^.!?]+[.!?]/);
    if (match) return match[0].trim();
    if (text.length > 100) return text.substring(0, 100).trim() + '...';
    return text.trim();
  };

  // Convert to title case
  const toTitleCase = (str: string) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave?.(event._id);
  };

  return (
    <div className="agenda-card" onClick={onClick}>
      {/* Category Label */}
      <div
        className="agenda-category-label"
        style={{ background: category.color }}
      >
        {category.label}
      </div>

      {/* Image Container */}
      <div className="agenda-image-container">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={title}
            className="agenda-image"
            loading="lazy"
          />
        ) : (
          <div
            className="agenda-image-placeholder"
            style={{ background: `linear-gradient(135deg, ${category.color}40, ${category.color}20)` }}
          >
            <span className="agenda-placeholder-icon">{category.icon}</span>
          </div>
        )}

        {/* Free Badge */}
        {event.pricing?.isFree && (
          <div className="agenda-free-badge">Gratis</div>
        )}
      </div>

      {/* Save Button */}
      <button
        className={`agenda-save-btn ${isSaved ? 'saved' : ''}`}
        onClick={handleSaveClick}
      >
        {isSaved ? '❤️' : '🤍'}
      </button>

      {/* Content */}
      <div className="agenda-content">
        <div className="agenda-title">{toTitleCase(title)}</div>
        <div className="agenda-description">{truncateDescription(description)}</div>

        {/* Date & Rating Row */}
        <div className="agenda-meta-row">
          <div className="agenda-date">
            <Calendar className="agenda-icon" />
            <span>{dateDisplay}</span>
          </div>
          {event.featured && (
            <div className="agenda-rating">
              <Star className="agenda-star-icon" />
              <span>Featured</span>
            </div>
          )}
        </div>

        {/* Location & Distance Row */}
        <div className="agenda-bottom-row">
          {event.location?.name && (
            <div className="agenda-location">
              <MapPin className="agenda-icon" />
              <span className="agenda-location-text">{event.location.name}</span>
            </div>
          )}
          {distance && (
            <div className="agenda-distance">
              <svg className="agenda-map-icon" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                  fill="#0273ae"
                  stroke="#0273ae"
                  strokeWidth="2"
                />
                <circle cx="12" cy="10" r="3" fill="white" />
              </svg>
              {distance}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="agenda-actions">
        <button className="agenda-action-btn" title="Share">
          <span>↗️</span>
          <span>Share</span>
        </button>
        <button className="agenda-action-btn" title="Calendar">
          <span>📅</span>
          <span>Agenda</span>
        </button>
        <button className="agenda-action-btn" title="Map">
          <span>📍</span>
          <span>Map</span>
        </button>
        <button className="agenda-action-btn agenda-action-primary" title="Details" onClick={onClick}>
          <span>ℹ️</span>
          <span>Details</span>
        </button>
      </div>
    </div>
  );
};

export default AgendaCard;
