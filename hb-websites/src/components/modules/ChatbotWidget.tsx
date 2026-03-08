'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface ChatbotWidgetProps {
  tenantSlug: string;
  locale: string;
  chatbotName?: string;
  apiUrl: string;
}

const QUICK_ACTIONS: Record<string, Array<{ label: string; message: string }>> = {
  nl: [
    { label: 'Programma samenstellen', message: 'Stel een dagprogramma voor me samen op basis van mijn interesses en het weer van vandaag.' },
    { label: 'Zoeken op Rubriek', message: 'Welke categorieën zijn er? Laat me zoeken op rubriek.' },
    { label: 'Routebeschrijving', message: 'Ik wil een routebeschrijving. Welke bezienswaardigheden kan ik combineren in een route?' },
    { label: 'Tip van de Dag', message: 'Wat is jouw tip van de dag? Verras me met iets leuks!' },
  ],
  en: [
    { label: 'Plan my day', message: 'Create a day program for me based on my interests and today\'s weather.' },
    { label: 'Browse categories', message: 'What categories are available? Let me browse by category.' },
    { label: 'Route planner', message: 'I want a route description. Which attractions can I combine in a route?' },
    { label: 'Tip of the Day', message: 'What\'s your tip of the day? Surprise me with something fun!' },
  ],
  de: [
    { label: 'Tagesprogramm', message: 'Erstelle ein Tagesprogramm für mich basierend auf meinen Interessen und dem heutigen Wetter.' },
    { label: 'Nach Kategorie', message: 'Welche Kategorien gibt es? Lass mich nach Kategorie suchen.' },
    { label: 'Routenplaner', message: 'Ich möchte eine Routenbeschreibung. Welche Sehenswürdigkeiten kann ich in einer Route kombinieren?' },
    { label: 'Tipp des Tages', message: 'Was ist dein Tipp des Tages? Überrasche mich mit etwas Schönem!' },
  ],
  es: [
    { label: 'Planificar el día', message: 'Crea un programa diario para mí basado en mis intereses y el clima de hoy.' },
    { label: 'Buscar por categoría', message: '¿Qué categorías hay disponibles? Déjame buscar por categoría.' },
    { label: 'Planificador de rutas', message: 'Quiero una descripción de ruta. ¿Qué atracciones puedo combinar en una ruta?' },
    { label: 'Consejo del día', message: '¡Cuál es tu consejo del día? ¡Sorpréndeme con algo divertido!' },
  ],
};

const DESTINATION_IDS: Record<string, number> = {
  calpe: 1,
  texel: 2,
  alicante: 3,
  warrewijzer: 4,
};

export default function ChatbotWidget({ tenantSlug, locale, chatbotName, apiUrl }: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const name = chatbotName ?? (tenantSlug === 'texel' ? 'Tessa' : tenantSlug === 'warrewijzer' ? 'Wijze Warre' : 'HoliBot');
  const quickActions = QUICK_ACTIONS[locale] ?? QUICK_ACTIONS.en;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

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

      const res = await fetch(`${apiUrl}/api/v1/holibot/chat/stream`, {
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
  }, [messages, isStreaming, apiUrl, tenantSlug, locale]);

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
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] bg-surface rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-primary text-on-primary px-4 py-3 flex items-center justify-between flex-shrink-0">
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
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickActions.map((qa) => (
                    <button
                      key={qa.label}
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
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary text-on-primary rounded-br-sm'
                      : 'bg-gray-100 text-foreground rounded-bl-sm'
                  }`}
                >
                  {msg.content || (msg.isStreaming && (
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  ))}
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
