import React, { useState } from 'react';
import { format } from 'date-fns';
import { nl, enUS, es, de, sv, pl } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { MapPin, Star } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import type { AgendaEvent } from '../services/agendaService';
import './AgendaCard.css';

/**
 * AgendaCard Component
 * Displays event in POI Grid style - matching POILandingPage cards exactly
 * With comparison functionality
 */

interface AgendaCardProps {
  event: AgendaEvent;
  onClick?: () => void;
  onSave?: (eventId: string) => void;
  isSaved?: boolean;
  distance?: string;
  detectedCategory?: string;
  // Comparison props
  isInComparison?: boolean;
  onToggleComparison?: (eventId: string) => void;
  canAddMore?: boolean;
  showComparison?: boolean;
  // Date key for scroll detection (applied directly to card)
  dateKey?: string;
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
  nl: { free: 'Gratis', featured: 'Uitgelicht', share: 'Delen', agenda: 'Agenda', map: 'Kaart', details: 'Details', compare: 'Vergelijk' },
  en: { free: 'Free', featured: 'Featured', share: 'Share', agenda: 'Agenda', map: 'Map', details: 'Details', compare: 'Compare' },
  de: { free: 'Kostenlos', featured: 'Empfohlen', share: 'Teilen', agenda: 'Kalender', map: 'Karte', details: 'Details', compare: 'Vergleichen' },
  es: { free: 'Gratis', featured: 'Destacado', share: 'Compartir', agenda: 'Agenda', map: 'Mapa', details: 'Detalles', compare: 'Comparar' },
  sv: { free: 'Gratis', featured: 'Utvalda', share: 'Dela', agenda: 'Kalender', map: 'Karta', details: 'Detaljer', compare: 'Jämför' },
  pl: { free: 'Bezpłatne', featured: 'Polecane', share: 'Udostępnij', agenda: 'Kalendarz', map: 'Mapa', details: 'Szczegóły', compare: 'Porównaj' },
};

export const AgendaCard: React.FC<AgendaCardProps> = ({
  event,
  onClick,
  onSave,
  isSaved = false,
  distance,
  detectedCategory,
  isInComparison = false,
  onToggleComparison,
  canAddMore = true,
  showComparison = true,
  dateKey
}) => {
  const { language } = useLanguage();
  const locale = dateLocales[language] || nl;
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

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

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave?.(event._id);
  };

  const handleToggleComparison = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleComparison?.(event._id);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/agenda/${event._id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: description || `Check out ${title}!`,
          url
        });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Link copied!', 'info');
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        showToast('Failed to share', 'info');
      }
    }
  };

  const handleAddToCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();

    const startStr = format(startDate, "yyyyMMdd'T'HHmmss");
    const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    const endStr = format(endDate, "yyyyMMdd'T'HHmmss");

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description?.substring(0, 200) || ''}`,
      `LOCATION:${event.location?.name || ''}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Calendar event downloaded!', 'success');
  };

  const handleShowMap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.location?.coordinates) {
      const { lat, lng } = event.location.coordinates;
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    } else if (event.location?.name) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location.name)}`, '_blank');
    }
  };

  return (
    <div className="agenda-card" onClick={onClick} data-date-key={dateKey}>
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

        {/* Featured Badge Row */}
        {event.featured && (
          <div className="agenda-meta-row">
            <div className="agenda-rating">
              <Star className="agenda-star-icon" />
              <span>{ui.featured}</span>
            </div>
          </div>
        )}

        {/* Location, Distance & Comparison Row */}
        <div className="agenda-bottom-row">
          <div className="agenda-location-distance">
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

          {/* Comparison Checkbox */}
          {showComparison && onToggleComparison && (
            <label className="agenda-comparison-checkbox" onClick={handleToggleComparison}>
              <input
                type="checkbox"
                checked={isInComparison}
                onChange={() => {}}
                disabled={!canAddMore && !isInComparison}
              />
              <span className="agenda-comparison-label">{ui.compare}</span>
            </label>
          )}
        </div>
      </div>

      {/* Action Buttons - ORIGINAL EMOJI ICONS */}
      <div className="agenda-actions">
        <button className="agenda-action-btn" title={ui.share} onClick={handleShare}>
          <span>↗️</span>
          <span>{ui.share}</span>
        </button>
        <button className="agenda-action-btn" title={ui.agenda} onClick={handleAddToCalendar}>
          <span>📅</span>
          <span>{ui.agenda}</span>
        </button>
        <button className="agenda-action-btn" title={ui.map} onClick={handleShowMap}>
          <span>📍</span>
          <span>{ui.map}</span>
        </button>
        <button className="agenda-action-btn agenda-action-primary" title={ui.details} onClick={onClick}>
          <span>ℹ️</span>
          <span>{ui.details}</span>
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '24px',
            backgroundColor: toast.type === 'success' ? '#10B981' : '#0273ae',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 10000,
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default AgendaCard;
