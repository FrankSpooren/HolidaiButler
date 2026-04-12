import { useState, useRef } from 'react';
import {
  Box, Typography, TextField, InputAdornment, ImageList, ImageListItem,
  ImageListItemBar, IconButton, CircularProgress, Button, Snackbar, Alert, Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client.js';

export default function PexelsSearchTab({ destId }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [importing, setImporting] = useState(new Set());
  const [imported, setImported] = useState(new Set());
  const [snack, setSnack] = useState(null);
  const timer = useRef(null);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setQuery(val), 500);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['pexels-search', query],
    queryFn: () => client.get('/media/pexels/search', { params: { q: query, per_page: 24 } }).then(r => r.data),
    enabled: !!query && query.length >= 2,
    staleTime: 60000,
  });
  const results = data?.data?.results || [];

  const importMut = useMutation({
    mutationFn: (pexelsId) => {
      const cleanId = String(pexelsId).replace('pexels_', '');
      return client.post(`/media/pexels/import/${cleanId}`, {}, { params: { destinationId: destId }, timeout: 120000 });
    },
    onSuccess: (res, pexelsId) => {
      setImporting(prev => { const n = new Set(prev); n.delete(pexelsId); return n; });
      setImported(prev => new Set(prev).add(pexelsId));
      queryClient.invalidateQueries({ queryKey: ['media'] });
      setSnack({ message: t('media.pexels.imported', 'Afbeelding geïmporteerd naar mediabibliotheek'), severity: 'success' });
    },
    onError: (err, pexelsId) => {
      setImporting(prev => { const n = new Set(prev); n.delete(pexelsId); return n; });
      setSnack({ message: err?.response?.data?.error?.message || 'Import mislukt', severity: 'error' });
    }
  });

  const handleImport = (item) => {
    const id = item.id;
    if (importing.has(id) || imported.has(id)) return;
    setImporting(prev => new Set(prev).add(id));
    importMut.mutate(id);
  };

  return (
    <Box>
      <TextField
        fullWidth size="small" autoFocus
        placeholder={t('media.pexels.searchPlaceholder', 'Zoek rechtenvrije afbeeldingen op Pexels...')}
        value={search}
        onChange={e => handleSearch(e.target.value)}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
        }}
        sx={{ mb: 2 }}
      />

      {!query && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="body1" color="text.secondary">
            {t('media.pexels.prompt', 'Voer een zoekterm in om rechtenvrije afbeeldingen te vinden')}
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
            Powered by Pexels — gratis te gebruiken met naamsvermelding
          </Typography>
        </Box>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      )}

      {query && !isLoading && results.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">{t('media.pexels.noResults', 'Geen resultaten voor')} "{query}"</Typography>
        </Box>
      )}

      {results.length > 0 && (
        <ImageList cols={4} gap={8}>
          {results.map(item => {
            const id = item.id;
            const isImporting = importing.has(id);
            const isImported = imported.has(id);
            return (
              <ImageListItem key={id} sx={{ borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                <img
                  src={item.urls?.small || item.urls?.thumb}
                  alt={item.description || ''}
                  loading="lazy"
                  style={{ height: 180, objectFit: 'cover' }}
                />
                <ImageListItemBar
                  title={item.user?.name || 'Pexels'}
                  subtitle={`${item.width}×${item.height}`}
                  actionIcon={
                    isImported ? (
                      <CheckCircleIcon sx={{ color: '#4caf50', mr: 1 }} />
                    ) : (
                      <Tooltip title={t('media.pexels.import', 'Importeer naar mediabibliotheek')}>
                        <IconButton
                          onClick={() => handleImport(item)}
                          disabled={isImporting}
                          sx={{ color: 'white' }}
                        >
                          {isImporting ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                        </IconButton>
                      </Tooltip>
                    )
                  }
                  sx={{ '& .MuiImageListItemBar-title': { fontSize: '0.8rem' }, '& .MuiImageListItemBar-subtitle': { fontSize: '0.7rem' } }}
                />
              </ImageListItem>
            );
          })}
        </ImageList>
      )}

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)}>
        {snack && <Alert severity={snack.severity} onClose={() => setSnack(null)}>{snack.message}</Alert>}
      </Snackbar>
    </Box>
  );
}
