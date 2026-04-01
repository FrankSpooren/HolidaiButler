'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { analytics } from '../../lib/analytics';
import ChatHeader from '../chatbot/ChatHeader';
import WelcomeScreen from '../chatbot/WelcomeScreen';
import SpeakerButton from '../chatbot/SpeakerButton';
import { useHoliBot, type ChatMessage } from '../chatbot/HoliBotContext';
import './ChatbotWidget.css';
import '../chatbot/ItineraryWizard.css';

const CategoryBrowser = dynamic(() => import('../chatbot/CategoryBrowser'), { ssr: false });

/* ─── Types ─── */

interface ItineraryStop {
  time: string;
  type: 'activity' | 'lunch' | 'dinner' | 'event';
  poi?: { id: number; name: string; category?: string; address?: string; rating?: number; images?: string[]; thumbnail_url?: string };
  event?: { id: number; title: string; description?: string; address?: string; event_date?: string };
  label?: string;
}

interface ItineraryData {
  date: string;
  duration: string;
  description: string;
  itinerary: ItineraryStop[];
  totalStops: number;
}

// ChatMessage imported from HoliBotContext

interface DailyTipData {
  itemType: 'poi' | 'event' | 'message';
  poi?: { id: number; name: string; category?: string; address?: string; rating?: number; review_count?: number; images?: string[]; thumbnail_url?: string };
  event?: { id: number; name: string; category?: string; address?: string; event_date?: string; thumbnailUrl?: string };
  tipDescription?: string;
  tipId?: number | null;
  exhausted?: boolean;
}

interface ChatbotWidgetProps {
  tenantSlug: string;
  locale: string;
  chatbotName?: string;
  quickActionFilter?: string[];
  chatbotColor?: string;
  welcomeMessage?: Record<string, string>;
}

/* ─── Constants ─── */

const DIRECTIONS_HELP: Record<string, string> = {
  nl: 'Naar welke bestemming wil je navigeren? Typ de naam van een plek, strand of restaurant.',
  en: 'Which destination would you like directions to? Type the name of a place, beach or restaurant.',
  de: 'Zu welchem Ziel möchtest du navigieren? Gib den Namen eines Ortes, Strandes oder Restaurants ein.',
  es: '¿A qué destino te gustaría ir? Escribe el nombre de un lugar, playa o restaurante.',
};

const QUICK_ACTIONS: Record<string, Array<{ id: string; label: string; message: string }>> = {
  nl: [
    { id: 'program', label: 'Programma samenstellen', message: '__ITINERARY__' },
    { id: 'category', label: 'Zoeken op Rubriek', message: '__CATEGORY__' },
    { id: 'directions', label: 'Routebeschrijving', message: '__DIRECTIONS__' },
    { id: 'tip', label: 'Tip van de Dag', message: '__TIP_VAN_DE_DAG__' },
  ],
  en: [
    { id: 'program', label: 'Plan my day', message: '__ITINERARY__' },
    { id: 'category', label: 'Browse categories', message: '__CATEGORY__' },
    { id: 'directions', label: 'Route planner', message: '__DIRECTIONS__' },
    { id: 'tip', label: 'Tip of the Day', message: '__TIP_VAN_DE_DAG__' },
  ],
  de: [
    { id: 'program', label: 'Tagesprogramm', message: '__ITINERARY__' },
    { id: 'category', label: 'Nach Kategorie', message: '__CATEGORY__' },
    { id: 'directions', label: 'Routenplaner', message: '__DIRECTIONS__' },
    { id: 'tip', label: 'Tipp des Tages', message: '__TIP_VAN_DE_DAG__' },
  ],
  es: [
    { id: 'program', label: 'Planificar el día', message: '__ITINERARY__' },
    { id: 'category', label: 'Buscar por categoría', message: '__CATEGORY__' },
    { id: 'directions', label: 'Planificador de rutas', message: '__DIRECTIONS__' },
    { id: 'tip', label: 'Consejo del día', message: '__TIP_VAN_DE_DAG__' },
  ],
};

const TIP_LABELS: Record<string, string> = {
  nl: 'Tip van de Dag',
  en: 'Tip of the Day',
  de: 'Tipp des Tages',
  es: 'Consejo del día',
};

