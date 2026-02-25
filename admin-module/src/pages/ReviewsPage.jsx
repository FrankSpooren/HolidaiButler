import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, TextField, Select, MenuItem,
  FormControl, InputLabel, Grid, Skeleton, TablePagination, TableSortLabel,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, Alert, InputAdornment, Snackbar
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StarIcon from '@mui/icons-material/Star';
import SentimentSatisfiedIcon from '@mui/icons-material/SentimentSatisfied';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import { useTranslation } from 'react-i18next';
import { useReviewList, useReviewDetail, useReviewUpdate } from '../hooks/useReviews.js';
import useDestinationStore from '../stores/destinationStore.js';
import useAuthStore from '../stores/authStore.js';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import { formatDate, formatNumber } from '../utils/formatters.js';
import { DESTINATIONS, getDestinationColor } from '../utils/destinations.js';

const SENTIMENT_CONFIG = {
  positive: { icon: SentimentSatisfiedIcon, color: '#22c55e', label: 'Positief' },
  neutral: { icon: SentimentNeutralIcon, color: '#f59e0b', label: 'Neutraal' },
  negative: { icon: SentimentDissatisfiedIcon, color: '#ef4444', label: 'Negatief' }
};

export default function ReviewsPage() {
  const { t } = useTranslation();
  const globalDestination = useDestinationStore(s => s.selectedDestination);
  const user = useAuthStore(s => s.user);
  const canModerate = user?.role !== 'reviewer'; // reviewers can only view, not archive/unarchive
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [destination, setDestination] = useState(globalDestination);
  const [rating, setRating] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [archived, setArchived] = useState('false');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('DESC');
  const [detailId, setDetailId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', undoReview: null });

  // Sync with global destination
  useEffect(() => {
    setDestination(globalDestination);
    setPage(0);
  }, [globalDestination]);

  const filters = {
    page: page + 1,
    limit: rowsPerPage,
    ...(search && { search }),
    ...(destination !== 'all' && { destination }),
    ...(rating && { rating }),
    ...(sentiment && { sentiment }),
    archived,
    sort,
    order
  };

  const { data, isLoading, error, refetch } = useReviewList(filters);
  const updateMutation = useReviewUpdate();

  const reviews = data?.data?.reviews || [];
  const pagination = data?.data?.pagination || {};
  const summary = data?.data?.summary || {};

  const handleSearch = () => { setSearch(searchInput); setPage(0); };

  const handleSort = (col) => {
    if (sort === col) {
      setOrder(o => o === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSort(col);
      setOrder(col === 'created_at' ? 'DESC' : 'ASC');
    }
    setPage(0);
  };

  const handleArchiveToggle = async (review, e) => {
    e.stopPropagation();
    const wasArchived = review.is_archived;
    try {
      await updateMutation.mutateAsync({
        id: review.id,
        data: { is_archived: !wasArchived }
      });
      setSnackbar({
        open: true,
        message: wasArchived ? t('reviews.unarchived') : t('reviews.archived'),
        undoReview: { id: review.id, is_archived: wasArchived }
      });
    } catch { /* shown in UI */ }
  };

  const handleUndo = async () => {
    if (!snackbar.undoReview) return;
    try {
      await updateMutation.mutateAsync({
        id: snackbar.undoReview.id,
        data: { is_archived: snackbar.undoReview.is_archived }
      });
    } catch { /* ignore */ }
    setSnackbar({ open: false, message: '', undoReview: null });
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        {t('reviews.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('reviews.subtitle')}
      </Typography>

      {error && <ErrorBanner onRetry={refetch} />}

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">{t('reviews.summary.total')}</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{formatNumber(summary.total)}</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">{t('reviews.summary.avgRating')}</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {summary.avgRating ? Number(summary.avgRating).toFixed(1) : '—'}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">{t('reviews.summary.positive')}</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#22c55e' }}>
              {formatNumber(summary.positive)}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">{t('reviews.summary.negative')}</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#ef4444' }}>
              {formatNumber(summary.negative)}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth size="small"
              placeholder={t('reviews.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
              <InputLabel>{t('reviews.filter.destination')}</InputLabel>
              <Select value={destination} label={t('reviews.filter.destination')} onChange={(e) => { setDestination(e.target.value); setPage(0); }}>
                <MenuItem value="all">{t('common.allDestinations')}</MenuItem>
                {DESTINATIONS.map(d => <MenuItem key={d.code} value={d.code}>{d.flag} {d.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('reviews.filter.rating')}</InputLabel>
              <Select value={rating} label={t('reviews.filter.rating')} onChange={(e) => { setRating(e.target.value); setPage(0); }}>
                <MenuItem value="">{t('reviews.filter.allRatings')}</MenuItem>
                {[5, 4, 3, 2, 1].map(r => <MenuItem key={r} value={String(r)}>{r} {'\u2605'.repeat(r)}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('reviews.filter.sentiment')}</InputLabel>
              <Select value={sentiment} label={t('reviews.filter.sentiment')} onChange={(e) => { setSentiment(e.target.value); setPage(0); }}>
                <MenuItem value="">{t('reviews.filter.allSentiments')}</MenuItem>
                <MenuItem value="positive">{t('reviews.filter.positive')}</MenuItem>
                <MenuItem value="neutral">{t('reviews.filter.neutral')}</MenuItem>
                <MenuItem value="negative">{t('reviews.filter.negative')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('reviews.filter.archived')}</InputLabel>
              <Select value={archived} label={t('reviews.filter.archived')} onChange={(e) => { setArchived(e.target.value); setPage(0); }}>
                <MenuItem value="false">{t('reviews.filter.active')}</MenuItem>
                <MenuItem value="true">{t('reviews.filter.archivedOnly')}</MenuItem>
                <MenuItem value="">{t('reviews.filter.all')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Card>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
              <TableCell>
                <TableSortLabel active={sort === 'poiName'} direction={sort === 'poiName' ? order.toLowerCase() : 'asc'} onClick={() => handleSort('poiName')}>
                  {t('reviews.table.poi')}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={sort === 'user_name'} direction={sort === 'user_name' ? order.toLowerCase() : 'asc'} onClick={() => handleSort('user_name')}>
                  {t('reviews.table.user')}
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel active={sort === 'rating'} direction={sort === 'rating' ? order.toLowerCase() : 'asc'} onClick={() => handleSort('rating')}>
                  {t('reviews.table.rating')}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={sort === 'sentiment'} direction={sort === 'sentiment' ? order.toLowerCase() : 'asc'} onClick={() => handleSort('sentiment')}>
                  {t('reviews.table.sentiment')}
                </TableSortLabel>
              </TableCell>
              <TableCell>{t('reviews.table.text')}</TableCell>
              <TableCell>
                <TableSortLabel active={sort === 'created_at'} direction={sort === 'created_at' ? order.toLowerCase() : 'asc'} onClick={() => handleSort('created_at')}>
                  {t('reviews.table.date')}
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">{t('reviews.table.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              [...Array(10)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(7)].map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                </TableRow>
              ))
            ) : reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">{t('reviews.noResults')}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              reviews.map(review => {
                const sc = SENTIMENT_CONFIG[review.sentiment] || SENTIMENT_CONFIG.neutral;
                const SentIcon = sc.icon;
                return (
                  <TableRow
                    key={review.id} hover
                    sx={{ cursor: 'pointer', opacity: review.is_archived ? 0.6 : 1 }}
                    onClick={() => setDetailId(review.id)}
                  >
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {review.poiName || `POI #${review.poi_id}`}
                        </Typography>
                        <Chip
                          size="small"
                          label={review.destination_id === 2 ? '🇳🇱 Texel' : '🇪🇸 Calpe'}
                          sx={{ mt: 0.3, bgcolor: getDestinationColor(review.destination_id === 2 ? 'texel' : 'calpe') + '22', fontSize: '0.65rem' }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {review.user_name || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.3 }}>
                        <StarIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                        <Typography variant="body2">{review.rating}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        icon={<SentIcon sx={{ fontSize: 14 }} />}
                        label={sc.label}
                        sx={{ bgcolor: sc.color + '18', color: sc.color, fontWeight: 600, fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {review.review_text || <em style={{ color: '#9ca3af' }}>{t('reviews.noText')}</em>}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        {formatDate(review.visit_date || review.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title={t('reviews.view')}>
                        <IconButton size="small" onClick={() => setDetailId(review.id)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {canModerate && (
                      <Tooltip title={review.is_archived ? t('reviews.unarchive') : t('reviews.archive')}>
                        <IconButton size="small" onClick={(e) => handleArchiveToggle(review, e)}>
                          {review.is_archived ? <UnarchiveIcon fontSize="small" /> : <ArchiveIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
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
            labelRowsPerPage={t('reviews.rowsPerPage')}
          />
        )}
      </TableContainer>

      {/* Detail Dialog */}
      {detailId && <ReviewDetailDialog reviewId={detailId} onClose={() => setDetailId(null)} />}

      {/* Archive Snackbar with Undo */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        message={snackbar.message}
        action={
          <Button color="inherit" size="small" onClick={handleUndo}>
            {t('reviews.undo')}
          </Button>
        }
      />
    </Box>
  );
}

/* ===== Review Detail Dialog ===== */
function ReviewDetailDialog({ reviewId, onClose }) {
  const { t } = useTranslation();
  const { data, isLoading, error } = useReviewDetail(reviewId);
  const review = data?.data?.review || {};
  const sc = SENTIMENT_CONFIG[review.sentiment] || SENTIMENT_CONFIG.neutral;

  return (
    <Dialog open maxWidth="sm" fullWidth onClose={onClose}>
      <DialogTitle>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('reviews.detail.title')}</Typography>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{t('common.error')}</Alert>}
        {isLoading ? (
          <Box><Skeleton height={40} /><Skeleton height={200} /></Box>
        ) : (
          <>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">{t('reviews.detail.poi')}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{review.poiName || `POI #${review.poi_id}`}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">{t('reviews.detail.destination')}</Typography>
                <Typography variant="body2">{review.destination_id === 2 ? '🇳🇱 Texel' : '🇪🇸 Calpe'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">{t('reviews.detail.user')}</Typography>
                <Typography variant="body2">{review.user_name || '—'}</Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary">{t('reviews.detail.rating')}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                  <StarIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>{review.rating}</Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary">{t('reviews.detail.sentiment')}</Typography>
                <Chip size="small" label={sc.label} sx={{ bgcolor: sc.color + '18', color: sc.color, fontWeight: 600 }} />
              </Grid>
            </Grid>

            <Typography variant="caption" color="text.secondary">{t('reviews.detail.reviewText')}</Typography>
            <Card variant="outlined" sx={{ p: 2, mb: 2, minHeight: 80 }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {review.review_text || <em>{t('reviews.noText')}</em>}
              </Typography>
            </Card>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">{t('reviews.detail.visitDate')}</Typography>
                <Typography variant="body2">{formatDate(review.visit_date)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">{t('reviews.detail.createdAt')}</Typography>
                <Typography variant="body2">{formatDate(review.created_at)}</Typography>
              </Grid>
            </Grid>

            {review.is_archived && (
              <Alert severity="info" sx={{ mt: 2 }}>
                {t('reviews.detail.archivedAt')}: {formatDate(review.archived_at)}
              </Alert>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('reviews.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
