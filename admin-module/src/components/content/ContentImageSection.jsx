/**
 * ContentImageSection — Shared image management for content items
 * Extracted from ContentStudioPage for reuse in ConceptDialog + ContentItemDialog
 * Sources: Media Library, POI images, Pexels stock photos, Unsplash, Flickr
 */
import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, Chip, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab,
  CircularProgress, Alert, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';
import contentService from '../../api/contentService.js';
import client from '../../api/client.js';

export default function ContentImageSection({ itemId, item, onUpdate, isContentOnlyDest = false }) {
  const { t } = useTranslation();
  const [images, setImages] = useState([]);

  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [unsplashQuery, setUnsplashQuery] = useState('');
  const [unsplashResults, setUnsplashResults] = useState([]);
  const [unsplashLoading, setUnsplashLoading] = useState(false);
  const [suggestTab, setSuggestTab] = useState(0);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaTab, setMediaTab] = useState(0);
  const [mediaSearch, setMediaSearch] = useState('');

  // Load images from all sources based on active tab + search
  useEffect(() => {
    if (!mediaPickerOpen) return;
    const apiBase = import.meta.env.VITE_API_URL || 'https://api.holidaibutler.com';
    const destCode = String(item?.destination_id || 1);
    const destId = item?.destination_id || 1;

    if (mediaTab === 0) {
      setMediaLoading(true);
      client.get('/media', { params: { limit: 50 }, headers: { 'X-Destination-ID': destCode } })
        .then(res => {
          const files = res.data?.data?.files || res.data?.data || [];
          setMediaItems(files.map(f => ({ ...f, source: 'media', url: `${apiBase}/media-files/${f.destination_id || destId}/${f.filename}`, thumbnail: `${apiBase}/media-files/${f.destination_id || destId}/${f.filename}` })));
        })
        .catch(() => setMediaItems([]))
        .finally(() => setMediaLoading(false));
    } else if (mediaTab === 1) {
      setMediaLoading(true);
      const searchParam = mediaSearch ? `&search=${encodeURIComponent(mediaSearch)}` : '';
      client.get(`/content/images/browse?destination_id=${destId}&limit=30${searchParam}`)
        .then(res => setMediaItems((res.data?.data || []).map(img => ({ id: img.id, source: 'poi', url: img.url, thumbnail: img.url, poi_name: img.poi_name }))))
        .catch(() => setMediaItems([]))
        .finally(() => setMediaLoading(false));
    } else if (mediaTab === 2 && mediaSearch.trim().length > 1) {
      setMediaLoading(true);
      contentService.searchPexels(mediaSearch.trim())
        .then(res => {
          const photos = res.data || [];
          setMediaItems(photos.map(p => ({ id: p.id, source: 'pexels', url: p.urls?.regular || p.urls?.small, thumbnail: p.urls?.thumb || p.urls?.small, photographer: p.photographer || p.user?.name, source_link: p.url || p.links?.html })));
        })
        .catch(() => setMediaItems([]))
        .finally(() => setMediaLoading(false));
    }
  }, [mediaPickerOpen, mediaTab, mediaSearch, itemId, item?.destination_id]);

  // Load current images — resolve raw IDs to URLs


  // Suggestions loaded on-demand (user clicks button), not on mount — performance optimization
  // useEffect removed: was loading suggestions for every item open, even when not needed

  // Load images directly from server (not from item prop — avoids stale state)
  const loadImages = async () => {
    if (!itemId) return;
    try {
      const r = await client.get(`/content/items/${itemId}`);
      const data = r.data?.data || r.data || {};
      if (data.resolved_images && data.resolved_images.length > 0) {
        setImages(data.resolved_images);
      } else {
        const mediaIds = data.media_ids
          ? (typeof data.media_ids === 'string' ? JSON.parse(data.media_ids) : data.media_ids)
          : [];
        setImages(mediaIds);
      }
    } catch { setImages([]); }
  };

  useEffect(() => { loadImages(); }, [itemId]);

  const currentImageIds = new Set(images.map(img => typeof img === 'object' ? img.id : img));

  const handleMoveImage = async (fromIdx, direction) => {
    const toIdx = fromIdx + direction;
    if (toIdx < 0 || toIdx >= images.length) return;
    const newOrder = [...images];
    [newOrder[fromIdx], newOrder[toIdx]] = [newOrder[toIdx], newOrder[fromIdx]];
    setImages(newOrder);
    // Persist to backend
    const updatedIds = newOrder.map(m => {
      if (typeof m === 'object' && typeof m.id === 'string' && m.id.startsWith('http')) return m.id;
      return typeof m === 'object' ? m.id : m;
    });
    try {
      await client.patch(`/content/items/${itemId}`, { media_ids: updatedIds });
      // Reload images from server to confirm persistence
      await loadImages();
    } catch (err) {
      console.error('Image reorder failed:', err);
      await loadImages();
    }
  };

  const handleRemoveImage = async (mediaId) => {
    try {
      const updatedImages = images.filter(m => {
        const mId = typeof m === 'object' ? m.id : m;
        return mId !== mediaId;
      });
      const updatedIds = updatedImages.map(m => {
        if (typeof m === 'object' && typeof m.id === 'string' && m.id.startsWith('http')) return m.id;
        return typeof m === 'object' ? m.id : m;
      });
      const patchRes = await client.patch(`/content/items/${itemId}`, { media_ids: updatedIds });
      setImages(updatedImages);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Image remove failed:', err);
    }
  };

  const handleSelectImage = async (mediaId) => {
    const isSocial = item?.content_type === 'social_post' || item?.content_type === 'video_script';
    try {
      if (isSocial) {
        for (const img of images) {
          const id = typeof img === 'object' ? img.id : img;
          await contentService.detachImage(itemId, id);
        }
        await contentService.attachImages(itemId, [mediaId]);
      } else {
        await contentService.attachImages(itemId, [mediaId]);
      }
      await loadImages();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Image select failed:', err);
    }
  };

  const handleAttachImage = async (mediaId) => {
    try {
      await contentService.attachImages(itemId, [mediaId]);
      await loadImages();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Image attach failed:', err);
    }
  };

  const loadSuggestions = async (refresh = false) => {
    setSuggestLoading(true);
    try {
      const exclude_ids = refresh ? suggestions.map(s => s.id).filter(Boolean) : [];
      const r = await contentService.suggestImages({ content_item_id: itemId, exclude_ids });
      setSuggestions(r.data || []);
    } catch (err) {
      console.error('Image suggest failed:', err);
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleUnsplashSearch = async () => {
    if (!unsplashQuery.trim()) return;
    setUnsplashLoading(true);
    try {
      const r = await contentService.searchUnsplash(unsplashQuery);
      setUnsplashResults(r.data || []);
    } catch (err) {
      console.error('Unsplash search failed:', err);
    } finally {
      setUnsplashLoading(false);
    }
  };

  const alternatives = suggestions.filter(img => !currentImageIds.has(img.id));

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      {/* Selected image(s) */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2">
          {t('contentStudio.images.selected', 'Geselecteerde afbeelding')}
          {images.length > 0 && <Chip label={images.length} size="small" sx={{ ml: 1, height: 18, fontSize: 11 }} />}
        </Typography>
        <Button size="small" variant="outlined" onClick={() => setMediaPickerOpen(true)} startIcon={<AddIcon />}>
          {t('contentStudio.images.addImage', 'Voeg afbeelding toe')}
        </Button>
      </Box>

      {images.length > 0 ? (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
          {images.map((imgId, idx) => {
            const src = typeof imgId === 'object' ? (imgId.url || imgId.thumbnail) : null;
            const id = typeof imgId === 'object' ? imgId.id : imgId;
            return (
              <Box key={id || idx} sx={{ position: 'relative', width: 140, height: 105, borderRadius: 1, overflow: 'hidden', border: '2px solid', borderColor: 'success.main', bgcolor: '#f5f5f5' }}>
                {src && <Box component="img" src={src} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.target.style.background = '#e0e0e0'; e.target.style.display = 'none'; }} />}
                <Chip label={t('contentStudio.images.active', 'Actief')} size="small" color="success"
                  sx={{ position: 'absolute', bottom: 4, left: 4, height: 18, fontSize: 10 }} />
                <IconButton size="small" onClick={() => handleRemoveImage(id)}
                  sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }, p: 0.3 }}>
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
                <Box sx={{ position: 'absolute', bottom: 2, right: 2, display: 'flex', gap: 0.25 }}>
                  <IconButton size="small" disabled={idx === 0} onClick={() => handleMoveImage(idx, -1)}
                    sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }, p: 0.25, '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)', bgcolor: 'rgba(0,0,0,0.3)' } }}>
                    <ArrowBackIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                  <IconButton size="small" disabled={idx === images.length - 1} onClick={() => handleMoveImage(idx, 1)}
                    sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }, p: 0.25, '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)', bgcolor: 'rgba(0,0,0,0.3)' } }}>
                    <ArrowForwardIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Alert severity="warning" sx={{ mb: 1.5, py: 0.5 }}>
          {t('contentStudio.images.noImages', 'Geen afbeelding geselecteerd. Kies hieronder een image.')}
        </Alert>
      )}

      {/* Alternative images — always visible */}
      <Divider sx={{ my: 1 }} />
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {t('contentStudio.images.alternatives', 'Kies een alternatief')}
        {suggestLoading && <CircularProgress size={14} sx={{ ml: 1 }} />}
      </Typography>

      {alternatives.length > 0 ? (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {alternatives.slice(0, 6).map((img, idx) => (
            <Box key={idx} sx={{ cursor: 'pointer', width: 140, textAlign: 'center' }}
              onClick={() => handleSelectImage(img.id)}>
              <Box component="img" src={img.url || img.thumbnail}
                alt={img.poi_name || img.alt_text || ''}
                sx={{ width: 140, height: 105, objectFit: 'cover', borderRadius: 1,
                  border: '2px solid transparent', transition: 'border-color 0.2s, transform 0.2s',
                  '&:hover': { borderColor: 'primary.main', transform: 'scale(1.03)' } }}
                onError={e => { e.target.style.display = 'none'; }}
              />
              <Typography variant="caption" noWrap sx={{ display: 'block', mt: 0.3 }}>
                {img.poi_name || img.source || '—'}
              </Typography>
            </Box>
          ))}
        </Box>
      ) : !suggestLoading ? (
        <Typography variant="caption" color="text.secondary">
          {t('contentStudio.images.noAlternatives', 'Geen alternatieven beschikbaar')}
        </Typography>
      ) : null}

      <Button size="small" onClick={() => loadSuggestions(true)} sx={{ mt: 1 }} startIcon={<RefreshIcon />} disabled={suggestLoading}>
        {t('contentStudio.images.refreshSuggestions', 'Nieuwe suggesties laden')}
      </Button>

      {/* Extended Image Dialog — Unsplash search */}
      <Dialog open={suggestOpen} onClose={() => setSuggestOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('contentStudio.dialogs.addImage', 'Meer afbeeldingen zoeken')}</DialogTitle>
        <DialogContent>
          <Tabs value={suggestTab} onChange={(_, v) => setSuggestTab(v)} sx={{ mb: 2 }}>
            <Tab label={isContentOnlyDest ? t('contentStudio.images.mediaSuggestions', 'Media Suggesties') : t('contentStudio.images.suggestions', 'POI Suggesties')} />
            <Tab label={t('contentStudio.images.unsplash', 'Unsplash')} />
          </Tabs>

          {suggestTab === 0 && (
            <>
              {suggestLoading ? (
                <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={24} /></Box>
              ) : suggestions.length > 0 ? (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {suggestions.map((img, idx) => {
                    const isSelected = currentImageIds.has(img.id);
                    return (
                      <Box key={idx} sx={{ cursor: isSelected ? 'default' : 'pointer', width: 140, textAlign: 'center', opacity: isSelected ? 0.5 : 1 }}
                        onClick={() => { if (!isSelected) { handleAttachImage(img.id || img.url); setSuggestOpen(false); } }}>
                        <Box component="img" src={img.url || img.thumbnail}
                          alt={img.poi_name || img.alt_text || ''} sx={{ width: 140, height: 105, objectFit: 'cover', borderRadius: 1, border: isSelected ? '2px solid' : '2px solid transparent', borderColor: isSelected ? 'success.main' : 'transparent', '&:hover': { borderColor: isSelected ? 'success.main' : 'primary.main' } }}
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                        <Typography variant="caption" noWrap>{img.poi_name || img.source || '—'}</Typography>
                        {isSelected && <Chip label={t('contentStudio.images.active', 'Actief')} size="small" color="success" sx={{ height: 16, fontSize: 10 }} />}
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">{t('contentStudio.images.noSuggestions', 'Geen suggesties gevonden')}</Typography>
              )}
              <Button size="small" onClick={loadSuggestions} sx={{ mt: 1 }} startIcon={<RefreshIcon />}>{t('contentStudio.actions.reload', 'Opnieuw laden')}</Button>
            </>
          )}

          {suggestTab === 1 && (
            <>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField size="small" fullWidth placeholder={t('contentStudio.images.searchPlaceholder', 'Zoek stock foto\'s...')} value={unsplashQuery}
                  onChange={e => setUnsplashQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUnsplashSearch()} />
                <Button variant="contained" onClick={handleUnsplashSearch} disabled={unsplashLoading}>
                  {unsplashLoading ? <CircularProgress size={20} /> : <SearchIcon />}
                </Button>
              </Box>
              {unsplashResults.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {unsplashResults.map((img, idx) => (
                    <Box key={idx} sx={{ cursor: 'pointer', width: 140, textAlign: 'center' }}
                      onClick={() => { handleAttachImage(img.urls?.regular || img.id); setSuggestOpen(false); }}>
                      <Box component="img" src={img.urls?.thumb || img.urls?.small}
                        alt={img.alt_description || ''} sx={{ width: 140, height: 105, objectFit: 'cover', borderRadius: 1, border: '2px solid transparent', '&:hover': { borderColor: 'primary.main' } }} />
                      <Typography variant="caption" noWrap>{img.user?.name || 'Unsplash'}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuggestOpen(false)}>{t('contentStudio.actions.close', 'Sluiten')}</Button>
        </DialogActions>
      </Dialog>

      {/* Unified Image Picker Dialog — All Sources */}
      <Dialog open={mediaPickerOpen} onClose={() => setMediaPickerOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('contentStudio.images.selectFromLibrary', 'Selecteer afbeelding')}</DialogTitle>
        <DialogContent>
          <Tabs value={mediaTab} onChange={(_, v) => { setMediaTab(v); setMediaSearch(''); setMediaItems([]); }} sx={{ mb: 2 }}>
            <Tab label="Media" />
            <Tab label="POI" />
            <Tab label="Pexels" />
          </Tabs>

          <TextField size="small" fullWidth
            placeholder={mediaTab === 1 ? 'Zoek op naam, categorie, sfeer (bijv. "terrace", "romantic", "beach")...' : mediaTab === 2 ? 'Zoek stock foto\'s (Engels)...' : 'Zoek...'}
            value={mediaSearch}
            onChange={e => setMediaSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (mediaTab === 2 || mediaTab === 3)) { setMediaItems([]); }}}
            helperText={mediaTab === 1 ? 'Zoekt op POI-naam, Google categorie, review tags, sfeer en visuele AI-tags' : undefined}
            sx={{ mb: 2 }} />

          {mediaLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
          ) : mediaItems.length > 0 ? (
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', maxHeight: 400, overflowY: 'auto' }}>
              {mediaItems.map((m, idx) => (
                <Box key={m.id || idx} sx={{ cursor: 'pointer', width: 150, textAlign: 'center' }}
                  onClick={async () => {
                    if (m.source === 'unsplash' || m.source === 'pexels') {
                      try {
                        const res = await client.post('/content/images/download-external', {
                          url: m.url, source: m.source, destination_id: item?.destination_id || 1,
                          photographer: m.photographer || '', source_link: m.source_link || '',
                        });
                        const savedId = res.data?.data?.id;
                        if (savedId) await handleAttachImage(savedId);
                      } catch { await handleAttachImage(m.url); }
                    } else {
                      const attachId = m.source === 'poi' ? `poi:${m.id}` : m.id;
                      await handleAttachImage(attachId);
                    }
                    setMediaPickerOpen(false);
                  }}>
                  <Box component="img" src={m.thumbnail || m.url} alt={m.alt_text || m.poi_name || ''}
                    sx={{ width: 150, height: 112, objectFit: 'cover', borderRadius: 1,
                      border: '2px solid transparent', '&:hover': { borderColor: 'primary.main', transform: 'scale(1.03)' },
                      transition: 'all 0.2s' }}
                    onError={e => { e.target.style.display = 'none'; }} />
                  <Typography variant="caption" noWrap sx={{ display: 'block', mt: 0.3, fontWeight: 500 }}>
                    {m.poi_name || m.original_name || m.photographer || m.filename || '—'}
                  </Typography>
                  {m.poi_category && (
                    <Typography variant="caption" noWrap sx={{ display: 'block', fontSize: 10, color: 'text.secondary' }}>{m.poi_category}</Typography>
                  )}
                  {m.visual_description && (
                    <Typography variant="caption" noWrap sx={{ display: 'block', fontSize: 9, color: 'text.disabled', fontStyle: 'italic' }}>{m.visual_description}</Typography>
                  )}
                  {(m.source === 'unsplash' || m.source === 'pexels') && (
                    <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled' }}>{m.source}</Typography>
                  )}
                </Box>
              ))}
            </Box>
          ) : (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              {mediaTab === 2 && !mediaSearch ? 'Typ een zoekterm en druk Enter voor Pexels stock foto\'s.' : 'Geen resultaten gevonden.'}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMediaPickerOpen(false)}>{t('common.close', 'Sluiten')}</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