// Greeting per destination: Calpe=Hola (Spanish), Texel=Hoi (Dutch), default=Hi
const GREETINGS: Record<string, string> = {
  calpe: 'Hola',
  texel: 'Hoi',
};

const WELCOME_MESSAGES: Record<string, string[]> = {
  nl: [
    '{greeting}! Ik ben {name}, je persoonlijke reisassistent.',
    'Waar kan ik je bij helpen?',
    'Laat me enkele suggesties voor je doen, typ of spreek je vraag hieronder in:',
  ],
  en: [
    '{greeting}! I\'m {name}, your personal travel assistant.',
    'How can I help you?',
    'Let me give you some suggestions, or type or speak your question below:',
  ],
  de: [
    '{greeting}! Ich bin {name}, Ihr persönlicher Reiseassistent.',
    'Wie kann ich Ihnen helfen?',
    'Hier sind einige Vorschläge, oder geben Sie Ihre Frage unten ein:',
  ],
  es: [
    '¡{greeting}! Soy {name}, tu asistente personal de viaje.',
    '¿En qué puedo ayudarte?',
    'Aquí tienes algunas sugerencias, o escribe tu pregunta abajo:',
  ],
};

const PLACEHOLDER: Record<string, string> = {
  nl: 'Vraag of spreek...',
  en: 'Ask or speak...',
  de: 'Frage oder spreche...',
  es: 'Pregunta o habla...',
};

const DESTINATION_IDS: Record<string, number> = {
  calpe: 1,
  texel: 2,
  alicante: 3,
  warrewijzer: 4,
};

/* ─── Tip helpers ─── */

const TIP_HISTORY_KEY = 'holibot_tip_history';

function getTipExcludes(): string[] {
  try {
    const raw = localStorage.getItem(TIP_HISTORY_KEY);
    if (!raw) return [];
    const history = JSON.parse(raw) as Record<string, { tipId: string; type: string }>;
    return Object.values(history).map(h => h.tipId);
  } catch { return []; }
}

function recordTip(tipId: number | string, type: string) {
  try {
    const raw = localStorage.getItem(TIP_HISTORY_KEY);
    const history = raw ? JSON.parse(raw) : {};
    const key = `${type}-${tipId}`;
    history[key] = { tipId: String(tipId), type, timestamp: Date.now() };
    localStorage.setItem(TIP_HISTORY_KEY, JSON.stringify(history));
  } catch { /* ignore */ }
}

/* ─── TipCard ─── */

