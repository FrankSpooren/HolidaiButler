/**
 * HoliBot Context - Chat Widget State Management
 * Manages chat state, messages, and API communication
 *
 * Pattern: Context API with custom hook
 * Features:
 * - Lazy initialization
 * - Global window.openHoliBot function
 * - Message history management
 * - Session persistence
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { chatService } from '../services';

const HoliBotContext = createContext(null);

export function HoliBotProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [personality] = useState('auto'); // 'auto' | 'adventurous' | 'relaxed' | 'cultural'
  const [language] = useState(() => localStorage.getItem('language') || 'nl');

  // Generate unique message ID
  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Lazy initialization
  const initializeAPI = useCallback(async () => {
    if (isReady) return;
    console.log('[HoliBot] Initializing API...');
    setIsReady(true);
    console.log('[HoliBot] API ready');
  }, [isReady]);

  const open = useCallback(() => {
    console.log('[HoliBot] Opening widget...');
    if (!isReady) {
      initializeAPI();
    }
    setIsOpen(true);
  }, [isReady, initializeAPI]);

  const close = useCallback(() => {
    console.log('[HoliBot] Closing widget...');
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    console.log('[HoliBot] Sending message:', text);

    // Add user message immediately
    const userMessage = {
      id: generateMessageId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await chatService.sendMessage(text);

      if (response.success && response.data) {
        // Add assistant response
        const assistantMessage = {
          id: generateMessageId(),
          role: 'assistant',
          content: response.data.textResponse,
          timestamp: new Date(),
          pois: response.data.pois,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        console.log('[HoliBot] Response received');
      } else {
        // Error message
        const errorMessage = {
          id: generateMessageId(),
          role: 'assistant',
          content: getErrorMessage(language),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        console.error('[HoliBot] Error:', response.error);
      }
    } catch (error) {
      console.error('[HoliBot] Send message error:', error);
      const errorMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: getErrorMessage(language),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [language]);

  const addAssistantMessage = useCallback((content, pois) => {
    console.log('[HoliBot] Adding assistant message');
    const assistantMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      pois,
    };
    setMessages((prev) => [...prev, assistantMessage]);
  }, []);

  const clearMessages = useCallback(async () => {
    console.log('[HoliBot] Clearing messages');
    setMessages([]);
    await chatService.clearSession();
  }, []);

  // Expose global window.openHoliBot function
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

  const value = {
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
 */
export function useHoliBot() {
  const context = useContext(HoliBotContext);
  if (!context) {
    throw new Error('useHoliBot must be used within HoliBotProvider');
  }
  return context;
}

/**
 * Get localized error message
 */
function getErrorMessage(language) {
  const messages = {
    nl: 'Sorry, er is een fout opgetreden. Probeer het later opnieuw.',
    en: 'Sorry, an error occurred. Please try again later.',
    de: 'Sorry, ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
    es: 'Lo siento, se produjo un error. Por favor, intente de nuevo más tarde.',
  };
  return messages[language] || messages.nl;
}

export default HoliBotContext;
