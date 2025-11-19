import React, { useState } from 'react';
import {
  Box,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  IconButton,
  Drawer,
  Typography,
  Slider,
  useTheme,
  useMediaQuery,
  Collapse,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

/**
 * Enhanced Filter Bar Component
 * Implements Miller's Law (5-7 items), Proximity Principle, and Progressive Disclosure
 */
const EnhancedFilterBar = ({
  filters,
  onFilterChange,
  onClearAll,
  resultCount = 0,
  categories = [],
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Default categories if none provided
  const defaultCategories = [
    { value: 'nature', label: t('filters.categories.nature', 'Natuur & Outdoor') },
    { value: 'culture', label: t('filters.categories.culture', 'Cultuur & Geschiedenis') },
    { value: 'family', label: t('filters.categories.family', 'Familie & Kinderen') },
    { value: 'food', label: t('filters.categories.food', 'Eten & Drinken') },
    { value: 'sports', label: t('filters.categories.sports', 'Sport & Avontuur') },
  ];

  const categoryOptions = categories.length > 0 ? categories : defaultCategories;

  const handleFilterChange = (filterName, value) => {
    onFilterChange(filterName, value);
  };

  const handleClearFilter = (filterName) => {
    onFilterChange(filterName, filterName === 'categories' ? [] : null);
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value === null || value === undefined) return false;
    if (key === 'priceRange') return value[0] !== 0 || value[1] !== 100;
    return true;
  }).length;

  const FilterContent = () => (
    <Box>
      {/* Primary Filters - Always Visible (Miller's Law: max 5-7) */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="subtitle2"
          sx={{ mb: 1.5, fontWeight: 600, color: 'text.secondary' }}
        >
          {t('filters.quickFilters', 'Snelle Filters')}
        </Typography>
        <Grid container spacing={2}>
          {/* Category Filter */}
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="category-filter-label">
                {t('filters.category', 'Categorie')}
              </InputLabel>
              <Select
                labelId="category-filter-label"
                id="category-filter"
                multiple
                value={filters.categories || []}
                onChange={(e) => handleFilterChange('categories', e.target.value)}
                label={t('filters.category', 'Categorie')}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const cat = categoryOptions.find(c => c.value === value);
                      return (
                        <Chip
                          key={value}
                          label={cat?.label || value}
                          size="small"
                          sx={{ height: 24 }}
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {categoryOptions.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Date Filter - Simplified */}
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="date-filter-label">
                {t('filters.when', 'Wanneer')}
              </InputLabel>
              <Select
                labelId="date-filter-label"
                id="date-filter"
                value={filters.dateFilter || ''}
                onChange={(e) => handleFilterChange('dateFilter', e.target.value)}
                label={t('filters.when', 'Wanneer')}
              >
                <MenuItem value="">{t('filters.anytime', 'Alle data')}</MenuItem>
                <MenuItem value="today">{t('filters.today', 'Vandaag')}</MenuItem>
                <MenuItem value="tomorrow">{t('filters.tomorrow', 'Morgen')}</MenuItem>
                <MenuItem value="thisWeek">{t('filters.thisWeek', 'Deze week')}</MenuItem>
                <MenuItem value="thisWeekend">{t('filters.thisWeekend', 'Dit weekend')}</MenuItem>
                <MenuItem value="nextWeek">{t('filters.nextWeek', 'Volgende week')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Price Filter */}
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="price-filter-label">
                {t('filters.priceRange', 'Prijs')}
              </InputLabel>
              <Select
                labelId="price-filter-label"
                id="price-filter"
                value={filters.priceFilter || ''}
                onChange={(e) => handleFilterChange('priceFilter', e.target.value)}
                label={t('filters.priceRange', 'Prijs')}
              >
                <MenuItem value="">{t('filters.anyPrice', 'Alle prijzen')}</MenuItem>
                <MenuItem value="0-20">{t('filters.under20', 'Onder €20')}</MenuItem>
                <MenuItem value="20-50">€20 - €50</MenuItem>
                <MenuItem value="50-100">€50 - €100</MenuItem>
                <MenuItem value="100+">{t('filters.over100', 'Boven €100')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Advanced Filters Toggle - Progressive Disclosure */}
      <Box sx={{ mb: 2 }}>
        <Button
          size="small"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          endIcon={advancedOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{ textTransform: 'none' }}
        >
          {t('filters.moreFilters', 'Meer filters')}
          {activeFilterCount > 3 && (
            <Chip
              label={`+${activeFilterCount - 3}`}
              size="small"
              sx={{ ml: 1, height: 20 }}
              color="primary"
            />
          )}
        </Button>
      </Box>

      {/* Advanced Filters - Progressive Disclosure */}
      <Collapse in={advancedOpen}>
        <Box sx={{ pl: 2, borderLeft: 2, borderColor: 'divider' }}>
          <Typography
            variant="subtitle2"
            sx={{ mb: 1.5, fontWeight: 600, color: 'text.secondary' }}
          >
            {t('filters.advancedFilters', 'Geavanceerde Filters')}
          </Typography>
          <Grid container spacing={2}>
            {/* Duration Filter */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="duration-filter-label">
                  {t('filters.duration', 'Duur')}
                </InputLabel>
                <Select
                  labelId="duration-filter-label"
                  value={filters.duration || ''}
                  onChange={(e) => handleFilterChange('duration', e.target.value)}
                  label={t('filters.duration', 'Duur')}
                >
                  <MenuItem value="">{t('filters.anyDuration', 'Alle duren')}</MenuItem>
                  <MenuItem value="0-2">{t('filters.under2h', 'Onder 2 uur')}</MenuItem>
                  <MenuItem value="2-4">2-4 {t('common.hours', 'uur')}</MenuItem>
                  <MenuItem value="4-8">4-8 {t('common.hours', 'uur')}</MenuItem>
                  <MenuItem value="8+">{t('filters.fullDay', 'Hele dag (8+ uur)')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Age Suitability */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="age-filter-label">
                  {t('filters.ageGroup', 'Leeftijdsgroep')}
                </InputLabel>
                <Select
                  labelId="age-filter-label"
                  value={filters.ageGroup || ''}
                  onChange={(e) => handleFilterChange('ageGroup', e.target.value)}
                  label={t('filters.ageGroup', 'Leeftijdsgroep')}
                >
                  <MenuItem value="">{t('filters.allAges', 'Alle leeftijden')}</MenuItem>
                  <MenuItem value="kids">{t('filters.kids', 'Kinderen (0-12)')}</MenuItem>
                  <MenuItem value="teens">{t('filters.teens', 'Tieners (13-17)')}</MenuItem>
                  <MenuItem value="adults">{t('filters.adults', 'Volwassenen (18+)')}</MenuItem>
                  <MenuItem value="seniors">{t('filters.seniors', 'Senioren (65+)')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Location */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="location-filter-label">
                  {t('filters.location', 'Locatie')}
                </InputLabel>
                <Select
                  labelId="location-filter-label"
                  value={filters.location || ''}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  label={t('filters.location', 'Locatie')}
                >
                  <MenuItem value="">{t('filters.allLocations', 'Alle locaties')}</MenuItem>
                  <MenuItem value="calpe">Calpe</MenuItem>
                  <MenuItem value="altea">Altea</MenuItem>
                  <MenuItem value="benidorm">Benidorm</MenuItem>
                  <MenuItem value="denia">Dénia</MenuItem>
                  <MenuItem value="javea">Jávea</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Accessibility */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="accessibility-filter-label">
                  {t('filters.accessibility', 'Toegankelijkheid')}
                </InputLabel>
                <Select
                  labelId="accessibility-filter-label"
                  value={filters.accessibility || ''}
                  onChange={(e) => handleFilterChange('accessibility', e.target.value)}
                  label={t('filters.accessibility', 'Toegankelijkheid')}
                >
                  <MenuItem value="">{t('filters.allAccessibility', 'Geen voorkeur')}</MenuItem>
                  <MenuItem value="wheelchair">{t('filters.wheelchairAccessible', 'Rolstoel toegankelijk')}</MenuItem>
                  <MenuItem value="strollerFriendly">{t('filters.strollerFriendly', 'Buggy vriendelijk')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Language */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="language-filter-label">
                  {t('filters.guideLanguage', 'Gids taal')}
                </InputLabel>
                <Select
                  labelId="language-filter-label"
                  value={filters.guideLanguage || ''}
                  onChange={(e) => handleFilterChange('guideLanguage', e.target.value)}
                  label={t('filters.guideLanguage', 'Gids taal')}
                >
                  <MenuItem value="">{t('filters.anyLanguage', 'Alle talen')}</MenuItem>
                  <MenuItem value="nl">Nederlands</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="de">Deutsch</MenuItem>
                  <MenuItem value="fr">Français</MenuItem>
                  <MenuItem value="es">Español</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      </Collapse>

      {/* Active Filters Chips - Proximity Principle */}
      {activeFilterCount > 0 && (
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', mr: 1 }}>
              {t('filters.activeFilters', 'Actieve filters')} ({activeFilterCount}):
            </Typography>
            <Button
              size="small"
              onClick={onClearAll}
              sx={{ textTransform: 'none', minWidth: 'auto', p: 0.5 }}
            >
              {t('filters.clearAll', 'Alles wissen')}
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {filters.categories?.map((cat) => {
              const category = categoryOptions.find(c => c.value === cat);
              return (
                <Chip
                  key={cat}
                  label={category?.label || cat}
                  onDelete={() => {
                    const newCategories = filters.categories.filter(c => c !== cat);
                    handleFilterChange('categories', newCategories);
                  }}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              );
            })}
            {filters.dateFilter && (
              <Chip
                label={t(`filters.${filters.dateFilter}`, filters.dateFilter)}
                onDelete={() => handleClearFilter('dateFilter')}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {filters.priceFilter && (
              <Chip
                label={`€ ${filters.priceFilter}`}
                onDelete={() => handleClearFilter('priceFilter')}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {filters.duration && (
              <Chip
                label={t(`filters.duration_${filters.duration}`, filters.duration)}
                onDelete={() => handleClearFilter('duration')}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {filters.ageGroup && (
              <Chip
                label={t(`filters.${filters.ageGroup}`, filters.ageGroup)}
                onDelete={() => handleClearFilter('ageGroup')}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {filters.location && (
              <Chip
                label={filters.location}
                onDelete={() => handleClearFilter('location')}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {filters.accessibility && (
              <Chip
                label={t(`filters.${filters.accessibility}`, filters.accessibility)}
                onDelete={() => handleClearFilter('accessibility')}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {filters.guideLanguage && (
              <Chip
                label={filters.guideLanguage.toUpperCase()}
                onDelete={() => handleClearFilter('guideLanguage')}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      )}

      {/* Result Count */}
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {t('filters.showingResults', {
            count: resultCount,
            defaultValue: `${resultCount} resultaten gevonden`,
          })}
        </Typography>
      </Box>
    </Box>
  );

  // Mobile: Drawer Layout
  if (isMobile) {
    return (
      <>
        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setMobileDrawerOpen(true)}
            fullWidth
            sx={{
              justifyContent: 'space-between',
              textTransform: 'none',
              height: 48, // Fitts' Law: 48px touch target
            }}
          >
            <span>{t('filters.filters', 'Filters')}</span>
            {activeFilterCount > 0 && (
              <Chip
                label={activeFilterCount}
                size="small"
                color="primary"
                sx={{ ml: 1 }}
              />
            )}
          </Button>
        </Box>

        <Drawer
          anchor="bottom"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          PaperProps={{
            sx: {
              maxHeight: '90vh',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
            }
          }}
        >
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {t('filters.filters', 'Filters')}
              </Typography>
              <IconButton
                onClick={() => setMobileDrawerOpen(false)}
                aria-label={t('common.close', 'Sluiten')}
                sx={{ width: 48, height: 48 }} // Fitts' Law
              >
                <CloseIcon />
              </IconButton>
            </Box>
            <FilterContent />
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  onClearAll();
                  setMobileDrawerOpen(false);
                }}
                fullWidth
                sx={{ height: 48 }}
              >
                {t('filters.clear', 'Wissen')}
              </Button>
              <Button
                variant="contained"
                onClick={() => setMobileDrawerOpen(false)}
                fullWidth
                sx={{ height: 48 }}
              >
                {t('filters.apply', 'Toon resultaten')}
              </Button>
            </Box>
          </Box>
        </Drawer>
      </>
    );
  }

  // Desktop: Paper Layout
  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <FilterContent />
    </Paper>
  );
};

export default EnhancedFilterBar;
