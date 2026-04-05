'use client';

import { useState } from 'react';
import type { BannerProps } from '@/types/blocks';
import ChatbotButton from '@/components/ui/ChatbotButton';
import { analytics } from '@/lib/analytics';

const typeStyles = {
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  success: 'bg-green-50 text-green-800 border-green-200',
  promo: 'bg-primary/10 text-primary border-primary/20',
};

function getInitialDismissed(dismissible: boolean, message: string): boolean {
  if (!dismissible || typeof window === 'undefined') return false;
  const key = `hb-banner-${message.substring(0, 20)}`;
  return localStorage.getItem(key) === 'dismissed';
}

export default function Banner({ message, type = 'info', dismissible = false, link }: BannerProps) {
  const [dismissed, setDismissed] = useState(() => getInitialDismissed(dismissible, message));

  if (dismissed) return null;

  const handleDismiss = () => {
    analytics.banner_dismissed();
    const key = `hb-banner-${message.substring(0, 20)}`;
    localStorage.setItem(key, 'dismissed');
    setDismissed(true);
  };

  return (
    <div className={`border-b ${typeStyles[type]} py-3 px-4`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <p className="text-sm font-medium flex-1">
          {message}
          {link && (
            link.variant === 'chatbot' ? (
              <ChatbotButton
                label={link.label}
                message={link.chatbotAction}
                className="ml-2 underline hover:no-underline font-semibold text-current"
                size="sm"
              />
            ) : (
              <a href={link.href} className="ml-2 underline hover:no-underline font-semibold" onClick={() => analytics.banner_link_clicked(link.label)}>
                {link.label}
              </a>
            )
          )}
        </p>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="text-current opacity-60 hover:opacity-100 text-lg leading-none"
            aria-label="Dismiss"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}
