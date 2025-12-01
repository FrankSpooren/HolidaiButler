import { useState } from 'react';
import { useHoliBot } from '../../contexts/HoliBotContext';
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
 *
 * Phase 5: Voice Input ✅
 */

export function InputArea() {
  const [message, setMessage] = useState('');
  const { language, sendMessage: sendToBackend, isLoading } = useHoliBot();

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

  return (
    <form className="holibot-input-area" onSubmit={handleSubmit}>
      <textarea
        className="holibot-input-field"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Typ je vraag of gebruik spraak..."
        aria-label="Typ je vraag of gebruik spraak"
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
        aria-label="Verstuur bericht"
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
