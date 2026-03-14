'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

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

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  tipData?: DailyTipData | null;
  itineraryData?: ItineraryData | null;
}

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
}

const QUICK_ACTIONS: Record<string, Array<{ id: string; label: string; message: string }>> = {
  nl: [
    { id: 'program', label: 'Programma samenstellen', message: '__ITINERARY__' },
    { id: 'category', label: 'Zoeken op Rubriek', message: 'Welke categorieën zijn er? Laat me zoeken op rubriek.' },
    { id: 'directions', label: 'Routebeschrijving', message: 'Ik wil een routebeschrijving. Welke bezienswaardigheden kan ik combineren in een route?' },
    { id: 'tip', label: 'Tip van de Dag', message: '__TIP_VAN_DE_DAG__' },
  ],
  en: [
    { id: 'program', label: 'Plan my day', message: '__ITINERARY__' },
    { id: 'category', label: 'Browse categories', message: 'What categories are available? Let me browse by category.' },
    { id: 'directions', label: 'Route planner', message: 'I want a route description. Which attractions can I combine in a route?' },
    { id: 'tip', label: 'Tip of the Day', message: '__TIP_VAN_DE_DAG__' },
  ],
  de: [
    { id: 'program', label: 'Tagesprogramm', message: '__ITINERARY__' },
    { id: 'category', label: 'Nach Kategorie', message: 'Welche Kategorien gibt es? Lass mich nach Kategorie suchen.' },
    { id: 'directions', label: 'Routenplaner', message: 'Ich möchte eine Routenbeschreibung. Welche Sehenswürdigkeiten kann ich in einer Route kombinieren?' },
    { id: 'tip', label: 'Tipp des Tages', message: '__TIP_VAN_DE_DAG__' },
  ],
  es: [
    { id: 'program', label: 'Planificar el día', message: '__ITINERARY__' },
    { id: 'category', label: 'Buscar por categoría', message: '¿Qué categorías hay disponibles? Déjame buscar por categoría.' },
    { id: 'directions', label: 'Planificador de rutas', message: 'Quiero una descripción de ruta. ¿Qué atracciones puedo combinar en una ruta?' },
    { id: 'tip', label: 'Consejo del día', message: '__TIP_VAN_DE_DAG__' },
  ],
};

const TIP_LABELS: Record<string, string> = {
  nl: 'Tip van de Dag',
  en: 'Tip of the Day',
  de: 'Tipp des Tages',
  es: 'Consejo del día',
};

const DESTINATION_IDS: Record<string, number> = {
  calpe: 1,
  texel: 2,
  alicante: 3,
  warrewijzer: 4,
};

/** localStorage key for tip session excludes */
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

