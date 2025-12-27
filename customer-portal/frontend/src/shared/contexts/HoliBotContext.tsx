import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { ChatMessage } from '../types/chat.types';
import { chatApi, type ConversationMessage } from '../services/chat.api';
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
 * - Error handling with retry logic
 * - Automatic fallback from streaming to non-streaming
 */

interface HoliBotContextValue {
  isOpen: boolean;
  isReady: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  userPreferences: UserPreferences | null;
  wasReset: boolean; // True after reset, false after first message
  currentItinerary: any | null; // Persisted itinerary data
  currentDailyTip: any | null; // Persisted daily tip POI
  open: () => void;
  close: () => void;
  toggle: () => void;
  sendMessage: (text: string, useStreaming?: boolean) => Promise<void>;
  addAssistantMessage: (content: string, pois?: any[]) => void;
  clearMessages: () => void;
  clearError: () => void;
  retryLastMessage: () => Promise<void>;
  setCurrentItinerary: (itinerary: any | null) => void;
  setCurrentDailyTip: (tip: any | null) => void;
  personality: 'auto' | 'adventurous' | 'relaxed' | 'cultural';
  language: Language;
}

const HoliBotContext = createContext<HoliBotContextValue | null>(null);

interface HoliBotProviderProps {
  children: ReactNode;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

export function HoliBotProvider({ children }: HoliBotProviderProps) {
  const { language } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personality] = useState<'auto' | 'adventurous' | 'relaxed' | 'cultural'>('auto');
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [wasReset, setWasReset] = useState(false); // Track if chat was just reset
  const [currentItinerary, setCurrentItinerary] = useState<any | null>(null); // Persisted itinerary
  const [currentDailyTip, setCurrentDailyTip] = useState<any | null>(null); // Persisted daily tip

  const streamingMessageRef = useRef<string | null>(null);
  const lastMessageRef = useRef<string | null>(null);
  const retryCountRef = useRef<number>(0);

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

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getErrorMessage = useCallback((lang: Language): string => {
    const errorMessages: Record<Language, string> = {
      nl: 'Sorry, er is een fout opgetreden. Probeer het later opnieuw.',
      en: 'Sorry, an error occurred. Please try again later.',
      de: 'Entschuldigung, ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
      es: 'Lo siento, ocurrió un error. Por favor, inténtalo de nuevo más tarde.',
      sv: 'Tyvärr uppstod ett fel. Försök igen senare.',
      pl: 'Przepraszam, wystąpił błąd. Spróbuj ponownie później.'
    };
    return errorMessages[lang];
  }, []);

  const getRetryMessage = useCallback((lang: Language): string => {
    const retryMessages: Record<Language, string> = {
      nl: 'Even geduld, ik probeer opnieuw...',
      en: 'Please wait, retrying...',
      de: 'Bitte warten, ich versuche es erneut...',
      es: 'Por favor espera, reintentando...',
      sv: 'Vänta, försöker igen...',
      pl: 'Proszę czekać, próbuję ponownie...'
    };
    return retryMessages[lang];
  }, []);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const sendMessageInternal = useCallback(async (
    text: string,
    useStreaming: boolean,
    isRetry: boolean = false,
    currentMessages: ChatMessage[] = []
  ): Promise<boolean> => {
    if (!text.trim()) return true;

    console.log('[HoliBot] Sending message:', text, 'Streaming:', useStreaming, 'Retry:', isRetry);
    setError(null);

    // Build conversation history from existing messages (exclude streaming messages)
    const conversationHistory: ConversationMessage[] = currentMessages
      .filter(msg => !msg.isStreaming && msg.content.trim())
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));

    console.log('[HoliBot] Conversation history:', conversationHistory.length, 'messages');

