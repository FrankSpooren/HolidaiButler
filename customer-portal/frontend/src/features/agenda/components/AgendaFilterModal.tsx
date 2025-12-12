/**
 * AgendaFilterModal - Filter modal for agenda events
 * Filters: Interest, Distance, Company, Date
 * Supports all 6 languages: NL, DE, EN, ES, SV, PL
 */

import { useState, useEffect } from 'react';
import { X, ChevronDown, Calendar } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import './AgendaFilterModal.css';

interface AgendaFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: AgendaFilters) => void;
  initialFilters?: AgendaFilters;
  resultCount?: number;
}

export interface AgendaFilters {
  interests: string[];
  distance: number;
  company: string[];
  dateType: 'all' | 'today' | 'tomorrow' | 'weekend' | 'custom';
  dateStart?: string;
  dateEnd?: string;
}

// Translations for filter modal
const filterTranslations: Record<string, {
  title: string;
  interests: {
    label: string;
    options: Record<string, string>;
  };
  distance: {
    label: string;
    withinKm: string;
    noLimit: string;
  };
  company: {
    label: string;
    options: Record<string, string>;
  };
  date: {
    label: string;
    options: Record<string, string>;
    startDate: string;
    endDate: string;
  };
  actions: {
    clear: string;
    show: string;
    events: string;
  };
}> = {
  nl: {
    title: 'Filters',
    interests: {
      label: 'Interesse',
      options: {
        music: 'Muziek',
        culture: 'Cultuur',
        active: 'Actief',
        nature: 'Natuur',
        food: 'Eten & Drinken',
        festivals: 'Festivals',
        markets: 'Markten',
        creative: 'Creatief',
      },
    },
    distance: {
      label: 'Afstand',
      withinKm: 'Binnen {km} km',
      noLimit: 'Geen limiet',
    },
    company: {
      label: 'Gezelschap',
      options: {
        couple: 'Stel',
        family: 'Familie',
        solo: 'Solo',
        group: 'Groep',
      },
    },
    date: {
      label: 'Datum',
      options: {
        all: 'Alle data',
        custom: 'Aangepast',
      },
      startDate: 'Startdatum',
      endDate: 'Einddatum',
    },
    actions: {
      clear: 'Wissen',
      show: 'Toon',
      events: 'evenementen',
    },
  },
  en: {
    title: 'Filters',
    interests: {
      label: 'Interest',
      options: {
        music: 'Music',
        culture: 'Culture',
        active: 'Active',
        nature: 'Nature',
        food: 'Food & Drinks',
        festivals: 'Festivals',
        markets: 'Markets',
        creative: 'Creative',
      },
    },
    distance: {
      label: 'Distance',
      withinKm: 'Within {km} km',
      noLimit: 'No limit',
    },
    company: {
      label: 'Company',
      options: {
        couple: 'Couple',
        family: 'Family',
        solo: 'Solo',
        group: 'Group',
      },
    },
    date: {
      label: 'Date',
      options: {
        all: 'All dates',
        custom: 'Custom',
      },
      startDate: 'Start date',
      endDate: 'End date',
    },
    actions: {
      clear: 'Clear',
      show: 'Show',
      events: 'events',
    },
  },
  de: {
    title: 'Filter',
    interests: {
      label: 'Interesse',
      options: {
        music: 'Musik',
        culture: 'Kultur',
        active: 'Aktiv',
        nature: 'Natur',
        food: 'Essen & Trinken',
        festivals: 'Festivals',
        markets: 'Märkte',
        creative: 'Kreativ',
      },
    },
    distance: {
      label: 'Entfernung',
      withinKm: 'Innerhalb {km} km',
      noLimit: 'Keine Begrenzung',
    },
    company: {
      label: 'Gesellschaft',
      options: {
        couple: 'Paar',
        family: 'Familie',
        solo: 'Allein',
        group: 'Gruppe',
      },
    },
    date: {
      label: 'Datum',
      options: {
        all: 'Alle Termine',
        custom: 'Benutzerdefiniert',
      },
      startDate: 'Startdatum',
      endDate: 'Enddatum',
    },
    actions: {
      clear: 'Löschen',
      show: 'Zeigen',
      events: 'Veranstaltungen',
    },
  },
  es: {
    title: 'Filtros',
    interests: {
      label: 'Interés',
      options: {
        music: 'Música',
        culture: 'Cultura',
        active: 'Activo',
        nature: 'Naturaleza',
        food: 'Comida y Bebida',
        festivals: 'Festivales',
        markets: 'Mercados',
        creative: 'Creativo',
      },
    },
    distance: {
      label: 'Distancia',
      withinKm: 'Dentro de {km} km',
      noLimit: 'Sin límite',
    },
    company: {
      label: 'Compañía',
      options: {
        couple: 'Pareja',
        family: 'Familia',
        solo: 'Solo',
        group: 'Grupo',
      },
    },
    date: {
      label: 'Fecha',
      options: {
        all: 'Todas las fechas',
        custom: 'Personalizado',
      },
      startDate: 'Fecha de inicio',
      endDate: 'Fecha de fin',
    },
    actions: {
      clear: 'Borrar',
      show: 'Mostrar',
      events: 'eventos',
    },
  },
  sv: {
    title: 'Filter',
    interests: {
      label: 'Intresse',
      options: {
        music: 'Musik',
        culture: 'Kultur',
        active: 'Aktiv',
        nature: 'Natur',
        food: 'Mat & Dryck',
        festivals: 'Festivaler',
        markets: 'Marknader',
        creative: 'Kreativ',
      },
    },
    distance: {
      label: 'Avstånd',
      withinKm: 'Inom {km} km',
      noLimit: 'Ingen gräns',
    },
    company: {
      label: 'Sällskap',
      options: {
        couple: 'Par',
        family: 'Familj',
        solo: 'Ensam',
        group: 'Grupp',
      },
    },
    date: {
      label: 'Datum',
      options: {
        all: 'Alla datum',
        custom: 'Anpassad',
      },
      startDate: 'Startdatum',
      endDate: 'Slutdatum',
    },
    actions: {
      clear: 'Rensa',
      show: 'Visa',
      events: 'evenemang',
    },
  },
  pl: {
    title: 'Filtry',
    interests: {
      label: 'Zainteresowania',
      options: {
        music: 'Muzyka',
        culture: 'Kultura',
        active: 'Aktywne',
        nature: 'Natura',
        food: 'Jedzenie i Napoje',
        festivals: 'Festiwale',
        markets: 'Targi',
        creative: 'Kreatywny',
      },
    },
    distance: {
      label: 'Odległość',
      withinKm: 'W promieniu {km} km',
      noLimit: 'Bez limitu',
    },
    company: {
      label: 'Towarzystwo',
      options: {
        couple: 'Para',
        family: 'Rodzina',
        solo: 'Sam',
        group: 'Grupa',
      },
    },
    date: {
      label: 'Data',
      options: {
        all: 'Wszystkie daty',
        custom: 'Niestandardowy',
      },
      startDate: 'Data rozpoczęcia',
      endDate: 'Data zakończenia',
    },
    actions: {
      clear: 'Wyczyść',
      show: 'Pokaż',
      events: 'wydarzeń',
    },
  },
};

