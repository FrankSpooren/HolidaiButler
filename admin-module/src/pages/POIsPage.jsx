import { useState, useCallback, useEffect } from 'react';
import {
  Box, Typography, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, TextField, Select, MenuItem,
  FormControl, InputLabel, Grid, Skeleton, TablePagination, TableSortLabel,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, Alert, Tabs, Tab, InputAdornment, Snackbar,
  Autocomplete
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ImageIcon from '@mui/icons-material/Image';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';
import SyncIcon from '@mui/icons-material/Sync';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useTranslation } from 'react-i18next';
import { usePOIList, usePOIStats, usePOIDetail, usePOIUpdate, usePOICategories, usePOIImageReorder, usePOIImageDelete } from '../hooks/usePOIs.js';
import useDestinationStore from '../stores/destinationStore.js';
import useAuthStore from '../stores/authStore.js';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import { formatNumber } from '../utils/formatters.js';
import POIImageReviewQueue from '../components/poi/POIImageReviewQueue.jsx';
import POIClassificationDashboard from '../components/poi/POIClassificationDashboard.jsx';
import POIDiscoveryDashboard from '../components/poi/POIDiscoveryDashboard.jsx';
import client from '../api/client.js';
import POIFreshnessPanel from '../components/poi/POIFreshnessPanel.jsx';
import Checkbox from '@mui/material/Checkbox';
import { DESTINATIONS, getDestinationColor } from '../utils/destinations.js';

const CONTENT_LANGS = ['en', 'nl', 'de', 'es'];
const LANG_LABELS = { en: 'English', nl: 'Nederlands', de: 'Deutsch', es: 'Español' };

const SORTABLE_COLUMNS = [
  { id: 'id', label: 'ID', align: 'left' },
  { id: 'name', label: 'pois.table.name', i18n: true, align: 'left' },
  { id: 'destination_id', label: 'pois.table.destination', i18n: true, align: 'left' },
  { id: 'category', label: 'pois.table.category', i18n: true, align: 'left' },
];

