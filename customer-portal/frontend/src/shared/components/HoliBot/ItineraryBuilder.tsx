import { useState } from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import './ItineraryBuilder.css';

/**
 * ItineraryBuilder - Interactive wizard for building day programs
 *
 * Steps:
 * 1. Duration selection (morning, afternoon, evening, full-day)
 * 2. Interests selection (multi-select)
 * 3. Include meals toggle
 */

interface ItineraryBuilderProps {
  onSubmit: (options: ItineraryOptions) => void;
  onCancel: () => void;
}

export interface ItineraryOptions {
  duration: 'morning' | 'afternoon' | 'evening' | 'full-day';
  interests: string[];
  includeMeals: boolean;
}

const durationOptions = [
  { id: 'morning', icon: '🌅', hours: '09:00 - 12:00' },
  { id: 'afternoon', icon: '☀️', hours: '13:00 - 17:00' },
  { id: 'evening', icon: '🌙', hours: '18:00 - 22:00' },
  { id: 'full-day', icon: '📅', hours: '09:00 - 22:00' },
] as const;

// Interest icons matching POIs page and CategoryBrowser for consistency
const interestIcons: Record<string, string> = {
  'Beaches & Nature': '/assets/category-icons/beaches-nature.png',
  'Culture & History': '/assets/category-icons/culture-history.png',
  'Active': '/assets/category-icons/active.png',
  'Food & Drinks': '/assets/category-icons/food-drinks.png',
  'Shopping': '/assets/category-icons/shopping.png',
};

const interestOptions = [
  { id: 'Beaches & Nature' },
  { id: 'Culture & History' },
  { id: 'Active' },
  { id: 'Food & Drinks' },
  { id: 'Shopping' },
];

// Multi-language labels
const labels: Record<string, Record<string, string>> = {
  nl: {
    title: 'Programma samenstellen',
    step1: 'Kies een dagdeel',
    step2: 'Selecteer je interesses',
    step3: 'Maaltijden',
    morning: 'Ochtend',
    afternoon: 'Middag',
    evening: 'Avond',
    'full-day': 'Hele dag',
    'Beaches & Nature': 'Strand & Natuur',
    'Culture & History': 'Cultuur & Geschiedenis',
    'Active': 'Actief & Sport',
    'Food & Drinks': 'Eten & Drinken',
    'Shopping': 'Winkelen',
    includeMeals: 'Restaurant suggesties toevoegen',
    next: 'Volgende',
    back: 'Terug',
    generate: 'Programma maken',
    cancel: 'Annuleren',
  },
  en: {
    title: 'Build your itinerary',
    step1: 'Choose time of day',
    step2: 'Select your interests',
    step3: 'Meals',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    'full-day': 'Full day',
    'Beaches & Nature': 'Beaches & Nature',
    'Culture & History': 'Culture & History',
    'Active': 'Active & Sports',
    'Food & Drinks': 'Food & Drinks',
    'Shopping': 'Shopping',
    includeMeals: 'Include restaurant suggestions',
    next: 'Next',
    back: 'Back',
    generate: 'Create itinerary',
    cancel: 'Cancel',
  },
  de: {
    title: 'Programm erstellen',
    step1: 'Tageszeit wählen',
    step2: 'Interessen auswählen',
    step3: 'Mahlzeiten',
    morning: 'Morgen',
    afternoon: 'Nachmittag',
    evening: 'Abend',
    'full-day': 'Ganzer Tag',
    'Beaches & Nature': 'Strand & Natur',
    'Culture & History': 'Kultur & Geschichte',
    'Active': 'Aktiv & Sport',
    'Food & Drinks': 'Essen & Trinken',
    'Shopping': 'Einkaufen',
    includeMeals: 'Restaurant-Vorschläge hinzufügen',
    next: 'Weiter',
    back: 'Zurück',
    generate: 'Programm erstellen',
    cancel: 'Abbrechen',
  },
  es: {
    title: 'Crear itinerario',
    step1: 'Elige momento del día',
    step2: 'Selecciona tus intereses',
    step3: 'Comidas',
    morning: 'Mañana',
    afternoon: 'Tarde',
    evening: 'Noche',
    'full-day': 'Día completo',
    'Beaches & Nature': 'Playas y Naturaleza',
    'Culture & History': 'Cultura e Historia',
    'Active': 'Activo y Deportes',
    'Food & Drinks': 'Comida y Bebidas',
    'Shopping': 'Compras',
    includeMeals: 'Incluir sugerencias de restaurantes',
    next: 'Siguiente',
    back: 'Atrás',
    generate: 'Crear itinerario',
    cancel: 'Cancelar',
  },
  sv: {
    title: 'Skapa program',
    step1: 'Välj tid på dagen',
    step2: 'Välj dina intressen',
    step3: 'Måltider',
    morning: 'Morgon',
    afternoon: 'Eftermiddag',
    evening: 'Kväll',
    'full-day': 'Hela dagen',
    'Beaches & Nature': 'Stränder & Natur',
    'Culture & History': 'Kultur & Historia',
    'Active': 'Aktiv & Sport',
    'Food & Drinks': 'Mat & Dryck',
    'Shopping': 'Shopping',
    includeMeals: 'Inkludera restaurangförslag',
    next: 'Nästa',
    back: 'Tillbaka',
    generate: 'Skapa program',
    cancel: 'Avbryt',
  },
  pl: {
    title: 'Utwórz program',
    step1: 'Wybierz porę dnia',
    step2: 'Wybierz zainteresowania',
    step3: 'Posiłki',
    morning: 'Rano',
    afternoon: 'Popołudnie',
    evening: 'Wieczór',
    'full-day': 'Cały dzień',
    'Beaches & Nature': 'Plaże i Natura',
    'Culture & History': 'Kultura i Historia',
    'Active': 'Aktywność i Sport',
    'Food & Drinks': 'Jedzenie i Napoje',
    'Shopping': 'Zakupy',
    includeMeals: 'Dodaj sugestie restauracji',
    next: 'Dalej',
    back: 'Wstecz',
    generate: 'Utwórz program',
    cancel: 'Anuluj',
  },
};

