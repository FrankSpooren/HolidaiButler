import { X, Filter, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAgendaStore } from '../store/agendaStore';

/**
 * FilterPanel Component
 * Comprehensive filtering system for events
 * Responsive: Drawer on mobile, sidebar on desktop
 */

interface FilterPanelProps {
  open: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

const CATEGORIES = [
  { id: 'culture', label: 'Cultuur', icon: '🎭' },
  { id: 'beach', label: 'Strand', icon: '🏖️' },
  { id: 'active-sports', label: 'Sport', icon: '🏃' },
  { id: 'relaxation', label: 'Wellness', icon: '🧘' },
  { id: 'food-drink', label: 'Gastronomie', icon: '🍽️' },
  { id: 'nature', label: 'Natuur', icon: '🌿' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎉' },
  { id: 'folklore', label: 'Folklore', icon: '💃' },
  { id: 'festivals', label: 'Festivals', icon: '🎊' },
  { id: 'tours', label: 'Tours', icon: '🚶' },
  { id: 'workshops', label: 'Workshops', icon: '🎨' },
  { id: 'markets', label: 'Markten', icon: '🛍️' },
  { id: 'sports-events', label: 'Sportevenementen', icon: '⚽' },
  { id: 'exhibitions', label: 'Exposities', icon: '🖼️' },
  { id: 'music', label: 'Muziek', icon: '🎵' },
  { id: 'family', label: 'Familie', icon: '👨‍👩‍👧‍👦' },
];

const TIME_OF_DAY = [
  { id: 'morning', label: 'Ochtend (06:00-12:00)' },
  { id: 'afternoon', label: 'Middag (12:00-18:00)' },
  { id: 'evening', label: 'Avond (18:00-22:00)' },
  { id: 'night', label: 'Nacht (22:00-06:00)' },
  { id: 'all-day', label: 'Hele dag' },
];

const AUDIENCES = [
  { id: 'families-with-kids', label: 'Gezinnen met kinderen' },
  { id: 'couples', label: 'Stellen' },
  { id: 'friends', label: 'Vrienden' },
  { id: 'solo-travelers', label: 'Alleen reizend' },
  { id: 'seniors', label: 'Senioren' },
  { id: 'young-adults', label: 'Jongeren' },
  { id: 'all-ages', label: 'Alle leeftijden' },
];

const DATE_RANGES = [
  { id: 'upcoming', label: 'Aankomend' },
  { id: 'today', label: 'Vandaag' },
  { id: 'thisWeek', label: 'Deze week' },
  { id: 'thisMonth', label: 'Deze maand' },
];

export function FilterPanel({ open, onClose, isMobile = false }: FilterPanelProps) {
  const { t } = useLanguage();
  const {
    filters,
    setFilter,
    clearFilters,
    toggleCategory,
    getActiveFiltersCount,
  } = useAgendaStore();

  const activeFiltersCount = getActiveFiltersCount();

  if (!open && !isMobile) return null;

  const FilterContent = () => (
    <div className="p-4 sm:p-5">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-[#7FA594]" />
          <h2 className="font-semibold text-gray-900">Filters</h2>
          {activeFiltersCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#7FA594] text-white text-xs font-medium">
              {activeFiltersCount}
            </span>
          )}
        </div>
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Sluiten"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Date Range */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Periode
        </label>
        <div className="relative">
          <select
            value={filters.dateRange}
            onChange={(e) => setFilter('dateRange', e.target.value)}
            className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#7FA594] focus:border-transparent"
          >
            {DATE_RANGES.map((range) => (
              <option key={range.id} value={range.id}>
                {range.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Categories */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Categorieën
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => {
            const isSelected = filters.categories.includes(category.id);
            return (
              <button
                key={category.id}
                onClick={() => toggleCategory(category.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-[#7FA594] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{category.icon}</span>
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-4" />

      {/* Time of Day */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tijdstip
        </label>
        <div className="relative">
          <select
            value={filters.timeOfDay || ''}
            onChange={(e) => setFilter('timeOfDay', e.target.value || null)}
            className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#7FA594] focus:border-transparent"
          >
            <option value="">Alle tijdstippen</option>
            {TIME_OF_DAY.map((time) => (
              <option key={time.id} value={time.id}>
                {time.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Target Audience */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Doelgroep
        </label>
        <div className="relative">
          <select
            value={filters.audience || ''}
            onChange={(e) => setFilter('audience', e.target.value || null)}
            className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#7FA594] focus:border-transparent"
          >
            <option value="">Alle doelgroepen</option>
            {AUDIENCES.map((audience) => (
              <option key={audience.id} value={audience.id}>
                {audience.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-4" />

      {/* Free Events Only */}
      <div className="mb-5">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.isFree === true}
            onChange={(e) => setFilter('isFree', e.target.checked ? true : null)}
            className="w-5 h-5 text-[#7FA594] border-gray-300 rounded focus:ring-[#7FA594] focus:ring-offset-0"
          />
          <span className="text-sm font-medium text-gray-700">
            Alleen gratis evenementen
          </span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={clearFilters}
          disabled={activeFiltersCount === 0}
          className="w-full py-2.5 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Filters wissen
        </button>
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-[#7FA594] text-white rounded-lg text-sm font-medium hover:bg-[#5E8B7E] transition-colors"
          >
            Toepassen ({activeFiltersCount})
          </button>
        )}
      </div>
    </div>
  );

  // Mobile drawer
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {open && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
        )}

        {/* Drawer */}
        <div
          className={`fixed inset-y-0 left-0 w-full max-w-sm bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <FilterContent />
        </div>
      </>
    );
  }

  // Desktop sidebar
  return (
    <div className="bg-white rounded-xl shadow-md sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
      <FilterContent />
    </div>
  );
}

export default FilterPanel;
