import { useState, useCallback } from 'react';
import {
  Box, Typography, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, TextField, Select, MenuItem,
  FormControl, InputLabel, Grid, Skeleton, TablePagination,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, Alert, InputAdornment, Snackbar,
  Tabs, Tab, Stepper, Step, StepLabel, Divider, List, ListItem,
  ListItemText, ListItemIcon, Checkbox, Menu, CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import HandshakeIcon from '@mui/icons-material/Handshake';
import BusinessIcon from '@mui/icons-material/Business';
import PlaceIcon from '@mui/icons-material/Place';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ReceiptIcon from '@mui/icons-material/Receipt';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArchiveIcon from '@mui/icons-material/Archive';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  usePartnerList, usePartnerDetail, usePartnerStats,
  usePartnerCreate, usePartnerUpdate, usePartnerUpdateStatus,
  usePartnerTransactions
} from '../hooks/usePartners.js';
import useDestinationStore from '../stores/destinationStore.js';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import client from '../api/client.js';

const INTERMEDIARY_STATUS_COLORS = {
  voorstel: 'default',
  toestemming: 'info',
  bevestiging: 'primary',
  delen: 'success',
  reminder: 'secondary',
  review: 'success',
  cancelled: 'error',
  expired: 'warning'
};

const STATUS_COLORS = {
  draft: 'default',
  pending: 'info',
  active: 'success',
  suspended: 'warning',
  terminated: 'error'
};

const DEST_MAP = { 1: 'Calpe', 2: 'Texel', 3: 'Alicante' };
const DEST_OPTIONS = [
  { value: 1, label: 'Calpe' },
  { value: 2, label: 'Texel' }
];

const EMPTY_FORM = {
  destinationId: 1,
  companyName: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  iban: '',
  kvkNumber: '',
  vatNumber: '',
  commissionRate: 15,
  commissionType: 'percentage',
  notes: ''
};

