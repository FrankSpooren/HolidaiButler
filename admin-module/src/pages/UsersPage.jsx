import { useState, useCallback } from 'react';
import {
  Box, Typography, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, TextField, Select, MenuItem,
  FormControl, InputLabel, Grid, Skeleton, TablePagination,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, Alert, InputAdornment, Snackbar
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { useUserList, useUserCreate, useUserUpdate, useUserDelete, useUserResetPassword } from '../hooks/useUsers.js';
import useAuthStore from '../stores/authStore.js';
import ErrorBanner from '../components/common/ErrorBanner.jsx';

const ROLE_COLORS = {
  platform_admin: 'error',
  poi_owner: 'primary',
  editor: 'secondary',
  reviewer: 'info'
};

const STATUS_COLORS = {
  active: 'success',
  suspended: 'error',
  pending: 'warning'
};

const ROLES = ['platform_admin', 'poi_owner', 'editor', 'reviewer'];
const DEST_OPTIONS = [
  { value: 'calpe', label: 'Calpe' },
  { value: 'texel', label: 'Texel' }
];

const EMPTY_FORM = {
  email: '', firstName: '', lastName: '', password: '',
  role: 'editor', allowed_destinations: ['calpe', 'texel']
};

export default function UsersPage() {
  const { t } = useTranslation();
  const currentUser = useAuthStore(s => s.user);

  // Filters
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filters = {
    page: page + 1,
    limit: rowsPerPage,
    ...(search && { search }),
    ...(roleFilter && { role: roleFilter }),
    ...(statusFilter && { status: statusFilter })
  };

  const { data, isLoading, error, refetch } = useUserList(filters);
  const createMut = useUserCreate();
  const updateMut = useUserUpdate();
  const deleteMut = useUserDelete();
  const resetPwMut = useUserResetPassword();

  const users = data?.data?.users || [];
  const pagination = data?.data?.pagination || {};

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [resetPwUser, setResetPwUser] = useState(null);
  const [tempPassword, setTempPassword] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [snack, setSnack] = useState({ open: false, message: '' });

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(0);
  }, [searchInput]);

  // --- CREATE ---
  const openCreate = () => {
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    const errors = {};
    if (!formData.email) errors.email = t('users.errors.required');
    if (!formData.firstName) errors.firstName = t('users.errors.required');
    if (!formData.password || formData.password.length < 12) errors.password = t('users.errors.passwordWeak');
    if (formData.password && (!/[A-Z]/.test(formData.password) || !/[0-9]/.test(formData.password))) {
      errors.password = t('users.errors.passwordWeak');
    }
    if (Object.keys(errors).length) { setFormErrors(errors); return; }

    try {
      await createMut.mutateAsync(formData);
      setCreateOpen(false);
      setSnack({ open: true, message: t('users.created') });
    } catch (err) {
      setFormErrors({ submit: err.response?.data?.error?.message || t('common.error') });
    }
  };

  // --- EDIT ---
  const openEdit = (user) => {
    setFormData({
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      role: user.role || 'editor',
      status: user.status || 'active',
      allowed_destinations: user.allowed_destinations || ['calpe', 'texel']
    });
    setFormErrors({});
    setEditUser(user);
  };

  const handleUpdate = async () => {
    try {
      await updateMut.mutateAsync({ id: editUser.id, data: formData });
      setEditUser(null);
      setSnack({ open: true, message: t('users.updated') });
    } catch (err) {
      setFormErrors({ submit: err.response?.data?.error?.message || t('common.error') });
    }
  };

  // --- DELETE ---
  const handleDelete = async () => {
    try {
      await deleteMut.mutateAsync(deleteUser.id);
      setDeleteUser(null);
      setSnack({ open: true, message: t('users.deleted') });
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error?.message || t('common.error') });
    }
  };

  // --- RESET PASSWORD ---
  const handleResetPassword = async () => {
    try {
      const result = await resetPwMut.mutateAsync(resetPwUser.id);
      setTempPassword(result.data.tempPassword);
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error?.message || t('common.error') });
      setResetPwUser(null);
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    setSnack({ open: true, message: t('users.passwordCopied') });
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const isSelf = (user) => user.id === currentUser?.id;

  if (error) return <ErrorBanner message={error.message} onRetry={refetch} />;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>{t('users.title')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('users.subtitle')}</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          {t('users.add')}
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              size="small" fullWidth
              placeholder={t('users.searchPlaceholder')}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
              }}
            />
          </Grid>
          <Grid item xs={6} md={2.5}>
            <FormControl size="small" fullWidth>
              <InputLabel>{t('users.filter.role')}</InputLabel>
              <Select value={roleFilter} label={t('users.filter.role')} onChange={e => { setRoleFilter(e.target.value); setPage(0); }}>
                <MenuItem value="">{t('users.filter.all')}</MenuItem>
                {ROLES.map(r => <MenuItem key={r} value={r}>{t(`users.roles.${r}`)}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2.5}>
            <FormControl size="small" fullWidth>
              <InputLabel>{t('users.filter.status')}</InputLabel>
              <Select value={statusFilter} label={t('users.filter.status')} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
                <MenuItem value="">{t('users.filter.all')}</MenuItem>
                <MenuItem value="active">{t('users.statuses.active')}</MenuItem>
                <MenuItem value="suspended">{t('users.statuses.suspended')}</MenuItem>
                <MenuItem value="pending">{t('users.statuses.pending')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()} sx={{ height: 40 }}>
              {t('users.refresh')}
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Table */}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('users.table.name')}</TableCell>
                <TableCell>{t('users.table.email')}</TableCell>
                <TableCell>{t('users.table.role')}</TableCell>
                <TableCell>{t('users.table.destinations')}</TableCell>
                <TableCell>{t('users.table.status')}</TableCell>
                <TableCell>{t('users.table.created')}</TableCell>
                <TableCell align="right">{t('users.table.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <PersonIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">{t('users.noResults')}</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map(user => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {user.first_name} {user.last_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t(`users.roles.${user.role}`)}
                        size="small"
                        color={ROLE_COLORS[user.role] || 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {(user.allowed_destinations || []).map(d => (
                        <Chip key={d} label={d === 'calpe' ? '🇪🇸 Calpe' : '🇳🇱 Texel'} size="small" variant="outlined" sx={{ mr: 0.5 }} />
                      ))}
                    </TableCell>
                    <TableCell>
                      <Chip label={t(`users.statuses.${user.status}`)} size="small" color={STATUS_COLORS[user.status] || 'default'} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{formatDate(user.created_at)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={t('users.edit')}>
                        <IconButton size="small" onClick={() => openEdit(user)} disabled={isSelf(user)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('users.resetPassword')}>
                        <IconButton size="small" onClick={() => { setResetPwUser(user); setTempPassword(''); }}>
                          <VpnKeyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('users.delete')}>
                        <IconButton size="small" onClick={() => setDeleteUser(user)} disabled={isSelf(user)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={pagination.total || 0}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage={t('users.rowsPerPage')}
        />
      </Paper>

      {/* CREATE DIALOG */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('users.addTitle')}</DialogTitle>
        <DialogContent>
          {formErrors.submit && <Alert severity="error" sx={{ mb: 2 }}>{formErrors.submit}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField size="small" fullWidth required label={t('users.fields.email')} type="email"
                value={formData.email} onChange={e => setFormData(d => ({ ...d, email: e.target.value }))}
                error={!!formErrors.email} helperText={formErrors.email} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField size="small" fullWidth required label={t('users.fields.password')} type="password"
                value={formData.password} onChange={e => setFormData(d => ({ ...d, password: e.target.value }))}
                error={!!formErrors.password} helperText={formErrors.password || t('users.passwordHint')} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField size="small" fullWidth required label={t('users.fields.firstName')}
                value={formData.firstName} onChange={e => setFormData(d => ({ ...d, firstName: e.target.value }))}
                error={!!formErrors.firstName} helperText={formErrors.firstName} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField size="small" fullWidth label={t('users.fields.lastName')}
                value={formData.lastName} onChange={e => setFormData(d => ({ ...d, lastName: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>{t('users.fields.role')}</InputLabel>
                <Select value={formData.role} label={t('users.fields.role')}
                  onChange={e => setFormData(d => ({ ...d, role: e.target.value }))}>
                  {ROLES.map(r => <MenuItem key={r} value={r}>{t(`users.roles.${r}`)}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>{t('users.fields.destinations')}</InputLabel>
                <Select multiple value={formData.allowed_destinations} label={t('users.fields.destinations')}
                  onChange={e => setFormData(d => ({ ...d, allowed_destinations: e.target.value }))}
                  renderValue={sel => sel.map(v => v === 'calpe' ? '🇪🇸 Calpe' : '🇳🇱 Texel').join(', ')}>
                  {DEST_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>{t('users.cancel')}</Button>
          <Button variant="contained" onClick={handleCreate} disabled={createMut.isLoading}>
            {createMut.isLoading ? t('users.creating') : t('users.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={!!editUser} onClose={() => setEditUser(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('users.editTitle')}</DialogTitle>
        <DialogContent>
          {formErrors.submit && <Alert severity="error" sx={{ mb: 2 }}>{formErrors.submit}</Alert>}
          <Alert severity="info" sx={{ mb: 2 }}>{editUser?.email}</Alert>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField size="small" fullWidth label={t('users.fields.firstName')}
                value={formData.firstName} onChange={e => setFormData(d => ({ ...d, firstName: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField size="small" fullWidth label={t('users.fields.lastName')}
                value={formData.lastName} onChange={e => setFormData(d => ({ ...d, lastName: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>{t('users.fields.role')}</InputLabel>
                <Select value={formData.role} label={t('users.fields.role')}
                  onChange={e => setFormData(d => ({ ...d, role: e.target.value }))}>
                  {ROLES.map(r => <MenuItem key={r} value={r}>{t(`users.roles.${r}`)}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>{t('users.fields.status')}</InputLabel>
                <Select value={formData.status} label={t('users.fields.status')}
                  onChange={e => setFormData(d => ({ ...d, status: e.target.value }))}>
                  <MenuItem value="active">{t('users.statuses.active')}</MenuItem>
                  <MenuItem value="suspended">{t('users.statuses.suspended')}</MenuItem>
                  <MenuItem value="pending">{t('users.statuses.pending')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl size="small" fullWidth>
                <InputLabel>{t('users.fields.destinations')}</InputLabel>
                <Select multiple value={formData.allowed_destinations || []} label={t('users.fields.destinations')}
                  onChange={e => setFormData(d => ({ ...d, allowed_destinations: e.target.value }))}
                  renderValue={sel => sel.map(v => v === 'calpe' ? '🇪🇸 Calpe' : '🇳🇱 Texel').join(', ')}>
                  {DEST_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUser(null)}>{t('users.cancel')}</Button>
          <Button variant="contained" onClick={handleUpdate} disabled={updateMut.isLoading}>
            {updateMut.isLoading ? t('users.saving') : t('users.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={!!deleteUser} onClose={() => setDeleteUser(null)}>
        <DialogTitle>{t('users.deleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('users.deleteConfirm', { name: `${deleteUser?.first_name} ${deleteUser?.last_name}`, email: deleteUser?.email })}
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>{t('users.deleteSoftNote')}</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteUser(null)}>{t('users.cancel')}</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleteMut.isLoading}>
            {deleteMut.isLoading ? t('users.deleting') : t('users.confirmDelete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* RESET PASSWORD DIALOG */}
      <Dialog open={!!resetPwUser} onClose={() => { setResetPwUser(null); setTempPassword(''); }} maxWidth="sm" fullWidth>
        <DialogTitle>{t('users.resetPasswordTitle')}</DialogTitle>
        <DialogContent>
          {!tempPassword ? (
            <>
              <Typography>
                {t('users.resetPasswordConfirm', { name: `${resetPwUser?.first_name} ${resetPwUser?.last_name}` })}
              </Typography>
              <Alert severity="info" sx={{ mt: 2 }}>{t('users.resetPasswordNote')}</Alert>
            </>
          ) : (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>{t('users.passwordGenerated')}</Alert>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="h6" sx={{ fontFamily: 'monospace', flex: 1, letterSpacing: 1 }}>
                  {tempPassword}
                </Typography>
                <Tooltip title={t('users.copyPassword')}>
                  <IconButton onClick={copyPassword}><ContentCopyIcon /></IconButton>
                </Tooltip>
              </Box>
              <Alert severity="warning" sx={{ mt: 2 }}>{t('users.shareSecurely')}</Alert>
            </>
          )}
        </DialogContent>
        <DialogActions>
          {!tempPassword ? (
            <>
              <Button onClick={() => setResetPwUser(null)}>{t('users.cancel')}</Button>
              <Button variant="contained" color="warning" onClick={handleResetPassword} disabled={resetPwMut.isLoading}>
                {resetPwMut.isLoading ? t('users.resetting') : t('users.resetPassword')}
              </Button>
            </>
          ) : (
            <Button variant="contained" onClick={() => { setResetPwUser(null); setTempPassword(''); }}>
              {t('users.close')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ open: false, message: '' })}
        message={snack.message}
      />
    </Box>
  );
}
