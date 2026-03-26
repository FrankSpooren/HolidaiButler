import { useState } from 'react';
import {
  Box, Typography, Card, Grid, Skeleton, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  TablePagination, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Select, MenuItem, FormControl, InputLabel, Snackbar,
  IconButton, Tooltip, TextField, Menu, ListItemIcon, ListItemText,
  CircularProgress, FormControlLabel, Checkbox
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
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import PublicIcon from '@mui/icons-material/Public';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSettings, useAuditLog, useClearCache, useUndoAction, useBranding, useUpdateBranding, useUploadLogo } from '../hooks/useSettings.js';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import { formatDate } from '../utils/formatters.js';
import client from '../api/client.js';

const LANGUAGES = [
  { code: 'nl', flag: '🇳🇱' },
  { code: 'en', flag: '🇬🇧' },
  { code: 'de', flag: '🇩🇪' },
  { code: 'es', flag: '🇪🇸' }
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

      {/* Destination Management */}
      <DestinationManagement />

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
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useBranding();
  const updateMut = useUpdateBranding();
  const uploadMut = useUploadLogo();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [snack, setSnack] = useState(null);
  const API_BASE = import.meta.env.VITE_API_URL || '';

  const branding = data?.data?.branding || {};
  const DEST_FLAGS = { calpe: '🇪🇸', texel: '🇳🇱' };

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
              {(brand.brand_name || brand.payoff) && (
                <Grid container spacing={1} sx={{ mt: 0.5 }}>
                  {brand.brand_name && (
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">{t('settings.branding.brandName')}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{brand.brand_name}</Typography>
                    </Grid>
                  )}
                  {brand.payoff && (
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">{t('settings.branding.payoff')}</Typography>
                      <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                        {typeof brand.payoff === 'object' ? (brand.payoff[i18n.language] || brand.payoff.en || Object.values(brand.payoff)[0] || '') : brand.payoff}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              )}
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                {brand.logo_url && (
                  <Box
                    component="img"
                    src={`${API_BASE}${brand.logo_url}`}
                    alt={`${dest} logo`}
                    sx={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 0.5, border: '1px solid #eee' }}
                  />
                )}
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
              <Grid item xs={12}>
                <TextField
                  fullWidth size="small" label={t('settings.branding.brandName')}
                  value={form.brand_name || ''} onChange={(e) => setForm(f => ({ ...f, brand_name: e.target.value }))}
                  placeholder="TexelMaps"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  {t('settings.branding.logo')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {form.logo_url && (
                    <Box
                      component="img"
                      src={`${API_BASE}${form.logo_url}`}
                      alt="logo"
                      sx={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 1, border: '1px solid #ddd', p: 0.5 }}
                    />
                  )}
                  <Button
                    variant="outlined"
                    size="small"
                    component="label"
                    startIcon={<CloudUploadIcon />}
                    disabled={uploadMut.isPending}
                  >
                    {uploadMut.isPending ? t('settings.branding.uploading') : t('settings.branding.uploadLogo')}
                    <input
                      type="file"
                      hidden
                      accept="image/png,image/jpeg,image/svg+xml"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          setSnack(t('settings.branding.logoTooLarge'));
                          return;
                        }
                        try {
                          const result = await uploadMut.mutateAsync({ destination: editing, file });
                          setForm(f => ({ ...f, logo_url: result.data.logo_url }));
                          setSnack(t('settings.branding.logoUploaded'));
                        } catch {
                          setSnack(t('common.error'));
                        }
                        e.target.value = '';
                      }}
                    />
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    PNG, JPG, SVG (max 2MB)
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth size="small" label={t('settings.branding.payoff')}
                  value={typeof form.payoff === 'object' ? (form.payoff[i18n.language] || form.payoff.en || '') : (form.payoff || '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm(f => ({
                      ...f,
                      payoff: typeof f.payoff === 'object' ? { ...f.payoff, [i18n.language]: val } : val
                    }));
                  }}
                  placeholder="Ontdek Texel"
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