function TipCard({ tip, locale, onRefresh }: { tip: DailyTipData; locale: string; onRefresh: () => void }) {
  if (tip.itemType === 'message') {
    return (
      <div style={{ fontSize: 14, color: '#5A6C7D', fontStyle: 'italic' }}>
        {tip.tipDescription || (locale === 'nl' ? 'Je hebt alle tips gezien! Probeer het later opnieuw.' : 'You\'ve seen all tips! Try again later.')}
      </div>
    );
  }

  const item = tip.poi || tip.event;
  if (!item) return null;

  const imageUrl = tip.poi?.images?.[0] || tip.poi?.thumbnail_url || tip.event?.thumbnailUrl;
  const href = tip.poi ? `/poi/${item.id}` : `/event/${item.id}`;

  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', background: 'white' }}>
      {imageUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={imageUrl} alt={item.name} style={{ width: '100%', height: 128, objectFit: 'cover' }} />
      )}
      <div style={{ padding: 12 }}>
        {item.category && (
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--hb-primary, #30c59b)' }}>{item.category}</span>
        )}
        <a href={href} style={{ display: 'block', marginTop: 4, fontWeight: 600, fontSize: 14, color: '#2C3E50', textDecoration: 'none' }}>
          {item.name}
        </a>
        {tip.poi?.rating && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 12, color: '#9CA3AF' }}>
            <span style={{ color: '#F59E0B' }}>&#9733;</span>
            {tip.poi.rating.toFixed(1)}
            {tip.poi.review_count ? ` (${tip.poi.review_count})` : ''}
          </div>
        )}
        {item.address && <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '4px 0 0' }}>{item.address}</p>}
      </div>
      <div style={{ padding: '0 12px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href={href} style={{ fontSize: 12, color: 'var(--hb-primary, #30c59b)', textDecoration: 'none' }}>
          {locale === 'nl' ? 'Bekijk details' : 'View details'}
        </a>
        <button
          onClick={onRefresh}
          style={{ fontSize: 12, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          title={locale === 'nl' ? 'Volgende tip' : 'Next tip'}
        >
          &#x1f504; {locale === 'nl' ? 'Volgende' : 'Next'}
        </button>
      </div>
    </div>
  );
}

/* ─── Itinerary Builder (3-step wizard) ─── */

const ITINERARY_LABELS: Record<string, Record<string, string>> = {
  nl: {
    title: 'Programma samenstellen', step1: 'Kies een dagdeel', step2: 'Selecteer je interesses',
    step3: 'Maaltijden', morning: 'Ochtend', afternoon: 'Middag', evening: 'Avond', 'full-day': 'Hele dag',
    'Beaches & Nature': 'Strand & Natuur', 'Culture & History': 'Cultuur & Geschiedenis',
    'Active': 'Actief & Sport', 'Food & Drinks': 'Eten & Drinken', 'Shopping': 'Winkelen',
    includeMeals: 'Restaurant suggesties toevoegen', next: 'Volgende', back: 'Terug',
    generate: 'Programma maken', cancel: 'Annuleren', loading: 'Programma wordt samengesteld...',
  },
  en: {
    title: 'Plan my day', step1: 'Choose time of day', step2: 'Select your interests',
    step3: 'Meals', morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', 'full-day': 'Full day',
    'Beaches & Nature': 'Beaches & Nature', 'Culture & History': 'Culture & History',
    'Active': 'Active & Sports', 'Food & Drinks': 'Food & Drinks', 'Shopping': 'Shopping',
    includeMeals: 'Include restaurant suggestions', next: 'Next', back: 'Back',
    generate: 'Create itinerary', cancel: 'Cancel', loading: 'Building your itinerary...',
  },
  de: {
    title: 'Tagesprogramm', step1: 'Tageszeit wählen', step2: 'Interessen auswählen',
    step3: 'Mahlzeiten', morning: 'Morgen', afternoon: 'Nachmittag', evening: 'Abend', 'full-day': 'Ganzer Tag',
    'Beaches & Nature': 'Strand & Natur', 'Culture & History': 'Kultur & Geschichte',
    'Active': 'Aktiv & Sport', 'Food & Drinks': 'Essen & Trinken', 'Shopping': 'Einkaufen',
    includeMeals: 'Restaurant-Vorschläge hinzufügen', next: 'Weiter', back: 'Zurück',
    generate: 'Programm erstellen', cancel: 'Abbrechen', loading: 'Programm wird erstellt...',
  },
  es: {
    title: 'Planificar el día', step1: 'Elige momento del día', step2: 'Selecciona tus intereses',
    step3: 'Comidas', morning: 'Mañana', afternoon: 'Tarde', evening: 'Noche', 'full-day': 'Día completo',
    'Beaches & Nature': 'Playas y Naturaleza', 'Culture & History': 'Cultura e Historia',
    'Active': 'Activo y Deportes', 'Food & Drinks': 'Comida y Bebidas', 'Shopping': 'Compras',
    includeMeals: 'Incluir sugerencias de restaurantes', next: 'Siguiente', back: 'Atrás',
    generate: 'Crear itinerario', cancel: 'Cancelar', loading: 'Creando tu itinerario...',
  },
};

const DURATION_OPTIONS = [
  { id: 'morning' as const, icon: '\u{1F305}', hours: '09:00 - 12:00' },
  { id: 'afternoon' as const, icon: '\u{2600}\u{FE0F}', hours: '13:00 - 17:00' },
  { id: 'evening' as const, icon: '\u{1F319}', hours: '18:00 - 22:00' },
  { id: 'full-day' as const, icon: '\u{1F4C5}', hours: '09:00 - 22:00' },
];

const INTEREST_OPTIONS = ['Beaches & Nature', 'Culture & History', 'Active', 'Food & Drinks', 'Shopping'];

type Duration = 'morning' | 'afternoon' | 'evening' | 'full-day';

// Map onboarding interest keys → itinerary wizard interest names
const ONBOARDING_TO_WIZARD: Record<string, string> = {
  beach: 'Beaches & Nature',
  nature: 'Beaches & Nature',
  culture: 'Culture & History',
  active: 'Active',
  gastro: 'Food & Drinks',
  nightlife: 'Food & Drinks',
};

function getOnboardingInterests(): string[] {
  try {
    const raw = localStorage.getItem('hb_onboarding_data');
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data.interests)) return [];
    const mapped = new Set<string>();
    for (const key of data.interests) {
      const cat = ONBOARDING_TO_WIZARD[key];
      if (cat) mapped.add(cat);
    }
    return Array.from(mapped);
  } catch { return []; }
}

function ItineraryWizard({ locale, onSubmit, onCancel }: {
  locale: string;
  onSubmit: (opts: { duration: Duration; interests: string[]; includeMeals: boolean }) => void;
  onCancel: () => void;
}) {
  const t = ITINERARY_LABELS[locale] || ITINERARY_LABELS.en;
  const [step, setStep] = useState(1);
  const [duration, setDuration] = useState<Duration>('full-day');
  const [interests, setInterests] = useState<string[]>(() => getOnboardingInterests());
  const [includeMeals, setIncludeMeals] = useState(true);

  const toggleInterest = (id: string) => {
    setInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="iw-container">
      <div className="iw-header">
        <span className="iw-header-title">{t.title}</span>
        <div className="iw-steps">
          {[1, 2, 3].map(s => (
            <span key={s} className={`iw-step ${step >= s ? 'iw-step-active' : 'iw-step-inactive'}`}>{s}</span>
          ))}
        </div>
      </div>
      <div className="iw-body">
        {step === 1 && (
          <div>
            <p className="iw-label">{t.step1}</p>
            <div className="iw-grid">
              {DURATION_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setDuration(opt.id)}
                  className={`iw-option ${duration === opt.id ? 'iw-option-selected' : ''}`}>
                  <span className="iw-option-icon">{opt.icon}</span>
                  <span>{t[opt.id]}</span>
                  <span className="iw-option-sub">{opt.hours}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <p className="iw-label">{t.step2}</p>
            <div className="iw-chips">
              {INTEREST_OPTIONS.map(id => (
                <button key={id} onClick={() => toggleInterest(id)}
                  className={`iw-chip ${interests.includes(id) ? 'iw-chip-selected' : ''}`}>
                  {t[id]}
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 3 && (
          <div>
            <p className="iw-label">{t.step3}</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={includeMeals} onChange={e => setIncludeMeals(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#D4AF37' }} />
              <span style={{ fontSize: 12, color: '#2C3E50' }}>{t.includeMeals}</span>
            </label>
            <div className="iw-summary">
              <p className="iw-summary-title">{t[duration]}</p>
              {interests.length > 0 && <p style={{ margin: '4px 0 0' }}>{interests.map(i => t[i]).join(', ')}</p>}
            </div>
          </div>
        )}
      </div>
      <div className="iw-footer">
        {step > 1 ? (
          <button className="iw-btn iw-btn-secondary" onClick={() => setStep(step - 1)}>{t.back}</button>
        ) : (
          <button className="iw-btn iw-btn-secondary" onClick={onCancel}>{t.cancel}</button>
        )}
        {step < 3 ? (
          <button className="iw-btn iw-btn-primary" onClick={() => setStep(step + 1)}>{t.next}</button>
        ) : (
          <button className="iw-btn iw-btn-primary" onClick={() => onSubmit({ duration, interests, includeMeals })}>{t.generate}</button>
        )}
      </div>
    </div>
  );
}

/* ─── Itinerary Result Card ─── */

function ItineraryCard({ data, locale }: { data: ItineraryData; locale: string }) {
  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', background: 'white' }}>
      {data.description && (
        <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.02)', fontSize: 12, color: '#2C3E50', fontStyle: 'italic' }}>
          {data.description}
        </div>
      )}
      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.itinerary.map((stop, i) => {
          const item = stop.poi || stop.event;
          const name = stop.poi?.name || stop.event?.title || stop.label || '';
          const isMeal = stop.type === 'lunch' || stop.type === 'dinner';
          const imageUrl = stop.poi?.images?.[0] || stop.poi?.thumbnail_url;

          return (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0, width: 48, textAlign: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: isMeal ? '#D97706' : 'var(--hb-primary, #30c59b)' }}>{stop.time}</span>
              </div>
              <div style={{ flexShrink: 0, marginTop: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: isMeal ? '#F59E0B' : stop.type === 'event' ? '#8B5CF6' : 'var(--hb-primary, #30c59b)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {item && item.id ? (
                  <a href={stop.poi ? `/poi/${item.id}` : `/event/${item.id}`} style={{ fontSize: 12, fontWeight: 600, color: '#2C3E50', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isMeal && <span style={{ marginRight: 4 }}>{stop.type === 'lunch' ? '\u{1F37D}\u{FE0F}' : '\u{1F374}'}</span>}
                    {name}
                  </a>
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#2C3E50', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isMeal && <span style={{ marginRight: 4 }}>{stop.type === 'lunch' ? '\u{1F37D}\u{FE0F}' : '\u{1F374}'}</span>}
                    {name}
                  </span>
                )}
                {stop.poi?.category && <span style={{ fontSize: 10, color: '#9CA3AF' }}>{stop.poi.category}</span>}
                {stop.poi?.rating && <span style={{ fontSize: 10, color: '#F59E0B', marginLeft: 4 }}>{'\u2733'} {stop.poi.rating.toFixed(1)}</span>}
              </div>
              {imageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={imageUrl} alt={name} style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>
      <div style={{ padding: '8px 12px', borderTop: '1px solid #F3F4F6', fontSize: 10, color: '#9CA3AF' }}>
        {data.totalStops} {locale === 'nl' ? 'stops' : locale === 'de' ? 'Stopps' : locale === 'es' ? 'paradas' : 'stops'}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

export default function ChatbotWidget({ tenantSlug, locale, chatbotName, quickActionFilter, chatbotColor, welcomeMessage }: ChatbotWidgetProps) {
  // Shared state via HoliBotContext (accessible by MobileBottomNav, layout, etc.)
  const { isOpen, setIsOpen, messages, setMessages, isStreaming, setIsStreaming, sessionId, resetSession } = useHoliBot();

  // Local UI state (component-specific, not shared)
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showItineraryWizard, setShowItineraryWizard] = useState(false);
  const [showCategoryBrowser, setShowCategoryBrowser] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);

  const name = chatbotName ?? (tenantSlug === 'texel' ? 'Tessa' : tenantSlug === 'warrewijzer' ? 'Wijze Warre' : 'CalpeChat');
  const accentColor = chatbotColor || '#D4AF37';
  const accentDark = '#C49B2A';

  // Welcome messages: use branding config or default, with {name} + {greeting} substitution
  const greeting = GREETINGS[tenantSlug] || 'Hi';
  const getWelcomeMessages = (): string[] => {
    if (welcomeMessage && welcomeMessage[locale]) {
      return [
        `${greeting}! ${locale === 'nl' ? 'Ik ben' : locale === 'de' ? 'Ich bin' : locale === 'es' ? 'Soy' : "I'm"} ${name}.`,
        welcomeMessage[locale],
        WELCOME_MESSAGES[locale]?.[2] || WELCOME_MESSAGES.en[2],
      ];
    }
    const msgs = WELCOME_MESSAGES[locale] || WELCOME_MESSAGES.en;
    return msgs.map(m => m.replace('{name}', name).replace('{greeting}', greeting));
  };

  // Filter quick actions based on admin config
  const allActions = QUICK_ACTIONS[locale] ?? QUICK_ACTIONS.en;
  const quickActions = quickActionFilter && quickActionFilter.length > 0
    ? allActions.filter(qa => quickActionFilter.includes(qa.id))
    : allActions;

  // WelcomeScreen handles its own animation (extracted to component)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard: Escape closes chatbot
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, setIsOpen]);

  /** Fetch daily tip */
  const fetchDailyTip = useCallback(async () => {
    const tipLabel = TIP_LABELS[locale] || TIP_LABELS.en;
    const now = new Date();
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: tipLabel, timestamp: now };
    const assistantId = `assistant-${Date.now()}`;
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', timestamp: now, isStreaming: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsStreaming(true);

    try {
      const excludes = getTipExcludes();
      const params = new URLSearchParams({ language: locale });
      if (excludes.length > 0) params.set('excludeIds', excludes.join(','));

      const res = await fetch(`/api/holibot/daily-tip?${params.toString()}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const json = await res.json();
      const tipData: DailyTipData | null = json.data;

      if (!tipData) throw new Error('No tip data');
      if (tipData.tipId) recordTip(tipData.tipId, tipData.itemType);

      const itemName = tipData.poi?.name || tipData.event?.name || '';
      const contentText = tipData.itemType === 'message' ? (tipData.tipDescription || '') : `${tipLabel}: ${itemName}`;

      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: contentText, isStreaming: false, tipData } : m
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: locale === 'nl' ? 'Sorry, er ging iets mis met de tip.' : 'Sorry, something went wrong with the tip.', isStreaming: false } : m
      ));
    } finally {
      setIsStreaming(false);
    }
  }, [locale]);

  const fetchItinerary = useCallback(async (opts: { duration: Duration; interests: string[]; includeMeals: boolean }) => {
    setShowItineraryWizard(false);
    const itLabel = (ITINERARY_LABELS[locale] || ITINERARY_LABELS.en).title;
    const now = new Date();
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: itLabel, timestamp: now };
    const assistantId = `assistant-${Date.now()}`;
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', timestamp: now, isStreaming: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    try {
      const res = await fetch('/api/holibot/itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          duration: opts.duration,
          interests: opts.interests,
          includeMeals: opts.includeMeals,
          language: locale,
          sessionId: sessionId,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const itData: ItineraryData = json.data;
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: itData.description || itLabel, isStreaming: false, itineraryData: itData } : m
        ));
      } else {
        throw new Error(json.error || 'API error');
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: locale === 'nl' ? 'Sorry, er ging iets mis met het samenstellen van je programma.' : 'Sorry, something went wrong building your itinerary.', isStreaming: false } : m
      ));
    } finally {
      setIsStreaming(false);
    }
  }, [locale]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    analytics.chatbot_message_sent(locale);

    if (text === '__TIP_VAN_DE_DAG__') { analytics.chatbot_quick_action_tip(); fetchDailyTip(); return; }
    if (text === '__ITINERARY__') { analytics.chatbot_quick_action_itinerary(); setShowItineraryWizard(true); return; }
    if (text === '__CATEGORY__') { analytics.chatbot_quick_action_category(); setShowCategoryBrowser(true); return; }
    if (text === '__DIRECTIONS__') {
      analytics.chatbot_quick_action_directions();
      const helpText = DIRECTIONS_HELP[locale] || DIRECTIONS_HELP.en;
      const now = new Date();
      const msg: ChatMessage = { id: `assistant-${Date.now()}`, role: 'assistant', content: helpText, timestamp: now, isStreaming: false };
      setMessages(prev => [...prev, msg]);
      return;
    }

    const now = new Date();
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: text.trim(), timestamp: now };
    const assistantId = `assistant-${Date.now()}`;
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', timestamp: now, isStreaming: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsStreaming(true);

    const conversationHistory = [...messages, userMsg]
      .filter(m => !m.isStreaming && m.content.trim())
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      abortRef.current = new AbortController();

      const res = await fetch('/api/holibot/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Destination-ID': String(DESTINATION_IDS[tenantSlug] ?? 1),
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          message: text.trim(),
          conversationHistory,
          language: locale,
          sessionId: sessionId,
          userPreferences: undefined,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error(`API error: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.substring(7).trim();
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.substring(6));
              if (currentEvent === 'chunk' && data.text) {
                fullText += data.text;
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: fullText } : m
                ));
              } else if (currentEvent === 'done' && data.fullMessage) {
                fullText = data.fullMessage;
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: fullText, isStreaming: false } : m
                ));
              } else if (currentEvent === 'error') {
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: data.error ?? 'Er ging iets mis.', isStreaming: false } : m
                ));
              }
            } catch { /* skip */ }
            currentEvent = '';
          }
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === assistantId && m.isStreaming ? { ...m, isStreaming: false } : m
      ));
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: locale === 'nl' ? 'Sorry, er ging iets mis. Probeer het opnieuw.' : 'Sorry, something went wrong. Please try again.', isStreaming: false } : m
      ));
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [messages, isStreaming, tenantSlug, locale, fetchDailyTip, fetchItinerary]);

  // Voice input
  const [hasSpeechAPI, setHasSpeechAPI] = useState(false);
  useEffect(() => {
    setHasSpeechAPI(!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = locale === 'nl' ? 'nl-NL' : locale === 'de' ? 'de-DE' : locale === 'es' ? 'es-ES' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      if (text.trim()) sendMessage(text.trim());
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [locale, sendMessage]);

  // Apply blur to page content when chatbot opens on mobile (matching OnboardingSheet pattern)
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return;
    const main = document.querySelector('main');
    const header = document.querySelector('.md\\:hidden[style*="linear-gradient"]');
    if (isOpen) {
      main?.setAttribute('style', `${main.getAttribute('style') || ''};filter:blur(3px) brightness(0.85)`);
      if (header) (header as HTMLElement).style.filter = 'blur(3px) brightness(0.85)';
    } else {
      main?.setAttribute('style', (main.getAttribute('style') || '').replace(/;?filter:blur\(3px\) brightness\(0\.85\)/g, ''));
      if (header) (header as HTMLElement).style.filter = '';
    }
  }, [isOpen]);

  // Listen for external chatbot open events (MobileBottomNav Chat tab + ChatbotButton in blocks)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setIsOpen(true);
      if (detail?.action === 'itinerary') {
        setTimeout(() => setShowItineraryWizard(true), 150);
      } else if (detail?.action === '__TIP_VAN_DE_DAG__') {
        setTimeout(() => sendMessage('__TIP_VAN_DE_DAG__'), 100);
      } else if (detail?.action === '__DIRECTIONS__') {
        setTimeout(() => sendMessage('__DIRECTIONS__'), 100);
      } else if (detail?.action === '__CATEGORY__') {
        setTimeout(() => setShowCategoryBrowser(true), 150);
      } else if (detail?.message && detail.message !== 'general') {
        setTimeout(() => sendMessage(detail.message), 100);
      }
    };
    window.addEventListener('hb:chatbot:open', handler);
    return () => window.removeEventListener('hb:chatbot:open', handler);
  }, [sendMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleReset = () => {
    const msg = locale === 'nl' ? 'Gesprek opnieuw starten?' : 'Restart conversation?';
    if (window.confirm(msg)) {
      resetSession(); // Clears messages, resets sessionId via Context
      setInput('');
      setShowItineraryWizard(false);
      setShowCategoryBrowser(false);
      if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    }
  };

  const welcomeMessages = getWelcomeMessages();

  const formatTime = (d: Date) => d.toLocaleTimeString(locale === 'nl' ? 'nl-NL' : 'en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      {/* FAB — desktop only */}
      {!isOpen && (
        <button
          className="holibot-fab"
          onClick={() => { setIsOpen(true); analytics.chatbot_opened(); }}
          aria-label={`Open ${name}`}
          aria-expanded={false}
          aria-haspopup="dialog"
          type="button"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, ${accentDark} 100%)`,
            boxShadow: `0 10px 25px ${accentColor}4D`,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <>
          {/* Overlay backdrop (desktop only, hidden on mobile via CSS) */}
          <div className="holibot-overlay" onClick={() => setIsOpen(false)} aria-hidden="true" />

          <div className="holibot-window" role="dialog" aria-modal="true" aria-labelledby="holibot-title">
            {/* Header */}
            <ChatHeader
              name={name}
              locale={locale}
              accentColor={accentColor}
              onReset={handleReset}
              onClose={() => setIsOpen(false)}
            />

            {/* Message list — aria-live for screen readers */}
            <div className="holibot-message-list" aria-live="polite" aria-relevant="additions">
              {/* Welcome screen — hide when wizard/browser active */}
              {messages.length === 0 && !showItineraryWizard && !showCategoryBrowser && (
                <WelcomeScreen
                  messages={welcomeMessages}
                  quickActions={quickActions}
                  onQuickAction={(message, actionId) => {
                    if (actionId === 'category') analytics.chatbot_quick_action_category();
                    else if (actionId === 'directions') analytics.chatbot_quick_action_directions();
                    else if (actionId === 'program') analytics.chatbot_quick_action_itinerary();
                    else if (actionId === 'tip') analytics.chatbot_quick_action_tip();
                    sendMessage(message);
                  }}
                />
              )}

              {/* Chat messages */}
              {messages.map((msg) => (
                <div key={msg.id} className={`holibot-message holibot-message--${msg.role}`}>
                  {/* Assistant avatar */}
                  {msg.role === 'assistant' && (
                    <div className="holibot-message-avatar">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2C3E50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  )}

                  <div className="holibot-message-content">
                    {(msg.tipData || msg.itineraryData) ? (
                      /* Special cards render without bubble wrapper */
                      msg.itineraryData ? (
                        <ItineraryCard data={msg.itineraryData} locale={locale} />
                      ) : msg.tipData ? (
                        <TipCard tip={msg.tipData} locale={locale} onRefresh={fetchDailyTip} />
                      ) : null
                    ) : (
                      <div className="holibot-message-bubble">
                        {msg.content ? (
                          <p className="holibot-message-text">
                            {msg.content}
                            {msg.isStreaming && <span className="holibot-cursor" />}
                          </p>
                        ) : msg.isStreaming ? (
                          <div className="holibot-typing">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        ) : null}
                      </div>
                    )}
                    <div className="holibot-message-time" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {formatTime(msg.timestamp)}
                      {msg.role === 'assistant' && msg.content && !msg.isStreaming && (
                        <SpeakerButton text={msg.content} locale={locale} />
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Itinerary wizard */}
              {showItineraryWizard && (
                <div className="holibot-message holibot-message--assistant">
                  <div className="holibot-message-avatar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2C3E50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="holibot-message-content" style={{ maxWidth: '90%' }}>
                    <ItineraryWizard locale={locale} onSubmit={fetchItinerary} onCancel={() => setShowItineraryWizard(false)} />
                  </div>
                </div>
              )}

              {/* Category Browser */}
              {showCategoryBrowser && (
                <div className="holibot-message holibot-message--assistant">
                  <div className="holibot-message-avatar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2C3E50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="holibot-message-content" style={{ maxWidth: '90%' }}>
                    <CategoryBrowser
                      locale={locale}
                      onSelect={(cat, sub, type) => {
                        setShowCategoryBrowser(false);
                        // Send the selected category as a chat message for POI recommendations
                        const query = type ? `Toon mij ${type} in ${cat}` : sub ? `Toon mij ${sub} in ${cat}` : `Toon mij POIs in categorie ${cat}`;
                        sendMessage(query);
                      }}
                      onCancel={() => setShowCategoryBrowser(false)}
                    />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <form className="holibot-input-area" onSubmit={handleSubmit}>
              <textarea
                ref={inputRef}
                className="holibot-input-field"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={PLACEHOLDER[locale] || PLACEHOLDER.en}
                aria-label={locale === 'nl' ? 'Typ je vraag of gebruik spraak' : 'Type your question or use voice'}
                rows={1}
                maxLength={500}
                disabled={isStreaming}
              />

              {/* Voice button */}
              {hasSpeechAPI && (
                <button
                  type="button"
                  className={`holibot-voice-button${isListening ? ' listening' : ''}`}
                  onClick={() => {
                    if (isListening && recognitionRef.current) {
                      recognitionRef.current.stop();
                      setIsListening(false);
                    } else {
                      startListening();
                    }
                  }}
                  aria-label={isListening ? 'Stop listening' : 'Voice input'}
                  disabled={isStreaming}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </button>
              )}

              {/* Send button */}
              <button
                type="submit"
                className="holibot-send-button"
                disabled={!input.trim() || isStreaming}
                aria-label={locale === 'nl' ? 'Verstuur bericht' : 'Send message'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M2 12l20-10-10 20-2-10-8-0z" fill="currentColor" />
                </svg>
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
