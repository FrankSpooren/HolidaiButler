import { useState, useEffect } from 'react';
import holidaiButlerIcon from '../../../assets/images/HolidaiButler_Icon_iOS.png';
import './WelcomeMessage.css';

/**
 * WelcomeMessage - Sequential animated greeting
 *
 * User Requirements (2025-11-10):
 * - Auto-scroll to top on widget open
 * - 2 opening sentences + instruction sentence
 * - HoliBot avatar with HolidaiButler brand icon
 * - Followed by 4 suggestion tiles
 * - New content: Calpe-specific greeting
 *
 * Animation: Fade-in sequence
 * Design: Mobile-first, calm, sophisticated
 */

interface WelcomeMessageProps {
  language?: 'nl' | 'en' | 'de' | 'es' | 'sv';
}

const welcomeMessages = {
  nl: [
    'Hola! Ik ben HoliBot, je persoonlijke Calpe-Assistent.',
    'Waar kan ik je bij helpen?',
    'Laat me enkele suggesties voor je doen, typ of spreek je vraag hieronder in:'
  ],
  en: [
    'Hola! I\'m HoliBot, your personal Calpe Assistant.',
    'How can I help you?',
    'Let me give you some suggestions, or type or speak your question below:'
  ]
};

export function WelcomeMessage({ language = 'nl', onComplete }: WelcomeMessageProps & { onComplete?: () => void }) {
  const messages = welcomeMessages[language] || welcomeMessages.nl;
  const [visibleMessages, setVisibleMessages] = useState<number>(0);

  // Sequential fade-in animation (1.5s intervals) - Run once on mount only
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Show first message immediately
    setVisibleMessages(1);

    // Show second message after 1.5s
    timers.push(setTimeout(() => setVisibleMessages(2), 1500));

    // Show third message after 3s
    timers.push(setTimeout(() => setVisibleMessages(3), 3000));

    // Notify parent that animation is complete after 3rd message (add 500ms buffer)
    if (onComplete) {
      timers.push(setTimeout(() => onComplete(), 3500));
    }

    // Cleanup
    return () => timers.forEach(timer => clearTimeout(timer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  return (
    <div className="holibot-welcome-container" role="article">
      {/* Message 1: Greeting with HoliBot avatar */}
      {visibleMessages >= 1 && (
        <div className="holibot-welcome-message holibot-welcome-animate">
          <div className="holibot-welcome-avatar">
            <img
              src={holidaiButlerIcon}
              alt="HoliBot"
              className="holibot-welcome-avatar-img"
            />
          </div>
          <p className="holibot-welcome-text">{messages[0]}</p>
        </div>
      )}

      {/* Message 2: Question */}
      {visibleMessages >= 2 && (
        <div className="holibot-welcome-message holibot-welcome-animate holibot-welcome-secondary">
          <p className="holibot-welcome-text-secondary">{messages[1]}</p>
        </div>
      )}

      {/* Message 3: Instructions */}
      {visibleMessages >= 3 && (
        <div className="holibot-welcome-message holibot-welcome-animate holibot-welcome-secondary">
          <p className="holibot-welcome-text-secondary">{messages[2]}</p>
        </div>
      )}
    </div>
  );
}
