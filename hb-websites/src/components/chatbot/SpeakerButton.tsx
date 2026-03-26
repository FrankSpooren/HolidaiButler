'use client';

import { useState, useCallback, useRef } from 'react';

interface SpeakerButtonProps {
  text: string;
  locale: string;
}

const LANG_MAP: Record<string, string> = {
  nl: 'nl-NL',
  en: 'en-US',
  de: 'de-DE',
  es: 'es-ES',
  sv: 'sv-SE',
  fr: 'fr-FR',
};

/**
 * SpeakerButton — Text-to-speech button using Web Speech API.
 * Reads assistant messages aloud. Language-aware voice selection.
 */
export default function SpeakerButton({ text, locale }: SpeakerButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const handleSpeak = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // If already speaking, stop
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Clean text: remove markdown, urls, emojis
    const clean = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[^\p{L}\p{N}\p{P}\s]/gu, '')
      .trim();

    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = LANG_MAP[locale] || 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Try to select a voice matching the locale
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = LANG_MAP[locale]?.split('-')[0] || 'en';
    const match = voices.find(v => v.lang.startsWith(langPrefix));
    if (match) utterance.voice = match;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    utteranceRef.current = utterance;

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [text, locale, isSpeaking]);

  // Only render if Speech API is available
  if (typeof window !== 'undefined' && !window.speechSynthesis) return null;

  return (
    <button
      onClick={handleSpeak}
      type="button"
      aria-label={isSpeaking ? (locale === 'nl' ? 'Stop voorlezen' : 'Stop reading') : (locale === 'nl' ? 'Voorlezen' : 'Read aloud')}
      title={isSpeaking ? (locale === 'nl' ? 'Stop' : 'Stop') : (locale === 'nl' ? 'Voorlezen' : 'Read aloud')}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 2,
        color: isSpeaking ? 'var(--hb-primary, #D4AF37)' : '#9CA3AF',
        fontSize: 14,
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      {isSpeaking ? '⏹' : '🔊'}
    </button>
  );
}
