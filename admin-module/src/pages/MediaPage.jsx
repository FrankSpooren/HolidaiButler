import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, Snackbar, TextField, FormControl, InputLabel,
  Select, MenuItem, Tooltip, Checkbox, IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import DeselectIcon from '@mui/icons-material/Deselect';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client.js';
import { useBrandingDestinations } from '../hooks/useBrandingEditor.js';
import useAuthStore from '../stores/authStore.js';
import MediaHeader from '../components/media/MediaHeader.jsx';
import MediaSourceTabs from '../components/media/MediaSourceTabs.jsx';
import MediaGrid from '../components/media/MediaGrid.jsx';
import MediaFilterDrawer from '../components/media/MediaFilterDrawer.jsx';
import MediaDetailDialog from '../components/media/MediaDetailDialog.jsx';
import MediaUploadDialog from '../components/media/MediaUploadDialog.jsx';
import MediaBulkActionsBar from '../components/media/MediaBulkActionsBar.jsx';
import MediaCollectionsDrawer from '../components/media/MediaCollectionsDrawer.jsx';
import MediaCollectionDetailDialog from '../components/media/MediaCollectionDetailDialog.jsx';
import MediaCleanupTab from '../components/media/MediaCleanupTab.jsx';
import PexelsSearchTab from '../components/media/PexelsSearchTab.jsx';
import POIImagesTab from '../components/media/POIImagesTab.jsx';
import useDestinationStore from '../stores/destinationStore.js';

const CATEGORIES = ['all', 'branding', 'pages', 'pois', 'video', 'documents', 'other'];
const apiUrl = import.meta.env.VITE_API_URL || 'https://api.holidaibutler.com';

