import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
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
 * - SSE Streaming responses for real-time typing effect
 * - Lazy initialization (Zendesk pattern)
 * - Global window.openHoliBot function
 */

interface HoliBotContextValue {
  isOpen: boolean;
  isReady: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  userPreferences: UserPreferences | null;
  open: () => void;
  close: () => void;
  toggle: () => void;
  sendMessage: (text: string, useStreaming?: boolean) => Promise<void>;
  addAssistantMessage: (content: string, pois?: any[]) => void;
  clearMessages: () => void;
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
  const [isStreaming, setIsStreaming] = useState(false);
  const [personality] = useState<'auto' | 'adventurous' | 'relaxed' | 'cultural'>('auto');
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);

  const streamingMessageRef = useRef<string | null>(null);

  useEffect(() => {
    chatApi.setLanguage(language);
    console.log('[HoliBot] Language set to:', language);
  }, [language]);

  useEffect(() => {
    const loadPreferences = async () => {
      const prefs = await userPreferencesApi.getPreferences();
      if (prefs) {
        setUserPreferences(prefs);
        chatApi.setUserPreferences(prefs);
        console.log('[HoliBot] User preferences loaded:', prefs);
      }
    };
    loadPreferences();
  }, []);

  const initializeAPI = useCallback(async () => {
    if (isReady) return;
    console.log('[HoliBot] Initializing API...');
    const prefs = await userPreferencesApi.getPreferences();
    if (prefs) {
      setUserPreferences(prefs);
      chatApi.setUserPreferences(prefs);
    }
    setIsReady(true);
    console.log('[HoliBot] API ready');
  }, [isReady]);

  const open = useCallback(() => {
    console.log('[HoliBot] Opening widget...');
    if (!isReady) initializeAPI();
    setIsOpen(true);
  }, [isReady, initializeAPI]);

  const close = useCallback(() => {
    console.log('[HoliBot] Closing widget...');
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) close();
    else open();
  }, [isOpen, open, close]);

  const getErrorMessage = useCallback((lang: Language): string => {
    const errorMessages: Record<Language, string> = {
      nl: 'Sorry, er is een fout opgetreden. Probeer het later opnieuw.',
      en: 'Sorry, an error occurred. Please try again later.',
      de: 'Entschuldigung, ein Fehler ist aufgetreten. Bitte versuchen Sie es spaeter erneut.',
      es: 'Lo siento, ocurrio un error. Por favor, intentalo de nuevo mas tarde.',
      sv: 'Tyvaerr uppstod ett fel. Forsoek igen senare.',
      pl: 'Przepraszam, wystapil blad. Sprobuj ponownie pozniej.'
    };
    return errorMessages[lang];
  }, []);

  const sendMessage = useCallback(async (text: string, useStreaming = true) => {
    if (!text.trim()) return;

    console.log('[HoliBot] Sending message:', text, 'Streaming:', useStreaming);

    // Add user message
    const userMessage: ChatMessage = {
      id: chatApi.generateMessageId(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    if (useStreaming) {
      // Streaming mode
      setIsStreaming(true);
      const assistantMessageId = chatApi.generateMessageId();
      streamingMessageRef.current = assistantMessageId;

      // Add empty assistant message that will be updated
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true
      };
      setMessages(prev => [...prev, assistantMessage]);

      try {
        await chatApi.sendMessageStream(
          { query: text },
          {
            onMetadata: (data) => {
              console.log('[HoliBot] Stream metadata:', data);
              // Update POIs in the streaming message
              setMessages(prev => prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, pois: data.pois }
                  : msg
              ));
            },
            onChunk: (chunk, fullText) => {
              // Update the streaming message content
              setMessages(prev => prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: fullText }
                  : msg
              ));
            },
            onDone: (data) => {
              console.log('[HoliBot] Stream done:', data.totalLength, 'chars');
              // Mark streaming as complete
              setMessages(prev => prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: data.fullMessage, isStreaming: false }
                  : msg
              ));
              setIsStreaming(false);
              streamingMessageRef.current = null;
            },
            onError: (error) => {
              console.error('[HoliBot] Stream error:', error);
              setMessages(prev => prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: getErrorMessage(language), isStreaming: false }
                  : msg
              ));
              setIsStreaming(false);
              streamingMessageRef.current = null;
            }
          }
        );
      } catch (error) {
        console.error('[HoliBot] Streaming error:', error);
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: getErrorMessage(language), isStreaming: false }
            : msg
        ));
        setIsStreaming(false);
        streamingMessageRef.current = null;
      }
    } else {
      // Non-streaming mode (fallback)
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
        } else {
          const errorMessage: ChatMessage = {
            id: chatApi.generateMessageId(),
            role: 'assistant',
            content: getErrorMessage(language),
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      } catch (error) {
        console.error('[HoliBot] Send message error:', error);
        const errorMessage: ChatMessage = {
          id: chatApi.generateMessageId(),
          role: 'assistant',
          content: getErrorMessage(language),
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }
  }, [language, getErrorMessage]);

  const addAssistantMessage = useCallback((content: string, pois?: any[]) => {
    console.log('[HoliBot] Adding assistant message');
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
    console.log('[HoliBot] Clearing messages and session');
    setMessages([]);
    chatApi.clearSession();
  }, []);

  useEffect(() => {
    console.log('[HoliBot] Registering window.openHoliBot...');
    window.openHoliBot = async () => {
      console.log('[HoliBot] window.openHoliBot() called');
      open();
    };
    console.log('[HoliBot] window.openHoliBot registered');
    return () => {
      console.log('[HoliBot] Cleanup: Removing window.openHoliBot');
      delete window.openHoliBot;
    };
  }, [open]);

  const value: HoliBotContextValue = {
    isOpen,
    isReady,
    messages,
    isLoading,
    isStreaming,
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
