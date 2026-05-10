'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * AnchorNav Block — VII-E2 Batch C, Block C2
 *
 * In-page navigation that auto-detects H2 headings or uses manual anchors.
 * Highlights active section via IntersectionObserver.
 * Smooth scroll on click. Sticky variant available.
 */

export interface AnchorNavProps {
  source?: 'auto_h2' | 'manual';
  manualAnchors?: Array<{ id: string; label: string }>;
  position?: 'top' | 'sticky_top';
  showProgressBar?: boolean;
  variant?: 'pills' | 'list' | 'tabs';
}

interface AnchorItem {
  id: string;
  label: string;
}

export default function AnchorNav(props: AnchorNavProps) {
  const {
    source = 'auto_h2',
    manualAnchors,
    position = 'sticky_top',
    showProgressBar = false,
    variant = 'pills',
  } = props;

  const [anchors, setAnchors] = useState<AnchorItem[]>(manualAnchors || []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Auto-detect H2 elements
  useEffect(() => {
    if (source !== 'auto_h2') return;

    const h2s = document.querySelectorAll('h2[id], h2');
    const items: AnchorItem[] = [];
    h2s.forEach((h2, i) => {
      if (!h2.id) h2.id = `section-${i}`;
      items.push({ id: h2.id, label: h2.textContent || `Section ${i + 1}` });
    });
    setAnchors(items);
  }, [source]);

  // IntersectionObserver for active section tracking
  useEffect(() => {
    if (anchors.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            // Calculate progress
            const idx = anchors.findIndex(a => a.id === entry.target.id);
            if (idx >= 0) setProgress(((idx + 1) / anchors.length) * 100);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    );

    anchors.forEach(a => {
      const el = document.getElementById(a.id);
      if (el) observerRef.current!.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [anchors]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.focus({ preventScroll: true });
    }
  };

  if (anchors.length === 0) return null;

  const isSticky = position === 'sticky_top';

  const navClasses = {
    pills: 'flex flex-wrap gap-2',
    list: 'flex flex-col gap-1',
    tabs: 'flex border-b border-gray-200',
  };

  const itemClasses = (isActive: boolean) => {
    if (variant === 'tabs') {
      return `px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px] border-b-2 ${
        isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`;
    }
    if (variant === 'list') {
      return `px-3 py-2 text-sm rounded-lg transition-colors min-h-[44px] flex items-center ${
        isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
      }`;
    }
    // pills
    return `px-3 py-1.5 text-sm rounded-full transition-colors min-h-[36px] ${
      isActive ? 'bg-blue-600 text-white font-medium' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`;
  };

  return (
    <nav
      aria-label="Page sections"
      className={`anchor-nav-block ${isSticky ? 'sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-3' : 'py-2'}`}
    >
      {showProgressBar && (
        <div className="h-0.5 bg-gray-100 mb-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}

      <div className={navClasses[variant]} role="tablist">
        {anchors.map(anchor => (
          <button
            key={anchor.id}
            role="tab"
            aria-selected={activeId === anchor.id}
            onClick={() => handleClick(anchor.id)}
            className={itemClasses(activeId === anchor.id)}
          >
            {anchor.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
