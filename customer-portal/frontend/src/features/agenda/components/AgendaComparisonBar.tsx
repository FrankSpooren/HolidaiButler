import { useAgendaComparison } from '../../../shared/contexts/AgendaComparisonContext';
import { useLanguage } from '@/i18n/LanguageContext';
import './AgendaComparisonBar.css';

interface AgendaComparisonBarProps {
  onCompare: () => void;
}

const translations: Record<string, { selected: string; compare: string; clear: string }> = {
  nl: { selected: 'geselecteerd', compare: 'Vergelijken', clear: 'Wissen' },
  en: { selected: 'selected', compare: 'Compare', clear: 'Clear' },
  de: { selected: 'ausgewählt', compare: 'Vergleichen', clear: 'Löschen' },
  es: { selected: 'seleccionados', compare: 'Comparar', clear: 'Borrar' },
  sv: { selected: 'valda', compare: 'Jämför', clear: 'Rensa' },
  pl: { selected: 'wybranych', compare: 'Porównaj', clear: 'Wyczyść' },
};

/**
 * AgendaComparisonBar - Sticky bottom bar for event comparison
 * Shows when 1+ events are selected for comparison
 */
export function AgendaComparisonBar({ onCompare }: AgendaComparisonBarProps) {
  const { comparisonEvents, clearComparison } = useAgendaComparison();
  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  const count = comparisonEvents.size;

  if (count === 0) return null;

  return (
    <div className="agenda-comparison-bar">
      <div className="agenda-comparison-bar-content">
        <span className="agenda-comparison-count">
          {count} {t.selected}
        </span>
        <div className="agenda-comparison-buttons">
          <button
            className="agenda-comparison-clear-btn"
            onClick={clearComparison}
          >
            {t.clear}
          </button>
          <button
            className="agenda-comparison-compare-btn"
            onClick={onCompare}
            disabled={count < 2}
          >
            {t.compare}
          </button>
        </div>
      </div>
    </div>
  );
}