/** Render a POI/Event card inside the chat */
function TipCard({ tip, locale, onRefresh }: { tip: DailyTipData; locale: string; onRefresh: () => void }) {
  if (tip.itemType === 'message') {
    return (
      <div className="text-sm text-foreground/70 italic">
        {tip.tipDescription || (locale === 'nl' ? 'Je hebt alle tips gezien! Probeer het later opnieuw.' : 'You\'ve seen all tips! Try again later.')}
      </div>
    );
  }

  const item = tip.poi || tip.event;
  if (!item) return null;

  const imageUrl = tip.poi?.images?.[0] || tip.poi?.thumbnail_url || tip.event?.thumbnailUrl;
  const href = tip.poi ? `/poi/${item.id}` : `/event/${item.id}`;

  return (
    <div className="border border-primary/20 rounded-xl overflow-hidden bg-white">
      {imageUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={imageUrl} alt={item.name} className="w-full h-32 object-cover" />
      )}
      <div className="p-3">
        {item.category && (
          <span className="text-xs font-medium text-primary">{item.category}</span>
        )}
        <a href={href} className="block mt-1 font-semibold text-sm text-foreground hover:text-primary transition-colors">
          {item.name}
        </a>
        {tip.poi?.rating && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted">
            <span className="text-amber-500">&#9733;</span>
            {tip.poi.rating.toFixed(1)}
            {tip.poi.review_count ? ` (${tip.poi.review_count})` : ''}
          </div>
        )}
        {item.address && (
          <p className="text-xs text-muted mt-1 truncate">{item.address}</p>
        )}
        {tip.event?.event_date && (
          <p className="text-xs text-muted mt-1">
            {new Date(tip.event.event_date).toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-US', { day: 'numeric', month: 'long' })}
          </p>
        )}
      </div>
      <div className="px-3 pb-2 flex justify-between items-center">
        <a href={href} className="text-xs text-primary hover:underline">
          {locale === 'nl' ? 'Bekijk details' : 'View details'}
        </a>
        <button
          onClick={onRefresh}
          className="text-xs text-muted hover:text-primary transition-colors flex items-center gap-1"
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

function ItineraryWizard({ locale, onSubmit, onCancel }: {
  locale: string;
  onSubmit: (opts: { duration: Duration; interests: string[]; includeMeals: boolean }) => void;
  onCancel: () => void;
}) {
  const t = ITINERARY_LABELS[locale] || ITINERARY_LABELS.en;
  const [step, setStep] = useState(1);
  const [duration, setDuration] = useState<Duration>('full-day');
  const [interests, setInterests] = useState<string[]>([]);
  const [includeMeals, setIncludeMeals] = useState(true);

  const toggleInterest = (id: string) => {
    setInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="border border-primary/30 rounded-xl overflow-hidden bg-white">
      {/* Header */}
      <div className="bg-primary/10 px-3 py-2 flex items-center justify-between">
        <span className="font-semibold text-sm text-foreground">{t.title}</span>
        <div className="flex gap-1">
          {[1, 2, 3].map(s => (
            <span key={s} className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${step >= s ? 'bg-primary text-on-primary' : 'bg-gray-200 text-muted'}`}>{s}</span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-3">
        {step === 1 && (
          <div>
            <p className="text-xs text-muted mb-2">{t.step1}</p>
            <div className="grid grid-cols-2 gap-2">
              {DURATION_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setDuration(opt.id)}
                  className={`flex flex-col items-center p-2 rounded-lg border text-xs transition-all ${duration === opt.id ? 'border-primary bg-primary/10 font-semibold' : 'border-gray-200 hover:border-primary/50'}`}>
                  <span className="text-lg">{opt.icon}</span>
                  <span className="text-foreground">{t[opt.id]}</span>
                  <span className="text-muted text-[10px]">{opt.hours}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-xs text-muted mb-2">{t.step2}</p>
            <div className="flex flex-wrap gap-1.5">
              {INTEREST_OPTIONS.map(id => (
                <button key={id} onClick={() => toggleInterest(id)}
                  className={`px-2.5 py-1.5 rounded-full text-xs border transition-all ${interests.includes(id) ? 'border-primary bg-primary text-on-primary' : 'border-gray-200 text-foreground hover:border-primary/50'}`}>
                  {t[id]}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="text-xs text-muted mb-2">{t.step3}</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={includeMeals} onChange={e => setIncludeMeals(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
              <span className="text-xs text-foreground">{t.includeMeals}</span>
            </label>
            <div className="mt-3 p-2 bg-gray-50 rounded-lg text-xs text-muted">
              <p className="font-medium text-foreground">{t[duration]}</p>
              {interests.length > 0 && <p>{interests.map(i => t[i]).join(', ')}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 pb-3 flex justify-between">
        {step > 1 ? (
          <button onClick={() => setStep(step - 1)} className="px-3 py-1.5 text-xs rounded-full border border-gray-200 text-muted hover:text-foreground">{t.back}</button>
        ) : (
          <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded-full border border-gray-200 text-muted hover:text-foreground">{t.cancel}</button>
        )}
        {step < 3 ? (
          <button onClick={() => setStep(step + 1)} className="px-3 py-1.5 text-xs rounded-full bg-primary text-on-primary hover:opacity-90">{t.next}</button>
        ) : (
          <button onClick={() => onSubmit({ duration, interests, includeMeals })} className="px-3 py-1.5 text-xs rounded-full bg-primary text-on-primary hover:opacity-90">{t.generate}</button>
        )}
      </div>
    </div>
  );
}

/* ─── Itinerary Result Card ─── */

function ItineraryCard({ data, locale }: { data: ItineraryData; locale: string }) {
  return (
    <div className="border border-primary/20 rounded-xl overflow-hidden bg-white">
      {/* AI description */}
      {data.description && (
        <div className="px-3 py-2 bg-primary/5 text-xs text-foreground italic">
          {data.description}
        </div>
      )}
      {/* Timeline */}
      <div className="px-3 py-2 space-y-2">
        {data.itinerary.map((stop, i) => {
          const item = stop.poi || stop.event;
          const name = stop.poi?.name || stop.event?.title || stop.label || '';
          const isMeal = stop.type === 'lunch' || stop.type === 'dinner';
          const imageUrl = stop.poi?.images?.[0] || stop.poi?.thumbnail_url;

          return (
            <div key={i} className="flex gap-2 items-start">
              {/* Time badge */}
              <div className="flex-shrink-0 w-12 text-center">
                <span className={`text-xs font-bold ${isMeal ? 'text-amber-600' : 'text-primary'}`}>{stop.time}</span>
              </div>
              {/* Connector dot */}
              <div className="flex-shrink-0 mt-1">
                <div className={`w-2.5 h-2.5 rounded-full ${isMeal ? 'bg-amber-500' : stop.type === 'event' ? 'bg-purple-500' : 'bg-primary'}`} />
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                {item && item.id ? (
                  <a href={stop.poi ? `/poi/${item.id}` : `/event/${item.id}`}
                    className="text-xs font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">
                    {isMeal && <span className="mr-1">{stop.type === 'lunch' ? '\u{1F37D}\u{FE0F}' : '\u{1F374}'}</span>}
                    {name}
                  </a>
                ) : (
                  <span className="text-xs font-semibold text-foreground line-clamp-1">
                    {isMeal && <span className="mr-1">{stop.type === 'lunch' ? '\u{1F37D}\u{FE0F}' : '\u{1F374}'}</span>}
                    {name}
                  </span>
                )}
                {stop.poi?.category && (
                  <span className="text-[10px] text-muted">{stop.poi.category}</span>
                )}
                {stop.poi?.rating && (
                  <span className="text-[10px] text-amber-500 ml-1">{'\u2733'} {stop.poi.rating.toFixed(1)}</span>
                )}
              </div>
              {/* Thumbnail */}
              {imageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={imageUrl} alt={name} className="w-10 h-10 rounded object-cover flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-100 text-[10px] text-muted">
        {data.totalStops} {locale === 'nl' ? 'stops' : locale === 'de' ? 'Stopps' : locale === 'es' ? 'paradas' : 'stops'}
      </div>
    </div>
  );
}

export default function ChatbotWidget({ tenantSlug, locale, chatbotName, quickActionFilter, chatbotColor }: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showItineraryWizard, setShowItineraryWizard] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const sessionIdRef = useRef<string>(crypto.randomUUID());

  const name = chatbotName ?? (tenantSlug === 'texel' ? 'Tessa' : tenantSlug === 'warrewijzer' ? 'Wijze Warre' : 'HoliBot');

  // Filter quick actions based on admin config
  const allActions = QUICK_ACTIONS[locale] ?? QUICK_ACTIONS.en;
  const quickActions = quickActionFilter && quickActionFilter.length > 0
    ? allActions.filter(qa => quickActionFilter.includes(qa.id))
    : allActions;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  /** Fetch daily tip from dedicated endpoint */
  const fetchDailyTip = useCallback(async () => {
    const tipLabel = TIP_LABELS[locale] || TIP_LABELS.en;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: tipLabel,
    };

    const assistantId = `assistant-${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };

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
      const tipData: DailyTipData = json.data;

      // Record shown tip for session excludes
      if (tipData.tipId) {
        recordTip(tipData.tipId, tipData.itemType);
      }

      const itemName = tipData.poi?.name || tipData.event?.name || '';
      const contentText = tipData.itemType === 'message'
        ? (tipData.tipDescription || '')
        : `${tipLabel}: ${itemName}`;

      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: contentText, isStreaming: false, tipData }
          : m
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: locale === 'nl' ? 'Sorry, er ging iets mis met de tip.' : 'Sorry, something went wrong with the tip.', isStreaming: false }
          : m
      ));
    } finally {
      setIsStreaming(false);
    }
  }, [locale]);

  const fetchItinerary = useCallback(async (opts: { duration: Duration; interests: string[]; includeMeals: boolean }) => {
    setShowItineraryWizard(false);

    const itLabel = (ITINERARY_LABELS[locale] || ITINERARY_LABELS.en).title;
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: itLabel };
    const assistantId = `assistant-${Date.now()}`;
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', isStreaming: true };

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
          sessionId: sessionIdRef.current,
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

    // Intercept daily tip action
    if (text === '__TIP_VAN_DE_DAG__') {
      fetchDailyTip();
      return;
    }

    // Intercept itinerary action — show wizard
    if (text === '__ITINERARY__') {
      setShowItineraryWizard(true);
      return;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
    };

    const assistantId = `assistant-${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };

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
          sessionId: sessionIdRef.current,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`API error: ${res.status}`);
      }

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
                  m.id === assistantId
                    ? { ...m, content: data.error ?? 'Er ging iets mis.', isStreaming: false }
                    : m
                ));
              }
            } catch {
              // Skip unparseable lines
            }
            currentEvent = '';
          }
        }
      }

      // Ensure streaming flag is removed
      setMessages(prev => prev.map(m =>
        m.id === assistantId && m.isStreaming ? { ...m, isStreaming: false } : m
      ));
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: locale === 'nl' ? 'Sorry, er ging iets mis. Probeer het opnieuw.' : 'Sorry, something went wrong. Please try again.', isStreaming: false }
          : m
      ));
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [messages, isStreaming, tenantSlug, locale, fetchDailyTip, fetchItinerary]);

  // Check if Web Speech API is available
  const [hasSpeechAPI, setHasSpeechAPI] = useState(false);
  useEffect(() => {
    setHasSpeechAPI(!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(locale === 'nl' ? 'Spraakherkenning wordt niet ondersteund in deze browser. Gebruik Chrome of Edge.' : 'Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = locale === 'nl' ? 'nl-NL' : locale === 'de' ? 'de-DE' : locale === 'es' ? 'es-ES' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      if (text.trim()) {
        sendMessage(text.trim());
      }
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert(locale === 'nl' ? 'Microfoontoegang is geblokkeerd. Sta microfoontoegang toe in je browserinstellingen.' : 'Microphone access is blocked. Allow microphone access in your browser settings.');
      }
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [locale, sendMessage]);

  // Listen for external chatbot open events (from ChatbotButton in blocks)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setIsOpen(true);
      if (detail?.message && detail.message !== 'general') {
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

  return (
    <>
      {/* Floating Bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-on-primary shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:scale-105"
          aria-label={`Open ${name}`}
          style={chatbotColor ? { backgroundColor: chatbotColor } : undefined}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-3 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-1.5rem)] sm:w-[380px] max-h-[80vh] h-[520px] bg-surface rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-primary text-on-primary px-4 py-3 flex items-center justify-between flex-shrink-0" style={chatbotColor ? { backgroundColor: chatbotColor } : undefined}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-on-primary/20 flex items-center justify-center text-sm font-bold">
                {name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-sm">{name}</h3>
                <p className="text-xs opacity-75">
                  {locale === 'nl' ? 'Online' : 'Online'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const msg = locale === 'nl' ? 'Gesprek opnieuw starten?' : 'Restart conversation?';
                  if (window.confirm(msg)) {
                    setMessages([]);
                    sessionIdRef.current = crypto.randomUUID();
                    setInput('');
                    setIsStreaming(false);
                    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
                  }
                }}
                className="p-1 hover:bg-on-primary/10 rounded transition-colors"
                aria-label="Restart chat"
                title={locale === 'nl' ? 'Opnieuw starten' : 'Restart'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-on-primary/10 rounded transition-colors"
                aria-label="Minimize chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-muted mb-4">
                  {locale === 'nl'
                    ? `Hallo! Ik ben ${name}. Hoe kan ik je helpen?`
                    : `Hi! I'm ${name}. How can I help you?`}
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-full">
                  {quickActions.map((qa) => (
                    <button
                      key={qa.id}
                      onClick={() => sendMessage(qa.message)}
                      className="px-3 py-1.5 text-xs rounded-full border border-primary text-primary hover:bg-primary hover:text-on-primary transition-colors"
                    >
                      {qa.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] ${msg.tipData || msg.itineraryData ? '' : 'px-3 py-2 rounded-2xl'} text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary text-on-primary rounded-br-sm px-3 py-2 rounded-2xl'
                      : msg.tipData || msg.itineraryData
                        ? ''
                        : 'bg-gray-100 text-foreground rounded-bl-sm'
                  }`}
                >
                  {msg.itineraryData ? (
                    <ItineraryCard data={msg.itineraryData} locale={locale} />
                  ) : msg.tipData ? (
                    <TipCard tip={msg.tipData} locale={locale} onRefresh={fetchDailyTip} />
                  ) : msg.content ? (
                    msg.content
                  ) : msg.isStreaming ? (
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
            {showItineraryWizard && (
              <div className="flex justify-start">
                <div className="max-w-[90%]">
                  <ItineraryWizard
                    locale={locale}
                    onSubmit={fetchItinerary}
                    onCancel={() => setShowItineraryWizard(false)}
                  />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-gray-200 px-3 py-2 flex gap-2 flex-shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={locale === 'nl' ? 'Stel een vraag...' : 'Ask a question...'}
              className="flex-1 resize-none border-0 bg-transparent text-sm focus:outline-none max-h-20 text-foreground placeholder:text-muted"
              rows={1}
              disabled={isStreaming}
            />
            <button
              type="button"
              onClick={() => {
                if (isListening && recognitionRef.current) {
                  recognitionRef.current.stop();
                  setIsListening(false);
                } else {
                  startListening();
                }
              }}
              className={`p-2 rounded-full transition-colors flex-shrink-0 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-muted hover:text-primary'}`}
              aria-label={isListening ? 'Stop listening' : 'Voice input'}
              disabled={isStreaming}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="p-2 rounded-full bg-primary text-on-primary disabled:opacity-40 hover:bg-primary-dark transition-colors flex-shrink-0"
              aria-label="Send"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
