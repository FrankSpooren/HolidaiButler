'use client';

import type { ReactNode, MouseEvent } from 'react';
import { analytics } from '@/lib/analytics';

interface PoiCardProps {
  poiId: number;
  href: string;
  children: ReactNode;
  className?: string;
  poiName?: string;
}

export default function PoiCard({ poiId, href, children, className = '', poiName }: PoiCardProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (poiName) analytics.poi_card_clicked(poiName);
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
