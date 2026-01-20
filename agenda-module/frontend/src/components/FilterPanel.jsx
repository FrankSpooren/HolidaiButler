import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  FormControlLabel,
  Checkbox,
  Button,
  Drawer,
  IconButton,
  useMediaQuery,
  useTheme,
  Divider,
} from '@mui/material';
import { Close, FilterList } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import useAgendaStore from '../utils/agendaStore';

/**
 * FilterPanel Component
 * Comprehensive filtering system for events
 * Responsive: Drawer on mobile, sidebar on desktop
 */

const CATEGORIES = [
  'culture',
  'beach',
  'active-sports',
  'relaxation',
  'food-drink',
  'nature',
  'entertainment',
  'folklore',
  'festivals',
  'tours',
  'workshops',
  'markets',
  'sports-events',
  'exhibitions',
  'music',
  'family',
];

const TIME_OF_DAY = ['morning', 'afternoon', 'evening', 'night', 'all-day'];

const AUDIENCES = [
  'families-with-kids',
  'couples',
  'friends',
  'solo-travelers',
  'seniors',
  'young-adults',
  'all-ages',
];

const DATE_RANGES = ['upcoming', 'today', 'thisWeek', 'thisMonth'];

function FilterPanel({ open, onClose, isMobile = false }) {
  const { t } = useTranslation();
  const theme = useTheme();

  const { filters, setFilter, clearFilters, toggleCategory, getActiveFiltersCount } =
    useAgendaStore();

  const activeFiltersCount = getActiveFiltersCount();

  const handleClearFilters = () => {
    clearFilters();
  };

  const FilterContent = () => (
    <Box sx={{ p: 3, width: isMobile ? '100vw' : 320, maxWidth: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterList color="primary" aria-hidden="true" />
          <Typography variant="h6" component="h2" id="filter-panel-title">
            {t('filters.title')}
          </Typography>
          {activeFiltersCount > 0 && (
            <Chip
              label={activeFiltersCount}
              size="small"
              color="primary"
              sx={{ minWidth: 24, height: 24 }}
              aria-label={`${activeFiltersCount} ${t('filters.activeFilters')}`}
            />
          )}
        </Box>
        {isMobile && (
          <IconButton
            onClick={onClose}
            size="small"
            aria-label={t('common.close')}
          >
            <Close />
          </IconButton>
        )}
      </Box>

      {/* Date Range */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="date-range-label">{t('filters.dateRange')}</InputLabel>
        <Select
          labelId="date-range-label"
          value={filters.dateRange}
          label={t('filters.dateRange')}
          onChange={(e) => setFilter('dateRange', e.target.value)}
        >
          {DATE_RANGES.map((range) => (
            <MenuItem key={range} value={range}>
              {t(`dateRanges.${range}`)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Divider sx={{ my: 2 }} />

      {/* Categories */}
      <Box sx={{ mb: 3 }} role="group" aria-labelledby="category-filter-label">
        <Typography
          variant="subtitle2"
          gutterBottom
          sx={{ fontWeight: 600 }}
          id="category-filter-label"
        >
          {t('filters.category')}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
          {CATEGORIES.map((category) => {
            const isSelected = filters.categories.includes(category);
            return (
              <Chip
                key={category}
                label={t(`categories.${category}`)}
                size="small"
                color={isSelected ? 'primary' : 'default'}
                variant={isSelected ? 'filled' : 'outlined'}
                onClick={() => toggleCategory(category)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleCategory(category);
                  }
                }}
                tabIndex={0}
                role="checkbox"
                aria-checked={isSelected}
                aria-label={`${t('filters.toggleCategory')} ${t(`categories.${category}`)}`}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: isSelected ? 'primary.dark' : 'action.hover',
                  },
                  '&:focus': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: 2,
                  },
                }}
              />
            );
          })}
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Time of Day */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="time-of-day-label">{t('filters.timeOfDay')}</InputLabel>
        <Select
          labelId="time-of-day-label"
          value={filters.timeOfDay || ''}
          label={t('filters.timeOfDay')}
          onChange={(e) => setFilter('timeOfDay', e.target.value || null)}
        >
          <MenuItem value="">
            <em>{t('common.clear')}</em>
          </MenuItem>
          {TIME_OF_DAY.map((time) => (
            <MenuItem key={time} value={time}>
              {t(`timeOfDay.${time}`)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Target Audience */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="audience-label">{t('filters.audience')}</InputLabel>
        <Select
          labelId="audience-label"
          value={filters.audience || ''}
          label={t('filters.audience')}
          onChange={(e) => setFilter('audience', e.target.value || null)}
        >
          <MenuItem value="">
            <em>{t('common.clear')}</em>
          </MenuItem>
          {AUDIENCES.map((audience) => (
            <MenuItem key={audience} value={audience}>
              {t(`audience.${audience}`)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Divider sx={{ my: 2 }} />

      {/* Free Events Only */}
      <FormControlLabel
        control={
          <Checkbox
            checked={filters.isFree === true}
            onChange={(e) => setFilter('isFree', e.target.checked ? true : null)}
            color="primary"
          />
        }
        label={t('filters.freeOnly')}
        sx={{ mb: 3 }}
      />

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
        <Button
          variant="outlined"
          onClick={handleClearFilters}
          disabled={activeFiltersCount === 0}
          fullWidth
          aria-label={t('filters.clearAllFilters')}
        >
          {t('common.clear')}
        </Button>
        {isMobile && (
          <Button
            variant="contained"
            onClick={onClose}
            fullWidth
            aria-label={t('filters.applyFilters')}
          >
            {t('common.apply')}
          </Button>
        )}
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        aria-labelledby="filter-panel-title"
        sx={{
          '& .MuiDrawer-paper': {
            width: '100%',
            maxWidth: 400,
          },
        }}
      >
        <FilterContent />
      </Drawer>
    );
  }

  return (
    <Paper
      elevation={2}
      sx={{
        position: 'sticky',
        top: 16,
        height: 'fit-content',
        maxHeight: 'calc(100vh - 32px)',
        overflow: 'auto',
      }}
    >
      <FilterContent />
    </Paper>
  );
}

export default FilterPanel;
