import { useState, useEffect } from 'react';
import { useDestination } from '../../contexts/DestinationContext';
import holibotAvatar from '../../../assets/images/hb-merkicoon.png';
import './WelcomeMessage.css';

/**
 * WelcomeMessage - Sequential animated greeting
 * Multi-language support: nl, en, de, es, sv, pl
 * Destination-aware: uses holibot.welcomeMessages from config
 */

interface WelcomeMessageProps {
  language?: 'nl' | 'en' | 'de' | 'es' | 'sv' | 'pl';
  onComplete?: () => void;
  skipAnimation?: boolean; // Skip animation after reset
}

// Fallback messages if not in destination config
const defaultWelcomeMessages: Record<string, string[]> = {
  nl: [
    'Hola! Ik ben HoliBot, je persoonlijke Calpe-Assistent.',
    'Waar kan ik je bij helpen?',
    'Laat me enkele suggesties voor je doen, typ of spreek je vraag hieronder in:'
  ],
  en: [
    'Hola! I\'m HoliBot, your personal Calpe Assistant.',
    'How can I help you?',
    'Let me give you some suggestions, or type or speak your question below:'
  ],
  de: [
    'Hola! Ich bin HoliBot, Ihr persönlicher Calpe-Assistent.',
    'Wie kann ich Ihnen helfen?',
    'Hier sind einige Vorschläge, oder geben Sie Ihre Frage unten ein:'
  ],
  es: [
    'Hola! Soy HoliBot, tu asistente personal de Calpe.',
    '¿En qué puedo ayudarte?',
    'Aquí tienes algunas sugerencias, o escribe tu pregunta abajo:'
  ],
  sv: [
    'Hola! Jag är HoliBot, din personliga Calpe-assistent.',
    'Hur kan jag hjälpa dig?',
    'Här är några förslag, eller skriv din fråga nedan:'
  ],
  pl: [
    'Hola! Jestem HoliBot, Twój osobisty asystent Calpe.',
    'Jak mogę Ci pomóc?',
    'Oto kilka sugestii, lub wpisz swoje pytanie poniżej:'
  ]
};

export function WelcomeMessage({ language = 'nl', onComplete, skipAnimation = false }: WelcomeMessageProps) {
  const destination = useDestination();
  const destMessages = destination.holibot?.welcomeMessages;
  const messages = destMessages?.[language] || destMessages?.['nl'] || defaultWelcomeMessages[language] || defaultWelcomeMessages.nl;
  const [visibleMessages, setVisibleMessages] = useState<number>(skipAnimation ? 3 : 0);

  useEffect(() => {
    // If skipAnimation, show everything immediately
    if (skipAnimation) {
      setVisibleMessages(3);
      onComplete?.();
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    setVisibleMessages(1);
    timers.push(setTimeout(() => setVisibleMessages(2), 1500));
    timers.push(setTimeout(() => setVisibleMessages(3), 3000));

    if (onComplete) {
      timers.push(setTimeout(() => onComplete(), 3500));
    }

    return () => timers.forEach(timer => clearTimeout(timer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipAnimation]);

  return (
    <div className="holibot-welcome-container" role="article">
      {visibleMessages >= 1 && (
        <div className="holibot-welcome-message holibot-welcome-animate">
          <div className="holibot-welcome-avatar">
            <img
              src={holibotAvatar}
              alt={destination.holibot?.name || 'HoliBot'}
              className="holibot-welcome-avatar-img"
            />
          </div>
          <p className="holibot-welcome-text">{messages[0]}</p>
        </div>
      )}

      {visibleMessages >= 2 && (
        <div className="holibot-welcome-message holibot-welcome-animate holibot-welcome-secondary">
          <p className="holibot-welcome-text-secondary">{messages[1]}</p>
        </div>
      )}

      {visibleMessages >= 3 && (
        <div className="holibot-welcome-message holibot-welcome-animate holibot-welcome-secondary">
          <p className="holibot-welcome-text-secondary">{messages[2]}</p>
        </div>
      )}
    </div>
  );
}
