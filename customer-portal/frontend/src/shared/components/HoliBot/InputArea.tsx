import { useState } from 'react';
import { useHoliBot } from '../../contexts/HoliBotContext';
import { useLanguage } from '../../../i18n/LanguageContext';
import { translations } from '../../../i18n/translations';
import { VoiceButton } from './VoiceButton';
import './InputArea.css';

/**
 * InputArea - Chat input with text field, voice input, and send button
 *
 * Features:
 * - Multiline textarea with auto-resize
 * - Voice input button (Web Speech API) ✅ Phase 5
 * - Send button (enabled when text present)
 * - Enter to send, Shift+Enter for new line
 * - Accessible (WCAG 2.1 AA)
 * - Multi-language placeholder support ✅
 *
 * Phase 5: Voice Input ✅
 */

// Fallback placeholder translations for voice input context
const placeholderTranslations = {
  nl: 'Typ je vraag of gebruik spraak...',
  en: 'Type your question or use voice...',
  de: 'Tippe deine Frage oder nutze Sprache...',
  es: 'Escribe tu pregunta o usa voz...',
  sv: 'Skriv din fråga eller använd röst...',
  pl: 'Wpisz pytanie lub użyj głosu...'
};

const ariaLabelTranslations = {
  nl: 'Typ je vraag of gebruik spraak',
  en: 'Type your question or use voice',
  de: 'Tippe deine Frage oder nutze Sprache',
  es: 'Escribe tu pregunta o usa voz',
  sv: 'Skriv din fråga eller använd röst',
  pl: 'Wpisz pytanie lub użyj głosu'
};

const sendButtonAriaLabels = {
  nl: 'Verstuur bericht',
  en: 'Send message',
  de: 'Nachricht senden',
  es: 'Enviar mensaje',
  sv: 'Skicka meddelande',
  pl: 'Wyślij wiadomość'
};

export function InputArea() {
  const [message, setMessage] = useState('');
  const { language, sendMessage: sendToBackend, isLoading } = useHoliBot();
  const { language: appLanguage } = useLanguage();

  // Use HoliBot language or fall back to app language
  const currentLang = language || appLanguage || 'nl';
  const t = translations[currentLang as keyof typeof translations] || translations.nl;

  // Map language codes to Web Speech API format
  const speechLanguage = language === 'nl' ? 'nl-NL' :
                         language === 'en' ? 'en-US' :
                         language === 'de' ? 'de-DE' :
                         language === 'es' ? 'es-ES' :
                         language === 'sv' ? 'sv-SE' : 'nl-NL';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || isLoading) return;

    // Send message to backend via context
    await sendToBackend(message);
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    setMessage(transcript);
  };

  // Get translated strings
  const placeholder = placeholderTranslations[currentLang as keyof typeof placeholderTranslations] || placeholderTranslations.nl;
  const ariaLabel = ariaLabelTranslations[currentLang as keyof typeof ariaLabelTranslations] || ariaLabelTranslations.nl;
  const sendAriaLabel = sendButtonAriaLabels[currentLang as keyof typeof sendButtonAriaLabels] || sendButtonAriaLabels.nl;

  return (
    <form className="holibot-input-area" onSubmit={handleSubmit}>
      <textarea
        className="holibot-input-field"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        rows={1}
        maxLength={500}
      />

      <VoiceButton
        onTranscript={handleVoiceTranscript}
        language={speechLanguage}
        disabled={isLoading}
      />

      <button
        type="submit"
        className="holibot-send-button"
        disabled={!message.trim() || isLoading}
        aria-label={sendAriaLabel}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M2 12l20-10-10 20-2-10-8-0z"
            fill="currentColor"
          />
        </svg>
      </button>
    </form>
  );
}
