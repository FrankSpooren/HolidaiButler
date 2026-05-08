'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Search Block — VII-E2 Batch A, Block A1
 *
 * Full-site search across POIs, Events, and Articles with:
 * - 300ms debounced typeahead
 * - Recent searches (localStorage, max 5)
 * - Chatbot fallback prompt when 0 results
 * - Schema.org WebSite + SearchAction
 * - WCAG 2.2 AA: aria-busy, aria-controls, role=search, sr-only labels
 * - Container queries for responsive layout
 */

export interface SearchBlockData {
  placeholder?: Record<string, string>;
  searchTypes?: ('pois' | 'events' | 'articles')[];
  showSuggestions?: boolean;
  showRecentSearches?: boolean;
  resultPageHref?: string;
  variant?: 'header' | 'hero' | 'inline';
  enableChatbotFallback?: boolean;
}

interface SearchResult {
  id: number;
  name?: string;
  title?: string;
  snippet?: string;
  tile_description?: string;
  description?: string;
  category?: string;
  rating?: number;
  date?: string;
  result_type: 'poi' | 'event' | 'article';
  relevance_score: number;
}

interface SearchResponse {
  query: string;
  total: number;
  pois: SearchResult[];
  events: SearchResult[];
  articles: SearchResult[];
  merged: SearchResult[];
  suggested_chatbot_prompt: string | null;
}

const RECENT_KEY = 'hb_recent_searches';
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  try {
    const recent = getRecentSearches().filter(q => q !== query);
    recent.unshift(query);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // localStorage unavailable
  }
}

function ResultIcon({ type }: { type: string }) {
  const icons: Record<string, string> = { poi: '\u{1F4CD}', event: '\u{1F4C5}', article: '\u{1F4DD}' };
  return <span aria-hidden="true" className="mr-2 text-base">{icons[type] || ''}</span>;
}

function ResultTypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = { poi: 'POI', event: 'Event', article: 'Article' };
  return (
    <span className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-[var(--hb-bg-muted,#f1f5f9)] text-[var(--hb-text-muted,#64748b)]">
      {labels[type] || type}
    </span>
  );
}

export default function Search({ data, blockId }: { data: SearchBlockData; blockId: string }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const locale = typeof document !== 'undefined'
    ? document.documentElement.lang || 'en'
    : 'en';

  const placeholder = data.placeholder?.[locale] || data.placeholder?.en || 'Search POIs, events, articles...';
  const types = (data.searchTypes ?? ['pois', 'events', 'articles']).join(',');
  const showSuggestions = data.showSuggestions !== false;
  const enableChatbot = data.enableChatbotFallback !== false;

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch results
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    fetch(`/api/v1/search?q=${encodeURIComponent(debouncedQuery)}&types=${types}&lang=${locale}&limit=10`, {
      signal: controller.signal,
      headers: { 'X-Destination-ID': typeof window !== 'undefined' ? (window as any).__HB_DESTINATION_ID__ || '' : '' },
    })
      .then(r => r.json())
      .then((json: SearchResponse) => {
        setResults(json);
        setIsLoading(false);
        setActiveIndex(-1);
        // Analytics
        if (typeof window !== 'undefined' && (window as any).sa_event) {
          (window as any).sa_event('search_used', { query: debouncedQuery, total: json.total });
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') setIsLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery, types, locale]);

  // Load recent searches on focus
  const handleFocus = useCallback(() => {
    if (data.showRecentSearches !== false) {
      setRecentSearches(getRecentSearches());
    }
    setShowDropdown(true);
  }, [data.showRecentSearches]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = results?.merged || [];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && items[activeIndex]) {
      e.preventDefault();
      navigateToResult(items[activeIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  const navigateToResult = (item: SearchResult) => {
    saveRecentSearch(query);
    if (item.result_type === 'poi') {
      window.location.href = `/poi/${item.id}`;
    } else if (item.result_type === 'event') {
      window.location.href = `/event/${item.id}`;
    } else if (item.result_type === 'article') {
      window.location.href = `/blog/${item.id}`;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      saveRecentSearch(query);
      if (data.resultPageHref) {
        window.location.href = `${data.resultPageHref}?q=${encodeURIComponent(query)}`;
      }
    }
  };

  const openChatbot = () => {
    // Dispatch custom event to open chatbot (from VII-B command v7.1)
    window.dispatchEvent(new CustomEvent('hb:chatbot:open', {
      detail: { prompt: query },
    }));
  };

  const variantClasses = {
    header: 'max-w-xl mx-auto',
    hero: 'max-w-2xl mx-auto',
    inline: 'w-full',
  };

  return (
    <>
      {/* Schema.org WebSite + SearchAction */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            url: typeof window !== 'undefined' ? window.location.origin : '',
            potentialAction: {
              '@type': 'SearchAction',
              target: `${typeof window !== 'undefined' ? window.location.origin : ''}/search?q={search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          }),
        }}
      />

      <section
        className={`@container search-block ${variantClasses[data.variant || 'inline']}`}
        role="search"
        aria-label="Site search"
      >
        <form onSubmit={handleSubmit} className="relative">
          <label htmlFor={`search-input-${blockId}`} className="sr-only">
            {placeholder}
          </label>

          <div className="relative">
            {/* Search icon */}
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--hb-text-muted,#94a3b8)] pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>

            <input
              ref={inputRef}
              id={`search-input-${blockId}`}
              type="search"
              value={query}
              onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              autoComplete="off"
              aria-busy={isLoading}
              aria-controls={`search-results-${blockId}`}
              aria-expanded={showDropdown && (!!results || recentSearches.length > 0)}
              aria-haspopup="listbox"
              aria-activedescendant={activeIndex >= 0 ? `search-item-${blockId}-${activeIndex}` : undefined}
              className="w-full min-h-[48px] pl-10 pr-4 py-3 border-2 border-[var(--hb-input-border,#e2e8f0)] rounded-xl text-base
                         bg-[var(--hb-bg-surface,#fff)] text-[var(--hb-text-primary,#1e293b)]
                         placeholder:text-[var(--hb-text-muted,#94a3b8)]
                         focus:outline-none focus:ring-2 focus:ring-[var(--hb-color-primary,#3b82f6)] focus:border-transparent
                         transition-shadow duration-200"
            />

            {/* Loading spinner */}
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
                <div className="w-5 h-5 border-2 border-[var(--hb-color-primary,#3b82f6)] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Dropdown */}
          {showDropdown && showSuggestions && (
            <div
              ref={dropdownRef}
              id={`search-results-${blockId}`}
              role="listbox"
              aria-label="Search results"
              className="absolute z-50 w-full mt-2 bg-[var(--hb-bg-elevated,#fff)] rounded-xl shadow-lg
                         border border-[var(--hb-border-default,#e2e8f0)]
                         max-h-[60vh] overflow-y-auto"
            >
              {/* Recent searches (when no query) */}
              {query.length < 2 && recentSearches.length > 0 && (
                <div className="p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--hb-text-muted,#94a3b8)] mb-2">
                    Recent
                  </p>
                  {recentSearches.map((recent, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setQuery(recent); setShowDropdown(true); }}
                      className="block w-full text-left px-3 py-2 text-sm rounded-lg
                                 hover:bg-[var(--hb-bg-muted,#f1f5f9)] transition-colors
                                 text-[var(--hb-text-primary,#1e293b)]"
                    >
                      {recent}
                    </button>
                  ))}
                </div>
              )}

              {/* Results */}
              {results && results.merged.length > 0 && (
                <div className="p-2">
                  {results.merged.map((item, i) => (
                    <button
                      key={`${item.result_type}-${item.id}`}
                      id={`search-item-${blockId}-${i}`}
                      role="option"
                      aria-selected={i === activeIndex}
                      type="button"
                      onClick={() => navigateToResult(item)}
                      className={`flex items-start w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer
                        ${i === activeIndex
                          ? 'bg-[var(--hb-color-primary,#3b82f6)]/10'
                          : 'hover:bg-[var(--hb-bg-muted,#f1f5f9)]'
                        }`}
                    >
                      <ResultIcon type={item.result_type} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-[var(--hb-text-primary,#1e293b)] truncate">
                            {item.name || item.title || ''}
                          </span>
                          <ResultTypeLabel type={item.result_type} />
                        </div>
                        {(item.tile_description || item.description || item.snippet) && (
                          <p className="text-xs text-[var(--hb-text-muted,#64748b)] mt-0.5 line-clamp-1">
                            {item.tile_description || item.description || item.snippet}
                          </p>
                        )}
                        {item.result_type === 'poi' && item.rating && (
                          <span className="text-xs text-[var(--hb-text-muted,#94a3b8)]">
                            {'★'.repeat(Math.round(item.rating))} {item.rating.toFixed(1)}
                          </span>
                        )}
                        {item.result_type === 'event' && item.date && (
                          <span className="text-xs text-[var(--hb-text-muted,#94a3b8)]">
                            {new Date(item.date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* No results + chatbot fallback */}
              {results && results.total === 0 && debouncedQuery.length >= 2 && (
                <div className="p-4 text-center">
                  <p className="text-sm text-[var(--hb-text-muted,#64748b)] mb-3">
                    {results.suggested_chatbot_prompt || `No results for "${debouncedQuery}"`}
                  </p>
                  {enableChatbot && (
                    <button
                      type="button"
                      onClick={openChatbot}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                                 bg-[var(--hb-color-primary,#3b82f6)] text-white
                                 hover:opacity-90 transition-opacity min-h-[44px]"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Ask chatbot
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </form>
      </section>
    </>
  );
}
