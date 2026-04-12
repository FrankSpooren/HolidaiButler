import { useState, useEffect, useCallback } from 'react';
import {
  Box, TextField, ToggleButtonGroup, ToggleButton, Select, MenuItem,
  FormControl, InputLabel, IconButton, Button, Badge, Tooltip
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import DashboardIcon from '@mui/icons-material/Dashboard';
import UploadIcon from '@mui/icons-material/Upload';
import FilterListIcon from '@mui/icons-material/FilterList';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useTranslation } from 'react-i18next';

const SORT_OPTIONS = [
  { value: 'created_at', labelKey: 'media.sort.date' },
  { value: 'filename', labelKey: 'media.sort.filename' },
  { value: 'size_bytes', labelKey: 'media.sort.size' },
  { value: 'usage_count', labelKey: 'media.sort.usage' },
];

export default function MediaHeader({
  search, onSearchChange, view, onViewChange,
  sort, order, onSortChange, filterCount, onFilterClick, onUploadClick
}) {
  const { t } = useTranslation();
  const [localSearch, setLocalSearch] = useState(search);

  // Debounce search input 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) onSearchChange(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, search, onSearchChange]);

  // Sync external search changes
  useEffect(() => { setLocalSearch(search); }, [search]);

  const toggleOrder = useCallback(() => {
    onSortChange(sort, order === 'asc' ? 'desc' : 'asc');
  }, [sort, order, onSortChange]);

  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
      <TextField
        size="small"
        placeholder={t('media.search', 'Zoeken...')}
        value={localSearch}
        onChange={e => setLocalSearch(e.target.value)}
        sx={{ width: 200 }}
      />

      <ToggleButtonGroup
        value={view}
        exclusive
        onChange={(_, v) => v && onViewChange(v)}
        size="small"
      >
        <ToggleButton value="grid"><Tooltip title={t('media.view.grid', 'Grid')}><GridViewIcon fontSize="small" /></Tooltip></ToggleButton>
        <ToggleButton value="list"><Tooltip title={t('media.view.list', 'List')}><ViewListIcon fontSize="small" /></Tooltip></ToggleButton>
        <ToggleButton value="masonry"><Tooltip title={t('media.view.masonry', 'Masonry')}><DashboardIcon fontSize="small" /></Tooltip></ToggleButton>
      </ToggleButtonGroup>

      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>{t('media.sort.label', 'Sorteren')}</InputLabel>
        <Select
          value={sort}
          label={t('media.sort.label', 'Sorteren')}
          onChange={e => onSortChange(e.target.value, order)}
        >
          {SORT_OPTIONS.map(o => (
            <MenuItem key={o.value} value={o.value}>
              {t(o.labelKey, o.value)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <IconButton size="small" onClick={toggleOrder}>
        {order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
      </IconButton>

      <Box sx={{ flex: 1 }} />

      <Tooltip title={t('media.filters', 'Filters')}>
        <IconButton onClick={onFilterClick}>
          <Badge badgeContent={filterCount} color="primary">
            <FilterListIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Button variant="contained" startIcon={<UploadIcon />} onClick={onUploadClick}>
        {t('media.upload', 'Upload')}
      </Button>
    </Box>
  );
}