export function ItineraryBuilder({ onSubmit, onCancel }: ItineraryBuilderProps) {
  const { language } = useLanguage();
  const t = labels[language] || labels.nl;

  const [step, setStep] = useState(1);
  const [duration, setDuration] = useState<ItineraryOptions['duration']>('full-day');
  const [interests, setInterests] = useState<string[]>([]);
  const [includeMeals, setIncludeMeals] = useState(true);

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSubmit = () => {
    onSubmit({ duration, interests, includeMeals });
  };

  const canProceed = () => {
    if (step === 1) return !!duration;
    if (step === 2) return true; // interests optional
    return true;
  };

  return (
    <div className="itinerary-builder">
      <div className="itinerary-builder-header">
        <h3>{t.title}</h3>
        <div className="itinerary-builder-steps">
          <span className={step >= 1 ? 'active' : ''}>1</span>
          <span className={step >= 2 ? 'active' : ''}>2</span>
          <span className={step >= 3 ? 'active' : ''}>3</span>
        </div>
      </div>

      <div className="itinerary-builder-content">
        {/* Step 1: Duration */}
        {step === 1 && (
          <div className="itinerary-step">
            <p className="step-label">{t.step1}</p>
            <div className="duration-options">
              {durationOptions.map(option => (
                <button
                  key={option.id}
                  className={`duration-option ${duration === option.id ? 'selected' : ''}`}
                  onClick={() => setDuration(option.id)}
                >
                  <span className="duration-icon">{option.icon}</span>
                  <span className="duration-label">{t[option.id]}</span>
                  <span className="duration-hours">{option.hours}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Interests */}
        {step === 2 && (
          <div className="itinerary-step">
            <p className="step-label">{t.step2}</p>
            <div className="interest-options">
              {interestOptions.map(option => (
                <button
                  key={option.id}
                  className={`interest-option ${interests.includes(option.id) ? 'selected' : ''}`}
                  onClick={() => toggleInterest(option.id)}
                >
                  <span className="interest-icon">
                    <img
                      src={interestIcons[option.id]}
                      alt={t[option.id]}
                      className="interest-icon-img"
                      style={{ width: 32, height: 32, objectFit: 'contain' }}
                    />
                  </span>
                  <span className="interest-label">{t[option.id]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Meals */}
        {step === 3 && (
          <div className="itinerary-step">
            <p className="step-label">{t.step3}</p>
            <label className="meals-toggle">
              <input
                type="checkbox"
                checked={includeMeals}
                onChange={e => setIncludeMeals(e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">{t.includeMeals}</span>
            </label>

            <div className="itinerary-summary">
              <p><strong>{t[duration]}</strong></p>
              {interests.length > 0 && (
                <p>{interests.map(i => t[i]).join(', ')}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="itinerary-builder-footer">
        {step > 1 ? (
          <button className="btn-back" onClick={() => setStep(step - 1)}>
            {t.back}
          </button>
        ) : (
          <button className="btn-cancel" onClick={onCancel}>
            {t.cancel}
          </button>
        )}

        {step < 3 ? (
          <button
            className="btn-next"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
          >
            {t.next}
          </button>
        ) : (
          <button className="btn-generate" onClick={handleSubmit}>
            {t.generate}
          </button>
        )}
      </div>
    </div>
  );
}
