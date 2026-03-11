'use client';

import type { ReactNode, MouseEvent } from 'react';

interface EventCardProps {
  eventId: number;
  children: ReactNode;
  className?: string;
}

export default function EventCard({ eventId, children, className = '' }: EventCardProps) {
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    window.dispatchEvent(
      new CustomEvent('hb:event:open', { detail: { eventId } })
    );
  };

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer group block bg-surface rounded-tenant overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 ${className}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(e as unknown as MouseEvent<HTMLDivElement>); }}
    >
      {children}
    </div>
  );
}
