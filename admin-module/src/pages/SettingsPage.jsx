import { useState } from 'react';
import {
  Box, Typography, Card, Grid, Skeleton, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  TablePagination, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Select, MenuItem, FormControl, InputLabel, Snackbar,
  IconButton, Tooltip, TextField
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import MemoryIcon from '@mui/icons-material/Memory';
import TimerIcon from '@mui/icons-material/Timer';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import TranslateIcon from '@mui/icons-material/Translate';
import PaletteIcon from '@mui/icons-material/Palette';
import UndoIcon from '@mui/icons-material/Undo';
import SaveIcon from '@mui/icons-material/Save';
import { useTranslation } from 'react-i18next';
import { useSettings, useAuditLog, useClearCache, useUndoAction, useBranding, useUpdateBranding } from '../hooks/useSettings.js';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import { formatDate } from '../utils/formatters.js';

const LANGUAGES = [
  { code: 'nl', flag: '\uD83C\uDDF3\uD83C\uDDF1' },
  { code: 'en', flag: '\uD83C\uDDEC\uD83C\uDDE7' },
  { code: 'de', flag: '\uD83C\uDDE9\uD83C\uDDEA' },
  { code: 'es', flag: '\uD83C\uDDEA\uD83C\uDDF8' }
];

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

      {/* Language Selector */}
      <LanguageSelector />

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

      {/* Branding */}
      <BrandingSection />

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

/* ===== Language Selector ===== */
function LanguageSelector() {
  const { t, i18n } = useTranslation();

  const handleChange = (e) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem('hb-admin-lang', lang);
  };

  return (
    <>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
        <TranslateIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
        {t('settings.language.title')}
      </Typography>
      <Card sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2">{t('settings.language.description')}</Typography>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select value={i18n.language} onChange={handleChange}>
              {LANGUAGES.map(lang => (
                <MenuItem key={lang.code} value={lang.code}>
                  {lang.flag} {t(`settings.language.${lang.code}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Card>
    </>
  );
}

/* ===== Branding Section ===== */
function BrandingSection() {
  const { t } = useTranslation();
  const { data, isLoading } = useBranding();
  const updateMut = useUpdateBranding();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [snack, setSnack] = useState(null);

  const branding = data?.data?.branding || {};
  const DEST_FLAGS = { calpe: '\uD83C\uDDEA\uD83C\uDDF8', texel: '\uD83C\uDDF3\uD83C\uDDF1' };

  const startEdit = (dest) => {
    setForm({ ...branding[dest] });
    setEditing(dest);
  };

  const handleSave = async () => {
    try {
      await updateMut.mutateAsync({ destination: editing, data: form });
      setSnack(t('settings.branding.saved'));
      setEditing(null);
    } catch {
      setSnack(t('common.error'));
    }
  };

  return (
    <>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
        <PaletteIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
        {t('settings.branding.title')}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {isLoading ? (
          [0, 1].map(i => (
            <Grid item xs={12} md={6} key={i}>
              <Skeleton variant="rounded" height={140} />
            </Grid>
          ))
        ) : Object.entries(branding).map(([dest, brand]) => (
          <Grid item xs={12} md={6} key={dest}>
            <Card sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {DEST_FLAGS[dest]} {dest.charAt(0).toUpperCase() + dest.slice(1)}
                </Typography>
                <Button size="small" variant="outlined" onClick={() => startEdit(dest)}>
                  {t('pois.edit')}
                </Button>
              </Box>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">{t('settings.branding.primary')}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: brand.primary, border: '1px solid #ccc' }} />
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{brand.primary}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">{t('settings.branding.secondary')}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: brand.secondary, border: '1px solid #ccc' }} />
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{brand.secondary}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">{t('settings.branding.accent')}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: brand.accent, border: '1px solid #ccc' }} />
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{brand.accent}</Typography>
                  </Box>
                </Grid>
              </Grid>
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('settings.branding.chatbot')}: <b>{brand.chatbotName}</b> | {brand.domain}
                  {brand.customized && <Chip size="small" label={t('settings.branding.customized')} sx={{ ml: 1, fontSize: '0.65rem', height: 18 }} color="info" />}
                </Typography>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Edit Branding Dialog */}
      {editing && (
        <Dialog open maxWidth="xs" fullWidth onClose={() => setEditing(null)}>
          <DialogTitle>
            {t('settings.branding.editTitle')} — {DEST_FLAGS[editing]} {editing.charAt(0).toUpperCase() + editing.slice(1)}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={6}>
                <TextField
                  fullWidth size="small" label={t('settings.branding.primary')}
                  value={form.primary || ''} onChange={(e) => setForm(f => ({ ...f, primary: e.target.value }))}
                  InputProps={{ startAdornment: <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: form.primary, border: '1px solid #ccc', mr: 1, flexShrink: 0 }} /> }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth size="small" label={t('settings.branding.secondary')}
                  value={form.secondary || ''} onChange={(e) => setForm(f => ({ ...f, secondary: e.target.value }))}
                  InputProps={{ startAdornment: <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: form.secondary, border: '1px solid #ccc', mr: 1, flexShrink: 0 }} /> }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth size="small" label={t('settings.branding.accent')}
                  value={form.accent || ''} onChange={(e) => setForm(f => ({ ...f, accent: e.target.value }))}
                  InputProps={{ startAdornment: <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: form.accent, border: '1px solid #ccc', mr: 1, flexShrink: 0 }} /> }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth size="small" label={t('settings.branding.chatbot')}
                  value={form.chatbotName || ''} onChange={(e) => setForm(f => ({ ...f, chatbotName: e.target.value }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditing(null)}>{t('settings.cancel')}</Button>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={updateMut.isPending}>
              {updateMut.isPending ? t('pois.saving') : t('pois.save')}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
        message={snack}
      />
    </>
  );
}

/* ===== Audit Log Table ===== */
const UNDOABLE_ACTIONS = ['poi_update', 'review_archive', 'review_unarchive', 'user_created', 'user_updated', 'user_deleted', 'agent_config_updated'];

function AuditLogTable({ page, setPage, action, setAction }) {
  const { t } = useTranslation();
  const undoMut = useUndoAction();
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const filters = {
    page: page + 1,
    limit: 25,
    ...(action && { action })
  };
  const { data, isLoading, error } = useAuditLog(filters);
  const entries = data?.data?.entries || [];
  const pagination = data?.data?.pagination || {};

  const handleUndo = async (entry) => {
    try {
      await undoMut.mutateAsync(entry._id);
      setSnack({ open: true, message: t('settings.audit.undone'), severity: 'success' });
    } catch (err) {
      const msg = err.response?.data?.error?.message || t('common.error');
      setSnack({ open: true, message: msg, severity: 'error' });
    }
  };

  const isUndoable = (entry) => UNDOABLE_ACTIONS.includes(entry.action) && entry.action !== 'action_undone';

  return (
    <Card>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>{t('settings.audit.filterAction')}</InputLabel>
          <Select value={action} label={t('settings.audit.filterAction')} onChange={(e) => { setAction(e.target.value); setPage(0); }}>
            <MenuItem value="">{t('settings.audit.allActions')}</MenuItem>
            <MenuItem value="poi_update">POI Update</MenuItem>
            <MenuItem value="review_archive">Review Archive</MenuItem>
            <MenuItem value="user_created">User Created</MenuItem>
            <MenuItem value="user_updated">User Updated</MenuItem>
            <MenuItem value="user_deleted">User Deleted</MenuItem>
            <MenuItem value="agent_config_updated">Agent Config</MenuItem>
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
              <TableCell align="right">{t('settings.audit.undo')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(5)].map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                </TableRow>
              ))
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
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
                  <TableCell align="right">
                    {isUndoable(entry) && (
                      <Tooltip title={t('settings.audit.undoAction')}>
                        <IconButton
                          size="small"
                          onClick={() => handleUndo(entry)}
                          disabled={undoMut.isPending}
                        >
                          <UndoIcon fontSize="small" />
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
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        message={snack.message}
      />
    </Card>
  );
}
