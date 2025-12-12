import { useEffect, useState } from 'react';
import { X, Calendar, MapPin, Clock, Euro } from 'lucide-react';
import { format } from 'date-fns';
import { nl, enUS, de, es, sv, pl } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { useLanguage } from '@/i18n/LanguageContext';
import { agendaService, type AgendaEvent } from '../services/agendaService';
import { useAgendaComparison } from '../../../shared/contexts/AgendaComparisonContext';
import './AgendaComparisonModal.css';

interface AgendaComparisonModalProps {
  eventIds: string[];
  isOpen: boolean;
  onClose: () => void;
}

const dateLocales: Record<string, Locale> = { nl: nl, en: enUS, de: de, es: es, sv: sv, pl: pl };

const translations: Record<string, Record<string, string>> = {
  nl: { title: 'Vergelijk Events', date: 'Datum', location: 'Locatie', price: 'Prijs', free: 'Gratis', close: 'Sluiten', remove: 'Verwijderen' },
  en: { title: 'Compare Events', date: 'Date', location: 'Location', price: 'Price', free: 'Free', close: 'Close', remove: 'Remove' },
  de: { title: 'Events vergleichen', date: 'Datum', location: 'Ort', price: 'Preis', free: 'Kostenlos', close: 'Schließen', remove: 'Entfernen' },
  es: { title: 'Comparar Eventos', date: 'Fecha', location: 'Ubicación', price: 'Precio', free: 'Gratis', close: 'Cerrar', remove: 'Eliminar' },
  sv: { title: 'Jämför Evenemang', date: 'Datum', location: 'Plats', price: 'Pris', free: 'Gratis', close: 'Stäng', remove: 'Ta bort' },
  pl: { title: 'Porównaj wydarzenia', date: 'Data', location: 'Lokalizacja', price: 'Cena', free: 'Bezpłatnie', close: 'Zamknij', remove: 'Usuń' },
};

export function AgendaComparisonModal({ eventIds, isOpen, onClose }: AgendaComparisonModalProps) {
  const { language } = useLanguage();
  const { removeFromComparison } = useAgendaComparison();
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const t = translations[language] || translations.en;
  const locale = dateLocales[language] || dateLocales.en;

  useEffect(() => {
    if (!isOpen || eventIds.length === 0) return;

    const fetchEvents = async () => {
      setLoading(true);
      try {
        const fetchedEvents = await Promise.all(
          eventIds.map(id => agendaService.getEventById(id))
        );
        setEvents(fetchedEvents.filter((e): e is AgendaEvent => e !== null));
      } catch (error) {
        console.error('Error fetching events for comparison:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [isOpen, eventIds]);

  if (!isOpen) return null;

  const getTitle = (event: AgendaEvent): string => {
    return typeof event.title === 'string'
      ? event.title
      : event.title?.[language] || event.title?.nl || event.title?.en || 'Event';
  };

  const getDescription = (event: AgendaEvent): string => {
    const desc = typeof event.description === 'string'
      ? event.description
      : event.description?.[language] || event.description?.nl || event.description?.en || '';
    return desc.length > 150 ? desc.substring(0, 150) + '...' : desc;
  };

  const getPrimaryImage = (event: AgendaEvent): string | undefined => {
    return event.images?.find((img) => img.isPrimary)?.url || event.images?.[0]?.url;
  };

  const handleRemove = (eventId: string) => {
    removeFromComparison(eventId);
    if (eventIds.length <= 2) {
      onClose();
    }
  };

  return (
    <div className="agenda-comparison-modal-overlay" onClick={onClose}>
      <div className="agenda-comparison-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="agenda-comparison-header">
          <h2>{t.title}</h2>
          <button className="agenda-comparison-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="agenda-comparison-content">
          {loading ? (
            <div className="agenda-comparison-loading">Loading...</div>
          ) : (
            <div className="agenda-comparison-grid">
              {events.map((event) => (
                <div key={event._id} className="agenda-comparison-column">
                  {/* Remove button */}
                  <button
                    className="agenda-comparison-remove"
                    onClick={() => handleRemove(event._id)}
                    title={t.remove}
                  >
                    <X size={16} />
                  </button>

                  {/* Image */}
                  <div className="agenda-comparison-image">
                    {getPrimaryImage(event) ? (
                      <img src={getPrimaryImage(event)} alt={getTitle(event)} />
                    ) : (
                      <div className="agenda-comparison-image-placeholder">📅</div>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="agenda-comparison-title">{getTitle(event)}</h3>

                  {/* Description */}
                  <p className="agenda-comparison-description">{getDescription(event)}</p>

                  {/* Details */}
                  <div className="agenda-comparison-details">
                    {/* Date */}
                    <div className="agenda-comparison-row">
                      <Calendar size={16} />
                      <span>{format(new Date(event.startDate), 'PPP', { locale })}</span>
                    </div>

                    {/* Time */}
                    {event.startDate && (
                      <div className="agenda-comparison-row">
                        <Clock size={16} />
                        <span>{format(new Date(event.startDate), 'HH:mm', { locale })}</span>
                      </div>
                    )}

                    {/* Location */}
                    {event.location?.name && (
                      <div className="agenda-comparison-row">
                        <MapPin size={16} />
                        <span>{event.location.name}</span>
                      </div>
                    )}

                    {/* Price */}
                    <div className="agenda-comparison-row">
                      <Euro size={16} />
                      <span>
                        {event.pricing?.isFree
                          ? t.free
                          : event.pricing?.price
                            ? `€${event.pricing.price}`
                            : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="agenda-comparison-footer">
          <button className="agenda-comparison-close-btn" onClick={onClose}>
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
