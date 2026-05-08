'use client';

import { useEffect, useState } from 'react';

export type AlertSeverity = 'info' | 'warning' | 'error';
export type AlertContext = 'closure' | 'weather' | 'capacity' | 'soldout' | 'general';

export interface AlertStatusProps {
  severity?: AlertSeverity;
  message: string;
  dismissible?: boolean;
  expiresAt?: string;
  context?: AlertContext;
}

const severityStyles: Record<AlertSeverity, string> = {
  info: 'bg-[var(--hb-alert-info-bg,#DBEAFE)] text-[var(--hb-alert-info-text,#1E3A8A)] border-[var(--hb-alert-info-border,#3B82F6)]',
  warning: 'bg-[var(--hb-alert-warning-bg,#FEF3C7)] text-[var(--hb-alert-warning-text,#78350F)] border-[var(--hb-alert-warning-border,#F59E0B)]',
  error: 'bg-[var(--hb-alert-error-bg,#FEE2E2)] text-[var(--hb-alert-error-text,#7F1D1D)] border-[var(--hb-alert-error-border,#EF4444)]',
};

const severityIcons: Record<AlertSeverity, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '🚨',
};

export default function AlertStatus({
  severity = 'warning',
  message,
  dismissible = false,
  expiresAt,
  context,
}: AlertStatusProps) {
  const [dismissed, setDismissed] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const checkExpiry = () => {
      if (new Date() > new Date(expiresAt)) setExpired(true);
    };
    checkExpiry();
    const interval = setInterval(checkExpiry, 60_000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (dismissed || expired) return null;

  return (
    <div
      role="alert"
      aria-live={severity === 'error' ? 'assertive' : 'polite'}
      data-context={context}
      className={`${severityStyles[severity]} border-2 rounded-lg p-4 my-2`}
      style={{ containerType: 'inline-size' }}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">
          {severityIcons[severity]}
        </span>
        <p className="flex-1 text-sm font-medium @[400px]:text-base">{message}</p>
        {dismissible && (
          <button
            onClick={() => setDismissed(true)}
            aria-label="Sluit melding"
            className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-current opacity-60 hover:opacity-100 transition"
          >
            <span aria-hidden="true" className="text-lg">&times;</span>
          </button>
        )}
      </div>
    </div>
  );
}
