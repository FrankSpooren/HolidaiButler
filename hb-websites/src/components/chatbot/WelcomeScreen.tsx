'use client';

import { useEffect, useState } from 'react';

interface QuickAction {
  id: string;
  label: string;
  message: string;
}

interface WelcomeScreenProps {
  messages: string[];
  quickActions: QuickAction[];
  onQuickAction: (message: string, actionId: string) => void;
}

/**
 * WelcomeScreen — Animated greeting messages + quick action buttons.
 * Extracted from ChatbotWidget monolith for modularity.
 */
export default function WelcomeScreen({ messages, quickActions, onQuickAction }: WelcomeScreenProps) {
  const [welcomeStep, setWelcomeStep] = useState(0);
  const [quickRepliesVisible, setQuickRepliesVisible] = useState(false);

  useEffect(() => {
    setWelcomeStep(1);
    setQuickRepliesVisible(false);

    const t2 = setTimeout(() => setWelcomeStep(2), 1500);
    const t3 = setTimeout(() => setWelcomeStep(3), 3000);
    const t4 = setTimeout(() => setQuickRepliesVisible(true), 3500);

    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  return (
    <div className="holibot-welcome-container" role="article">
      {welcomeStep >= 1 && (
        <div className="holibot-welcome-message holibot-welcome-animate">
          <div className="holibot-message-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2C3E50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <p className="holibot-welcome-text">{messages[0]}</p>
        </div>
      )}

      {welcomeStep >= 2 && (
        <div className="holibot-welcome-message holibot-welcome-animate holibot-welcome-secondary">
          <p className="holibot-welcome-text-secondary">{messages[1]}</p>
        </div>
      )}

      {welcomeStep >= 3 && (
        <div className="holibot-welcome-message holibot-welcome-animate holibot-welcome-secondary">
          <p className="holibot-welcome-text-secondary">{messages[2]}</p>
        </div>
      )}

      {/* Quick reply buttons with staggered animation */}
      <div className="holibot-quick-replies" role="group" aria-label="Quick actions">
        {quickActions.map((qa, index) => (
          <button
            key={qa.id}
            type="button"
            className={`holibot-quick-reply-button${quickRepliesVisible ? ' visible' : ''}`}
            onClick={() => onQuickAction(qa.message, qa.id)}
            aria-label={qa.label}
            style={{ animationDelay: quickRepliesVisible ? `${index * 150}ms` : undefined }}
          >
            {qa.label}
          </button>
        ))}
      </div>
    </div>
  );
}
