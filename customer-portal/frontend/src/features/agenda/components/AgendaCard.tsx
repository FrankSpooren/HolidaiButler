import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import { nl, enUS, de, es } from 'date-fns/locale';
import { Calendar, Clock, MapPin, Euro, Star } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import type { AgendaEvent } from '../services/agendaService';

/**
 * AgendaCard Component
 * Displays a single event in card format (grid or list view)
 * Mobile-first responsive design with Tailwind CSS
 */

interface AgendaCardProps {
  event: AgendaEvent;
  variant?: 'grid' | 'list';
  onClick?: () => void;
}

const dateLocales: Record<string, Locale> = {
  nl: nl,
  en: enUS,
  de: de,
  es: es,
};

// Category colors and labels
const categoryConfig: Record<string, { color: string; label: string; icon: string }> = {
  culture: { color: 'bg-purple-100 text-purple-700', label: 'Cultuur', icon: '🎭' },
  beach: { color: 'bg-blue-100 text-blue-700', label: 'Strand', icon: '🏖️' },
  'active-sports': { color: 'bg-orange-100 text-orange-700', label: 'Sport', icon: '🏃' },
  relaxation: { color: 'bg-green-100 text-green-700', label: 'Wellness', icon: '🧘' },
  'food-drink': { color: 'bg-amber-100 text-amber-700', label: 'Gastronomie', icon: '🍽️' },
  nature: { color: 'bg-emerald-100 text-emerald-700', label: 'Natuur', icon: '🌿' },
  entertainment: { color: 'bg-pink-100 text-pink-700', label: 'Entertainment', icon: '🎉' },
  folklore: { color: 'bg-red-100 text-red-700', label: 'Folklore', icon: '💃' },
  festivals: { color: 'bg-yellow-100 text-yellow-700', label: 'Festivals', icon: '🎊' },
  tours: { color: 'bg-teal-100 text-teal-700', label: 'Tours', icon: '🚶' },
  workshops: { color: 'bg-indigo-100 text-indigo-700', label: 'Workshops', icon: '🎨' },
  markets: { color: 'bg-lime-100 text-lime-700', label: 'Markten', icon: '🛍️' },
  'sports-events': { color: 'bg-cyan-100 text-cyan-700', label: 'Sportevenementen', icon: '⚽' },
  exhibitions: { color: 'bg-violet-100 text-violet-700', label: 'Exposities', icon: '🖼️' },
  music: { color: 'bg-rose-100 text-rose-700', label: 'Muziek', icon: '🎵' },
  family: { color: 'bg-sky-100 text-sky-700', label: 'Familie', icon: '👨‍👩‍👧‍👦' },
};

export function AgendaCard({ event, variant = 'grid', onClick }: AgendaCardProps) {
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
  const endDate = new Date(event.endDate);
  const isSameDay = format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd');

  const dateDisplay = isSameDay
    ? format(startDate, 'dd MMMM yyyy', { locale })
    : `${format(startDate, 'dd MMM', { locale })} - ${format(endDate, 'dd MMM yyyy', { locale })}`;

  const timeDisplay = event.allDay
    ? 'Hele dag'
    : format(startDate, 'HH:mm', { locale });

  // Get primary image
  const primaryImage = event.images?.find((img) => img.isPrimary)?.url || event.images?.[0]?.url;

  // Get category config
  const category = categoryConfig[event.primaryCategory] || {
    color: 'bg-gray-100 text-gray-700',
    label: event.primaryCategory,
    icon: '📅',
  };

  // List variant
  if (variant === 'list') {
    return (
      <article
        onClick={onClick}
        className="flex bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer mb-3 hover:-translate-y-0.5"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      >
        {/* Image */}
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={title}
            className="w-24 h-24 sm:w-36 sm:h-36 object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-24 h-24 sm:w-36 sm:h-36 bg-gradient-to-br from-[#5E8B7E] to-[#7FA594] flex items-center justify-center flex-shrink-0">
            <Calendar className="w-8 h-8 text-white/50" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-3 sm:p-4 flex flex-col">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-1 mb-1">
            {title}
          </h3>

          <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-gray-600 mb-2">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#7FA594]" />
              {dateDisplay}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#7FA594]" />
              {timeDisplay}
            </span>
          </div>

          {event.location?.name && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mb-2 line-clamp-1">
              <MapPin className="w-3.5 h-3.5 text-[#7FA594]" />
              {event.location.name}
            </p>
          )}

          <div className="flex gap-2 items-center mt-auto">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${category.color}`}>
              <span>{category.icon}</span>
              {category.label}
            </span>
            {event.pricing?.isFree && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Gratis
              </span>
            )}
            {event.featured && (
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            )}
          </div>
        </div>
      </article>
    );
  }

  // Grid variant (default)
  return (
    <article
      onClick={onClick}
      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#5E8B7E] to-[#7FA594] flex items-center justify-center">
            <Calendar className="w-16 h-16 text-white/30" />
          </div>
        )}

        {/* Category Badge */}
        <span className={`absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${category.color} backdrop-blur-sm`}>
          <span>{category.icon}</span>
          {category.label}
        </span>

        {/* Featured Badge */}
        {event.featured && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
            Uitgelicht
          </span>
        )}

        {/* Price Badge */}
        {event.pricing && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/70 text-white backdrop-blur-sm">
            {event.pricing.isFree ? (
              'Gratis'
            ) : (
              <>
                <Euro className="w-3.5 h-3.5" />
                {event.pricing.minPrice}
              </>
            )}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2 min-h-[3.5rem]">
          {title}
        </h3>

        <div className="space-y-1.5 mb-3">
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#7FA594] flex-shrink-0" />
            <span>{dateDisplay}</span>
          </p>

          <p className="text-sm text-gray-600 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#7FA594] flex-shrink-0" />
            <span>{timeDisplay}</span>
          </p>

          {event.location?.name && (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#7FA594] flex-shrink-0" />
              <span className="line-clamp-1">{event.location.name}</span>
            </p>
          )}
        </div>

        <p className="text-sm text-gray-500 line-clamp-2">
          {description}
        </p>
      </div>
    </article>
  );
}

export default AgendaCard;
