import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { ChatMessage } from '../types/chat.types';
import { chatApi } from '../services/chat.api';
import { userPreferencesApi } from '../services/userPreferences.api';
import type { UserPreferences } from '../services/userPreferences.api';
import { useLanguage } from '../../i18n/LanguageContext';
import type { Language } from '../../i18n/translations';

/**
 * HoliBot Context - Enterprise-Level Chat Widget State Management
 *
 * Features:
 * - Multi-language support via LanguageContext
 * - User preferences integration for personalization
 * - Lazy initialization (Zendesk pattern)
 * - Global window.openHoliBot function
 */

interface HoliBotContextValue {
  // State
  isOpen: boolean;
  isReady: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  userPreferences: UserPreferences | null;

  // Actions
  open: () => void;
  close: () => void;
  toggle: () => void;
  sendMessage: (text: string) => Promise<void>;
  addAssistantMessage: (content: string, pois?: any[]) => void;
  clearMessages: () => void;

  // Configuration
  personality: 'auto' | 'adventurous' | 'relaxed' | 'cultural';
  language: Language;
}

const HoliBotContext = createContext<HoliBotContextValue | null>(null);

interface HoliBotProviderProps {
  children: ReactNode;
}

export function HoliBotProvider({ children }: HoliBotProviderProps) {
  const { language } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [personality] = useState<'auto' | 'adventurous' | 'relaxed' | 'cultural'>('auto');
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);

  // Update chatApi language when app language changes
  useEffect(() => {
    chatApi.setLanguage(language);
    console.log('[HoliBot] 🌐 Language set to:', language);
  }, [language]);

  // Load user preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      const prefs = await userPreferencesApi.getPreferences();
      if (prefs) {
        setUserPreferences(prefs);
        chatApi.setUserPreferences(prefs);
        console.log('[HoliBot] 👤 User preferences loaded:', prefs);
      }
    };
    loadPreferences();
  }, []);

  // Lazy initialization
  const initializeAPI = useCallback(async () => {
    if (isReady) return;

    console.log('[HoliBot] 🔄 Initializing API...');

    // Reload preferences in case they changed
    const prefs = await userPreferencesApi.getPreferences();
    if (prefs) {
      setUserPreferences(prefs);
      chatApi.setUserPreferences(prefs);
    }

    setIsReady(true);
    console.log('[HoliBot] ✅ API ready');
  }, [isReady]);

  const open = useCallback(() => {
    console.log('[HoliBot] 🎯 Opening widget...');

    if (!isReady) {
      initializeAPI();
    }

    setIsOpen(true);
  }, [isReady, initializeAPI]);

  const close = useCallback(() => {
    console.log('[HoliBot] 🔒 Closing widget...');
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    console.log('[HoliBot] 📤 Sending message:', text, 'Language:', language);

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: chatApi.generateMessageId(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage({ query: text });

      if (response.success && response.data) {
        const assistantMessage: ChatMessage = {
          id: chatApi.generateMessageId(),
          role: 'assistant',
          content: response.data.textResponse,
          timestamp: new Date(),
          pois: response.data.pois
        };
        setMessages(prev => [...prev, assistantMessage]);
        console.log('[HoliBot] ✅ Response received');
      } else {
        const errorMessages: Record<Language, string> = {
          nl: 'Sorry, ik kon je vraag niet verwerken. Probeer het later opnieuw.',
          en: 'Sorry, I could not process your question. Please try again later.',
          de: 'Entschuldigung, ich konnte Ihre Frage nicht verarbeiten. Bitte versuchen Sie es später erneut.',
          es: 'Lo siento, no pude procesar tu pregunta. Por favor, inténtalo de nuevo más tarde.',
          sv: 'Tyvärr kunde jag inte behandla din fråga. Försök igen senare.',
          pl: 'Przepraszam, nie mogłem przetworzyć Twojego pytania. Spróbuj ponownie później.'
        };
        const errorMessage: ChatMessage = {
          id: chatApi.generateMessageId(),
          role: 'assistant',
          content: errorMessages[language],
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        console.error('[HoliBot] ❌ Error:', response.error);
      }
    } catch (error) {
      console.error('[HoliBot] ❌ Send message error:', error);
      const errorMessages: Record<Language, string> = {
        nl: 'Sorry, er is een fout opgetreden. Probeer het later opnieuw.',
        en: 'Sorry, an error occurred. Please try again later.',
        de: 'Entschuldigung, ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
        es: 'Lo siento, ocurrió un error. Por favor, inténtalo de nuevo más tarde.',
        sv: 'Tyvärr uppstod ett fel. Försök igen senare.',
        pl: 'Przepraszam, wystąpił błąd. Spróbuj ponownie później.'
      };
      const errorMessage: ChatMessage = {
        id: chatApi.generateMessageId(),
        role: 'assistant',
        content: errorMessages[language],
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [language]);

  const addAssistantMessage = useCallback((content: string, pois?: any[]) => {
    console.log('[HoliBot] 💬 Adding assistant message');
    const assistantMessage: ChatMessage = {
      id: chatApi.generateMessageId(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      pois
    };
    setMessages(prev => [...prev, assistantMessage]);
  }, []);

  const clearMessages = useCallback(async () => {
    console.log('[HoliBot] 🗑️ Clearing messages and session');
    setMessages([]);
    chatApi.clearSession();
  }, []);

  // Expose global window.openHoliBot function
  useEffect(() => {
    console.log('[HoliBot] 🌐 Registering window.openHoliBot...');

    window.openHoliBot = async () => {
      console.log('[HoliBot] 🎯 window.openHoliBot() called');
      open();
    };

    console.log('[HoliBot] ✅ window.openHoliBot registered');

    return () => {
      console.log('[HoliBot] 🧹 Cleanup: Removing window.openHoliBot');
      delete window.openHoliBot;
    };
  }, [open]);

  const value: HoliBotContextValue = {
    isOpen,
    isReady,
    messages,
    isLoading,
    userPreferences,
    open,
    close,
    toggle,
    sendMessage,
    addAssistantMessage,
    clearMessages,
    personality,
    language,
  };

  return (
    <HoliBotContext.Provider value={value}>
      {children}
    </HoliBotContext.Provider>
  );
}

export function useHoliBot() {
  const context = useContext(HoliBotContext);

  if (!context) {
    throw new Error('useHoliBot must be used within HoliBotProvider');
  }

  return context;
}

declare global {
  interface Window {
    openHoliBot?: () => Promise<void>;
  }
}
