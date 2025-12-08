import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { ChatMessage } from '../types/chat.types';
import { chatApi } from '../services/chat.api';

/**
 * HoliBot Context - Enterprise-Level Chat Widget State Management
 *
 * Pattern: Zendesk-inspired Context API with custom hook
 * Features:
 * - Lazy initialization (only load API on first open)
 * - Global window.openHoliBot function
 * - Type-safe state management
 * - Performance-optimized callbacks
 * - Phase 6: Message history & Mistral AI integration ✅
 */

interface HoliBotContextValue {
  // State
  isOpen: boolean;
  isReady: boolean;
  messages: ChatMessage[];
  isLoading: boolean;

  // Actions
  open: () => void;
  close: () => void;
  toggle: () => void;
  sendMessage: (text: string) => Promise<void>;
  addAssistantMessage: (content: string, pois?: any[]) => void;
  clearMessages: () => void;

  // Configuration
  personality: 'auto' | 'adventurous' | 'relaxed' | 'cultural';
  language: 'nl' | 'en' | 'de' | 'es' | 'sv';
}

const HoliBotContext = createContext<HoliBotContextValue | null>(null);

interface HoliBotProviderProps {
  children: ReactNode;
}

export function HoliBotProvider({ children }: HoliBotProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [personality] = useState<'auto' | 'adventurous' | 'relaxed' | 'cultural'>('auto');
  const [language] = useState<'nl' | 'en' | 'de' | 'es' | 'sv'>('nl');

  // Lazy initialization: only load API on first open (Zendesk pattern)
  const initializeAPI = useCallback(async () => {
    if (isReady) return;

    console.log('[HoliBot] 🔄 Initializing API...');

    // TODO: Initialize Mistral AI API connection
    // For now, just mark as ready
    setIsReady(true);

    console.log('[HoliBot] ✅ API ready');
  }, [isReady]);

  const open = useCallback(() => {
    console.log('[HoliBot] 🎯 Opening widget...');

    // Lazy load API if not ready
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

    console.log('[HoliBot] 📤 Sending message:', text);

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
      // Send to backend (new chat API endpoint)
      const response = await chatApi.sendMessage({
        query: text
      });

      if (response.success && response.data) {
        // Add assistant response with POIs for clickable links
        const assistantMessage: ChatMessage = {
          id: chatApi.generateMessageId(),
          role: 'assistant',
          content: response.data.textResponse,
          timestamp: new Date(),
          pois: response.data.pois // Store POIs for clickable links ✅
        };
        setMessages(prev => [...prev, assistantMessage]);

        console.log('[HoliBot] ✅ Response received');
        console.log(`[HoliBot] 📍 ${response.data.pois.length} POIs returned`);
        console.log(`[HoliBot] 🔍 Intent: ${response.data.intent.primaryIntent}`);
        console.log(`[HoliBot] 💾 Session: ${response.data.sessionId}`);
      } else {
        // Error message
        const errorMessage: ChatMessage = {
          id: chatApi.generateMessageId(),
          role: 'assistant',
          content: 'Sorry, ik kon je vraag niet verwerken. Probeer het later opnieuw.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        console.error('[HoliBot] ❌ Error:', response.error);
      }
    } catch (error) {
      console.error('[HoliBot] ❌ Send message error:', error);
      const errorMessage: ChatMessage = {
        id: chatApi.generateMessageId(),
        role: 'assistant',
        content: 'Sorry, er is een fout opgetreden. Probeer het later opnieuw.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addAssistantMessage = useCallback((content: string, pois?: any[]) => {
    console.log('[HoliBot] 💬 Adding assistant message directly');
    const assistantMessage: ChatMessage = {
      id: chatApi.generateMessageId(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      pois // Include POIs for clickable links
    };
    setMessages(prev => [...prev, assistantMessage]);
  }, []);

  const clearMessages = useCallback(async () => {
    console.log('[HoliBot] 🗑️ Clearing messages and session');
    setMessages([]);

    // Clear backend session
    await chatApi.clearSession();
  }, []);

  // Expose global window.openHoliBot function for external access
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

/**
 * Custom hook to access HoliBot context
 * Throws error if used outside HoliBotProvider
 */
export function useHoliBot() {
  const context = useContext(HoliBotContext);

  if (!context) {
    throw new Error('useHoliBot must be used within HoliBotProvider');
  }

  return context;
}

// Type declaration for global window.openHoliBot
declare global {
  interface Window {
    openHoliBot?: () => Promise<void>;
  }
}