export default function MediaPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);
  const isPlatformAdmin = user?.role === 'platform_admin';
  const selectedDest = useDestinationStore(s => s.selectedDestination);
  const allStoreDests = useDestinationStore(s => s.destinations);
  const destInfo = allStoreDests.find(d => d.code === selectedDest);
  const destId = destInfo?.id || (allStoreDests[0]?.id) || '';
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');
  const [density, setDensity] = useState(() => localStorage.getItem('hb-media-density') || 'default');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(() => {
    const t = searchParams.get('tab');
    return t ? parseInt(t) : 0;
  });
  const [page, setPage] = useState(1);
  const [visualQuery, setVisualQuery] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [detailOpen, setDetailOpen] = useState(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    media_type: '', category: '', tags: [], quality_tier: '', owner_name: '',
    usage_rights: '', license_type: '', consent_status: '', archived: false,
    date_from: '', date_to: ''
  });

  const filterCount = Object.entries(filters).filter(([k, v]) => {
    if (k === 'archived') return v === true;
    if (Array.isArray(v)) return v.length > 0;
    return v !== '' && v !== undefined && v !== null;
  }).length;

  // Media query — library tab
  const { data, isLoading } = useQuery({
    queryKey: ['media', destId, search, sort, order, page, JSON.stringify(filters)],
    queryFn: () => client.get('/media', {
      params: {
        destinationId: destId,
        search: search || undefined,
        sort,
        ...( filters.media_type ? { media_type: filters.media_type } : {}),
        ...( filters.category ? { category: filters.category } : {}),
        ...( filters.quality_tier ? { quality_tier: filters.quality_tier } : {}),
        ...( filters.owner_name ? { owner_name: filters.owner_name } : {}),
        ...( filters.usage_rights ? { usage_rights: filters.usage_rights } : {}),
        ...( filters.license_type ? { license_type: filters.license_type } : {}),
        ...( filters.consent_status ? { consent_status: filters.consent_status } : {}),
        ...( filters.archived ? { archived: true } : {}),
        ...( filters.tags?.length ? { tags: filters.tags.join(',') } : {}),
        order,
        page,
        limit: 200,
      }
    }).then(r => r.data),
    enabled: !!destId && tab === 0,
    staleTime: 30000, // 30s cache — media changes more often than POIs
  });

  // Visual search query
  const { data: vsData, isLoading: vsLoading } = useQuery({
    queryKey: ['media-visual-search', destId, visualQuery],
    queryFn: () => client.get('/media/visual-search', { params: { q: visualQuery, destinationId: destId, limit: 20 } }).then(r => r.data),
    enabled: !!visualQuery && visualQuery.length >= 2 && !!destId && tab === 0,
    staleTime: 60000,
  });

  const isVisualMode = !!visualQuery;
  const files = isVisualMode ? (vsData?.data?.results || []) : (data?.data?.files || data?.data || []);
  const totalItems = isVisualMode ? files.length : (data?.meta?.total || 0);
  const hasMore = !isVisualMode && files.length < totalItems;

  // Mutations
  const uploadMut = useMutation({
    mutationFn: async (formData) => {
      const res = await client.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      setSnack({ open: true, message: t('media.uploadSuccess', 'Files uploaded'), severity: 'success' });
    },
    onError: (err) => {
      setSnack({ open: true, message: err.response?.data?.error?.message || err.message, severity: 'error' });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => client.delete(`/media/${id}`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      setDetailOpen(null);
      setSnack({ open: true, message: t('media.deleted', 'File deleted'), severity: 'success' });
    },
  });

  const bulkDeleteMut = useMutation({
    mutationFn: async (ids) => {
      const results = await Promise.allSettled(ids.map(id => client.delete(`/media/${id}`)));
      return results.filter(r => r.status === 'fulfilled').length;
    },
    onSuccess: (deleted) => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      setSelected(new Set());
      setBulkDeleteOpen(false);
      setSnack({ open: true, message: `${deleted} ${t('media.filesDeleted', 'file(s) deleted')}`, severity: 'success' });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data: updateData }) => client.put(`/media/${id}`, updateData).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      setSnack({ open: true, message: t('media.updated', 'Updated'), severity: 'success' });
    },
  });

  // Handlers
  const handleUpload = useCallback((e) => {
    const uploadFiles = e?.target?.files;
    if (!uploadFiles?.length) return;
    const formData = new FormData();
    formData.append('destination_id', destId);
    formData.append('category', category !== 'all' ? category : 'other');
    for (const file of uploadFiles) formData.append('files', file);
    uploadMut.mutate(formData);
    if (e?.target) e.target.value = '';
  }, [destId, category, uploadMut]);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [collectionDetailId, setCollectionDetailId] = useState(null);
  const handleUploadClick = useCallback(() => {
    setUploadDialogOpen(true);
  }, []);

  const toggleSelect = useCallback((id, e) => {
    if (e) e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelected(prev => prev.size === files.length ? new Set() : new Set(files.map(f => f.id)));
  }, [files]);

  const handleSortChange = useCallback((newSort, newOrder) => {
    setSort(newSort);
    setOrder(newOrder);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((val) => {
    setSearch(val);
    setPage(1);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) setPage(p => p + 1);
  }, [hasMore, isLoading]);

  const getUrl = (file) => `${apiUrl}${file.url}`;
  const isImageFile = (file) => file.mime_type?.startsWith('image/');

  const handleDensityChange = (val) => {
    setDensity(val);
    localStorage.setItem('hb-media-density', val);
  };

  const densityCols = density === 'compact' ? 6 : density === 'comfortable' ? 3 : 4;

  // X1: Keyboard navigation for media grid
  const [focusIndex, setFocusIndex] = useState(-1);
  const mediaItems = data?.data?.files || data?.data || [];

  useEffect(() => {
    const handler = (e) => {
      // Don't capture when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      const cols = 4; // grid columns
      if (tab !== 0) return; // keyboard nav only on main grid tab
      const len = mediaItems.length;
      if (!len) return;

      switch (e.key) {
        case 'ArrowRight': case 'j':
          e.preventDefault();
          setFocusIndex(prev => Math.min(prev + 1, len - 1));
          break;
        case 'ArrowLeft': case 'k':
          e.preventDefault();
          setFocusIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusIndex(prev => Math.min(prev + cols, len - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusIndex(prev => Math.max(prev - cols, 0));
          break;
        case 'Enter':
          if (focusIndex >= 0 && focusIndex < len) {
            setDetailOpen(mediaItems[focusIndex]);
          }
          break;
        case ' ':
          e.preventDefault();
          if (focusIndex >= 0 && focusIndex < len) {
            toggleSelect(mediaItems[focusIndex].id);
          }
          break;
        case 'Escape':
          if (selected.length > 0) { setSelected ? setSelected([]) : null; }
          else { setFocusIndex(-1); }
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focusIndex, mediaItems, selected, tab]);

    return (
    <Box sx={{ p: 3 }}>
      {/* Page title + destination selector */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('media.title', 'Mediabibliotheek')}</Typography>
          <Typography variant="body2" color="text.secondary">{data?.meta?.total || files.length} {t('media.files', 'bestanden')}</Typography>
        </Box>
        {destInfo && (
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, bgcolor: 'action.hover', px: 1.5, py: 0.5, borderRadius: 1 }}>
            {destInfo.name || selectedDest}
          </Typography>
        )}
      </Box>

      {/* Source tabs */}
      <MediaSourceTabs activeTab={tab} onTabChange={setTab} />

      {/* Tab content */}
      {tab === 0 && (
        <>
          {/* Header bar with search, view, sort, filters, upload */}
          <MediaHeader
            search={search}
            onSearchChange={(v) => { handleSearchChange(v); setVisualQuery(''); }}
            onVisualSearch={(v) => { setVisualQuery(v); setSearch(''); }}
            view={view}
            onViewChange={setView}
            sort={sort}
            order={order}
            onSortChange={handleSortChange}
            filterCount={filterCount}
            onFilterClick={() => setFilterOpen(true)}
            onUploadClick={handleUploadClick}
          />

          {/* Density toggle */}
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Weergave:</Typography>
            {[{k:'compact',l:'Compact'},{k:'default',l:'Normaal'},{k:'comfortable',l:'Groot'}].map(d => (
              <Chip key={d.k} label={d.l} size="small"
                variant={density === d.k ? 'filled' : 'outlined'}
                color={density === d.k ? 'primary' : 'default'}
                onClick={() => handleDensityChange(d.k)}
                sx={{ cursor: 'pointer', fontSize: '0.75rem' }} />
            ))}
          </Box>

          {/* Bulk actions bar */}
          {files.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Tooltip title={selected.size === files.length ? t('media.deselectAll', 'Deselect all') : t('media.selectAll', 'Select all')}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={selected.size === files.length ? <DeselectIcon /> : <SelectAllIcon />}
                  onClick={toggleSelectAll}
                >
                  {selected.size === files.length ? t('media.deselectAll', 'Deselect all') : t('media.selectAll', 'Select all')}
                </Button>
              </Tooltip>
              {selected.size > 0 && (
                <>
                  <Chip label={`${selected.size} ${t('media.selected', 'selected')}`} size="small" color="primary" />
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setBulkDeleteOpen(true)}
                  >
                    {t('media.deleteSelected', 'Delete selected')}
                  </Button>
                </>
              )}
            </Box>
          )}

          {/* Bulk actions bar */}
          <MediaBulkActionsBar
            selectedIds={[...selected]}
            destId={destId}
            onClear={() => setSelected(new Set())}
            onCollectionClick={() => setCollectionsOpen(true)}
          />

          {/* Media grid */}
          <MediaGrid
            focusIndex={focusIndex}
            cols={densityCols}
            items={files}
            view={view}
            selected={selected}
            onSelect={toggleSelect}
            onItemClick={setDetailOpen}
            loading={isLoading}
            apiBase={apiUrl}
            onLoadMore={handleLoadMore}
            onUploadClick={handleUploadClick}
          />
        </>
      )}

      {tab === 1 && (
        <POIImagesTab destId={destId} />
      )}

      {tab === 2 && (
        <PexelsSearchTab destId={destId} />
      )}

      {tab === 3 && (
        <MediaCleanupTab destId={destId} />
      )}

      {/* Detail dialog */}
      {/* Upload Dialog */}
      <MediaUploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        destId={destId}
        onComplete={() => queryClient.invalidateQueries({ queryKey: ['media'] })}
      />

      {/* Media Detail Dialog */}
      <MediaDetailDialog
        open={!!detailOpen}
        mediaId={detailOpen?.id}
        destId={destId}
        apiBase={apiUrl}
        onClose={() => setDetailOpen(null)}
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ['media'] })}
      />

      {/* Bulk delete confirmation */}
      <Dialog open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)}>
        <DialogTitle>{t('media.confirmBulkDelete', 'Confirm Bulk Delete')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('media.bulkDeleteMessage', `Are you sure you want to delete ${selected.size} file(s)? This cannot be undone.`)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => bulkDeleteMut.mutate([...selected])}
            disabled={bulkDeleteMut.isPending}
          >
            {bulkDeleteMut.isPending ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Collections Drawer */}
      <MediaCollectionsDrawer
        open={collectionsOpen}
        onClose={() => setCollectionsOpen(false)}
        selectedIds={[...selected]}
        destId={destId}
        onOpenDetail={(id) => { setCollectionsOpen(false); setCollectionDetailId(id); }}
      />

      {/* Collection Detail Dialog */}
      <MediaCollectionDetailDialog
        open={!!collectionDetailId}
        collectionId={collectionDetailId}
        destId={destId}
        apiBase={apiUrl}
        onClose={() => setCollectionDetailId(null)}
      />

      {/* Filter Drawer */}
      <MediaFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onFilterChange={(f) => { setFilters(f); setPage(1); }}
        destId={destId}
      />

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
