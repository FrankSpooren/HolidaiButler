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
  Rating,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  MyLocation as LocationIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

/**
 * Enhanced Filter Bar Component
 * Implements Miller's Law (5-7 items), Proximity Principle, and Progressive Disclosure
 * WCAG 2.1 AA Compliant
 */
const EnhancedFilterBar = ({
  filters,
  onFilterChange,
  onClearAll,
  resultCount = 0,
  categories = [],
  onRequestLocation,
  userLocation = null,
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
    { value: 'beach', label: t('filters.categories.beach', 'Strand & Water') },
    { value: 'activities', label: t('filters.categories.activities', 'Activiteiten') },
  ];

  const categoryOptions = categories.length > 0 ? categories : defaultCategories;

  const locations = [
    { value: '', label: t('filters.allLocations', 'Alle locaties') },
    { value: 'calpe', label: 'Calpe' },
    { value: 'altea', label: 'Altea' },
    { value: 'benidorm', label: 'Benidorm' },
    { value: 'denia', label: 'Denia' },
    { value: 'javea', label: 'Javea' },
  ];

  const handleFilterChange = (filterName, value) => {
    onFilterChange(filterName, value);
  };

  const handleClearFilter = (filterName) => {
    onFilterChange(filterName, filterName === 'categories' ? [] : null);
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value === null || value === undefined || value === '') return false;
    if (key === 'distance' && value === 25) return false;
    if (key === 'minRating' && value === 0) return false;
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
                <MenuItem value="0-20">{t('filters.under20', 'Onder \u20AC20')}</MenuItem>
                <MenuItem value="20-50">{'\u20AC'}20 - {'\u20AC'}50</MenuItem>
                <MenuItem value="50-100">{'\u20AC'}50 - {'\u20AC'}100</MenuItem>
                <MenuItem value="100+">{t('filters.over100', 'Boven \u20AC100')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Location Filter */}
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="location-filter-label">
                {t('filters.location', 'Locatie')}
              </InputLabel>
              <Select
                labelId="location-filter-label"
                id="location-filter"
                value={filters.location || ''}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                label={t('filters.location', 'Locatie')}
              >
                {locations.map((loc) => (
                  <MenuItem key={loc.value} value={loc.value}>
                    {loc.label}
                  </MenuItem>
                ))}
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
          aria-expanded={advancedOpen}
          aria-controls="advanced-filters"
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
      <Collapse in={advancedOpen} id="advanced-filters">
        <Box sx={{ pl: 2, borderLeft: 2, borderColor: 'divider' }}>
          <Typography
            variant="subtitle2"
            sx={{ mb: 1.5, fontWeight: 600, color: 'text.secondary' }}
          >
            {t('filters.advancedFilters', 'Geavanceerde Filters')}
          </Typography>
          <Grid container spacing={2}>
            {/* Distance Filter */}
            <Grid item xs={12} sm={6}>
              <Box sx={{ px: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('filters.distance', 'Afstand')}: {filters.distance || 25} km
                  </Typography>
                  {onRequestLocation && (
                    <Button
                      size="small"
                      startIcon={<LocationIcon />}
                      onClick={onRequestLocation}
                      sx={{ textTransform: 'none' }}
                    >
                      {userLocation
                        ? t('filters.locationActive', 'Locatie actief')
                        : t('filters.useMyLocation', 'Gebruik mijn locatie')
                      }
                    </Button>
                  )}
                </Box>
                <Slider
                  value={filters.distance || 25}
                  onChange={(e, value) => handleFilterChange('distance', value)}
                  min={1}
                  max={50}
                  step={1}
                  marks={[
                    { value: 1, label: '1 km' },
                    { value: 25, label: '25 km' },
                    { value: 50, label: '50 km' },
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value} km`}
                  aria-label={t('filters.distance', 'Afstand')}
                />
              </Box>
            </Grid>

            {/* Rating Filter */}
            <Grid item xs={12} sm={6}>
              <Box sx={{ px: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {t('filters.minRating', 'Minimale beoordeling')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Rating
                    value={filters.minRating || 0}
                    onChange={(e, value) => handleFilterChange('minRating', value || 0)}
                    precision={0.5}
                  />
                  <Typography variant="body2">
                    {filters.minRating > 0 ? `${filters.minRating}+` : t('filters.any', 'Alle')}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Accessibility Filter */}
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

            {/* Age Group Filter */}
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
            {filters.priceFilter && (
              <Chip
                label={`\u20AC ${filters.priceFilter}`}
                onDelete={() => handleClearFilter('priceFilter')}
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
            {filters.distance && filters.distance !== 25 && (
              <Chip
                label={`${filters.distance} km`}
                onDelete={() => handleFilterChange('distance', 25)}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {filters.minRating > 0 && (
              <Chip
                label={`${filters.minRating}+ \u2605`}
                onDelete={() => handleFilterChange('minRating', 0)}
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
            {filters.duration && (
              <Chip
                label={filters.duration}
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
          </Box>
        </Box>
      )}

      {/* Result Count */}
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {resultCount} {t('filters.resultsFound', 'resultaten gevonden')}
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
            aria-label={t('filters.openFilters', 'Open filters')}
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
