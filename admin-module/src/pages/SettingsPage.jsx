import { useState } from 'react';
import {
  Box, Typography, Card, Grid, Skeleton, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  TablePagination, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import MemoryIcon from '@mui/icons-material/Memory';
import TimerIcon from '@mui/icons-material/Timer';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useTranslation } from 'react-i18next';
import { useSettings, useAuditLog, useClearCache } from '../hooks/useSettings.js';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import { formatDate } from '../utils/formatters.js';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useSettings();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [auditPage, setAuditPage] = useState(0);
  const [auditAction, setAuditAction] = useState('');

  const settings = data?.data || {};
  const system = settings.system || {};
  const destinations = settings.destinations || {};
  const admin = settings.admin || {};

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        {t('settings.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('settings.subtitle')}
      </Typography>

      {error && <ErrorBanner onRetry={refetch} />}

      {/* System Info */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
        {t('settings.system.title')}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          {isLoading ? <Skeleton variant="rounded" height={120} /> : (
            <Card sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <MemoryIcon color="primary" />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t('settings.system.runtime')}</Typography>
              </Box>
              <Typography variant="body2">Node.js: {system.nodeVersion}</Typography>
              <Typography variant="body2">{t('settings.system.uptime')}: {system.uptime}</Typography>
              <Typography variant="body2">{t('settings.system.environment')}: {system.environment}</Typography>
            </Card>
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          {isLoading ? <Skeleton variant="rounded" height={120} /> : (
            <Card sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <StorageIcon color="primary" />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t('settings.system.services')}</Typography>
              </Box>
              <ServiceStatus label="MySQL" status={system.mysql} />
              <ServiceStatus label="MongoDB" status={system.mongodb} />
              <ServiceStatus label="Redis" status={system.redis} />
            </Card>
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          {isLoading ? <Skeleton variant="rounded" height={120} /> : (
            <Card sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TimerIcon color="primary" />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t('settings.system.admin')}</Typography>
              </Box>
              <Typography variant="body2">{t('settings.system.adminUser')}: {admin.email}</Typography>
              <Typography variant="body2">{t('settings.system.role')}: {admin.role}</Typography>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Destination Data */}
      {!isLoading && destinations && (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
            {t('settings.destinations.title')}
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {Object.entries(destinations).map(([code, dest]) => (
              <Grid item xs={12} md={6} key={code}>
                <Card sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    {code === 'texel' ? '🇳🇱 Texel' : '🇪🇸 Calpe'}
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">POIs</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>{dest.poiCount}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Reviews</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>{dest.reviewCount}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">ChromaDB</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>{dest.chromaCollection || '—'}</Typography>
                    </Grid>
                  </Grid>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Cache Management */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
        {t('settings.cache.title')}
      </Typography>
      <Card sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2">{t('settings.cache.description')}</Typography>
          </Box>
          <Button
            variant="outlined" color="warning" size="small"
            startIcon={<DeleteSweepIcon />}
            onClick={() => setClearDialogOpen(true)}
          >
            {t('settings.cache.clear')}
          </Button>
        </Box>
      </Card>

      {/* Clear Cache Dialog */}
      <ClearCacheDialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)} />

      {/* Audit Log */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
        <HistoryIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
        {t('settings.audit.title')}
      </Typography>
      <AuditLogTable page={auditPage} setPage={setAuditPage} action={auditAction} setAction={setAuditAction} />
    </Box>
  );
}

/* ===== Service Status Row ===== */
function ServiceStatus({ label, status }) {
  const connected = status === 'connected' || status === 'ok' || status === true;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
      {connected ? (
        <CheckCircleIcon sx={{ fontSize: 16, color: '#22c55e' }} />
      ) : (
        <ErrorIcon sx={{ fontSize: 16, color: '#ef4444' }} />
      )}
      <Typography variant="body2">{label}: {connected ? 'Connected' : (status || 'Disconnected')}</Typography>
    </Box>
  );
}

/* ===== Clear Cache Dialog ===== */
function ClearCacheDialog({ open, onClose }) {
  const { t } = useTranslation();
  const clearMutation = useClearCache();
  const [confirmed, setConfirmed] = useState(false);

  const handleClear = async () => {
    try {
      await clearMutation.mutateAsync({ all: true });
      setConfirmed(true);
      setTimeout(() => { setConfirmed(false); onClose(); }, 1500);
    } catch { /* shown in UI */ }
  };

  return (
    <Dialog open={open} maxWidth="xs" fullWidth onClose={onClose}>
      <DialogTitle>{t('settings.cache.clearTitle')}</DialogTitle>
      <DialogContent>
        {confirmed ? (
          <Alert severity="success">{t('settings.cache.cleared')}</Alert>
        ) : (
          <>
            {clearMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>{t('common.error')}</Alert>}
            <Typography variant="body2">{t('settings.cache.clearWarning')}</Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={clearMutation.isPending}>{t('settings.cancel')}</Button>
        {!confirmed && (
          <Button variant="contained" color="warning" onClick={handleClear} disabled={clearMutation.isPending}>
            {clearMutation.isPending ? t('settings.cache.clearing') : t('settings.cache.confirmClear')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

/* ===== Audit Log Table ===== */
function AuditLogTable({ page, setPage, action, setAction }) {
  const { t } = useTranslation();
  const filters = {
    page: page + 1,
    limit: 25,
    ...(action && { action })
  };
  const { data, isLoading, error } = useAuditLog(filters);
  const entries = data?.data?.entries || [];
  const pagination = data?.data?.pagination || {};

  return (
    <Card>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>{t('settings.audit.filterAction')}</InputLabel>
          <Select value={action} label={t('settings.audit.filterAction')} onChange={(e) => { setAction(e.target.value); setPage(0); }}>
            <MenuItem value="">{t('settings.audit.allActions')}</MenuItem>
            <MenuItem value="poi_update">POI Update</MenuItem>
            <MenuItem value="review_archive">Review Archive</MenuItem>
            <MenuItem value="cache_clear">Cache Clear</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && <Alert severity="error" sx={{ mx: 2, mb: 2 }}>{t('common.error')}</Alert>}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f8fafc' } }}>
              <TableCell>{t('settings.audit.date')}</TableCell>
              <TableCell>{t('settings.audit.action')}</TableCell>
              <TableCell>{t('settings.audit.user')}</TableCell>
              <TableCell>{t('settings.audit.details')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(4)].map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                </TableRow>
              ))
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">{t('settings.audit.noEntries')}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry, i) => (
                <TableRow key={entry._id || i} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      {formatDate(entry.timestamp)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={entry.action} variant="outlined" sx={{ fontSize: '0.7rem' }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{entry.actor?.email || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.detail || '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {!isLoading && (
        <TablePagination
          component="div"
          count={pagination.total || 0}
          page={page}
          onPageChange={(_e, p) => setPage(p)}
          rowsPerPage={25}
          rowsPerPageOptions={[25]}
        />
      )}
    </Card>
  );
}
