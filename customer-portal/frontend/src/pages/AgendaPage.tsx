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
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AgendaCard,
  FilterPanel,
  useAgendaStore,
  agendaService,
} from '@/features/agenda';
import type { AgendaEvent } from '@/features/agenda';

/**
 * AgendaPage - Events & Activities Calendar (Advanced Version)
 *
 * Route: /agenda
 * Layout: RootLayout
 * Auth: Public
 *
 * Features:
 * - Featured events section
 * - Advanced filtering with FilterPanel
 * - Grid/List view toggle
 * - Pagination
 * - Search functionality
 * - Integration with Agenda Module API
 */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function AgendaPage() {
  const { t, language } = useLanguage();
  const [searchInput, setSearchInput] = useState('');

  const {
    filters,
    viewMode,
    mobileFilterOpen,
    setSearch,
    setPage,
    setViewMode,
    toggleMobileFilter,
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
    staleTime: 60000, // 1 minute
  });

  // Fetch featured events
  const { data: featuredData } = useQuery({
    queryKey: ['agenda-featured'],
    queryFn: () => agendaService.getFeaturedEvents(6),
    staleTime: 300000, // 5 minutes
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

  // Handle event click (for future detail view)
  const handleEventClick = (event: AgendaEvent) => {
    console.log('Event clicked:', event._id);
    // TODO: Navigate to event detail page
  };

  // Check if we should show featured section
  const showFeatured = featuredEvents.length > 0 && !filters.search && activeFiltersCount === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section - White background (consistent with HB template) */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {t.agenda?.title || 'Agenda Calpe'}
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {t.agenda?.subtitle || 'Ontdek alle evenementen, festivals en activiteiten in Calpe en omgeving'}
          </p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Zoek evenementen..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-12 pr-10 py-3 bg-gray-100 border-2 border-transparent rounded-full focus:outline-none focus:bg-white focus:border-[#7FA594] transition-colors"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </form>

            {/* Mobile Filter Button */}
            <button
              onClick={toggleMobileFilter}
              className="sm:hidden flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-5 h-5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#7FA594] text-white text-xs font-medium">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* View Mode Toggle (Desktop) */}
            <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white shadow-sm text-[#7FA594]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                aria-label="Grid weergave"
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white shadow-sm text-[#7FA594]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                aria-label="Lijst weergave"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-sm text-gray-500">Actieve filters:</span>
              <button
                onClick={clearFilters}
                className="text-sm text-[#7FA594] hover:text-[#5E8B7E] font-medium flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Alles wissen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Filter Sidebar (Desktop) */}
          <div className="hidden lg:block w-72 flex-shrink-0">
            <FilterPanel open={true} isMobile={false} />
          </div>

          {/* Filter Drawer (Mobile) */}
          <FilterPanel
            open={mobileFilterOpen}
            onClose={toggleMobileFilter}
            isMobile={true}
          />

          {/* Events Content */}
          <div className="flex-1 min-w-0">
            {/* Featured Events */}
            <AnimatePresence>
              {showFeatured && (
                <motion.section
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-8"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <h2 className="text-xl font-semibold text-gray-900">
                      Uitgelichte Evenementen
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {featuredEvents.slice(0, 3).map((event) => (
                      <AgendaCard
                        key={event._id}
                        event={event}
                        variant="grid"
                        onClick={() => handleEventClick(event)}
                      />
                    ))}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Loading State */}
            {eventsLoading && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-10 h-10 text-[#7FA594] animate-spin mb-4" />
                <p className="text-gray-600">Evenementen laden...</p>
              </div>
            )}

            {/* Error State */}
            {eventsError && !eventsLoading && (
              <div className="flex flex-col items-center justify-center py-16">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <p className="text-gray-600 mb-4">Er is iets misgegaan bij het laden van evenementen.</p>
                <button
                  onClick={() => refetchEvents()}
                  className="px-4 py-2 bg-[#7FA594] text-white rounded-lg hover:bg-[#5E8B7E] transition-colors"
                >
                  Opnieuw proberen
                </button>
              </div>
            )}

            {/* Empty State */}
            {!eventsLoading && !eventsError && events.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <Calendar className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Geen evenementen gevonden
                </h3>
                <p className="text-gray-500 text-center mb-4">
                  Probeer andere zoektermen of pas je filters aan.
                </p>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Filters wissen
                  </button>
                )}
              </div>
            )}

            {/* Events List/Grid */}
            {!eventsLoading && !eventsError && events.length > 0 && (
              <>
                {/* Results Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {showFeatured ? 'Alle Evenementen' : 'Evenementen'}{' '}
                    <span className="text-gray-500 font-normal">({pagination.total})</span>
                  </h2>
                </div>

                {/* Grid View */}
                {viewMode === 'grid' && (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                  >
                    {events.map((event) => (
                      <motion.div key={event._id} variants={itemVariants}>
                        <AgendaCard
                          event={event}
                          variant="grid"
                          onClick={() => handleEventClick(event)}
                        />
                      </motion.div>
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
                    {events.map((event) => (
                      <motion.div key={event._id} variants={itemVariants}>
                        <AgendaCard
                          event={event}
                          variant="list"
                          onClick={() => handleEventClick(event)}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      aria-label="Vorige pagina"
                    >
                      <ChevronLeft className="w-5 h-5" />
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
                            className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                              pagination.page === pageNum
                                ? 'bg-[#7FA594] text-white'
                                : 'hover:bg-gray-100 text-gray-700'
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
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      aria-label="Volgende pagina"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Newsletter CTA */}
      <section className="bg-gradient-to-r from-[#5E8B7E] to-[#7FA594] text-white py-12 mt-8">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Mis geen enkel evenement!
          </h2>
          <p className="text-white/90 mb-6">
            Meld je aan voor onze nieuwsbrief en ontvang wekelijks de beste evenementen in Calpe.
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={(e) => { e.preventDefault(); alert('Bedankt voor je aanmelding!'); }}>
            <input
              type="email"
              placeholder="Je e-mailadres"
              required
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-white text-[#5E8B7E] font-semibold rounded-lg hover:bg-gray-100 transition-colors"
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
