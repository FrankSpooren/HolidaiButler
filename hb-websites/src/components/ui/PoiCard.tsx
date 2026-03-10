'use client';

import type { ReactNode, MouseEvent } from 'react';

interface PoiCardProps {
  poiId: number;
  href: string;
  children: ReactNode;
  className?: string;
}

export default function PoiCard({ poiId, href, children, className = '' }: PoiCardProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.dispatchEvent(
      new CustomEvent('hb:poi:open', { detail: { poiId } })
    );
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`group block bg-white rounded-tenant shadow-sm hover:shadow-md transition-shadow overflow-hidden ${className}`}
    >
      {children}
    </a>
  );
}
