'use client';

import { useState, useEffect } from 'react';

export interface EventFilters {
  categories: string[];
  dateRange: 'all' | 'today' | 'tomorrow' | 'weekend' | 'week' | 'month';
}

interface EventFilterModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: EventFilters) => void;
  currentFilters: EventFilters;
  availableCategories: string[];
  locale: string;
}

const LABELS: Record<string, Record<string, string>> = {
  nl: {
    title: 'Filters',
    category: 'Interesse',
    dateRange: 'Datum',
    all: 'Alles',
    today: 'Vandaag',
    tomorrow: 'Morgen',
    weekend: 'Dit weekend',
    week: 'Deze week',
    month: 'Deze maand',
    apply: 'Toepassen',
    clear: 'Wissen',
  },
  en: {
    title: 'Filters',
    category: 'Interest',
    dateRange: 'Date',
    all: 'All',
    today: 'Today',
    tomorrow: 'Tomorrow',
    weekend: 'This weekend',
    week: 'This week',
    month: 'This month',
    apply: 'Apply',
    clear: 'Clear',
  },
  de: {
    title: 'Filter',
    category: 'Interesse',
    dateRange: 'Datum',
    all: 'Alle',
    today: 'Heute',
    tomorrow: 'Morgen',
    weekend: 'Dieses Wochenende',
    week: 'Diese Woche',
    month: 'Diesen Monat',
    apply: 'Anwenden',
    clear: 'Zur\u00fccksetzen',
  },
  es: {
    title: 'Filtros',
    category: 'Inter\u00e9s',
    dateRange: 'Fecha',
    all: 'Todos',
    today: 'Hoy',
    tomorrow: 'Ma\u00f1ana',
    weekend: 'Este fin de semana',
    week: 'Esta semana',
    month: 'Este mes',
    apply: 'Aplicar',
    clear: 'Limpiar',
  },
};

const DATE_OPTIONS: EventFilters['dateRange'][] = ['all', 'today', 'tomorrow', 'weekend', 'week', 'month'];

export default function EventFilterModal({
  open, onClose, onApply, currentFilters, availableCategories, locale,
}: EventFilterModalProps) {
  const [filters, setFilters] = useState<EventFilters>(currentFilters);
  const [prevOpen, setPrevOpen] = useState(open);
  const t = LABELS[locale] || LABELS.en;

  // Reset filters when modal opens (no useEffect setState)
  if (open && !prevOpen) {
    setFilters(currentFilters);
  }
  if (open !== prevOpen) {
    setPrevOpen(open);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const toggleCategory = (cat: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const handleClear = () => {
    setFilters({ categories: [], dateRange: 'all' });
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const activeCount = filters.categories.length + (filters.dateRange !== 'all' ? 1 : 0);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white z-50 shadow-2xl overflow-y-auto animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-heading font-bold">{t.title}</h2>
          <button onClick={onClose} className="text-2xl text-muted hover:text-foreground">&times;</button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-6 overflow-y-auto">
          {/* Categories */}
          {availableCategories.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">{t.category}</h3>
              <div className="flex flex-wrap gap-2">
                {availableCategories.map(cat => {
                  const isActive = filters.categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-on-primary'
                          : 'bg-gray-100 text-foreground hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date range */}
          <div>
            <h3 className="text-sm font-semibold mb-3">{t.dateRange}</h3>
            <div className="flex flex-wrap gap-2">
              {DATE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => setFilters(prev => ({ ...prev, dateRange: opt }))}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filters.dateRange === opt
                      ? 'bg-primary text-on-primary'
                      : 'bg-gray-100 text-foreground hover:bg-gray-200'
                  }`}
                >
                  {t[opt] || opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t sticky bottom-0 bg-white flex gap-3">
          <button
            onClick={handleClear}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-foreground font-medium hover:bg-gray-50 transition-colors"
          >
            {t.clear}
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2.5 rounded-lg bg-primary text-on-primary font-medium hover:bg-primary/90 transition-colors"
          >
            {t.apply} {activeCount > 0 && `(${activeCount})`}
          </button>
        </div>

      </div>
    </>
  );
}