    // Only add user message if this is not a retry
    if (!isRetry) {
      const userMessage: ChatMessage = {
        id: chatApi.generateMessageId(),
        role: 'user',
        content: text,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      lastMessageRef.current = text;

      // Add the new user message to history for this request
      conversationHistory.push({ role: 'user', content: text });
    }

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
        let streamSuccess = false;

        await chatApi.sendMessageStream(
          { query: text },
          {
            onMetadata: (data) => {
              console.log('[HoliBot] Stream metadata:', data);
              setMessages(prev => prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, pois: data.pois }
                  : msg
              ));
            },
            onChunk: (chunk, fullText) => {
              setMessages(prev => prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: fullText }
                  : msg
              ));
            },
            onDone: (data) => {
              console.log('[HoliBot] Stream done:', data.totalLength, 'chars');
              setMessages(prev => prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: data.fullMessage, isStreaming: false }
                  : msg
              ));
              setIsStreaming(false);
              streamingMessageRef.current = null;
              retryCountRef.current = 0;
              streamSuccess = true;
            },
            onError: (errorMsg) => {
              console.error('[HoliBot] Stream error:', errorMsg);
              // Remove the failed streaming message
              setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
              setIsStreaming(false);
              streamingMessageRef.current = null;
            }
          },
          conversationHistory
        );

        return streamSuccess;
      } catch (err) {
        console.error('[HoliBot] Streaming error:', err);
        // Remove the failed streaming message
        setMessages(prev => prev.filter(msg => msg.id !== streamingMessageRef.current));
        setIsStreaming(false);
        streamingMessageRef.current = null;
        return false;
      }
    } else {
      // Non-streaming mode (fallback)
      setIsLoading(true);
      try {
        const response = await chatApi.sendMessage({ query: text }, conversationHistory);
        if (response.success && response.data) {
          const assistantMessage: ChatMessage = {
            id: chatApi.generateMessageId(),
            role: 'assistant',
            content: response.data.textResponse,
            timestamp: new Date(),
            pois: response.data.pois
          };
          setMessages(prev => [...prev, assistantMessage]);
          retryCountRef.current = 0;
          return true;
        } else {
          return false;
        }
      } catch (err) {
        console.error('[HoliBot] Send message error:', err);
        return false;
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  const sendMessage = useCallback(async (text: string, useStreaming = true) => {
    if (!text.trim()) return;

    // Clear reset flag when user sends a message
    setWasReset(false);

    // Get current messages snapshot for conversation history
    // We use a Promise to get the latest state
    const currentMessages = await new Promise<ChatMessage[]>(resolve => {
      setMessages(prev => {
        resolve([...prev]);
        return prev;
      });
    });

    // First attempt with streaming
    let success = await sendMessageInternal(text, useStreaming, false, currentMessages);

    // If streaming failed, retry with non-streaming as fallback
    if (!success && useStreaming && retryCountRef.current < MAX_RETRIES) {
      retryCountRef.current++;
      console.log(`[HoliBot] Streaming failed, retrying (${retryCountRef.current}/${MAX_RETRIES})...`);

      // Add a retry message
      const retryMessage: ChatMessage = {
        id: chatApi.generateMessageId(),
        role: 'assistant',
        content: getRetryMessage(language),
        timestamp: new Date(),
        isStreaming: true
      };
      setMessages(prev => [...prev, retryMessage]);

      await delay(RETRY_DELAY_MS);

      // Remove retry message
      setMessages(prev => prev.filter(msg => msg.id !== retryMessage.id));

      // Try non-streaming fallback - include the user message that was already added
      const retryMessages = await new Promise<ChatMessage[]>(resolve => {
        setMessages(prev => {
          resolve([...prev]);
          return prev;
        });
      });
      success = await sendMessageInternal(text, false, true, retryMessages);
    }

    // If all retries failed, show error message
    if (!success) {
      const errorMessage: ChatMessage = {
        id: chatApi.generateMessageId(),
        role: 'assistant',
        content: getErrorMessage(language),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setError('Connection failed');
    }
  }, [sendMessageInternal, language, getErrorMessage, getRetryMessage]);

  const retryLastMessage = useCallback(async () => {
    if (lastMessageRef.current) {
      retryCountRef.current = 0;
      // Remove the last error message if present
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.role === 'assistant' && lastMsg.content === getErrorMessage(language)) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      await sendMessage(lastMessageRef.current, true);
    }
  }, [sendMessage, language, getErrorMessage]);

  const addAssistantMessage = useCallback((content: string, pois?: any[]) => {
    console.log('[HoliBot] Adding assistant message');
    // Clear wasReset flag when adding a message (same as sendMessage)
    setWasReset(false);
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
    setError(null);
    lastMessageRef.current = null;
    retryCountRef.current = 0;
    setWasReset(true); // Mark as reset to skip animations
    setCurrentItinerary(null); // Clear persisted itinerary
    setCurrentDailyTip(null); // Clear persisted daily tip
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
    error,
    userPreferences,
    wasReset,
    currentItinerary,
    currentDailyTip,
    open,
    close,
    toggle,
    sendMessage,
    addAssistantMessage,
    clearMessages,
    clearError,
    retryLastMessage,
    setCurrentItinerary,
    setCurrentDailyTip,
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
