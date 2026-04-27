import { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button, CircularProgress, Alert, Chip,
  FormControl, InputLabel, Select, MenuItem, ImageList, ImageListItem,
  ImageListItemBar, Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useTranslation } from 'react-i18next';
import client from '../../api/client.js';

const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const TIMES = ['morning', 'afternoon', 'evening', 'night', 'golden_hour', 'blue_hour'];
const WEATHER = ['sunny', 'cloudy', 'rainy', 'stormy', 'foggy', 'snowy'];
const PERSONAS = ['families', 'couples', 'seniors', 'adventurers', 'foodies', 'culture_lovers'];
const PURPOSES = ['social_media', 'blog', 'newsletter', 'advertising', 'website'];

const apiUrl = import.meta.env.VITE_API_URL || 'https://api.holidaibutler.com';

export default function MediaContextSearch({ destId }) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    seasons: [], weather_conditions: [], time_of_day: '', persona_fit: [], content_purposes: []
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const body = { destination_id: destId };
      if (filters.seasons.length) body.seasons = filters.seasons;
      if (filters.weather_conditions.length) body.weather_conditions = filters.weather_conditions;
      if (filters.time_of_day) body.time_of_day = filters.time_of_day;
      if (filters.persona_fit.length) body.persona_fit = filters.persona_fit;
      if (filters.content_purposes.length) body.content_purposes = filters.content_purposes;
      body.limit = 24;
      const r = await client.post('/media/search/context', body);
      setResults(r.data?.data || []);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(`${apiUrl}${url}`);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  const activeFilterCount = Object.values(filters).filter(v => Array.isArray(v) ? v.length > 0 : !!v).length;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SearchIcon /> Context Search
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Zoek media op basis van context: seizoen, weer, tijdstip, doelgroep en doel.
      </Typography>

      {/* Filter controls */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Seizoen</InputLabel>
              <Select multiple value={filters.seasons} label="Seizoen"
                onChange={e => setFilters(f => ({ ...f, seasons: e.target.value }))}
                renderValue={sel => sel.map(s => <Chip key={s} label={s} size="small" sx={{ mr: 0.5, height: 20, fontSize: 10 }} />)}>
                {SEASONS.map(s => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Weer</InputLabel>
              <Select multiple value={filters.weather_conditions} label="Weer"
                onChange={e => setFilters(f => ({ ...f, weather_conditions: e.target.value }))}
                renderValue={sel => sel.map(s => <Chip key={s} label={s} size="small" sx={{ mr: 0.5, height: 20, fontSize: 10 }} />)}>
                {WEATHER.map(w => <MenuItem key={w} value={w} sx={{ textTransform: 'capitalize' }}>{w}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Tijdstip</InputLabel>
              <Select value={filters.time_of_day} label="Tijdstip"
                onChange={e => setFilters(f => ({ ...f, time_of_day: e.target.value }))}>
                <MenuItem value="">Alle</MenuItem>
                {TIMES.map(t => <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t.replace('_', ' ')}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Doelgroep</InputLabel>
              <Select multiple value={filters.persona_fit} label="Doelgroep"
                onChange={e => setFilters(f => ({ ...f, persona_fit: e.target.value }))}
                renderValue={sel => sel.map(s => <Chip key={s} label={s} size="small" sx={{ mr: 0.5, height: 20, fontSize: 10 }} />)}>
                {PERSONAS.map(p => <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>{p.replace('_', ' ')}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Doel</InputLabel>
              <Select multiple value={filters.content_purposes} label="Doel"
                onChange={e => setFilters(f => ({ ...f, content_purposes: e.target.value }))}
                renderValue={sel => sel.map(s => <Chip key={s} label={s} size="small" sx={{ mr: 0.5, height: 20, fontSize: 10 }} />)}>
                {PURPOSES.map(p => <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>{p.replace('_', ' ')}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button variant="contained" onClick={handleSearch} disabled={loading || activeFilterCount === 0}
              startIcon={loading ? <CircularProgress size={16} /> : <SearchIcon />} fullWidth>
              Zoeken {activeFilterCount > 0 && `(${activeFilterCount} filters)`}
            </Button>
            {activeFilterCount > 0 && (
              <Button variant="outlined" size="small"
                onClick={() => setFilters({ seasons: [], weather_conditions: [], time_of_day: '', persona_fit: [], content_purposes: [] })}>
                Reset
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Results */}
      {results !== null && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {results.length} resultaten gevonden
          </Typography>
          {results.length > 0 ? (
            <ImageList cols={4} gap={12}>
              {results.map(item => (
                <ImageListItem key={item.media_id} sx={{
                  borderRadius: 1, overflow: 'hidden', cursor: 'pointer',
                  '&:hover .MuiImageListItemBar-root': { opacity: 1 }
                }}>
                  <img
                    src={`${apiUrl}${item.thumbnail_url}`}
                    alt={item.alt_text_en || item.filename}
                    loading="lazy"
                    style={{ aspectRatio: '4/3', objectFit: 'cover' }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <ImageListItemBar
                    title={item.alt_text_en || item.filename}
                    subtitle={
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                        {item.seasons && JSON.parse(item.seasons || '[]').map(s => (
                          <Chip key={s} label={s} size="small" sx={{ height: 16, fontSize: 9, bgcolor: 'rgba(255,255,255,0.2)' }} />
                        ))}
                        {item.time_of_day && <Chip label={item.time_of_day} size="small" sx={{ height: 16, fontSize: 9, bgcolor: 'rgba(255,255,255,0.2)' }} />}
                      </Box>
                    }
                    actionIcon={
                      <Tooltip title={copied === item.thumbnail_url ? 'Gekopieerd!' : 'Kopieer URL'}>
                        <Button size="small" sx={{ color: '#fff', minWidth: 32 }}
                          onClick={(e) => { e.stopPropagation(); handleCopyUrl(item.thumbnail_url); }}>
                          <ContentCopyIcon sx={{ fontSize: 16 }} />
                        </Button>
                      </Tooltip>
                    }
                    sx={{ opacity: 0, transition: 'opacity 0.2s' }}
                  />
                </ImageListItem>
              ))}
            </ImageList>
          ) : (
            <Alert severity="info">Geen media gevonden met deze context filters. Probeer andere filters.</Alert>
          )}
        </>
      )}
    </Box>
  );
}
