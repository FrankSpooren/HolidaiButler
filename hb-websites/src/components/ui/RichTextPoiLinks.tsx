'use client';

import { useEffect } from 'react';

/**
 * Client-side click handler for auto-linked POI names in RichText.
 * Intercepts clicks on [data-poi-id] links and opens the POI detail drawer.
 */
export default function RichTextPoiLinks() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[data-poi-id]') as HTMLAnchorElement | null;
      if (!link) return;

      e.preventDefault();
      const poiId = parseInt(link.dataset.poiId || '0', 10);
      if (poiId > 0) {
        window.dispatchEvent(
          new CustomEvent('hb:poi:open', { detail: { poiId } })
        );
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return null;
}
