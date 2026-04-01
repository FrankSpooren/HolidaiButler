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
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import PublicIcon from '@mui/icons-material/Public';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSettings, useAuditLog, useClearCache, useUndoAction } from '../hooks/useSettings.js';
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

      {/* System Info verplaatst naar Agents & Systeem (Opdracht 3) */}

      {/* Destination Management */}
      <DestinationManagement />

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

/* ===== Destination Management ===== */
// MODULE_OPTIONS labels are configuration labels (not user-facing UI text); i18n can be added later if needed
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
        {t('settings.destinations.title', 'Destinations Beheer')}
      </Typography>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
              <TableCell>{t('settings.destinations.id', 'ID')}</TableCell>
              <TableCell>{t('settings.destinations.name', 'Naam')}</TableCell>
              <TableCell>{t('settings.destinations.type', 'Type')}</TableCell>
              <TableCell>{t('settings.destinations.status', 'Status')}</TableCell>
              <TableCell>{t('settings.destinations.code', 'Code')}</TableCell>
              <TableCell>{t('settings.destinations.domain', 'Domein')}</TableCell>
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
                    label={d.destinationType === 'content_only' ? t('settings.destinations.contentOnly', 'Content Studio') : t('settings.destinations.tourism', 'Tourism')}
                    color={d.destinationType === 'content_only' ? 'info' : 'default'}
                    icon={d.destinationType === 'content_only' ? <AutoAwesomeIcon /> : <PublicIcon />}
                    variant="outlined"
                    sx={{ '& .MuiChip-icon': { fontSize: 14 } }}
                  />
                </TableCell>
                <TableCell>
                  <Chip size="small"
                    label={d.status === 'archived' ? t('settings.destinations.archived', 'Gearchiveerd') : t('settings.destinations.active', 'Actief')}
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
          <ListItemText>{t('settings.destinations.editModules', 'Modules & kanalen bewerken')}</ListItemText>
        </MenuItem>
        {menuDest?.status === 'active' && (
          <MenuItem onClick={() => { setArchiveDialog(menuDest); handleCloseMenu(); }}>
            <ListItemIcon><ArchiveIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{t('settings.destinations.archive', 'Archiveren')}</ListItemText>
          </MenuItem>
        )}
        {menuDest?.status === 'archived' && (
          <MenuItem onClick={() => { handleRestore(menuDest); handleCloseMenu(); }}>
            <ListItemIcon><UnarchiveIcon fontSize="small" color="success" /></ListItemIcon>
            <ListItemText>{t('settings.destinations.restore', 'Herstellen')}</ListItemText>
          </MenuItem>
        )}
        {menuDest && ![1, 2].includes(menuDest.id) && (
          <MenuItem onClick={() => { openDeleteDialog(menuDest); handleCloseMenu(); }} sx={{ color: 'error.main' }}>
            <ListItemIcon><DeleteForeverIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>{t('settings.destinations.deletePermanent', 'Permanent verwijderen')}</ListItemText>
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
        <DialogTitle>{t('settings.destinations.archiveTitle', 'Destination archiveren?')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {t('settings.destinations.archiveBody', '{{name}} wordt gearchiveerd. De destination verdwijnt uit de dropdown voor alle gebruikers (behalve platform admins). Alle data blijft behouden en kan later hersteld worden.', { name: archiveDialog?.name })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveDialog(null)}>{t('common.cancel', 'Annuleren')}</Button>
          <Button variant="contained" color="warning" onClick={handleArchive} disabled={archiveMut.isPending}
            startIcon={archiveMut.isPending ? <CircularProgress size={16} /> : <ArchiveIcon />}>
            {t('settings.destinations.archive', 'Archiveren')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hard Delete — Two-step confirmation */}
      <Dialog open={!!deleteDialog} onClose={() => { setDeleteDialog(null); setDeletePreview(null); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main' }}>{t('settings.destinations.deleteTitle', 'Permanent verwijderen')}</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            Dit is <strong>ONOMKEERBAAR</strong>. Alle data van <strong>{deleteDialog?.name}</strong> wordt permanent verwijderd.
          </Alert>

          {deletePreview && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('settings.destinations.deleteWhat', 'Wat wordt verwijderd:')}</Typography>
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
                <Typography variant="body2" color="text.secondary">{t('settings.destinations.noRelatedData', 'Geen gerelateerde data gevonden.')}</Typography>
              )}
            </Box>
          )}

          <Typography variant="body2" sx={{ mb: 1 }}>
            {t('settings.destinations.deleteConfirm', 'Typ {{name}} om te bevestigen:', { name: deleteDialog?.name })}
          </Typography>
          <TextField
            fullWidth size="small" value={confirmName} onChange={e => setConfirmName(e.target.value)}
            placeholder={deleteDialog?.name} autoFocus
            error={confirmName.length > 0 && confirmName !== deleteDialog?.name}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteDialog(null); setDeletePreview(null); }}>{t('common.cancel', 'Annuleren')}</Button>
          <Button variant="contained" color="error" onClick={handleHardDelete}
            disabled={confirmName !== deleteDialog?.name || deleteMut.isPending}
            startIcon={deleteMut.isPending ? <CircularProgress size={16} /> : <DeleteForeverIcon />}>
            {t('settings.destinations.deletePermanent', 'Permanent Verwijderen')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Modules & Social Channels Dialog */}
      <Dialog open={!!editDialog} onClose={() => setEditDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('settings.destinations.editModulesTitle', 'Modules & kanalen')} — {editDialog?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mt: 1, mb: 1, fontWeight: 700 }}>{t('settings.destinations.activeModules', 'Actieve modules')}</Typography>
          {MODULE_OPTIONS.map(mod => (
            <FormControlLabel key={mod.key} sx={{ display: 'block' }}
              control={<Checkbox size="small" checked={editFlags[mod.key] !== false} onChange={e => setEditFlags(f => ({ ...f, [mod.key]: e.target.checked }))} />}
              label={mod.label}
            />
          ))}
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 700 }}>{t('settings.destinations.socialChannels', 'Social media kanalen')}</Typography>
          {SOCIAL_OPTIONS.map(s => (
            <FormControlLabel key={s.key} sx={{ display: 'block' }}
              control={<Checkbox size="small" checked={editSocial[s.key] === true} onChange={e => setEditSocial(f => ({ ...f, [s.key]: e.target.checked }))} />}
              label={s.label}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(null)}>{t('common.cancel', 'Annuleren')}</Button>
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
            {editSaving ? t('common.saving', 'Opslaan...') : t('common.save', 'Opslaan')}
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
