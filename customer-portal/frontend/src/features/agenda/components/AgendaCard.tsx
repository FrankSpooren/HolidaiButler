import React from 'react';
import { format } from 'date-fns';
import { nl, enUS, es } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { Calendar, Clock, MapPin, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import type { AgendaEvent } from '../services/agendaService';
import { cardHoverVariants } from '@/shared/utils/animations';

/**
 * AgendaCard Component
 * Displays event in compact card format - EXACT same styling as POICard
 */

interface AgendaCardProps {
  event: AgendaEvent;
  variant?: 'grid' | 'list';
  onClick?: () => void;
  index?: number;
}

const dateLocales: Record<string, Locale> = {
  nl: nl,
  en: enUS,
  es: es,
};

// Category configuration
const categoryConfig: Record<string, { label: string }> = {
  culture: { label: 'Cultuur' },
  exhibitions: { label: 'Exposities' },
  festivals: { label: 'Festivals' },
  music: { label: 'Muziek' },
  markets: { label: 'Markten' },
  'food-drink': { label: 'Gastronomie' },
  'active-sports': { label: 'Sport' },
  nature: { label: 'Natuur' },
  family: { label: 'Familie' },
  tours: { label: 'Tours' },
  workshops: { label: 'Workshops' },
  entertainment: { label: 'Entertainment' },
  relaxation: { label: 'Wellness' },
  folklore: { label: 'Folklore' },
  beach: { label: 'Strand' },
};

export const AgendaCard: React.FC<AgendaCardProps> = ({ event, variant = 'grid', onClick, index = 0 }) => {
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
  const timeDisplay = event.allDay ? 'Hele dag' : format(startDate, 'HH:mm', { locale });

  // Get primary image
  const primaryImage = event.images?.find((img) => img.isPrimary)?.url || event.images?.[0]?.url;

  // Get category label
  const categoryLabel = categoryConfig[event.primaryCategory]?.label || 'Evenement';

  // List variant - compact horizontal layout (matching POICard proportions)
  if (variant === 'list') {
    return (
      <motion.div
        onClick={onClick}
        className="bg-white rounded-card border border-border-light p-4 shadow-card cursor-pointer flex gap-4"
        variants={cardHoverVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        animate={{
          opacity: 1,
          y: 0,
          transition: { delay: index * 0.05, duration: 0.3 },
        }}
      >
        {/* Image */}
        <div className="w-32 h-24 max-h-24 bg-bg-gray rounded-lg flex-shrink-0 overflow-hidden relative">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-text-tertiary" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Category Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-holibot-accent bg-holibot-accent/10 px-3 py-1 rounded-chip whitespace-nowrap">
              {categoryLabel}
            </span>
            {event.pricing?.isFree && (
              <span className="text-xs font-medium text-green-700 bg-green-100 px-3 py-1 rounded-chip whitespace-nowrap">
                Gratis
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold text-text-primary line-clamp-1">
            {title}
          </h3>

          {/* Date & Time */}
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {dateDisplay}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {timeDisplay}
            </span>
          </div>

          {/* Location */}
          {event.location?.name && (
            <div className="flex items-start gap-1 text-sm text-text-secondary">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-1">{event.location.name}</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Grid variant - vertical card layout (EXACT same structure as POICard)
  return (
    <motion.div
      onClick={onClick}
      className="bg-white rounded-card border border-border-light p-4 shadow-card cursor-pointer"
      variants={cardHoverVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      animate={{
        opacity: 1,
        y: 0,
        transition: { delay: index * 0.05, duration: 0.3 },
      }}
    >
      {/* Event Image - fixed height container */}
      <div className="w-full h-40 max-h-40 bg-bg-gray rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <Calendar className="w-12 h-12 text-text-tertiary" />
        )}
      </div>

      {/* Event Content - same structure as POICard */}
      <div className="space-y-2">
        {/* Category Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-holibot-accent bg-holibot-accent/10 px-3 py-1 rounded-chip whitespace-nowrap">
            {categoryLabel}
          </span>
          {event.pricing?.isFree && (
            <span className="text-xs font-medium text-green-700 bg-green-100 px-3 py-1 rounded-chip whitespace-nowrap">
              Gratis
            </span>
          )}
        </div>

        {/* Event Title */}
        <h3 className="text-base font-semibold text-text-primary line-clamp-2 min-h-touch-lg">
          {title}
        </h3>

        {/* Date & Time */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-holibot-accent" />
            <span className="text-text-primary">{dateDisplay}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-holibot-accent" />
            <span className="text-text-secondary">{timeDisplay}</span>
          </div>
        </div>

        {/* Location */}
        {event.location?.name && (
          <div className="flex items-start gap-1 text-sm text-text-secondary">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-1">{event.location.name}</span>
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="text-sm text-text-secondary line-clamp-2">
            {description}
          </p>
        )}

        {/* Action Button - same style as POICard */}
        {event.url && (
          <div className="flex items-center gap-2 pt-2">
            <button
              className="flex-1 min-h-touch py-2 px-3 bg-bg-hover text-text-primary rounded-button text-sm font-medium hover:bg-border-light transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                window.open(event.url!, '_blank');
              }}
            >
              <ExternalLink className="w-4 h-4 inline mr-1" />
              Meer info
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AgendaCard;