/* ===== Destination Management ===== */
const MODULE_OPTIONS = [
  { key: 'hasContentStudio', label: 'Content Studio' },
  { key: 'hasMediaLibrary', label: 'Media Library' },
  { key: 'hasBranding', label: 'Branding / Merk Profiel' },
  { key: 'hasPOI', label: 'POI Database' },
  { key: 'hasEvents', label: 'Evenementen' },
  { key: 'hasChatbot', label: 'AI Chatbot' },
  { key: 'hasTicketing', label: 'Ticketing' },
  { key: 'hasReservations', label: 'Reserveringen' },
  { key: 'hasCommerce', label: 'Commerce Dashboard' },
  { key: 'hasPartners', label: 'Partners' },
  { key: 'hasIntermediary', label: 'Intermediair' },
  { key: 'hasFinancial', label: 'Financieel' },
  { key: 'hasPages', label: 'Pagina\'s / Website' },
];

const SOCIAL_OPTIONS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'x', label: 'X (Twitter)' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'pinterest', label: 'Pinterest' },
  { key: 'youtube', label: 'YouTube' },
];

function DestinationManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuDest, setMenuDest] = useState(null);
  const [archiveDialog, setArchiveDialog] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [deletePreview, setDeletePreview] = useState(null);
  const [confirmName, setConfirmName] = useState('');
  const [editDialog, setEditDialog] = useState(null);
  const [editFlags, setEditFlags] = useState({});
  const [editSocial, setEditSocial] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [snack, setSnack] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['destinations-manage'],
    queryFn: () => client.get('/destinations').then(r => r.data),
    staleTime: 30 * 1000,
  });
  const destinations = data?.data?.destinations || [];

  const archiveMut = useMutation({
    mutationFn: (id) => client.put(`/destinations/${id}/archive`).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['destinations-manage'] }); queryClient.invalidateQueries({ queryKey: ['destinations-list'] }); },
  });
  const restoreMut = useMutation({
    mutationFn: (id) => client.put(`/destinations/${id}/restore`).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['destinations-manage'] }); queryClient.invalidateQueries({ queryKey: ['destinations-list'] }); },
  });
  const deleteMut = useMutation({
    mutationFn: ({ id, name }) => client.delete(`/destinations/${id}?confirm=${encodeURIComponent(`PERMANENT_DELETE_${name}`)}`).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['destinations-manage'] }); queryClient.invalidateQueries({ queryKey: ['destinations-list'] }); },
  });

  const handleOpenMenu = (e, dest) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); setMenuDest(dest); };
  const handleCloseMenu = () => { setMenuAnchor(null); setMenuDest(null); };

  const handleArchive = async () => {
    try {
      await archiveMut.mutateAsync(archiveDialog.id);
      setSnack(`${archiveDialog.name} gearchiveerd`);
      setArchiveDialog(null);
    } catch (err) { setSnack(err.response?.data?.error?.message || 'Fout bij archiveren'); }
  };

  const handleRestore = async (dest) => {
    try {
      await restoreMut.mutateAsync(dest.id);
      setSnack(`${dest.name} hersteld`);
    } catch (err) { setSnack(err.response?.data?.error?.message || 'Fout bij herstellen'); }
  };

  const openDeleteDialog = async (dest) => {
    setDeleteDialog(dest);
    setConfirmName('');
    try {
      const { data: preview } = await client.get(`/destinations/${dest.id}/delete-preview`);
      setDeletePreview(preview.data);
    } catch { setDeletePreview(null); }
  };

  const handleHardDelete = async () => {
    try {
      await deleteMut.mutateAsync({ id: deleteDialog.id, name: deleteDialog.name });
      setSnack(`${deleteDialog.name} permanent verwijderd`);
      setDeleteDialog(null);
      setDeletePreview(null);
    } catch (err) { setSnack(err.response?.data?.error?.message || 'Fout bij verwijderen'); }
  };

  const FLAG_MAP = { 1: '🇪🇸', 2: '🇳🇱', 4: '🇧🇪', 5: '🇪🇸', 6: '🇪🇸', 7: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' };

  return (
    <>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
        <PublicIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
        Destinations Beheer
      </Typography>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
              <TableCell>ID</TableCell>
              <TableCell>Naam</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Domein</TableCell>
              <TableCell width={50}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
            )) : destinations.map(d => (
              <TableRow key={d.id} hover sx={{ opacity: d.status === 'archived' ? 0.55 : 1 }}>
                <TableCell>{d.id}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2">{FLAG_MAP[d.id] || '🌍'}</Typography>
                    <Typography variant="body2" fontWeight={600}>{d.name}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={d.destinationType === 'content_only' ? 'Content Studio' : 'Tourism'}
                    color={d.destinationType === 'content_only' ? 'info' : 'default'}
                    icon={d.destinationType === 'content_only' ? <AutoAwesomeIcon /> : <PublicIcon />}
                    variant="outlined"
                    sx={{ '& .MuiChip-icon': { fontSize: 14 } }}
                  />
                </TableCell>
                <TableCell>
                  <Chip size="small"
                    label={d.status === 'archived' ? 'Gearchiveerd' : 'Actief'}
                    color={d.status === 'archived' ? 'warning' : 'success'}
                  />
                </TableCell>
                <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{d.code}</Typography></TableCell>
                <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{d.domain || '—'}</Typography></TableCell>
                <TableCell>
                  <IconButton size="small" onClick={e => handleOpenMenu(e, d)}>
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={handleCloseMenu}>
        <MenuItem onClick={() => {
          const ff = menuDest?.featureFlags || {};
          setEditFlags({ ...ff });
          setEditSocial(ff.social_platforms || {});
          setEditDialog(menuDest);
          handleCloseMenu();
        }}>
          <ListItemIcon><PaletteIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Modules & kanalen bewerken</ListItemText>
        </MenuItem>
        {menuDest?.status === 'active' && (
          <MenuItem onClick={() => { setArchiveDialog(menuDest); handleCloseMenu(); }}>
            <ListItemIcon><ArchiveIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Archiveren</ListItemText>
          </MenuItem>
        )}
        {menuDest?.status === 'archived' && (
          <MenuItem onClick={() => { handleRestore(menuDest); handleCloseMenu(); }}>
            <ListItemIcon><UnarchiveIcon fontSize="small" color="success" /></ListItemIcon>
            <ListItemText>Herstellen</ListItemText>
          </MenuItem>
        )}
        {menuDest && ![1, 2].includes(menuDest.id) && (
          <MenuItem onClick={() => { openDeleteDialog(menuDest); handleCloseMenu(); }} sx={{ color: 'error.main' }}>
            <ListItemIcon><DeleteForeverIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Permanent verwijderen</ListItemText>
          </MenuItem>
        )}
        {menuDest && [1, 2].includes(menuDest.id) && (
          <MenuItem disabled>
            <ListItemText sx={{ color: 'text.disabled' }}>Beschermd (kern-bestemming)</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Archive Confirmation */}
      <Dialog open={!!archiveDialog} onClose={() => setArchiveDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Destination archiveren?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            <strong>{archiveDialog?.name}</strong> wordt gearchiveerd. De destination verdwijnt uit de dropdown voor alle gebruikers (behalve platform admins). Alle data blijft behouden en kan later hersteld worden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveDialog(null)}>Annuleren</Button>
          <Button variant="contained" color="warning" onClick={handleArchive} disabled={archiveMut.isPending}
            startIcon={archiveMut.isPending ? <CircularProgress size={16} /> : <ArchiveIcon />}>
            Archiveren
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hard Delete — Two-step confirmation */}
      <Dialog open={!!deleteDialog} onClose={() => { setDeleteDialog(null); setDeletePreview(null); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main' }}>Permanent verwijderen</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            Dit is <strong>ONOMKEERBAAR</strong>. Alle data van <strong>{deleteDialog?.name}</strong> wordt permanent verwijderd.
          </Alert>

          {deletePreview && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Wat wordt verwijderd:</Typography>
              <Grid container spacing={1}>
                {Object.entries(deletePreview.willDelete || {}).filter(([, v]) => v > 0).map(([table, count]) => (
                  <Grid item xs={6} key={table}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1, py: 0.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="body2">{table}</Typography>
                      <Typography variant="body2" fontWeight={600} color="error">{count}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
              {Object.values(deletePreview.willDelete || {}).every(v => v === 0) && (
                <Typography variant="body2" color="text.secondary">Geen gerelateerde data gevonden.</Typography>
              )}
            </Box>
          )}

          <Typography variant="body2" sx={{ mb: 1 }}>
            Typ <strong>{deleteDialog?.name}</strong> om te bevestigen:
          </Typography>
          <TextField
            fullWidth size="small" value={confirmName} onChange={e => setConfirmName(e.target.value)}
            placeholder={deleteDialog?.name} autoFocus
            error={confirmName.length > 0 && confirmName !== deleteDialog?.name}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteDialog(null); setDeletePreview(null); }}>Annuleren</Button>
          <Button variant="contained" color="error" onClick={handleHardDelete}
            disabled={confirmName !== deleteDialog?.name || deleteMut.isPending}
            startIcon={deleteMut.isPending ? <CircularProgress size={16} /> : <DeleteForeverIcon />}>
            Permanent Verwijderen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Modules & Social Channels Dialog */}
      <Dialog open={!!editDialog} onClose={() => setEditDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Modules & kanalen — {editDialog?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mt: 1, mb: 1, fontWeight: 700 }}>Actieve modules</Typography>
          {MODULE_OPTIONS.map(mod => (
            <FormControlLabel key={mod.key} sx={{ display: 'block' }}
              control={<Checkbox size="small" checked={editFlags[mod.key] !== false} onChange={e => setEditFlags(f => ({ ...f, [mod.key]: e.target.checked }))} />}
              label={mod.label}
            />
          ))}
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 700 }}>Social media kanalen</Typography>
          {SOCIAL_OPTIONS.map(s => (
            <FormControlLabel key={s.key} sx={{ display: 'block' }}
              control={<Checkbox size="small" checked={editSocial[s.key] === true} onChange={e => setEditSocial(f => ({ ...f, [s.key]: e.target.checked }))} />}
              label={s.label}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(null)}>Annuleren</Button>
          <Button variant="contained" disabled={editSaving} onClick={async () => {
            setEditSaving(true);
            try {
              const updatedFlags = { ...editFlags, social_platforms: editSocial };
              await client.put(`/destinations/${editDialog.id}/branding`, {
                feature_flags_override: updatedFlags,
              });
              // Also update feature_flags directly in DB
              await client.put(`/destinations/${editDialog.id}/feature-flags`, { featureFlags: updatedFlags });
              queryClient.invalidateQueries({ queryKey: ['destinations-manage'] });
              queryClient.invalidateQueries({ queryKey: ['destinations-list'] });
              setSnack(`Modules bijgewerkt voor ${editDialog.name}`);
              setEditDialog(null);
            } catch (err) {
              setSnack(err.response?.data?.error?.message || 'Fout bij opslaan');
            } finally { setEditSaving(false); }
          }}>
            {editSaving ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} message={snack} />
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
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Tooltip title={entry.actor?.type === 'agent' ? 'Agent' : entry.actor?.type === 'system' ? 'System' : 'Admin'}>
                        <Typography component="span" sx={{ fontSize: '1rem' }}>
                          {entry.actor?.type === 'agent' ? '🤖' : entry.actor?.type === 'system' ? '⚙️' : '👤'}
                        </Typography>
                      </Tooltip>
                      <Typography variant="body2">{entry.actor?.email || entry.actor?.name || '—'}</Typography>
                    </Box>
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