function TransactionsTab({ partnerId, destinationId, t }) {
  const [txPage, setTxPage] = useState(0);
  const { data: txData, isLoading: txLoading } = usePartnerTransactions(partnerId, destinationId, {
    page: txPage + 1, limit: 10
  });
  const transactions = txData?.data?.items || [];
  const txPagination = txData?.data?.pagination || { total: 0 };

  if (txLoading) return <Skeleton variant="rectangular" height={200} />;

  if (transactions.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary" sx={{ mb: 1 }}>{t('partners.no_transactions', 'Nog geen transacties voor deze partner')}</Typography>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 2 }}>{t('partners.no_transactions_hint', 'Transacties verschijnen hier zodra de partner een boeking bevestigt')}</Typography>
        <Button variant="outlined" size="small" href="/intermediary">{t('partners.goToIntermediary', 'Bekijk alle transacties')}</Button>
      </Box>
    );
  }

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
              <TableCell>{t('intermediary.fields.transaction_number')}</TableCell>
              <TableCell>{t('common.status')}</TableCell>
              <TableCell>{t('intermediary.fields.service_type')}</TableCell>
              <TableCell>{t('intermediary.fields.poi')}</TableCell>
              <TableCell align="right">{t('intermediary.fields.amount')}</TableCell>
              <TableCell align="right">{t('intermediary.fields.commission')}</TableCell>
              <TableCell>{t('intermediary.fields.activity_date')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map(tx => (
              <TableRow key={tx.id} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {tx.transaction_number}
                </TableCell>
                <TableCell>
                  <Chip
                    label={t(`intermediary.status.${tx.status}`)}
                    color={INTERMEDIARY_STATUS_COLORS[tx.status] || 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{tx.service_type || '-'}</TableCell>
                <TableCell>{tx.poi_name || '-'}</TableCell>
                <TableCell align="right">
                  {tx.amount_cents > 0 ? `€${(tx.amount_cents / 100).toFixed(2)}` : '-'}
                </TableCell>
                <TableCell align="right">
                  {tx.commission_cents > 0 ? `€${(tx.commission_cents / 100).toFixed(2)}` : '-'}
                </TableCell>
                <TableCell>
                  {tx.activity_date ? new Date(tx.activity_date).toLocaleDateString() : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {txPagination.total > 10 && (
        <TablePagination
          component="div"
          count={txPagination.total}
          page={txPage}
          onPageChange={(_, p) => setTxPage(p)}
          rowsPerPage={10}
          rowsPerPageOptions={[10]}
        />
      )}
    </Box>
  );
}

export default function PartnersPage() {
  const { t } = useTranslation();
  const selectedDest = useDestinationStore(s => s.selectedDestination);
  const destinationId = selectedDest === 'all' ? null : (selectedDest === 'calpe' ? 1 : selectedDest === 'texel' ? 2 : parseInt(selectedDest) || null);

  // Filters
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filters = {
    page: page + 1,
    limit: rowsPerPage,
    ...(search && { search }),
    ...(statusFilter && { status: statusFilter })
  };

  const { data, isLoading, error, refetch } = usePartnerList(destinationId || 1, filters);
  const { data: statsData } = usePartnerStats(destinationId || 1);
  const createMut = usePartnerCreate();
  const updateMut = usePartnerUpdate();
  const statusMut = usePartnerUpdateStatus();

  const partners = data?.data?.items || [];
  const pagination = data?.data?.pagination || {};
  const stats = statsData?.data || {};

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  // Partner action menu + archive/delete dialogs
  const [partnerMenuAnchor, setPartnerMenuAnchor] = useState(null);
  const [partnerMenuTarget, setPartnerMenuTarget] = useState(null);
  const [archivePartnerDialog, setArchivePartnerDialog] = useState(null);
  const [deletePartnerDialog, setDeletePartnerDialog] = useState(null);

  const queryClient = useQueryClient();
  const archivePartnerMut = useMutation({
    mutationFn: (id) => client.put(`/partners/${id}/archive`).then(r => r.data),
    onSuccess: () => { refetch(); },
  });
  const deletePartnerMut = useMutation({
    mutationFn: (id) => client.delete(`/partners/${id}`).then(r => r.data),
    onSuccess: () => { refetch(); },
  });

  // Create form
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [activeStep, setActiveStep] = useState(0);

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(0);
  }, [searchInput]);

  // ─── STATS CARDS ─────────────────────────────────────────
  const StatsCards = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {[
        { label: t('partners.stats.total'), value: stats.total_partners || 0, color: '#7FA594' },
        { label: t('partners.stats.active'), value: stats.active_partners || 0, color: '#4caf50' },
        { label: t('partners.stats.linked_pois'), value: stats.linked_pois || 0, color: '#2196f3' },
        { label: t('partners.stats.avg_commission'), value: `${(stats.avg_commission_rate || 0).toFixed(1)}%`, color: '#D4AF37' }
      ].map(({ label, value, color }) => (
        <Grid item xs={6} md={3} key={label}>
          <Card sx={{ p: 2, textAlign: 'center', borderTop: `3px solid ${color}` }}>
            <Typography variant="h4" fontWeight={700}>{value}</Typography>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  // ─── CREATE DIALOG (3-STEP WIZARD) ──────────────────────
  const handleCreate = async () => {
    try {
      await createMut.mutateAsync(form);
      setCreateOpen(false);
      setForm({ ...EMPTY_FORM });
      setActiveStep(0);
      setSnack({ open: true, message: t('partners.created'), severity: 'success' });
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error?.message || err.message, severity: 'error' });
    }
  };

  const CreateDialog = () => (
    <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>{t('partners.create_title')}</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ my: 2 }}>
          <Step><StepLabel>{t('partners.wizard.step1')}</StepLabel></Step>
          <Step><StepLabel>{t('partners.wizard.step2')}</StepLabel></Step>
          <Step><StepLabel>{t('partners.wizard.step3')}</StepLabel></Step>
        </Stepper>

        {activeStep === 0 && (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('partners.fields.destination')}</InputLabel>
                <Select value={form.destinationId} label={t('partners.fields.destination')}
                  onChange={e => setForm({ ...form, destinationId: e.target.value })}>
                  {DEST_OPTIONS.map(d => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label={t('partners.fields.company_name')} required
                value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label={t('partners.fields.contact_name')} required
                value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label={t('partners.fields.contact_email')} required type="email"
                value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label={t('partners.fields.contact_phone')}
                value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} />
            </Grid>
          </Grid>
        )}

        {activeStep === 1 && (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label={t('partners.fields.iban')} placeholder="NL00ABCD0123456789"
                value={form.iban} onChange={e => setForm({ ...form, iban: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label={t('partners.fields.kvk_number')}
                value={form.kvkNumber} onChange={e => setForm({ ...form, kvkNumber: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label={t('partners.fields.vat_number')} placeholder="NL000000000B00"
                value={form.vatNumber} onChange={e => setForm({ ...form, vatNumber: e.target.value })} />
            </Grid>
          </Grid>
        )}

        {activeStep === 2 && (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label={t('partners.fields.commission_rate')} type="number"
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                value={form.commissionRate} onChange={e => setForm({ ...form, commissionRate: parseFloat(e.target.value) || 0 })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('partners.fields.commission_type')}</InputLabel>
                <Select value={form.commissionType} label={t('partners.fields.commission_type')}
                  onChange={e => setForm({ ...form, commissionType: e.target.value })}>
                  <MenuItem value="percentage">{t('partners.commission_types.percentage')}</MenuItem>
                  <MenuItem value="fixed">{t('partners.commission_types.fixed')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label={t('partners.fields.notes')} multiline rows={3}
                value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
        {activeStep > 0 && <Button onClick={() => setActiveStep(s => s - 1)}>{t('common.back')}</Button>}
        {activeStep < 2 ? (
          <Button variant="contained" onClick={() => setActiveStep(s => s + 1)}
            disabled={activeStep === 0 && (!form.companyName || !form.contactName || !form.contactEmail)}>
            {t('common.next')}
          </Button>
        ) : (
          <Button variant="contained" onClick={handleCreate} disabled={createMut.isPending}>
            {t('partners.create_button')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  // ─── DETAIL DIALOG ──────────────────────────────────────
  const DetailDialog = () => {
    const [tab, setTab] = useState(0);
    const { data: detailData, isLoading: detailLoading } = usePartnerDetail(detailId, destinationId || 1);
    const partner = detailData?.data;

    const handleStatusChange = async (newStatus) => {
      try {
        await statusMut.mutateAsync({
          id: detailId,
          data: { status: newStatus, destinationId: partner?.destination_id }
        });
        setSnack({ open: true, message: t('partners.status_updated'), severity: 'success' });
      } catch (err) {
        setSnack({ open: true, message: err.response?.data?.error?.message || err.message, severity: 'error' });
      }
    };

    if (!detailId) return null;
    return (
      <Dialog open={!!detailId} onClose={() => { setDetailId(null); setEditMode(false); }} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{partner?.company_name || '...'}</Typography>
            {partner && <Chip label={partner.contract_status} color={STATUS_COLORS[partner.contract_status] || 'default'} size="small" />}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab icon={<BusinessIcon />} label={t('partners.tabs.profile')} iconPosition="start" />
            <Tab icon={<PlaceIcon />} label={t('partners.tabs.pois')} iconPosition="start" />
            <Tab icon={<AssignmentIcon />} label={t('partners.tabs.onboarding')} iconPosition="start" />
            <Tab icon={<ReceiptIcon />} label={t('partners.tabs.transactions')} iconPosition="start" />
          </Tabs>

          {detailLoading ? <Skeleton variant="rectangular" height={200} /> : partner && (
            <>
              {tab === 0 && (
                <Grid container spacing={2}>
                  {[
                    ['partners.fields.company_name', partner.company_name],
                    ['partners.fields.contact_name', partner.contact_name],
                    ['partners.fields.contact_email', partner.contact_email],
                    ['partners.fields.contact_phone', partner.contact_phone || '-'],
                    ['partners.fields.iban', partner.iban || '-'],
                    ['partners.fields.kvk_number', partner.kvk_number || '-'],
                    ['partners.fields.vat_number', partner.vat_number || '-'],
                    ['partners.fields.commission_rate', `${partner.commission_rate}% (${partner.commission_type})`],
                    ['partners.fields.contract_start', partner.contract_start_date || '-'],
                    ['partners.fields.contract_end', partner.contract_end_date || '-']
                  ].map(([label, value]) => (
                    <Grid item xs={12} sm={6} key={label}>
                      <Typography variant="caption" color="text.secondary">{t(label)}</Typography>
                      <Typography variant="body2">{value}</Typography>
                    </Grid>
                  ))}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('partners.status_actions')}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {partner.contract_status === 'draft' && (
                        <Button size="small" variant="outlined" onClick={() => handleStatusChange('pending')}>
                          {t('partners.actions.submit')}
                        </Button>
                      )}
                      {partner.contract_status === 'pending' && (
                        <Button size="small" variant="contained" color="success" onClick={() => handleStatusChange('active')}>
                          {t('partners.actions.activate')}
                        </Button>
                      )}
                      {partner.contract_status === 'active' && (
                        <Button size="small" variant="outlined" color="warning" onClick={() => handleStatusChange('suspended')}>
                          {t('partners.actions.suspend')}
                        </Button>
                      )}
                      {partner.contract_status === 'suspended' && (
                        <Button size="small" variant="contained" color="success" onClick={() => handleStatusChange('active')}>
                          {t('partners.actions.reactivate')}
                        </Button>
                      )}
                      {['draft', 'pending', 'active', 'suspended'].includes(partner.contract_status) && (
                        <Button size="small" variant="outlined" color="error" onClick={() => handleStatusChange('terminated')}>
                          {t('partners.actions.terminate')}
                        </Button>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              )}

              {tab === 1 && (
                <Box>
                  {partner.pois?.length > 0 ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
                          <TableCell>{t('partners.poi_table.name')}</TableCell>
                          <TableCell>{t('partners.poi_table.category')}</TableCell>
                          <TableCell>{t('partners.poi_table.rating')}</TableCell>
                          <TableCell>{t('partners.poi_table.commission')}</TableCell>
                          <TableCell>{t('partners.poi_table.active')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {partner.pois.map(pp => (
                          <TableRow key={pp.id}>
                            <TableCell>{pp.poi_name || `POI #${pp.poi_id}`}</TableCell>
                            <TableCell>{pp.poi_category || '-'}</TableCell>
                            <TableCell>{pp.poi_rating ? `${pp.poi_rating} (${pp.poi_review_count})` : '-'}</TableCell>
                            <TableCell>{pp.commission_override ? `${pp.commission_override}%` : t('partners.default_commission')}</TableCell>
                            <TableCell><Chip size="small" label={pp.is_active ? t('common.yes') : t('common.no')} color={pp.is_active ? 'success' : 'default'} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                      {t('partners.no_pois')}
                    </Typography>
                  )}
                </Box>
              )}

              {tab === 2 && (
                <List>
                  {partner.onboarding?.map(step => (
                    <ListItem key={step.id}>
                      <ListItemIcon>
                        {step.step_status === 'completed' ? (
                          <CheckCircleIcon color="success" />
                        ) : step.step_status === 'skipped' ? (
                          <CheckCircleIcon color="disabled" />
                        ) : (
                          <PendingIcon color="action" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={t(`partners.onboarding_steps.${step.step_name}`)}
                        secondary={step.completed_at ? `${t('partners.completed_by')}: ${step.completed_by || '-'} (${new Date(step.completed_at).toLocaleDateString()})` : t(`partners.step_status.${step.step_status}`)}
                      />
                    </ListItem>
                  ))}
                </List>
              )}

              {tab === 3 && (
                <TransactionsTab partnerId={partner.id} destinationId={partner.destination_id} t={t} />
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDetailId(null); setEditMode(false); }}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    );
  };

  // ─── MAIN RENDER ────────────────────────────────────────
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <HandshakeIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
            {t('partners.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">{t('partners.subtitle', 'Beheer partners en samenwerkingen')}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={t('common.refresh')}>
            <IconButton onClick={() => refetch()}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            {t('partners.add_button')}
          </Button>
        </Box>
      </Box>

      {error && <ErrorBanner message={error.message} onRetry={refetch} />}

      <StatsCards />

      {/* Filters */}
      <Card sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" placeholder={t('partners.search_placeholder')}
              value={searchInput} onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('partners.filter_status')}</InputLabel>
              <Select value={statusFilter} label={t('partners.filter_status')}
                onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
                <MenuItem value="">{t('common.all')}</MenuItem>
                {['draft', 'pending', 'active', 'suspended', 'terminated'].map(s => (
                  <MenuItem key={s} value={s}>{t(`partners.status.${s}`)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button variant="outlined" onClick={handleSearch} fullWidth>{t('common.search')}</Button>
          </Grid>
        </Grid>
      </Card>

      {/* Partners Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
              <TableCell>{t('partners.table.company')}</TableCell>
              <TableCell>{t('partners.table.destination')}</TableCell>
              <TableCell>{t('partners.table.status')}</TableCell>
              <TableCell>{t('partners.table.commission')}</TableCell>
              <TableCell>{t('partners.table.pois')}</TableCell>
              <TableCell>{t('partners.table.contact')}</TableCell>
              <TableCell width={60}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                </TableRow>
              ))
            ) : partners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">{t('partners.no_data')}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              partners.map(p => (
                <TableRow key={p.id} hover sx={{ cursor: 'pointer' }} onClick={() => setDetailId(p.id)}>
                  <TableCell><Typography variant="body2" fontWeight={600}>{p.company_name}</Typography></TableCell>
                  <TableCell>{DEST_MAP[p.destination_id] || p.destination_id}</TableCell>
                  <TableCell><Chip label={t(`partners.status.${p.contract_status}`)} color={STATUS_COLORS[p.contract_status]} size="small" /></TableCell>
                  <TableCell>{p.commission_rate}%</TableCell>
                  <TableCell>{p.poi_count || 0}</TableCell>
                  <TableCell><Typography variant="body2" noWrap>{p.contact_name}</Typography></TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={e => { e.stopPropagation(); setPartnerMenuAnchor(e.currentTarget); setPartnerMenuTarget(p); }}>
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={pagination.total || 0}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </TableContainer>

      {/* Partner Action Menu */}
      <Menu anchorEl={partnerMenuAnchor} open={!!partnerMenuAnchor} onClose={() => { setPartnerMenuAnchor(null); setPartnerMenuTarget(null); }}>
        <MenuItem onClick={() => { setDetailId(partnerMenuTarget?.id); setEditMode(false); setPartnerMenuAnchor(null); }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{t('common.edit')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setArchivePartnerDialog(partnerMenuTarget); setPartnerMenuAnchor(null); }}>
          <ListItemIcon><ArchiveIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{t('partners.archive', 'Archiveren')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setDeletePartnerDialog(partnerMenuTarget); setPartnerMenuAnchor(null); }} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteForeverIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>{t('partners.delete', 'Verwijderen')}</ListItemText>
        </MenuItem>
      </Menu>

      {/* Archive Partner Dialog */}
      <Dialog open={!!archivePartnerDialog} onClose={() => setArchivePartnerDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('partners.archiveTitle', 'Partner archiveren?')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {t('partners.archiveBody', '{{name}} wordt gearchiveerd. Data blijft behouden.', { name: archivePartnerDialog?.company_name })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchivePartnerDialog(null)}>{t('common.cancel', 'Annuleren')}</Button>
          <Button variant="contained" color="warning" onClick={async () => {
            try {
              await archivePartnerMut.mutateAsync(archivePartnerDialog.id);
              setSnack({ open: true, message: `${archivePartnerDialog.company_name} gearchiveerd`, severity: 'success' });
              setArchivePartnerDialog(null);
            } catch (err) {
              setSnack({ open: true, message: err.response?.data?.error?.message || 'Fout', severity: 'error' });
            }
          }} disabled={archivePartnerMut.isPending}
            startIcon={archivePartnerMut.isPending ? <CircularProgress size={16} /> : <ArchiveIcon />}>
            {t('partners.archive', 'Archiveren')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Partner Dialog */}
      <Dialog open={!!deletePartnerDialog} onClose={() => setDeletePartnerDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: 'error.main' }}>{t('partners.deleteTitle', 'Partner permanent verwijderen?')}</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>{deletePartnerDialog?.company_name}</strong> en alle gerelateerde data (POI-koppelingen, onboarding, payouts) worden permanent verwijderd.
          </Alert>
          <Typography variant="body2">{t('partners.deleteWarning', 'Dit is onomkeerbaar.')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletePartnerDialog(null)}>{t('common.cancel', 'Annuleren')}</Button>
          <Button variant="contained" color="error" onClick={async () => {
            try {
              await deletePartnerMut.mutateAsync(deletePartnerDialog.id);
              setSnack({ open: true, message: `${deletePartnerDialog.company_name} verwijderd`, severity: 'success' });
              setDeletePartnerDialog(null);
            } catch (err) {
              setSnack({ open: true, message: err.response?.data?.error?.message || 'Fout', severity: 'error' });
            }
          }} disabled={deletePartnerMut.isPending}
            startIcon={deletePartnerMut.isPending ? <CircularProgress size={16} /> : <DeleteForeverIcon />}>
            {t('partners.deletePermanent', 'Permanent Verwijderen')}
          </Button>
        </DialogActions>
      </Dialog>

      <CreateDialog />
      <DetailDialog />

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
