/**
 * Media Sidebar Panel — Content Studio integration
 * Browse media library + add images to content concepts
 * ML-3.3
 */
import { useState, useCallback } from 'react';
import {
  Drawer, Box, Typography, TextField, InputAdornment, IconButton,
  ImageList, ImageListItem, ImageListItemBar, Tabs, Tab, Chip,
  CircularProgress, Tooltip, Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CloseIcon from '@mui/icons-material/Close';
import PermMediaIcon from '@mui/icons-material/PermMedia';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client.js';

const API_BASE = 'https://api.holidaibutler.com';

export default function MediaSidebarPanel({ open, onClose, destId, onAddImage }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState(0); // 0=Library, 1=Pexels
  const [pexelsSearch, setPexelsSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [pexelsDebounced, setPexelsDebounced] = useState('');

  // Debounce search
  const handleSearch = useCallback((val) => {
    setSearch(val);
    clearTimeout(window._mediaSidebarTimer);
    window._mediaSidebarTimer = setTimeout(() => setDebounced(val), 400);
  }, []);

  const handlePexelsSearch = useCallback((val) => {
    setPexelsSearch(val);
    clearTimeout(window._pexelsSidebarTimer);
    window._pexelsSidebarTimer = setTimeout(() => setPexelsDebounced(val), 400);
  }, []);

  // Library query
  const { data: libData, isLoading: libLoading } = useQuery({
    queryKey: ['media-sidebar', destId, debounced],
    queryFn: () => client.get('/media', {
      params: { destinationId: destId, search: debounced || undefined, limit: 30, media_type: 'image' }
    }).then(r => r.data),
    enabled: open && tab === 0 && !!destId,
    staleTime: 30000,
  });
  const libItems = libData?.data?.files || libData?.data || [];

  // Pexels query
  const { data: pexData, isLoading: pexLoading } = useQuery({
    queryKey: ['pexels-sidebar', pexelsDebounced],
    queryFn: () => client.get('/media/pexels/search', {
      params: { q: pexelsDebounced, per_page: 20 }
    }).then(r => r.data),
    enabled: open && tab === 1 && !!pexelsDebounced,
    staleTime: 60000,
  });
  const pexItems = pexData?.data?.results || [];

  const getThumbUrl = (item) => {
    if (item.source === 'pexels') return item.urls?.small || item.urls?.thumb;
    return `${API_BASE}/media-files/${item.destination_id}/${item.filename}`;
  };

  const handleAdd = (item) => {
    if (item.source === 'pexels') {
      // For Pexels, pass the pexels data so parent can import
      onAddImage?.({ type: 'pexels', pexelsId: item.id?.replace('pexels_', ''), url: item.urls?.regular, photographer: item.user?.name });
    } else {
      // For library items, pass media ID
      onAddImage?.({ type: 'media', mediaId: item.id, url: `${API_BASE}/media-files/${item.destination_id}/${item.filename}` });
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      variant="persistent"
      PaperProps={{ sx: { width: 350, bgcolor: 'background.paper', borderLeft: '1px solid', borderColor: 'divider' } }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PermMediaIcon color="primary" />
          <Typography variant="h6" fontWeight={700} fontSize="1rem">
            {t('media.sidebar.title', 'Media')}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ px: 1, minHeight: 36 }}>
        <Tab label={t('media.sidebar.library', 'Bibliotheek')} sx={{ minHeight: 36, fontSize: '0.8rem' }} />
        <Tab label={t('media.sidebar.pexels', 'Pexels')} sx={{ minHeight: 36, fontSize: '0.8rem' }} />
      </Tabs>

      <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
        {tab === 0 ? (
          <TextField
            size="small" fullWidth placeholder={t('media.sidebar.searchLib', 'Zoek in mediabibliotheek...')}
            value={search} onChange={e => handleSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
        ) : (
          <TextField
            size="small" fullWidth placeholder={t('media.sidebar.searchPexels', 'Zoek op Pexels...')}
            value={pexelsSearch} onChange={e => handlePexelsSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
        )}
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', px: 1 }}>
        {/* Library tab */}
        {tab === 0 && (
          libLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={32} /></Box>
          ) : libItems.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">{t('media.sidebar.noResults', 'Geen resultaten')}</Typography>
            </Box>
          ) : (
            <ImageList cols={3} gap={6}>
              {libItems.map(item => (
                <ImageListItem key={item.id} sx={{ borderRadius: 1, overflow: 'hidden', cursor: 'pointer', position: 'relative', '&:hover .add-btn': { opacity: 1 } }}>
                  <img
                    src={getThumbUrl(item)}
                    alt={item.alt_text || item.filename}
                    loading="lazy"
                    style={{ height: 90, objectFit: 'cover' }}
                    onError={e => { e.target.style.background = '#333'; e.target.alt = '?'; }}
                  />
                  <Tooltip title={t('media.sidebar.addToContent', 'Toevoegen aan content')}>
                    <IconButton
                      className="add-btn"
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleAdd(item); }}
                      sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'primary.main', color: 'white', opacity: 0, transition: 'opacity 0.2s', '&:hover': { bgcolor: 'primary.dark' }, width: 28, height: 28 }}
                    >
                      <AddCircleIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ImageListItem>
              ))}
            </ImageList>
          )
        )}

        {/* Pexels tab */}
        {tab === 1 && (
          pexLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={32} /></Box>
          ) : !pexelsDebounced ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">{t('media.sidebar.searchPrompt', 'Voer een zoekterm in...')}</Typography>
            </Box>
          ) : pexItems.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">{t('media.sidebar.noResults', 'Geen resultaten')}</Typography>
            </Box>
          ) : (
            <ImageList cols={3} gap={6}>
              {pexItems.map(item => (
                <ImageListItem key={item.id} sx={{ borderRadius: 1, overflow: 'hidden', cursor: 'pointer', position: 'relative', '&:hover .add-btn': { opacity: 1 } }}>
                  <img
                    src={item.urls?.small || item.urls?.thumb}
                    alt={item.description || ''}
                    loading="lazy"
                    style={{ height: 90, objectFit: 'cover' }}
                  />
                  <ImageListItemBar
                    subtitle={<Typography variant="caption" sx={{ fontSize: '0.65rem' }}>{item.user?.name}</Typography>}
                    sx={{ '& .MuiImageListItemBar-titleWrap': { p: 0.5 } }}
                  />
                  <Tooltip title={t('media.sidebar.addToContent', 'Toevoegen aan content')}>
                    <IconButton
                      className="add-btn"
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleAdd(item); }}
                      sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'primary.main', color: 'white', opacity: 0, transition: 'opacity 0.2s', '&:hover': { bgcolor: 'primary.dark' }, width: 28, height: 28 }}
                    >
                      <AddCircleIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ImageListItem>
              ))}
            </ImageList>
          )
        )}
      </Box>
    </Drawer>
  );
}
