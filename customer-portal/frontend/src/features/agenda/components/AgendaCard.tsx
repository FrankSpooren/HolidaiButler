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
 * Displays event in compact card format matching HolidaiButler design system
 * Consistent with POICard styling
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

// Category configuration with colors matching HolidaiButler brand
const categoryConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  culture: { color: 'text-purple-700', bgColor: 'bg-purple-100', label: 'Cultuur' },
  exhibitions: { color: 'text-violet-700', bgColor: 'bg-violet-100', label: 'Exposities' },
  festivals: { color: 'text-amber-700', bgColor: 'bg-amber-100', label: 'Festivals' },
  music: { color: 'text-rose-700', bgColor: 'bg-rose-100', label: 'Muziek' },
  markets: { color: 'text-lime-700', bgColor: 'bg-lime-100', label: 'Markten' },
  'food-drink': { color: 'text-orange-700', bgColor: 'bg-orange-100', label: 'Gastronomie' },
  'active-sports': { color: 'text-cyan-700', bgColor: 'bg-cyan-100', label: 'Sport' },
  nature: { color: 'text-emerald-700', bgColor: 'bg-emerald-100', label: 'Natuur' },
  family: { color: 'text-sky-700', bgColor: 'bg-sky-100', label: 'Familie' },
  tours: { color: 'text-teal-700', bgColor: 'bg-teal-100', label: 'Tours' },
  workshops: { color: 'text-indigo-700', bgColor: 'bg-indigo-100', label: 'Workshops' },
  entertainment: { color: 'text-pink-700', bgColor: 'bg-pink-100', label: 'Entertainment' },
  relaxation: { color: 'text-green-700', bgColor: 'bg-green-100', label: 'Wellness' },
  folklore: { color: 'text-red-700', bgColor: 'bg-red-100', label: 'Folklore' },
  beach: { color: 'text-blue-700', bgColor: 'bg-blue-100', label: 'Strand' },
};

export function AgendaCard({ event, variant = 'grid', onClick, index = 0 }: AgendaCardProps) {
  const { language } = useLanguage();
  const locale = dateLocales[language] || nl;

  // Get localized title and description
  const title = typeof event.title === 'string'
    ? event.title
    : event.title?.[language] || event.title?.nl || event.title?.en || 'Event';

  const description = typeof event.description === 'string'
    ? event.description
    : event.description?.[language] || event.description?.nl || event.description?.en || '';

  // Format date
  const startDate = new Date(event.startDate);
  const dateDisplay = format(startDate, 'd MMM yyyy', { locale });
  const timeDisplay = event.allDay ? 'Hele dag' : format(startDate, 'HH:mm', { locale });

  // Get primary image
  const primaryImage = event.images?.find((img) => img.isPrimary)?.url || event.images?.[0]?.url;

  // Get category config
  const category = categoryConfig[event.primaryCategory] || {
    color: 'text-holibot-accent',
    bgColor: 'bg-holibot-accent/10',
    label: 'Evenement',
  };

  // List variant - compact horizontal layout
  if (variant === 'list') {
    return (
      <motion.article
        onClick={onClick}
        className="bg-white rounded-card border border-border-light shadow-card cursor-pointer flex overflow-hidden"
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
        {/* Compact Image */}
        <div className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 bg-bg-gray overflow-hidden">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-holibot-accent to-holibot-accent/70 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-white/50" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 sm:p-4 flex flex-col min-w-0">
          <h3 className="font-semibold text-text-primary text-sm sm:text-base line-clamp-1 mb-1">
            {title}
          </h3>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary mb-2">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-holibot-accent" />
              {dateDisplay}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-holibot-accent" />
              {timeDisplay}
            </span>
          </div>

          {event.location?.name && (
            <p className="text-xs text-text-tertiary flex items-center gap-1 mb-2 line-clamp-1">
              <MapPin className="w-3.5 h-3.5 text-holibot-accent flex-shrink-0" />
              {event.location.name}
            </p>
          )}

          <div className="flex gap-2 items-center mt-auto">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-chip text-xs font-medium ${category.bgColor} ${category.color}`}>
              {category.label}
            </span>
            {event.pricing?.isFree && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-chip text-xs font-medium bg-green-100 text-green-700">
                Gratis
              </span>
            )}
          </div>
        </div>
      </motion.article>
    );
  }

  // Grid variant - vertical card layout (default)
  return (
    <motion.article
      onClick={onClick}
      className="bg-white rounded-card border border-border-light p-4 shadow-card cursor-pointer h-full flex flex-col"
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
      {/* Compact Image - h-36 instead of h-48 */}
      <div className="w-full h-36 bg-bg-gray rounded-lg mb-3 overflow-hidden relative">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-holibot-accent to-holibot-accent/70 flex items-center justify-center">
            <Calendar className="w-12 h-12 text-white/30" />
          </div>
        )}

        {/* Category Badge - overlaid on image */}
        <span className={`absolute top-2 left-2 inline-flex items-center px-2 py-1 rounded-chip text-xs font-medium ${category.bgColor} ${category.color} backdrop-blur-sm`}>
          {category.label}
        </span>

        {/* Free Badge */}
        {event.pricing?.isFree && (
          <span className="absolute top-2 right-2 inline-flex items-center px-2 py-1 rounded-chip text-xs font-medium bg-green-100 text-green-700 backdrop-blur-sm">
            Gratis
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col space-y-2">
        {/* Title */}
        <h3 className="text-base font-semibold text-text-primary line-clamp-2 min-h-[2.5rem]">
          {title}
        </h3>

        {/* Date & Time */}
        <div className="flex items-center gap-3 text-sm text-text-secondary">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-holibot-accent" />
            {dateDisplay}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-holibot-accent" />
            {timeDisplay}
          </span>
        </div>

        {/* Location */}
        {event.location?.name && (
          <div className="flex items-start gap-1 text-sm text-text-secondary">
            <MapPin className="w-4 h-4 mt-0.5 text-holibot-accent flex-shrink-0" />
            <span className="line-clamp-1">{event.location.name}</span>
          </div>
        )}

        {/* Description - only show first 2 lines */}
        {description && (
          <p className="text-sm text-text-tertiary line-clamp-2 flex-1">
            {description}
          </p>
        )}

        {/* Action Button */}
        {event.url && (
          <button
            className="mt-auto w-full min-h-touch py-2 px-3 bg-holibot-accent/10 text-holibot-accent rounded-button text-sm font-medium hover:bg-holibot-accent/20 transition-colors flex items-center justify-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              window.open(event.url!, '_blank');
            }}
          >
            <ExternalLink className="w-4 h-4" />
            Meer info
          </button>
        )}
      </div>
    </motion.article>
  );
}

export default AgendaCard;
