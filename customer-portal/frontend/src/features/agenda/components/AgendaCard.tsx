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
  detectedCategory?: string;
}

const dateLocales: Record<string, Locale> = {
  nl: nl,
  en: enUS,
  es: es,
  de: de,
  sv: sv,
  pl: pl,
};

// Category configuration - colors matching POI page exactly (linear gradients)
const categoryConfig: Record<string, { color: string; icon: string }> = {
  music: { color: 'linear-gradient(135deg, #354f48, #49605a)', icon: '🎵' },
  culture: { color: 'linear-gradient(135deg, #253444, #3a4856)', icon: '🏛️' },
  active: { color: 'linear-gradient(135deg, #016193, #1a709d)', icon: '⚽' },
  nature: { color: 'linear-gradient(135deg, #b4942e, #bb9e42)', icon: '🌿' },
  food: { color: 'linear-gradient(135deg, #4f766b, #608379)', icon: '🍽️' },
  festivals: { color: 'linear-gradient(135deg, #354f48, #49605a)', icon: '🎉' },
  markets: { color: 'linear-gradient(135deg, #b4892e, #bb9442)', icon: '🛒' },
  creative: { color: 'linear-gradient(135deg, #004568, #195777)', icon: '🎨' },
};

// Category labels - original Agenda labels (translated per language)
const categoryLabels: Record<string, Record<string, string>> = {
  nl: {
    music: 'Muziek',
    culture: 'Cultuur',
    active: 'Actief',
    nature: 'Natuur',
    food: 'Food',
    festivals: 'Festivals',
    markets: 'Markten',
    creative: 'Creatief',
  },
  en: {
    music: 'Music',
    culture: 'Culture',
    active: 'Active',
    nature: 'Nature',
    food: 'Food',
    festivals: 'Festivals',
    markets: 'Markets',
    creative: 'Creative',
  },
  de: {
    music: 'Musik',
    culture: 'Kultur',
    active: 'Aktiv',
    nature: 'Natur',
    food: 'Essen',
    festivals: 'Festivals',
    markets: 'Märkte',
    creative: 'Kreativ',
  },
  es: {
    music: 'Música',
    culture: 'Cultura',
    active: 'Activo',
    nature: 'Naturaleza',
    food: 'Comida',
    festivals: 'Festivales',
    markets: 'Mercados',
    creative: 'Creativo',
  },
  sv: {
    music: 'Musik',
    culture: 'Kultur',
    active: 'Aktiv',
    nature: 'Natur',
    food: 'Mat',
    festivals: 'Festivaler',
    markets: 'Marknader',
    creative: 'Kreativ',
  },
  pl: {
    music: 'Muzyka',
    culture: 'Kultura',
    active: 'Aktywne',
    nature: 'Natura',
    food: 'Jedzenie',
    festivals: 'Festiwale',
    markets: 'Targi',
    creative: 'Kreatywny',
  },
};

// UI labels translations
const uiLabels: Record<string, Record<string, string>> = {
  nl: { free: 'Gratis', featured: 'Uitgelicht', share: 'Delen', agenda: 'Agenda', map: 'Kaart', details: 'Details' },
  en: { free: 'Free', featured: 'Featured', share: 'Share', agenda: 'Agenda', map: 'Map', details: 'Details' },
  de: { free: 'Kostenlos', featured: 'Empfohlen', share: 'Teilen', agenda: 'Kalender', map: 'Karte', details: 'Details' },
  es: { free: 'Gratis', featured: 'Destacado', share: 'Compartir', agenda: 'Agenda', map: 'Mapa', details: 'Detalles' },
  sv: { free: 'Gratis', featured: 'Utvalda', share: 'Dela', agenda: 'Kalender', map: 'Karta', details: 'Detaljer' },
  pl: { free: 'Bezpłatne', featured: 'Polecane', share: 'Udostępnij', agenda: 'Kalendarz', map: 'Mapa', details: 'Szczegóły' },
};

export const AgendaCard: React.FC<AgendaCardProps> = ({
  event,
  onClick,
  onSave,
  isSaved = false,
  distance,
  detectedCategory
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

  // Get category config - use detected category or fallback
  const categoryKey = detectedCategory || event.primaryCategory || 'culture';
  const categoryStyle = categoryConfig[categoryKey] || {
    color: '#7FA594',
    icon: '📅',
  };
  const categoryLabel = categoryLabels[language]?.[categoryKey] || categoryLabels.en[categoryKey] || 'Event';
  const ui = uiLabels[language] || uiLabels.en;

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
        style={{ background: categoryStyle.color }}
      >
        {categoryLabel}
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
            style={{ background: `linear-gradient(135deg, ${categoryStyle.color}40, ${categoryStyle.color}20)` }}
          >
            <span className="agenda-placeholder-icon">{categoryStyle.icon}</span>
          </div>
        )}

        {/* Free Badge */}
        {event.pricing?.isFree && (
          <div className="agenda-free-badge">{ui.free}</div>
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
              <span>{ui.featured}</span>
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
        <button className="agenda-action-btn" title={ui.share}>
          <span>↗️</span>
          <span>{ui.share}</span>
        </button>
        <button className="agenda-action-btn" title={ui.agenda}>
          <span>📅</span>
          <span>{ui.agenda}</span>
        </button>
        <button className="agenda-action-btn" title={ui.map}>
          <span>📍</span>
          <span>{ui.map}</span>
        </button>
        <button className="agenda-action-btn agenda-action-primary" title={ui.details} onClick={onClick}>
          <span>ℹ️</span>
          <span>{ui.details}</span>
        </button>
      </div>
    </div>
  );
};

export default AgendaCard;
