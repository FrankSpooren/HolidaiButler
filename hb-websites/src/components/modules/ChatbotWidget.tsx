'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  tipData?: DailyTipData | null;
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
    { id: 'program', label: 'Programma samenstellen', message: 'Stel een dagprogramma voor me samen op basis van mijn interesses en het weer van vandaag.' },
    { id: 'category', label: 'Zoeken op Rubriek', message: 'Welke categorieën zijn er? Laat me zoeken op rubriek.' },
    { id: 'directions', label: 'Routebeschrijving', message: 'Ik wil een routebeschrijving. Welke bezienswaardigheden kan ik combineren in een route?' },
    { id: 'tip', label: 'Tip van de Dag', message: '__TIP_VAN_DE_DAG__' },
  ],
  en: [
    { id: 'program', label: 'Plan my day', message: 'Create a day program for me based on my interests and today\'s weather.' },
    { id: 'category', label: 'Browse categories', message: 'What categories are available? Let me browse by category.' },
    { id: 'directions', label: 'Route planner', message: 'I want a route description. Which attractions can I combine in a route?' },
    { id: 'tip', label: 'Tip of the Day', message: '__TIP_VAN_DE_DAG__' },
  ],
  de: [
    { id: 'program', label: 'Tagesprogramm', message: 'Erstelle ein Tagesprogramm für mich basierend auf meinen Interessen und dem heutigen Wetter.' },
    { id: 'category', label: 'Nach Kategorie', message: 'Welche Kategorien gibt es? Lass mich nach Kategorie suchen.' },
    { id: 'directions', label: 'Routenplaner', message: 'Ich möchte eine Routenbeschreibung. Welche Sehenswürdigkeiten kann ich in einer Route kombinieren?' },
    { id: 'tip', label: 'Tipp des Tages', message: '__TIP_VAN_DE_DAG__' },
  ],
  es: [
    { id: 'program', label: 'Planificar el día', message: 'Crea un programa diario para mí basado en mis intereses y el clima de hoy.' },
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

export default function ChatbotWidget({ tenantSlug, locale, chatbotName, quickActionFilter, chatbotColor }: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
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

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    // Intercept daily tip action
    if (text === '__TIP_VAN_DE_DAG__') {
      fetchDailyTip();
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
  }, [messages, isStreaming, tenantSlug, locale, fetchDailyTip]);

  // Listen for external chatbot open events (from ChatbotButton in blocks)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setIsOpen(true);
      if (detail?.message) {
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
                  className={`max-w-[85%] ${msg.tipData ? '' : 'px-3 py-2 rounded-2xl'} text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary text-on-primary rounded-br-sm px-3 py-2 rounded-2xl'
                      : msg.tipData
                        ? ''
                        : 'bg-gray-100 text-foreground rounded-bl-sm'
                  }`}
                >
                  {msg.tipData ? (
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
