/**
 * ContentImageSection — Shared image management for content items
 * Extracted from ContentStudioPage for reuse in ConceptDialog + ContentItemDialog
 * Sources: Media Library, POI images, Pexels stock photos, Unsplash, Flickr
 *
 * v2.0 — Enterprise Media Picker: infinite scroll, search, category filter, counter
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, Chip, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab,
  CircularProgress, Alert, Divider, Skeleton, Select, MenuItem, InputAdornment,
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

const PAGE_SIZE = 50;
const POI_PAGE_SIZE = 40;

export default function ContentImageSection({ itemId, item, onUpdate, isContentOnlyDest = false, conceptId, siblingItems = [] }) {
  const { t } = useTranslation();
  const [images, setImages] = useState([]);
  const [pickerSelection, setPickerSelection] = useState(new Set()); // multi-select in picker

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

  // Pagination state
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaTotal, setMediaTotal] = useState(0);
  const [mediaHasMore, setMediaHasMore] = useState(false);
  const [mediaLoadingMore, setMediaLoadingMore] = useState(false);
  const [mediaCategory, setMediaCategory] = useState('all');
  const sentinelRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const searchTimerRef = useRef(null);

  const apiBase = import.meta.env.VITE_API_URL || 'https://api.holidaibutler.com';
  const destCode = String(item?.destination_id || 1);
  const destId = item?.destination_id || 1;

  // Fetch media page (append or replace)
  const fetchMediaPage = useCallback(async (page, append = false) => {
    if (!append) setMediaLoading(true);
    else setMediaLoadingMore(true);

    try {
      if (mediaTab === 0) {
        const params = { limit: PAGE_SIZE, page };
        if (mediaSearch.trim()) params.search = mediaSearch.trim();
        if (mediaCategory && mediaCategory !== 'all') params.category = mediaCategory;
        const res = await client.get('/media', { params, headers: { 'X-Destination-ID': destCode } });
        const files = res.data?.data?.files || res.data?.data || [];
        const meta = res.data?.meta || {};
        const mapped = files.map(f => ({
          ...f, source: 'media',
          url: `${apiBase}/media-files/${f.destination_id || destId}/${f.filename}`,
          thumbnail: `${apiBase}/media-files/${f.destination_id || destId}/${f.filename}`,
        }));
        if (append) {
          setMediaItems(prev => [...prev, ...mapped]);
        } else {
          setMediaItems(mapped);
        }
        setMediaTotal(meta.total || mapped.length);
        setMediaHasMore(page < (meta.totalPages || 1));
        setMediaPage(page);
      } else if (mediaTab === 1) {
        const searchParam = mediaSearch ? `&search=${encodeURIComponent(mediaSearch)}` : '';
        const res = await client.get(`/content/images/browse?destination_id=${destId}&limit=${POI_PAGE_SIZE}&page=${page}${searchParam}`);
        const data = res.data?.data || [];
        const meta = res.data?.meta || {};
        const mapped = data.map(img => ({ id: img.id, source: 'poi', url: img.url, thumbnail: img.url, poi_name: img.poi_name }));
        if (append) {
          setMediaItems(prev => [...prev, ...mapped]);
        } else {
          setMediaItems(mapped);
        }
        setMediaTotal(meta.total || mapped.length);
        setMediaHasMore(mapped.length >= POI_PAGE_SIZE);
        setMediaPage(page);
      } else if (mediaTab === 2 && mediaSearch.trim().length > 1) {
        const res = await contentService.searchPexels(mediaSearch.trim());
        const photos = res.data || [];
        setMediaItems(photos.map(p => ({
          id: p.id, source: 'pexels',
          url: p.urls?.regular || p.urls?.small,
          thumbnail: p.urls?.thumb || p.urls?.small,
          photographer: p.photographer || p.user?.name,
          source_link: p.url || p.links?.html,
        })));
        setMediaTotal(photos.length);
        setMediaHasMore(false);
      }
    } catch {
      if (!append) setMediaItems([]);
    } finally {
      setMediaLoading(false);
      setMediaLoadingMore(false);
    }
  }, [mediaTab, mediaSearch, mediaCategory, destCode, destId, apiBase]);

  // Initial load when picker opens or tab/search/category changes
  useEffect(() => {
    if (!mediaPickerOpen) return;
    // Debounce search input
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setMediaPage(1);
      fetchMediaPage(1, false);
    }, mediaSearch ? 350 : 0);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [mediaPickerOpen, mediaTab, mediaSearch, mediaCategory]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!mediaPickerOpen || !mediaHasMore || mediaLoading || mediaLoadingMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && mediaHasMore && !mediaLoadingMore) {
          fetchMediaPage(mediaPage + 1, true);
        }
      },
      { root: scrollContainerRef.current, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [mediaPickerOpen, mediaHasMore, mediaLoading, mediaLoadingMore, mediaPage, fetchMediaPage]);

  // Reset state when picker closes
  useEffect(() => {
    if (!mediaPickerOpen) {
      setMediaItems([]);
      setMediaPage(1);
      setMediaTotal(0);
      setMediaHasMore(false);
      setMediaSearch('');
      setMediaCategory('all');
    }
  }, [mediaPickerOpen]);

  // Load current images from server
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
    const updatedIds = newOrder.map(m => {
      if (typeof m === 'object' && typeof m.id === 'string' && m.id.startsWith('http')) return m.id;
      return typeof m === 'object' ? m.id : m;
    });
    try {
      await client.patch(`/content/items/${itemId}`, { media_ids: updatedIds });
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
      await client.patch(`/content/items/${itemId}`, { media_ids: updatedIds });
      setImages(updatedImages);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Image remove failed:', err);
    }
  };

  // Platform-specific max image limits
  const PLATFORM_IMAGE_LIMITS = { facebook: 10, instagram: 10, linkedin: 9, x: 4, tiktok: 1, youtube: 1, pinterest: 1, website: 20 };
  const platform = item?.target_platform || 'website';
  const maxImages = PLATFORM_IMAGE_LIMITS[platform] || 10;

  const handleSelectImage = async (mediaId) => {
    const isSocial = item?.content_type === 'social_post' || item?.content_type === 'video_script';
    try {
      if (isSocial) {
        const platform = item?.target_platform || 'facebook';
        const maxImages = PLATFORM_IMAGE_LIMITS[platform] || 4;
        // Check if image is already attached — if so, detach (toggle behavior)
        const existingId = images.find(img => (typeof img === 'object' ? img.id : img) === mediaId);
        if (existingId) {
          await contentService.detachImage(itemId, mediaId);
        } else if (images.length >= maxImages) {
          // At limit: remove oldest, add new
          const oldestId = typeof images[0] === 'object' ? images[0].id : images[0];
          await contentService.detachImage(itemId, oldestId);
          await contentService.attachImages(itemId, [mediaId]);
        } else {
          // Under limit: just add
          await contentService.attachImages(itemId, [mediaId]);
        }
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

  // Loading skeleton grid
  const SkeletonGrid = () => (
    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Box key={i} sx={{ width: 150 }}>
          <Skeleton variant="rounded" width={150} height={112} />
          <Skeleton variant="text" width={100} sx={{ mt: 0.3 }} />
        </Box>
      ))}
    </Box>
  );

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      {/* Selected image(s) */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2">
          {t('contentStudio.images.selected', 'Geselecteerde afbeelding')}
          {images.length > 0 && <Chip label={images.length} size="small" sx={{ ml: 1, height: 18, fontSize: 11 }} />}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {images.length > 0 && siblingItems.length > 1 && (
            <Button size="small" variant="text" sx={{ fontSize: 11, textTransform: 'none' }}
              onClick={async () => {
                const mediaIds = images.map(m => {
                  if (typeof m === 'object' && typeof m.id === 'string' && m.id.startsWith('http')) return m.id;
                  return typeof m === 'object' ? m.id : m;
                });
                let copied = 0;
                for (const sib of siblingItems) {
                  if (sib.id === itemId) continue;
                  try {
                    await contentService.attachImages(sib.id, mediaIds);
                    copied++;
                  } catch { /* skip failed */ }
                }
                if (onUpdate) onUpdate();
              }}>
              Gebruik voor alle platformen
            </Button>
          )}
          <Button size="small" variant="outlined" onClick={() => setMediaPickerOpen(true)} startIcon={<AddIcon />}>
            {t('contentStudio.images.addImage', 'Voeg afbeelding toe')}
          </Button>
        </Box>
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
                {img.poi_name || img.source || '\u2014'}
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
                        <Typography variant="caption" noWrap>{img.poi_name || img.source || '\u2014'}</Typography>
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

      {/* Unified Image Picker Dialog — All Sources — Enterprise v2.0 */}
      <Dialog open={mediaPickerOpen} onClose={() => { setMediaPickerOpen(false); setPickerSelection(new Set()); }} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>{t('contentStudio.images.selectFromLibrary', 'Selecteer afbeeldingen')}</span>
            <Chip label={`max ${maxImages}`} size="small" variant="outlined" color="info" sx={{ fontSize: 10, height: 20 }} />
          </Box>
          {pickerSelection.size > 0 && (
            <Chip label={`${pickerSelection.size} geselecteerd`} size="small" color="primary" sx={{ fontSize: 11, height: 22 }} />
          )}
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <Tabs value={mediaTab} onChange={(_, v) => { setMediaTab(v); setMediaSearch(''); setMediaItems([]); setMediaPage(1); setMediaTotal(0); setMediaCategory('all'); }} sx={{ mb: 1.5 }}>
            <Tab label="Media" />
            <Tab label="POI" />
            <Tab label="Pexels" />
          </Tabs>

          {/* Search + Category filter bar */}
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            <TextField size="small" fullWidth
              placeholder={mediaTab === 1 ? 'Zoek op naam, categorie, sfeer...' : mediaTab === 2 ? 'Zoek stock foto\'s (Engels)...' : 'Zoek in mediabibliotheek...'}
              value={mediaSearch}
              onChange={e => setMediaSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> }}
            />
            {mediaTab === 0 && (
              <Select size="small" value={mediaCategory}
                onChange={e => setMediaCategory(e.target.value)}
                sx={{ minWidth: 120, fontSize: 13 }}>
                <MenuItem value="all">Alle</MenuItem>
                <MenuItem value="branding">Branding</MenuItem>
                <MenuItem value="pois">POIs</MenuItem>
                <MenuItem value="video">Video</MenuItem>
                <MenuItem value="other">Overig</MenuItem>
              </Select>
            )}
          </Box>

          {/* Image grid with infinite scroll */}
          {mediaLoading ? (
            <SkeletonGrid />
          ) : mediaItems.length > 0 ? (
            <Box ref={scrollContainerRef}
              sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', maxHeight: 480, overflowY: 'auto', alignContent: 'flex-start', p: 0.5 }}>
              {mediaItems.map((m, idx) => {
                const isAlreadySelected = currentImageIds.has(m.id) || currentImageIds.has(`poi:${m.id}`);
                const pickerId = m.source === 'poi' ? `poi:${m.id}` : (m.source === 'pexels' || m.source === 'unsplash') ? `ext:${m.id}` : m.id;
                const isInSelection = pickerSelection.has(pickerId);
                return (
                  <Box key={`${m.id}-${idx}`}
                    sx={{ cursor: isAlreadySelected ? 'default' : 'pointer', width: 150, textAlign: 'center', opacity: isAlreadySelected ? 0.45 : 1, position: 'relative' }}
                    onClick={() => {
                      if (isAlreadySelected) return;
                      setPickerSelection(prev => {
                        const next = new Set(prev);
                        if (next.has(pickerId)) { next.delete(pickerId); } else {
                          if (next.size + images.length < maxImages) next.add(pickerId);
                        }
                        return next;
                      });
                    }}>
                    <Box component="img" src={m.thumbnail || m.url} alt={m.alt_text || m.poi_name || ''}
                      sx={{ width: 150, height: 112, objectFit: 'cover', borderRadius: 1,
                        border: '2px solid',
                        borderColor: isAlreadySelected ? 'success.main' : isInSelection ? 'primary.main' : 'transparent',
                        '&:hover': { borderColor: isAlreadySelected ? 'success.main' : 'primary.main', transform: isAlreadySelected ? 'none' : 'scale(1.03)' },
                        transition: 'all 0.2s' }}
                      onError={e => { e.target.style.display = 'none'; }} />
                    {isAlreadySelected && (
                      <Chip label="Actief" size="small" color="success"
                        sx={{ position: 'absolute', top: 4, right: 4, height: 18, fontSize: 9 }} />
                    )}
                    {isInSelection && (
                      <Box sx={{ position: 'absolute', top: 4, left: 4, width: 22, height: 22, borderRadius: '50%', bgcolor: 'primary.main', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                        {[...pickerSelection].indexOf(pickerId) + 1}
                      </Box>
                    )}
                    <Typography variant="caption" noWrap sx={{ display: 'block', mt: 0.3, fontWeight: 500 }}>
                      {m.poi_name || m.original_name || m.photographer || m.filename || '\u2014'}
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
                );
              })}
              {/* Sentinel for infinite scroll */}
              {mediaHasMore && (
                <Box ref={sentinelRef} sx={{ width: '100%', py: 2, textAlign: 'center' }}>
                  {mediaLoadingMore && (
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} variant="rounded" width={150} height={112} />
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          ) : (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              {mediaTab === 2 && !mediaSearch ? 'Typ een zoekterm voor Pexels stock foto\'s.' : 'Geen resultaten gevonden.'}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3 }}>
          <Typography variant="caption" color="text.secondary">
            {images.length} van {maxImages} actief{pickerSelection.size > 0 ? ` — ${pickerSelection.size} geselecteerd om toe te voegen` : ''}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {pickerSelection.size > 0 && (
              <Button variant="contained" size="small" onClick={async () => {
                const toAttach = [];
                for (const pickerId of pickerSelection) {
                  if (pickerId.startsWith('ext:')) {
                    const extId = pickerId.replace('ext:', '');
                    const m = mediaItems.find(mi => String(mi.id) === String(extId));
                    if (m) {
                      try {
                        const res = await client.post('/content/images/download-external', {
                          url: m.url, source: m.source, destination_id: destId,
                          photographer: m.photographer || '', source_link: m.source_link || '',
                        });
                        const savedId = res.data?.data?.id;
                        if (savedId) toAttach.push(savedId);
                      } catch { toAttach.push(m.url); }
                    }
                  } else {
                    toAttach.push(pickerId);
                  }
                }
                if (toAttach.length > 0) {
                  await contentService.attachImages(itemId, toAttach);
                  await loadImages();
                  if (onUpdate) onUpdate();
                }
                setPickerSelection(new Set());
                setMediaPickerOpen(false);
              }}>
                {pickerSelection.size} toevoegen
              </Button>
            )}
            <Button onClick={() => { setMediaPickerOpen(false); setPickerSelection(new Set()); }}>{t('common.close', 'Sluiten')}</Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
