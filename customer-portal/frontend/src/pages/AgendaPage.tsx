import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Grid3X3,
  List,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Calendar,
  Star,
  CalendarDays,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AgendaCard,
  useAgendaStore,
  agendaService,
} from '@/features/agenda';
import type { AgendaEvent } from '@/features/agenda';

/**
 * AgendaPage - Events & Activities Calendar
 *
 * Route: /agenda
 * Layout: Clean grid layout matching HolidaiButler design system
 * Auth: Public
 */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export function AgendaPage() {
  const { t, language } = useLanguage();
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
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ['agenda-events', filters],
    queryFn: () => agendaService.getEvents(getQueryParams()),
    staleTime: 60000,
  });

  // Fetch featured events
  const { data: featuredData } = useQuery({
    queryKey: ['agenda-featured'],
    queryFn: () => agendaService.getFeaturedEvents(6),
    staleTime: 300000,
  });

  const events = eventsData?.data || [];
  const pagination = eventsData?.pagination || { page: 1, pages: 1, total: 0 };
  const featuredEvents = featuredData?.data || [];
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

  // Show featured section
  const showFeatured = featuredEvents.length > 0 && !filters.search && activeFiltersCount === 0;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero Section */}
      <div className="bg-white border-b border-border-light">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <CalendarDays className="w-8 h-8 text-holibot-accent" />
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
              {t.agenda?.title || 'Agenda Calpe'}
            </h1>
          </div>
          <p className="text-text-secondary max-w-2xl">
            {t.agenda?.subtitle || 'Ontdek alle evenementen, festivals en activiteiten in Calpe en omgeving'}
          </p>
        </div>
      </div>

      {/* Search and Controls Bar */}
      <div className="bg-white border-b border-border-light sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
              <input
                type="text"
                placeholder="Zoek evenementen..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-bg-gray border border-border-light rounded-button text-sm focus:outline-none focus:border-holibot-accent focus:ring-1 focus:ring-holibot-accent transition-colors"
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
            <div className="flex items-center gap-1 bg-bg-gray rounded-button p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white shadow-sm text-holibot-accent'
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
                    ? 'bg-white shadow-sm text-holibot-accent'
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
            <div className="flex items-center gap-2 mt-2">
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
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Featured Events Section */}
        <AnimatePresence>
          {showFeatured && featuredEvents.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8"
            >
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-rating-gold fill-rating-gold" />
                <h2 className="text-lg font-semibold text-text-primary">
                  Uitgelichte Evenementen
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredEvents.slice(0, 3).map((event, index) => (
                  <AgendaCard
                    key={event._id}
                    event={event}
                    variant="grid"
                    onClick={() => handleEventClick(event)}
                    index={index}
                  />
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {eventsLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-holibot-accent animate-spin mb-3" />
            <p className="text-text-secondary text-sm">Evenementen laden...</p>
          </div>
        )}

        {/* Error State */}
        {eventsError && !eventsLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="w-10 h-10 text-error mb-3" />
            <p className="text-text-secondary mb-4">Er ging iets mis bij het laden.</p>
            <button
              onClick={() => refetchEvents()}
              className="px-4 py-2 bg-holibot-accent text-white rounded-button text-sm font-medium hover:bg-holibot-accent/90 transition-colors"
            >
              Opnieuw proberen
            </button>
          </div>
        )}

        {/* Empty State */}
        {!eventsLoading && !eventsError && events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <Calendar className="w-12 h-12 text-text-tertiary mb-3" />
            <h3 className="text-base font-medium text-text-primary mb-1">
              Geen evenementen gevonden
            </h3>
            <p className="text-text-secondary text-sm text-center mb-4">
              Probeer andere zoektermen of pas filters aan.
            </p>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-border-light rounded-button text-sm hover:bg-bg-hover transition-colors"
              >
                Filters wissen
              </button>
            )}
          </div>
        )}

        {/* Events Grid/List */}
        {!eventsLoading && !eventsError && events.length > 0 && (
          <>
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">
                {showFeatured ? 'Alle Evenementen' : 'Evenementen'}
                <span className="text-text-tertiary font-normal ml-2">({pagination.total})</span>
              </h2>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {events.map((event, index) => (
                  <AgendaCard
                    key={event._id}
                    event={event}
                    variant="grid"
                    onClick={() => handleEventClick(event)}
                    index={index}
                  />
                ))}
              </motion.div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {events.map((event, index) => (
                  <AgendaCard
                    key={event._id}
                    event={event}
                    variant="list"
                    onClick={() => handleEventClick(event)}
                    index={index}
                  />
                ))}
              </motion.div>
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
          </>
        )}
      </div>

      {/* Newsletter CTA */}
      <section className="bg-gradient-to-r from-holibot-accent/90 to-holibot-accent text-white py-10 mt-8">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-xl md:text-2xl font-bold mb-3">
            Mis geen enkel evenement!
          </h2>
          <p className="text-white/90 text-sm mb-5">
            Meld je aan voor onze nieuwsbrief en ontvang de beste evenementen in Calpe.
          </p>
          <form className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto" onSubmit={(e) => { e.preventDefault(); alert('Bedankt voor je aanmelding!'); }}>
            <input
              type="email"
              placeholder="Je e-mailadres"
              required
              className="flex-1 px-4 py-2.5 rounded-button text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-white text-sm"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-white text-holibot-accent font-semibold rounded-button hover:bg-white/90 transition-colors text-sm"
            >
              Aanmelden
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default AgendaPage;
