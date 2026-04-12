import { useState } from 'react';
import {
  Drawer, Box, Typography, Button, Chip, FormControl, InputLabel, Select,
  MenuItem, Autocomplete, TextField, Switch, FormControlLabel, Divider, Stack
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client.js';

const MEDIA_TYPES = ['image', 'video', 'reel', 'gpx', 'pdf', 'audio'];
const QUALITY_TIERS = ['low', 'medium', 'high', 'ultra'];
const USAGE_RIGHTS = ['internal', 'online', 'offline', 'commercial', 'informational', 'all'];
const LICENSE_TYPES = ['own', 'stock_pexels', 'stock_flickr', 'stock_unsplash', 'creative_commons', 'rights_managed'];
const CONSENT_STATUSES = ['not_required', 'pending', 'approved', 'expired'];
const CATEGORIES = ['branding', 'pages', 'pois', 'video', 'documents', 'other'];

export default function MediaFilterDrawer({ open, onClose, filters, onFilterChange, destId }) {
  const { t } = useTranslation();

  // Tag autocomplete
  const { data: tagData } = useQuery({
    queryKey: ['media-tags', destId],
    queryFn: () => client.get('/media/tags/autocomplete', { params: { destinationId: destId } }).then(r => r.data),
    enabled: open && !!destId,
    staleTime: 60000,
  });
  const availableTags = tagData?.data || [];

  const update = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const activeCount = Object.entries(filters).filter(([k, v]) => {
    if (k === 'archived') return v === true;
    if (Array.isArray(v)) return v.length > 0;
    return v !== '' && v !== undefined && v !== null;
  }).length;

  const reset = () => {
    onFilterChange({
      media_type: '', category: '', tags: [], quality_tier: '', owner_name: '',
      usage_rights: '', license_type: '', consent_status: '', archived: false,
      date_from: '', date_to: ''
    });
  };

  const chipSelect = (key, options) => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {options.map(opt => (
        <Chip
          key={opt}
          label={opt}
          size="small"
          variant={filters[key] === opt ? 'filled' : 'outlined'}
          color={filters[key] === opt ? 'primary' : 'default'}
          onClick={() => update(key, filters[key] === opt ? '' : opt)}
          sx={{ textTransform: 'capitalize', cursor: 'pointer' }}
        />
      ))}
    </Box>
  );

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 340, p: 2.5, bgcolor: 'background.paper' } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>
          {t('media.filters', 'Filters')} {activeCount > 0 && <Chip size="small" label={activeCount} color="primary" sx={{ ml: 1 }} />}
        </Typography>
        <Button size="small" startIcon={<CloseIcon />} onClick={onClose} sx={{ minWidth: 0 }}>
          {t('common.close', 'Sluiten')}
        </Button>
      </Box>

      <Stack spacing={2.5} divider={<Divider />}>
        {/* Media Type */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('media.mediaType', 'Media type')}</Typography>
          {chipSelect('media_type', MEDIA_TYPES)}
        </Box>

        {/* Category */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('media.category', 'Categorie')}</Typography>
          {chipSelect('category', CATEGORIES)}
        </Box>

        {/* Tags */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('media.tags', 'Tags')}</Typography>
          <Autocomplete
            multiple freeSolo size="small"
            options={availableTags}
            value={filters.tags || []}
            onChange={(_, v) => update('tags', v)}
            renderInput={(params) => <TextField {...params} placeholder={t('media.addTags', 'Tags toevoegen...')} />}
          />
        </Box>

        {/* Quality */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('media.quality', 'Kwaliteit')}</Typography>
          {chipSelect('quality_tier', QUALITY_TIERS)}
        </Box>

        {/* Owner */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('media.owner', 'Eigenaar')}</Typography>
          <TextField
            size="small" fullWidth
            placeholder={t('media.ownerPlaceholder', 'Naam eigenaar...')}
            value={filters.owner_name || ''}
            onChange={e => update('owner_name', e.target.value)}
          />
        </Box>

        {/* Usage Rights */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('media.usageRights', 'Gebruiksrechten')}</Typography>
          <FormControl size="small" fullWidth>
            <Select value={filters.usage_rights || ''} onChange={e => update('usage_rights', e.target.value)} displayEmpty>
              <MenuItem value="">Alle</MenuItem>
              {USAGE_RIGHTS.map(r => <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>{r.replace('_', ' ')}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        {/* License Type */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('media.licenseType', 'Licentie')}</Typography>
          <FormControl size="small" fullWidth>
            <Select value={filters.license_type || ''} onChange={e => update('license_type', e.target.value)} displayEmpty>
              <MenuItem value="">Alle</MenuItem>
              {LICENSE_TYPES.map(l => <MenuItem key={l} value={l} sx={{ textTransform: 'capitalize' }}>{l.replace(/_/g, ' ')}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        {/* Consent Status */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('media.consent', 'Consent status')}</Typography>
          {chipSelect('consent_status', CONSENT_STATUSES)}
        </Box>

        {/* Archived toggle */}
        <FormControlLabel
          control={<Switch checked={!!filters.archived} onChange={e => update('archived', e.target.checked)} />}
          label={t('media.showArchived', 'Gearchiveerd tonen')}
        />

        {/* Reset */}
        <Button fullWidth variant="outlined" startIcon={<RestartAltIcon />} onClick={reset} sx={{ mt: 1 }}>
          {t('media.resetFilters', 'Reset filters')}
        </Button>
      </Stack>
    </Drawer>
  );
}
