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
import { useTranslation } from 'react-i18next';
import { usePOIList, usePOIStats, usePOIDetail, usePOIUpdate, usePOICategories, usePOIImageReorder } from '../hooks/usePOIs.js';
import useDestinationStore from '../stores/destinationStore.js';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import { formatNumber } from '../utils/formatters.js';
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
      setOrder('ASC');
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
                        {ds.avgRating != null ? ds.avgRating.toFixed(1) : '—'}
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

      {/* Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f8fafc' } }}>
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
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">{t('pois.noResults')}</Typography>
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
                      label={poi.destination_id === 2 ? '\uD83C\uDDF3\uD83C\uDDF1 Texel' : '\uD83C\uDDEA\uD83C\uDDF8 Calpe'}
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
                    <Tooltip title={t('pois.edit')}>
                      <IconButton size="small" onClick={() => setEditId(poi.id)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!isLoading && (
          <TablePagination
            component="div"
            count={pagination.total || 0}
            page={page}
            onPageChange={(_e, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage={t('pois.rowsPerPage')}
          />
        )}
      </TableContainer>

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
  const [snack, setSnack] = useState(null);
  const poi = data?.data?.poi || {};

  const getEnvPrefix = () => {
    const hostname = window.location.hostname;
    if (hostname.includes('admin.dev')) return 'dev.';
    if (hostname.includes('admin.test')) return 'test.';
    return '';
  };
  const envPrefix = getEnvPrefix();
  const frontendUrl = poi.destination_id === 2
    ? `https://${envPrefix}texelmaps.nl/pois/${poi.id}`
    : `https://${envPrefix}holidaibutler.com/pois/${poi.id}`;

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
                        sx={{ height: 80, width: 100, borderRadius: 1, objectFit: 'cover', border: i === 0 ? '2px solid #1976d2' : '1px solid #e2e8f0' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      {i === 0 && (
                        <Chip label={t('pois.primary')} size="small" color="primary" sx={{ position: 'absolute', top: 2, left: 2, fontSize: '0.6rem', height: 18 }} />
                      )}
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
          <Box><Skeleton height={40} /><Skeleton height={300} /></Box>
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
