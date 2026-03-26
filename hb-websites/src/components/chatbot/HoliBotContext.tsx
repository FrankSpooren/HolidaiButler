'use client';

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

/* ─── Types ─── */

export type Personality = 'auto' | 'adventurous' | 'relaxed' | 'cultural' | 'social';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  tipData?: any;
  itineraryData?: any;
}

interface HoliBotContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  sessionId: string;
  resetSession: () => void;
  personality: Personality;
  setPersonality: (p: Personality) => void;
}

const HoliBotContext = createContext<HoliBotContextValue | null>(null);

/* ─── Personality persistence ─── */

const PERSONALITY_KEY = 'hb_chatbot_personality';

function loadPersonality(): Personality {
  try {
    const saved = localStorage.getItem(PERSONALITY_KEY);
    if (saved && ['auto', 'adventurous', 'relaxed', 'cultural', 'social'].includes(saved)) {
      return saved as Personality;
    }
  } catch { /* SSR safe */ }
  return 'auto';
}

/* ─── Provider ─── */

export function HoliBotProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [personality, setPersonalityState] = useState<Personality>('auto');
  const sessionIdRef = useRef<string>(typeof crypto !== 'undefined' ? crypto.randomUUID() : 'ssr');
  const initialized = useRef(false);

  // Load personality from localStorage on first client render
  if (typeof window !== 'undefined' && !initialized.current) {
    initialized.current = true;
    const saved = loadPersonality();
    if (saved !== 'auto') setPersonalityState(saved);
  }

  const setPersonality = useCallback((p: Personality) => {
    setPersonalityState(p);
    try { localStorage.setItem(PERSONALITY_KEY, p); } catch { /* ignore */ }
  }, []);

  const resetSession = useCallback(() => {
    setMessages([]);
    setIsStreaming(false);
    sessionIdRef.current = crypto.randomUUID();
  }, []);

  return (
    <HoliBotContext.Provider
      value={{
        isOpen,
        setIsOpen,
        messages,
        setMessages,
        isStreaming,
        setIsStreaming,
        sessionId: sessionIdRef.current,
        resetSession,
        personality,
        setPersonality,
      }}
    >
      {children}
    </HoliBotContext.Provider>
  );
}

/* ─── Hook ─── */

export function useHoliBot(): HoliBotContextValue {
  const ctx = useContext(HoliBotContext);
  if (!ctx) throw new Error('useHoliBot must be used within HoliBotProvider');
  return ctx;
}
