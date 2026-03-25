'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { analytics } from '@/lib/analytics';

interface SearchResult {
  id: number;
  name: string;
  category?: string;
  rating?: number;
}

export default function SearchBar() {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    setExpanded(false);
    setQuery('');
    setResults([]);
  }, []);

  // Focus input when expanded
  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  // Close on click outside
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded, close]);

  // ESC to close
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [expanded, close]);

  // Debounced search
  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        analytics.search_used(value.trim());
        const res = await fetch(`/api/pois?search=${encodeURIComponent(value.trim())}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.pois ?? data.data ?? []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleResultClick = (poiId: number) => {
    window.dispatchEvent(
      new CustomEvent('hb:poi:open', { detail: { poiId } })
    );
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
      close();
    }
  };

  const stars = (v: number) => '★'.repeat(Math.round(v)) + '☆'.repeat(5 - Math.round(v));

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="p-2 text-foreground/70 hover:text-primary transition-colors"
        aria-label="Search"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full px-3 py-1.5 shadow-sm">
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search..."
          className="w-32 sm:w-48 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-gray-400"
        />
        <button
          onClick={close}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          aria-label="Close search"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Dropdown results */}
      {(results.length > 0 || loading) && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden z-50">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-400">Searching...</div>
          ) : (
            results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleResultClick(result.id)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
              >
                <div className="text-sm font-medium text-foreground truncate">{result.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  {result.category && (
                    <span className="text-xs text-muted">{result.category}</span>
                  )}
                  {result.rating && (
                    <span className="text-xs text-accent">{stars(result.rating)} {result.rating.toFixed(1)}</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