const defaultFilters: AgendaFilters = {
  interests: [],
  distance: 50, // 50 = no limit
  company: [],
  dateType: 'all',
};

export function AgendaFilterModal({
  isOpen,
  onClose,
  onApply,
  initialFilters = defaultFilters,
  resultCount = 0,
}: AgendaFilterModalProps) {
  const { language } = useLanguage();
  const t = filterTranslations[language] || filterTranslations.en;

  const [filters, setFilters] = useState<AgendaFilters>(initialFilters);
  const [expandedSections, setExpandedSections] = useState<string[]>(['interests', 'distance', 'company', 'date']);

  useEffect(() => {
    if (isOpen) {
      setFilters(initialFilters);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialFilters]);

  if (!isOpen) return null;

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const toggleInterest = (interest: string) => {
    setFilters((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const toggleCompany = (company: string) => {
    setFilters((prev) => ({
      ...prev,
      company: prev.company.includes(company)
        ? prev.company.filter((c) => c !== company)
        : [...prev.company, company],
    }));
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.interests.length > 0) count += filters.interests.length;
    if (filters.distance < 50) count++;
    if (filters.company.length > 0) count += filters.company.length;
    if (filters.dateType !== 'all') count++;
    return count;
  };

  return (
    <div className="agenda-filter-overlay" onClick={onClose}>
      <div className="agenda-filter-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="agenda-filter-header">
          <button className="agenda-filter-back" onClick={onClose}>←</button>
          <h2 className="agenda-filter-title">{t.title} ({getActiveFilterCount()})</h2>
          <button className="agenda-filter-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="agenda-filter-body">
          {/* Interests Section */}
          <div className="agenda-filter-section">
            <button
              className="agenda-filter-section-header"
              onClick={() => toggleSection('interests')}
            >
              <span>{t.interests.label}</span>
              <ChevronDown
                className={`agenda-filter-chevron ${expandedSections.includes('interests') ? 'expanded' : ''}`}
              />
            </button>
            {expandedSections.includes('interests') && (
              <div className="agenda-filter-section-content">
                <div className="agenda-filter-chips">
                  {Object.entries(t.interests.options).map(([key, label]) => (
                    <button
                      key={key}
                      className={`agenda-filter-chip ${filters.interests.includes(key) ? 'active' : ''}`}
                      onClick={() => toggleInterest(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Distance Section */}
          <div className="agenda-filter-section">
            <button
              className="agenda-filter-section-header"
              onClick={() => toggleSection('distance')}
            >
              <span>{t.distance.label}</span>
              <ChevronDown
                className={`agenda-filter-chevron ${expandedSections.includes('distance') ? 'expanded' : ''}`}
              />
            </button>
            {expandedSections.includes('distance') && (
              <div className="agenda-filter-section-content">
                <div className="agenda-filter-slider-container">
                  <input
                    type="range"
                    className="agenda-filter-slider"
                    min="1"
                    max="50"
                    value={filters.distance}
                    onChange={(e) => setFilters((prev) => ({ ...prev, distance: Number(e.target.value) }))}
                  />
                  <div className="agenda-filter-slider-label">
                    {filters.distance >= 50
                      ? t.distance.noLimit
                      : t.distance.withinKm.replace('{km}', String(filters.distance))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Company Section */}
          <div className="agenda-filter-section">
            <button
              className="agenda-filter-section-header"
              onClick={() => toggleSection('company')}
            >
              <span>{t.company.label}</span>
              <ChevronDown
                className={`agenda-filter-chevron ${expandedSections.includes('company') ? 'expanded' : ''}`}
              />
            </button>
            {expandedSections.includes('company') && (
              <div className="agenda-filter-section-content">
                <div className="agenda-filter-chips">
                  {Object.entries(t.company.options).map(([key, label]) => (
                    <button
                      key={key}
                      className={`agenda-filter-chip ${filters.company.includes(key) ? 'active' : ''}`}
                      onClick={() => toggleCompany(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Date Section */}
          <div className="agenda-filter-section">
            <button
              className="agenda-filter-section-header"
              onClick={() => toggleSection('date')}
            >
              <span>{t.date.label}</span>
              <ChevronDown
                className={`agenda-filter-chevron ${expandedSections.includes('date') ? 'expanded' : ''}`}
              />
            </button>
            {expandedSections.includes('date') && (
              <div className="agenda-filter-section-content">
                <div className="agenda-filter-radio-group">
                  {Object.entries(t.date.options).map(([key, label]) => (
                    <label key={key} className="agenda-filter-radio">
                      <input
                        type="radio"
                        name="dateType"
                        value={key}
                        checked={filters.dateType === key}
                        onChange={() => setFilters((prev) => ({ ...prev, dateType: key as AgendaFilters['dateType'] }))}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>

                {/* Custom Date Range */}
                {filters.dateType === 'custom' && (
                  <div className="agenda-filter-date-range">
                    <div className="agenda-filter-date-input">
                      <label>{t.date.startDate}</label>
                      <input
                        type="date"
                        value={filters.dateStart || ''}
                        onChange={(e) => setFilters((prev) => ({ ...prev, dateStart: e.target.value }))}
                      />
                    </div>
                    <div className="agenda-filter-date-input">
                      <label>{t.date.endDate}</label>
                      <input
                        type="date"
                        value={filters.dateEnd || ''}
                        onChange={(e) => setFilters((prev) => ({ ...prev, dateEnd: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="agenda-filter-footer">
          <button className="agenda-filter-clear" onClick={clearFilters}>
            {t.actions.clear}
          </button>
          <button className="agenda-filter-apply" onClick={handleApply}>
            {t.actions.show} {resultCount} {t.actions.events}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AgendaFilterModal;
