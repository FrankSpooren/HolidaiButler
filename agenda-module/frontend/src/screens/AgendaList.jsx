import { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  CircularProgress,
  Pagination,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  useMediaQuery,
  useTheme,
  Paper,
} from '@mui/material';
import {
  Search,
  FilterList,
  ViewModule,
  ViewList,
  Clear,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { toast } from 'react-toastify';

import useAgendaStore from '../utils/agendaStore';
import agendaAPI from '../services/agendaService';
import AgendaCard from '../components/AgendaCard';
import FilterPanel from '../components/FilterPanel';

/**
 * AgendaList Screen
 * Main events listing page with filtering and search
 * Mobile-first responsive design
 */

function AgendaList() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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

  const [searchInput, setSearchInput] = useState(filters.search);

  // Fetch events
  const { data, isLoading, error, refetch } = useQuery(
    ['events', filters],
    () => agendaAPI.getEvents(getQueryParams()),
    {
      keepPreviousData: true,
      staleTime: 60000, // 1 minute
      onError: (err) => {
        toast.error(t('common.error'));
        console.error('Error fetching events:', err);
      },
    }
  );

  // Fetch featured events
  const { data: featuredData } = useQuery(
    ['featured-events'],
    () => agendaAPI.getFeaturedEvents(6),
    {
      staleTime: 300000, // 5 minutes
    }
  );

  const events = data?.data || [];
  const pagination = data?.pagination || {};
  const featuredEvents = featuredData?.data || [];
  const activeFiltersCount = getActiveFiltersCount();

  // Handle search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  // Handle search clear
  const handleSearchClear = () => {
    setSearchInput('');
    setSearch('');
  };

  // Handle page change
  const handlePageChange = (event, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle view mode change
  const handleViewModeChange = (event, newMode) => {
    if (newMode) {
      setViewMode(newMode);
    }
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 2, md: 4 } }} component="main">
      <Container maxWidth="xl">
        {/* Skip to main content link for keyboard users */}
        <a
          href="#main-content"
          style={{
            position: 'absolute',
            left: '-9999px',
            zIndex: 999,
            padding: '1em',
            backgroundColor: theme.palette.primary.main,
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
          }}
          onFocus={(e) => {
            e.target.style.left = '1em';
            e.target.style.top = '1em';
          }}
          onBlur={(e) => {
            e.target.style.left = '-9999px';
          }}
        >
          {t('accessibility.skipToMainContent')}
        </a>

        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            sx={{
              fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
              fontWeight: 600,
            }}
          >
            {t('agenda.title')}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
          >
            {t('agenda.subtitle')}
          </Typography>
        </Box>

        {/* Featured Events */}
        {featuredEvents.length > 0 && !filters.search && activeFiltersCount === 0 && (
          <Box sx={{ mb: 4 }} component="section" aria-labelledby="featured-events-heading">
            <Typography
              variant="h5"
              gutterBottom
              sx={{ mb: 2, fontWeight: 500 }}
              id="featured-events-heading"
              component="h2"
            >
              {t('agenda.featuredEvents')}
            </Typography>
            <Grid container spacing={2}>
              {featuredEvents.slice(0, isMobile ? 2 : 6).map((event) => (
                <Grid item xs={12} sm={6} md={4} key={event._id}>
                  <AgendaCard event={event} variant="grid" />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Search and Filters Bar */}
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
            }}
          >
            {/* Search */}
            <Box
              component="form"
              onSubmit={handleSearchSubmit}
              sx={{ flex: 1, display: 'flex', gap: 1 }}
              role="search"
            >
              <TextField
                fullWidth
                placeholder={t('common.search')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                inputProps={{
                  'aria-label': t('agenda.searchEvents'),
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search aria-hidden="true" />
                    </InputAdornment>
                  ),
                  endAdornment: searchInput && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={handleSearchClear}
                        aria-label={t('common.clearSearch')}
                      >
                        <Clear />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Mobile Filter Button */}
            {isMobile && (
              <Button
                variant="outlined"
                startIcon={<FilterList aria-hidden="true" />}
                onClick={toggleMobileFilter}
                fullWidth
                aria-label={t('filters.openFilters')}
                aria-expanded={mobileFilterOpen}
              >
                {t('filters.title')}
                {activeFiltersCount > 0 && (
                  <Chip
                    label={activeFiltersCount}
                    size="small"
                    color="primary"
                    sx={{ ml: 1, minWidth: 24, height: 24 }}
                    aria-label={`${activeFiltersCount} ${t('filters.activeFilters')}`}
                  />
                )}
              </Button>
            )}

            {/* View Mode Toggle (Desktop) */}
            {!isMobile && (
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                size="small"
                aria-label={t('agenda.viewMode')}
              >
                <ToggleButton value="grid" aria-label={t('agenda.gridView')}>
                  <ViewModule />
                </ToggleButton>
                <ToggleButton value="list" aria-label={t('agenda.listView')}>
                  <ViewList />
                </ToggleButton>
              </ToggleButtonGroup>
            )}
          </Box>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">
                {t('filters.title')}:
              </Typography>
              <Button size="small" onClick={clearFilters} startIcon={<Clear />}>
                {t('common.clear')}
              </Button>
            </Box>
          )}
        </Paper>

        {/* Main Content */}
        <Grid container spacing={3}>
          {/* Filter Sidebar (Desktop) */}
          {!isMobile && (
            <Grid item md={3}>
              <FilterPanel open={true} isMobile={false} />
            </Grid>
          )}

          {/* Filter Drawer (Mobile) */}
          {isMobile && (
            <FilterPanel
              open={mobileFilterOpen}
              onClose={toggleMobileFilter}
              isMobile={true}
            />
          )}

          {/* Events List */}
          <Grid item xs={12} md={9} id="main-content">
            {/* Loading State */}
            {isLoading && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 400,
                }}
                role="status"
                aria-live="polite"
                aria-label={t('common.loading')}
              >
                <CircularProgress size={60} />
              </Box>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <Box sx={{ textAlign: 'center', py: 8 }} role="alert" aria-live="assertive">
                <Typography variant="h6" color="error" gutterBottom>
                  {t('common.error')}
                </Typography>
                <Button variant="contained" onClick={() => refetch()} sx={{ mt: 2 }}>
                  {t('common.retry')}
                </Button>
              </Box>
            )}

            {/* Empty State */}
            {!isLoading && !error && events.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 8 }} role="status" aria-live="polite">
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {t('agenda.noEvents')}
                </Typography>
                {activeFiltersCount > 0 && (
                  <Button variant="outlined" onClick={clearFilters} sx={{ mt: 2 }}>
                    {t('common.clear')} {t('filters.title')}
                  </Button>
                )}
              </Box>
            )}

            {/* Events Grid/List */}
            {!isLoading && !error && events.length > 0 && (
              <Box component="section" aria-labelledby="events-list-heading">
                {/* Screen reader announcement for results */}
                <div
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  style={{
                    position: 'absolute',
                    left: '-10000px',
                    width: '1px',
                    height: '1px',
                    overflow: 'hidden',
                  }}
                >
                  {t('agenda.resultsFound', { count: pagination.total || 0 })}
                </div>

                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ mb: 2 }}
                  id="events-list-heading"
                  component="h2"
                >
                  {t('agenda.upcomingEvents')} ({pagination.total || 0})
                </Typography>

                {viewMode === 'grid' ? (
                  <Grid container spacing={2}>
                    {events.map((event) => (
                      <Grid item xs={12} sm={6} md={4} key={event._id}>
                        <AgendaCard event={event} variant="grid" />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Box>
                    {events.map((event) => (
                      <AgendaCard key={event._id} event={event} variant="list" />
                    ))}
                  </Box>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      mt: 4,
                    }}
                    component="nav"
                    aria-label={t('common.pagination')}
                  >
                    <Pagination
                      count={pagination.pages}
                      page={pagination.page}
                      onChange={handlePageChange}
                      color="primary"
                      size={isMobile ? 'small' : 'medium'}
                      showFirstButton
                      showLastButton
                    />
                  </Box>
                )}
              </Box>
            )}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default AgendaList;
