import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Grid3X3, List, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  AgendaCard,
  useAgendaStore,
  agendaService,
} from '@/features/agenda';
import type { AgendaEvent } from '@/features/agenda';

/**
 * AgendaPage - Events & Activities Calendar
 * Route: /agenda
 * Layout: Clean grid layout matching POIGridPage
 */

export function AgendaPage() {
  const { t } = useLanguage();
  const [searchInput, setSearchInput] = useState('');

  const {
    filters,
    viewMode,
    setSearch,
    setPage,
    setViewMode,
    getQueryParams,
    getActiveFiltersCount,
    clearFilters,
  } = useAgendaStore();

  // Sync search input with store
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  // Fetch events
  const {
    data: eventsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['agenda-events', filters],
    queryFn: () => agendaService.getEvents(getQueryParams()),
    staleTime: 60000,
  });

  const events = eventsData?.data || [];
  const pagination = eventsData?.pagination || { page: 1, pages: 1, total: 0 };
  const activeFiltersCount = getActiveFiltersCount();

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  // Handle search clear
  const handleSearchClear = () => {
    setSearchInput('');
    setSearch('');
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle event click
  const handleEventClick = (event: AgendaEvent) => {
    if (event.url) {
      window.open(event.url, '_blank');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Header - same style as POIGridPage */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-text-primary mb-2">
          {t.agenda?.title || 'Calpe Agenda'}
        </h2>
        <p className="text-text-secondary">
          {t.agenda?.subtitle || 'Discover all events, festivals and activities in Calpe'}
        </p>
      </div>

      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Zoek evenementen..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-border-light rounded-button text-sm focus:outline-none focus:border-holibot-accent focus:ring-1 focus:ring-holibot-accent transition-colors"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleSearchClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-border-light transition-colors"
            >
              <X className="w-4 h-4 text-text-tertiary" />
            </button>
          )}
        </form>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-white border border-border-light rounded-button p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'grid'
                ? 'bg-holibot-accent/10 text-holibot-accent'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
            aria-label="Grid weergave"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'list'
                ? 'bg-holibot-accent/10 text-holibot-accent'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
            aria-label="Lijst weergave"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-text-tertiary">Filters actief:</span>
          <button
            onClick={clearFilters}
            className="text-sm text-holibot-accent hover:text-holibot-accent/80 font-medium flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Wissen
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-holibot-accent animate-spin" />
          <span className="ml-3 text-text-secondary">Evenementen laden...</span>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-card p-6 text-center">
          <p className="text-red-800 font-medium">Er ging iets mis bij het laden</p>
          <button
            onClick={() => refetch()}
            className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-button text-sm font-medium hover:bg-red-200 transition-colors"
          >
            Opnieuw proberen
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && events.length === 0 && (
        <div className="bg-bg-gray border border-border-light rounded-card p-12 text-center">
          <p className="text-text-secondary text-lg">Geen evenementen gevonden</p>
          <p className="text-text-tertiary text-sm mt-2">
            Probeer andere zoektermen of pas filters aan
          </p>
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 border border-border-light rounded-button text-sm hover:bg-bg-hover transition-colors"
            >
              Filters wissen
            </button>
          )}
        </div>
      )}

      {/* Events Grid/List */}
      {!isLoading && !error && events.length > 0 && (
        <div className="space-y-4">
          {/* Results Count */}
          <div className="text-text-secondary text-sm">
            {pagination.total} {pagination.total === 1 ? 'evenement' : 'evenementen'} gevonden
          </div>

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event, index) => (
                <AgendaCard
                  key={event._id}
                  event={event}
                  variant="grid"
                  onClick={() => handleEventClick(event)}
                  index={index}
                />
              ))}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="space-y-3">
              {events.map((event, index) => (
                <AgendaCard
                  key={event._id}
                  event={event}
                  variant="list"
                  onClick={() => handleEventClick(event)}
                  index={index}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 rounded-button border border-border-light hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Vorige"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  let pageNum: number;
                  if (pagination.pages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.pages - 2) {
                    pageNum = pagination.pages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-8 h-8 rounded-button text-sm font-medium transition-colors ${
                        pagination.page === pageNum
                          ? 'bg-holibot-accent text-white'
                          : 'hover:bg-bg-hover text-text-secondary'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="p-2 rounded-button border border-border-light hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Volgende"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AgendaPage;