export default function POIsPage() {
  const { t } = useTranslation();
  const globalDestination = useDestinationStore(s => s.selectedDestination);
  const [selectedPois, setSelectedPois] = useState(new Set());
  const [bulkAction, setBulkAction] = useState(null);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkStatus, setBulkStatus] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSnack, setBulkSnack] = useState(null);
  const [showFreshness, setShowFreshness] = useState(false);
  const [poiTab, setPoiTab] = useState(0);
  const user = useAuthStore(s => s.user);
  const canEdit = user?.role !== 'reviewer'; // reviewers can only view, not edit

  // Filters
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [destination, setDestination] = useState(globalDestination);
  const [category, setCategory] = useState('');
  const [hasContent, setHasContent] = useState('');
  const [isActive, setIsActive] = useState('');
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState('ASC');

  // Sync with global destination
  useEffect(() => {
    setDestination(globalDestination);
    setPage(0);
  }, [globalDestination]);

  // Detail/Edit dialogs
  const [detailId, setDetailId] = useState(null);
  const [editId, setEditId] = useState(null);

  const filters = {
    page: page + 1,
    limit: rowsPerPage,
    ...(search && { search }),
    ...(destination !== 'all' && { destination }),
    ...(category && { category }),
    ...(hasContent && { hasContent }),
    ...(isActive && { isActive }),
    sort,
    order
  };

  const { data, isLoading, error, refetch } = usePOIList(filters);
  const { data: stats, isLoading: statsLoading } = usePOIStats();
  const { data: catData } = usePOICategories(destination);

  const pois = data?.data?.pois || [];
  const pagination = data?.data?.pagination || {};
  const statsData = stats?.data || {};
  const categories = catData?.data?.categories || [];

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(0);
  }, [searchInput]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleSort = (col) => {
    if (sort === col) {
      setOrder(o => o === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSort(col);
      setOr
  const togglePoiSelect = (id) => {
    setSelectedPois(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkCategory = async () => {
    if (!bulkCategory || selectedPois.size === 0) return;
    setBulkLoading(true);
    try {
      await client.post('/pois/bulk-category', { poiIds: [...selectedPois], category: bulkCategory });
      setBulkSnack('Categorie gewijzigd voor ' + selectedPois.size + ' POIs');
      setSelectedPois(new Set());
      setBulkAction(null);
    } catch (e) { setBulkSnack('Fout: ' + (e.response?.data?.error?.message || e.message)); }
    finally { setBulkLoading(false); }
  };

  const handleBulkStatus = async () => {
    if (selectedPois.size === 0) return;
    setBulkLoading(true);
    try {
      await client.post('/pois/bulk-status', { poiIds: [...selectedPois], is_active: bulkStatus });
      setBulkSnack('Status gewijzigd voor ' + selectedPois.size + ' POIs');
      setSelectedPois(new Set());
      setBulkAction(null);
    } catch (e) { setBulkSnack('Fout: ' + (e.response?.data?.error?.message || e.message)); }
    finally { setBulkLoading(false); }
  };
der('ASC');
    }
    setPage(0);
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        {t('pois.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('pois.subtitle')}
      </Typography>

      {error && <ErrorBanner onRetry={refetch} />}

      {/* Stats cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {DESTINATIONS.map(d => {
          const ds = statsData[d.code] || {};
          return (
            <Grid item xs={12} md={6} key={d.code}>
              {statsLoading ? <Skeleton variant="rounded" height={100} /> : (
                <Card sx={{ p: 2, borderLeft: `4px solid ${d.color}` }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {d.flag} {d.name}
                  </Typography>
                  <Grid container spacing={1} sx={{ mt: 0.5 }}>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary">{t('pois.stats.total')}</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{formatNumber(ds.total)}</Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary">{t('pois.stats.active')}</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{formatNumber(ds.active)}</Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary">{t('pois.stats.withContent')}</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {ds.contentCoverage != null ? `${ds.contentCoverage}%` : '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary">{t('pois.stats.avgRating')}</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {ds.avgRating != null ? Number(ds.avgRating).toFixed(1) : '—'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Card>
              )}
            </Grid>
          );
        })}
      </Grid>

      {/* Filters */}
      <Card sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth size="small"
              placeholder={t('pois.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleSearch}><SearchIcon /></IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('pois.filter.destination')}</InputLabel>
              <Select value={destination} label={t('pois.filter.destination')} onChange={(e) => { setDestination(e.target.value); setPage(0); }}>
                <MenuItem value="all">{t('common.allDestinations')}</MenuItem>
                {DESTINATIONS.map(d => <MenuItem key={d.code} value={d.code}>{d.flag} {d.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('pois.filter.category')}</InputLabel>
              <Select value={category} label={t('pois.filter.category')} onChange={(e) => { setCategory(e.target.value); setPage(0); }}>
                <MenuItem value="">{t('pois.filter.all')}</MenuItem>
                {categories.map(c => (
                  <MenuItem key={c.name} value={c.name}>{c.name} ({c.count})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('pois.filter.content')}</InputLabel>
              <Select value={hasContent} label={t('pois.filter.content')} onChange={(e) => { setHasContent(e.target.value); setPage(0); }}>
                <MenuItem value="">{t('pois.filter.all')}</MenuItem>
                <MenuItem value="true">{t('pois.filter.withContent')}</MenuItem>
                <MenuItem value="false">{t('pois.filter.withoutContent')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('pois.filter.status')}</InputLabel>
              <Select value={isActive} label={t('pois.filter.status')} onChange={(e) => { setIsActive(e.target.value); setPage(0); }}>
                <MenuItem value="">{t('pois.filter.all')}</MenuItem>
                <MenuItem value="true">{t('pois.filter.active')}</MenuItem>
                <MenuItem value="false">{t('pois.filter.inactive')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={1}>
            <Tooltip title={order === 'ASC' ? 'Ascending' : 'Descending'}>
              <Button
                size="small" variant="outlined" fullWidth
                onClick={() => setOrder(o => o === 'ASC' ? 'DESC' : 'ASC')}
              >
                {order === 'ASC' ? '\u2191' : '\u2193'}
              </Button>
            </Tooltip>
          </Grid>
        </Grid>
      </Card>

      {/* POI Pipeline Tabs */}
      <Tabs value={poiTab} onChange={(_, v) => setPoiTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="POI Lijst" />
        <Tab label="Image Review" />
        <Tab label="Classification" />
        <Tab label="Discovery" />
        <Tab label="Freshness" />
      </Tabs>

      {poiTab === 1 && <POIImageReviewQueue />}
      {poiTab === 2 && <POIClassificationDashboard />}
      {poiTab === 3 && <POIDiscoveryDashboard />}
      {poiTab === 4 && <POIFreshnessPanel destinationId={destination || globalDestination} />}

      {poiTab === 0 && (
      <>
      {/* Pagination Bar — boven de tabel, altijd zichtbaar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, px: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="body2" color="text.secondary">Rijen per pagina:</Typography>
          <Select
            size="small"
            value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            sx={{ minWidth: 80, height: 32, fontSize: '0.875rem' }}
          >
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={100}>100</MenuItem>
            <MenuItem value={250}>250</MenuItem>
            <MenuItem value={500}>500</MenuItem>
          </Select>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {pagination.total > 0
              ? `${page * rowsPerPage + 1}–${Math.min((page + 1) * rowsPerPage, pagination.total)} van ${pagination.total}`
              : '0 resultaten'}
          </Typography>
          <IconButton size="small" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" disabled={(page + 1) * rowsPerPage >= (pagination.total || 0)} onClick={() => setPage(p => p + 1)}>
            <ArrowForwardIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
              {SORTABLE_COLUMNS.map(col => (
                <TableCell key={col.id} align={col.align}>
                  <TableSortLabel
                    active={sort === col.id}
                    direction={sort === col.id ? order.toLowerCase() : 'asc'}
                    onClick={() => handleSort(col.id)}
                  >
                    {col.i18n ? t(col.label) : col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell align="center"><ImageIcon fontSize="small" /></TableCell>
              <TableCell align="center">
                <TableSortLabel active={sort === 'rating'} direction={sort === 'rating' ? order.toLowerCase() : 'asc'} onClick={() => handleSort('rating')}>
                  <StarIcon fontSize="small" />
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">{t('pois.table.content')}</TableCell>
              <TableCell align="center">{t('pois.table.status')}</TableCell>
              <TableCell align="center">{t('pois.table.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              [...Array(10)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(9)].map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                </TableRow>
              ))
            ) : pois.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} sx={{ py: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary" sx={{ mb: 0.5 }}>{t('pois.noResults')}</Typography>
                  <Typography variant="caption" color="text.disabled">{t('pois.noResultsHint', 'POIs worden automatisch gesynchroniseerd via Apify. Controleer de destination configuratie.')}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              pois.map(poi => (
                <TableRow key={poi.id} hover sx={{ cursor: 'pointer' }} onClick={() => setDetailId(poi.id)}>
                  <TableCell>{poi.id}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {poi.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={poi.destination_id === 2 ? '🇳🇱 Texel' : '🇪🇸 Calpe'}
                      sx={{ bgcolor: getDestinationColor(poi.destination_id === 2 ? 'texel' : 'calpe') + '22', fontWeight: 600, fontSize: '0.75rem' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {poi.category || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{poi.imageCount || 0}</TableCell>
                  <TableCell align="center">
                    {poi.avgRating ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.3 }}>
                        <StarIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                        <Typography variant="body2">{Number(poi.avgRating).toFixed(1)}</Typography>
                      </Box>
                    ) : '—'}
                  </TableCell>
                  <TableCell align="center">
                    {poi.hasContent ? (
                      <CheckCircleIcon sx={{ fontSize: 18, color: '#22c55e' }} />
                    ) : (
                      <CancelIcon sx={{ fontSize: 18, color: '#ef4444' }} />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      label={poi.is_active ? t('pois.active') : t('pois.inactive')}
                      color={poi.is_active ? 'success' : 'default'}
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  </TableCell>
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title={t('pois.view')}>
                      <IconButton size="small" onClick={() => setDetailId(poi.id)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {canEdit && (
                    <Tooltip title={t('pois.edit')}>
                      <IconButton size="small" onClick={() => setEditId(poi.id)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
      </TableContainer>


      </>
      )}
      {/* Detail Dialog */}
      {detailId && (
        <POIDetailDialog
          poiId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={() => { setEditId(detailId); setDetailId(null); }}
        />
      )}

      {/* Edit Dialog */}
      {editId && (
        <POIEditDialog
          poiId={editId}
          onClose={() => setEditId(null)}
          onSaved={() => { setEditId(null); refetch(); }}
        />
      )}
    </Box>
  );
}

/* ===== Detail Dialog ===== */
function POIDetailDialog({ poiId, onClose, onEdit }) {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = usePOIDetail(poiId);
  const [langTab, setLangTab] = useState(0);
  const reorderMutation = usePOIImageReorder();
  const deleteMutation = usePOIImageDelete();
  const [snack, setSnack] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // imageId to confirm
  const [generatingContent, setGeneratingContent] = useState(false);
  const poi = data?.data?.poi || {};

  // 9.6: Generate content from POI
  const handleGenerateFromPOI = async () => {
    if (!poi.id) return;
    setGeneratingContent(true);
    try {
      const contentService = (await import('../api/contentService.js')).default;
      await contentService.generateFromPOI(poi.id, {
        destination_id: poi.destination_id,
        content_type: 'blog',
        platforms: ['website'],
      });
      setSnack('Content gegenereerd! Bekijk in Content Studio.');
    } catch (err) {
      setSnack(err.message || 'Content generatie mislukt');
    } finally {
      setGeneratingContent(false);
    }
  };

  const getEnvPrefix = () => {
    const hostname = window.location.hostname;
    if (hostname.includes('admin.dev')) return 'dev.';
    if (hostname.includes('admin.test')) return 'test.';
    return '';
  };
  const envPrefix = getEnvPrefix();
  const frontendUrl = poi.destination_id === 2
    ? `https://${envPrefix}texelmaps.nl/pois/${poi.id}`
    : `https://${envPrefix}calpetrip.com/pois/${poi.id}`;

  const handleMoveImage = async (images, fromIdx, direction) => {
    const toIdx = fromIdx + direction;
    if (toIdx < 0 || toIdx >= images.length) return;
    const newOrder = [...images];
    [newOrder[fromIdx], newOrder[toIdx]] = [newOrder[toIdx], newOrder[fromIdx]];
    const imageIds = newOrder.map(img => img.id);
    try {
      await reorderMutation.mutateAsync({ poiId: poi.id, imageIds });
      refetch();
      setSnack(t('pois.imageReordered'));
    } catch {
      setSnack(t('common.error'));
    }
  };

  const handleDeleteImage = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteMutation.mutateAsync({ poiId: poi.id, imageId: deleteConfirm });
      setDeleteConfirm(null);
      refetch();
      setSnack(t('pois.imageDeleted'));
    } catch {
      setSnack(t('common.error'));
    }
  };

  return (
    <Dialog open maxWidth="md" fullWidth onClose={onClose}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {isLoading ? <Skeleton width={200} /> : poi.name}
          </Typography>
          {!isLoading && (
            <Typography variant="body2" color="text.secondary">
              ID: {poi.id} | {poi.destination_id === 2 ? '🇳🇱 Texel' : '🇪🇸 Calpe'} | {poi.category}{poi.subcategory ? ` > ${poi.subcategory}` : ''}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {!isLoading && poi.is_active && (
            <Button
              variant="outlined" size="small" startIcon={<OpenInNewIcon />}
              onClick={() => window.open(frontendUrl, '_blank')}
            >
              {t('pois.viewOnFrontend')}
            </Button>
          )}
          {!isLoading && !poi.is_active && (
            <Chip label={t('pois.inactiveOnFrontend')} size="small" color="default" variant="outlined" />
          )}
          <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={onEdit}>
            {t('pois.edit')}
          </Button>
          <Tooltip title="Genereer AI content op basis van deze POI">
            <Button variant="outlined" size="small" color="secondary" startIcon={generatingContent ? <SyncIcon sx={{ animation: 'spin 1s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} /> : <AutoAwesomeIcon />} onClick={handleGenerateFromPOI} disabled={generatingContent}>
              {generatingContent ? 'Genereren...' : 'Genereer Content'}
            </Button>
          </Tooltip>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{t('common.error')}</Alert>}
        {isLoading ? (
          <Box><Skeleton height={40} /><Skeleton height={200} /><Skeleton height={100} /></Box>
        ) : (
          <>
            {/* Images with reorder */}
            {poi.images?.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  {t('pois.images')} ({poi.images.length})
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, overflowX: 'auto', pb: 1 }}>
                  {poi.images.slice(0, 10).map((img, i) => (
                    <Box key={img.id} sx={{ position: 'relative', flexShrink: 0 }}>
                      <Box
                        component="img"
                        src={img.url}
                        alt={`${poi.name} ${i + 1}`}
                        sx={{ height: 80, width: 100, borderRadius: 1, objectFit: 'cover', border: (theme) => i === 0 ? '2px solid #1976d2' : `1px solid ${theme.palette.divider}` }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      {/* C2: Image numbering — Primary badge or number */}
                      <Chip
                        label={i === 0 ? t('pois.primary') : String(i + 1)}
                        size="small"
                        color={i === 0 ? 'success' : 'default'}
                        sx={{ position: 'absolute', top: 2, left: 2, fontSize: '0.6rem', height: 18, minWidth: 20 }}
                      />
                      {/* C1: Delete button */}
                      <IconButton
                        size="small"
                        onClick={() => setDeleteConfirm(img.id)}
                        sx={{ position: 'absolute', top: 1, right: 1, bgcolor: 'rgba(255,255,255,0.85)', p: 0.2, '&:hover': { bgcolor: 'rgba(255,200,200,0.95)' } }}
                      >
                        <CloseIcon sx={{ fontSize: 14, color: '#d32f2f' }} />
                      </IconButton>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0 }}>
                        <IconButton
                          size="small" disabled={i === 0 || reorderMutation.isPending}
                          onClick={() => handleMoveImage(poi.images, i, -1)}
                          sx={{ p: 0.2 }}
                        >
                          <ArrowUpwardIcon sx={{ fontSize: 14, transform: 'rotate(-90deg)' }} />
                        </IconButton>
                        <IconButton
                          size="small" disabled={i === poi.images.length - 1 || reorderMutation.isPending}
                          onClick={() => handleMoveImage(poi.images, i, 1)}
                          sx={{ p: 0.2 }}
                        >
                          <ArrowDownwardIcon sx={{ fontSize: 14, transform: 'rotate(-90deg)' }} />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </>
            )}

            {/* Content tabs per language */}
            <Tabs value={langTab} onChange={(_e, v) => setLangTab(v)} sx={{ mb: 2 }}>
              {CONTENT_LANGS.map(l => <Tab key={l} label={LANG_LABELS[l]} />)}
            </Tabs>
            <Card variant="outlined" sx={{ p: 2, mb: 2, minHeight: 120 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                {t('pois.detail.description')}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {poi.content?.[CONTENT_LANGS[langTab]]?.detail || (
                  <Typography color="text.secondary" component="em">{t('pois.detail.noContent')}</Typography>
                )}
              </Typography>
              {poi.content?.[CONTENT_LANGS[langTab]]?.tile && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 0.5 }}>
                    {t('pois.detail.tileDescription')}
                  </Typography>
                  <Typography variant="body2">{poi.content[CONTENT_LANGS[langTab]].tile}</Typography>
                </>
              )}
            </Card>

            {/* Sync & Metadata Info */}
            <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SyncIcon fontSize="small" /> {t('pois.detail.syncInfo')}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary">{t('pois.detail.lastApifySync')}</Typography>
                  <Typography variant="body2">
                    {poi.lastApifyScrape?.scrapedAt
                      ? new Date(poi.lastApifyScrape.scrapedAt).toLocaleDateString('nl-NL')
                      : '\u2014'}
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary">Tier</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {poi.tier ? `Tier ${poi.tier}` : '\u2014'}
                    {poi.tier_score != null && <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>({poi.tier_score})</Typography>}
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary">{t('pois.detail.googleRating')}</Typography>
                  <Typography variant="body2">
                    {poi.google_rating ? `${poi.google_rating} (${poi.google_review_count || 0})` : '\u2014'}
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary">{t('pois.detail.freshness')}</Typography>
                  <Box>
                    <Chip size="small"
                      label={poi.content_freshness_status || 'unverified'}
                      color={poi.content_freshness_status === 'fresh' ? 'success' :
                             poi.content_freshness_status === 'aging' ? 'warning' : 'default'} />
                  </Box>
                </Grid>
              </Grid>
              {poi.lastApifyScrape?.validationStatus === 'error' && (
                <Alert severity="error" sx={{ mt: 1 }} variant="outlined">
                  {poi.lastApifyScrape.validationNotes}
                </Alert>
              )}
              {poi.lastApifyScrape?.validationStatus === 'warning' && (
                <Alert severity="warning" sx={{ mt: 1 }} variant="outlined">
                  {poi.lastApifyScrape.validationNotes}
                </Alert>
              )}
            </Card>

            {/* Review Summary */}
            {poi.reviewSummary && (
              <Card variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{t('pois.detail.reviews')}</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">{t('pois.detail.totalReviews')}</Typography>
                    <Typography variant="h6">{poi.reviewSummary.total}</Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">{t('pois.detail.avgRating')}</Typography>
                    <Typography variant="h6">
                      {poi.reviewSummary.avgRating ? Number(poi.reviewSummary.avgRating).toFixed(1) : '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">{t('pois.detail.distribution')}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      {(poi.reviewSummary.distribution || []).map(d => (
                        <Chip key={d.rating} size="small" label={`${d.rating}\u2605 (${d.count})`} variant="outlined" />
                      ))}
                    </Box>
                  </Grid>
                </Grid>
              </Card>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('pois.close')}</Button>
      </DialogActions>
      {/* C1: Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>{t('pois.deleteImageTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{t('pois.deleteImageConfirm')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>{t('pois.cancel')}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteImage}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? t('pois.deleting') : t('pois.deleteImage')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
        message={snack}
      />
    </Dialog>
  );
}

/* ===== Edit Dialog ===== */
function POIEditDialog({ poiId, onClose, onSaved }) {
  const { t } = useTranslation();
  const { data, isLoading } = usePOIDetail(poiId);
  const updateMutation = usePOIUpdate();
  const { data: catData } = usePOICategories();
  const [langTab, setLangTab] = useState(0);
  const [descriptions, setDescriptions] = useState({});
  const [activeState, setActiveState] = useState(null);
  const [categoryValue, setCategoryValue] = useState('');
  const [subcategoryValue, setSubcategoryValue] = useState('');
  const [initialized, setInitialized] = useState(false);

  const poi = data?.data?.poi || {};
  const categories = catData?.data?.categories || [];
  const subcatMap = catData?.data?.subcategories || {};
  const subcatOptions = subcatMap[categoryValue] || [];

  // Initialize form when data loads
  if (!isLoading && poi.id && !initialized) {
    const descs = {};
    CONTENT_LANGS.forEach(lang => {
      descs[lang] = poi.content?.[lang]?.detail || '';
    });
    setDescriptions(descs);
    setActiveState(poi.is_active ? 'true' : 'false');
    setCategoryValue(poi.category || '');
    setSubcategoryValue(poi.subcategory || '');
    setInitialized(true);
  }

  const handleSave = async () => {
    const payload = {
      descriptions,
      is_active: activeState === 'true',
      category: categoryValue,
      subcategory: subcategoryValue || null
    };
    try {
      await updateMutation.mutateAsync({ id: poiId, data: payload });
      onSaved();
    } catch {
      // error shown in UI
    }
  };

  const currentLang = CONTENT_LANGS[langTab];
  const charCount = (descriptions[currentLang] || '').length;

  return (
    <Dialog open maxWidth="md" fullWidth onClose={onClose}>
      <DialogTitle>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {t('pois.editTitle')}: {isLoading ? '...' : poi.name}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {isLoading ? (
          <Box><Skeleton height={40} /><Skeleton height={300} />
      {/* Bulk Category Dialog */}
      <Dialog open={bulkAction === 'category'} onClose={() => setBulkAction(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Categorie wijzigen ({selectedPois.size} POIs)</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Nieuwe categorie" value={bulkCategory} onChange={e => setBulkCategory(e.target.value)}
            sx={{ mt: 1 }} size="small" placeholder="bijv. Food & Drinks" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkAction(null)}>Annuleer</Button>
          <Button variant="contained" onClick={handleBulkCategory} disabled={bulkLoading || !bulkCategory}>
            {bulkLoading ? 'Bezig...' : 'Wijzig categorie'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Status Dialog */}
      <Dialog open={bulkAction === 'status'} onClose={() => setBulkAction(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{bulkStatus ? 'Activeren' : 'Deactiveren'} ({selectedPois.size} POIs)</DialogTitle>
        <DialogContent>
          <Typography>Weet je zeker dat je {selectedPois.size} POIs wilt {bulkStatus ? 'activeren' : 'deactiveren'}?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkAction(null)}>Annuleer</Button>
          <Button variant="contained" color={bulkStatus ? 'success' : 'error'} onClick={handleBulkStatus} disabled={bulkLoading}>
            {bulkLoading ? 'Bezig...' : (bulkStatus ? 'Activeren' : 'Deactiveren')}
          </Button>
        </DialogActions>
      </Dialog>

      {bulkSnack && (
        <Snackbar open autoHideDuration={3000} onClose={() => setBulkSnack(null)}>
          <Alert severity="info" onClose={() => setBulkSnack(null)}>{bulkSnack}</Alert>
        </Snackbar>
      )}

    </Box>
        ) : (
          <>
            {updateMutation.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {updateMutation.error?.response?.data?.error || t('common.error')}
              </Alert>
            )}

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('pois.filter.status')}</InputLabel>
                  <Select value={activeState || ''} label={t('pois.filter.status')} onChange={(e) => setActiveState(e.target.value)}>
                    <MenuItem value="true">{t('pois.active')}</MenuItem>
                    <MenuItem value="false">{t('pois.inactive')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <Autocomplete
                  freeSolo
                  size="small"
                  options={categories.map(c => c.name)}
                  value={categoryValue}
                  onChange={(_e, v) => { setCategoryValue(v || ''); setSubcategoryValue(''); }}
                  onInputChange={(_e, v) => { setCategoryValue(v || ''); }}
                  renderInput={(params) => (
                    <TextField {...params} label={t('pois.table.category')} />
                  )}
                />
              </Grid>
              <Grid item xs={6}>
                <Autocomplete
                  freeSolo
                  size="small"
                  options={subcatOptions}
                  value={subcategoryValue}
                  onChange={(_e, v) => setSubcategoryValue(v || '')}
                  onInputChange={(_e, v) => setSubcategoryValue(v || '')}
                  renderInput={(params) => (
                    <TextField {...params} label={t('pois.filter.subcategory')} />
                  )}
                />
              </Grid>
            </Grid>

            <Tabs value={langTab} onChange={(_e, v) => setLangTab(v)} sx={{ mb: 2 }}>
              {CONTENT_LANGS.map(l => <Tab key={l} label={LANG_LABELS[l]} />)}
            </Tabs>

            <TextField
              fullWidth multiline rows={8}
              label={`${t('pois.detail.description')} (${LANG_LABELS[currentLang]})`}
              value={descriptions[currentLang] || ''}
              onChange={(e) => setDescriptions(d => ({ ...d, [currentLang]: e.target.value }))}
              helperText={`${charCount} / 2000 ${t('pois.characters')}`}
              error={charCount > 2000}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={updateMutation.isPending}>{t('pois.cancel')}</Button>
        <Button
          variant="contained" onClick={handleSave}
          disabled={updateMutation.isPending || charCount > 2000}
        >
          {updateMutation.isPending ? t('pois.saving') : t('pois.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
