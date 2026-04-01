import { useState, useCallback } from 'react';
import {
  Box, Typography, Card, Grid, Skeleton, Button, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  TextField, Chip, Snackbar, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, Select, MenuItem, FormControl, InputLabel, Pagination,
  Stepper, Step, StepLabel
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { useNavigate } from 'react-router-dom';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { useTranslation } from 'react-i18next';
import useDestinationStore from '../stores/destinationStore.js';
import useAuthStore from '../stores/authStore.js';
import { intermediaryService } from '../api/intermediaryService.js';
import { formatCents } from '../utils/currencyFormat.js';
import {
  useIntermediaryList, useIntermediaryStats, useIntermediaryFunnel,
  useIntermediaryDetail, useIntermediaryConsent, useIntermediaryConfirm,
  useIntermediaryShare, useIntermediaryCancel
} from '../hooks/useIntermediary.js';

const CHART_COLORS = ['#1976d2', '#7c3aed', '#0891b2', '#22c55e', '#f59e0b'];

const STATUS_COLORS = {
  voorstel: 'default', toestemming: 'info', bevestiging: 'primary',
  delen: 'success', reminder: 'secondary', review: 'success',
  cancelled: 'error', expired: 'warning'
};

const FUNNEL_STEPS = ['voorstel', 'toestemming', 'bevestiging', 'delen', 'review'];

function getDefaultDates() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const to = now.toISOString().split('T')[0];
  return { from, to };
}

function getDestId(selected) {
  if (!selected || selected === 'all') return null;
  const map = { calpe: 1, texel: 2, alicante: 3 };
  return map[selected] || parseInt(selected) || null;
}

function StatusChip({ status }) {
  return <Chip size="small" label={status} color={STATUS_COLORS[status] || 'default'} />;
}

function KPICard({ title, value, subtitle, loading, color }) {
  return (
    <Card sx={{ p: 2, borderTop: `3px solid ${color || '#1976d2'}` }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{title}</Typography>
      {loading ? <Skeleton width={100} height={36} /> : (
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{value}</Typography>
      )}
      {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
    </Card>
  );
}

// ============================================================================
// DASHBOARD TAB
// ============================================================================
function DashboardTab({ destinationId, t }) {
  const [from, setFrom] = useState(() => getDefaultDates().from);
  const [to, setTo] = useState(() => getDefaultDates().to);
  const dateFilters = { dateFrom: from, dateTo: to };

  const { data: statsData, isLoading, refetch } = useIntermediaryStats(destinationId, dateFilters);
  const { data: funnelData } = useIntermediaryFunnel(destinationId, dateFilters);

  const stats = statsData?.data || {};
  const funnel = funnelData?.data?.funnel || [];

  const chartData = funnel.map((f, i) => ({
    name: t(`intermediary.funnel_${f.stage}`),
    count: f.count,
    fill: CHART_COLORS[i % CHART_COLORS.length]
  }));

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField type="date" size="small" label={t('intermediary.period_from')} value={from}
          onChange={e => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField type="date" size="small" label={t('intermediary.period_to')} value={to}
          onChange={e => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        <Button size="small" variant="contained" startIcon={<RefreshIcon />} onClick={refetch}>
          {t('common.refresh')}
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <KPICard title={t('intermediary.stats.total_transactions')} value={stats.total_transactions || 0}
            subtitle={`${stats.unique_partners || 0} ${t('intermediary.stats.unique_partners')}`}
            loading={isLoading} color="#1976d2" />
        </Grid>
        <Grid item xs={6} md={3}>
          <KPICard title={t('intermediary.stats.conversion_rate')}
            value={`${((stats.conversion_rate || 0) * 100).toFixed(1)}%`}
            subtitle={`${stats.active_proposals || 0} ${t('intermediary.stats.active_proposals')}`}
            loading={isLoading} color="#7c3aed" />
        </Grid>
        <Grid item xs={6} md={3}>
          <KPICard title={t('intermediary.stats.total_revenue')}
            value={formatCents(stats.total_revenue_cents)}
            loading={isLoading} color="#22c55e" />
        </Grid>
        <Grid item xs={6} md={3}>
          <KPICard title={t('intermediary.stats.total_commission')}
            value={formatCents(stats.total_commission_cents)}
            loading={isLoading} color="#f59e0b" />
        </Grid>
      </Grid>

      {chartData.length > 0 && (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>{t('intermediary.funnel_title')}</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={120} />
              <ReTooltip />
              <Bar dataKey="count" fill="#1976d2">
                {chartData.map((entry, idx) => (
                  <rect key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </Box>
  );
}

// ============================================================================
// TRANSACTIONS TAB
// ============================================================================
function TransactionsTab({ destinationId, t, showSnackbar }) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const filters = {
    status: statusFilter || undefined,
    search: search || undefined,
    page,
    limit: 25
  };
  const { data, isLoading } = useIntermediaryList(destinationId, filters);
  const items = data?.data?.items || [];
  const pagination = data?.data?.pagination || {};

  const allStatuses = ['voorstel', 'toestemming', 'bevestiging', 'delen', 'reminder', 'review', 'cancelled', 'expired'];

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>{t('intermediary.filter_status')}</InputLabel>
          <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            label={t('intermediary.filter_status')}>
            <MenuItem value="">{t('intermediary.filter_all')}</MenuItem>
            {allStatuses.map(s => (
              <MenuItem key={s} value={s}>{t(`intermediary.status.${s}`)}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField size="small" placeholder={t('intermediary.search_placeholder')} value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          sx={{ minWidth: 280 }} />
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
              <TableCell>{t('intermediary.fields.transaction_number')}</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>{t('intermediary.fields.partner')}</TableCell>
              <TableCell>{t('intermediary.fields.poi')}</TableCell>
              <TableCell align="right">{t('intermediary.fields.amount')}</TableCell>
              <TableCell align="right">{t('intermediary.fields.commission')}</TableCell>
              <TableCell>{t('intermediary.fields.activity_date')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary" sx={{ mb: 1 }}>{t('intermediary.no_data', 'Nog geen transacties')}</Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 2 }}>{t('intermediary.no_data_hint', 'Transacties worden aangemaakt zodra een partner een boeking bevestigt')}</Typography>
                  <Button variant="outlined" size="small" href="/partners">{t('intermediary.goToPartners', 'Ga naar Partners')}</Button>
                </TableCell>
              </TableRow>
            ) : items.map(tx => (
              <TableRow key={tx.id} hover sx={{ cursor: 'pointer' }}
                onClick={() => setSelectedId(tx.id)}>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {tx.transaction_number}
                </TableCell>
                <TableCell><StatusChip status={tx.status} /></TableCell>
                <TableCell>{tx.partner_name || '—'}</TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.poi_name || '—'}
                </TableCell>
                <TableCell align="right">{formatCents(tx.amount_cents)}</TableCell>
                <TableCell align="right">{formatCents(tx.commission_cents)}</TableCell>
                <TableCell>{tx.activity_date || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={pagination.totalPages} page={page} onChange={(_, v) => setPage(v)} />
        </Box>
      )}

      {selectedId && (
        <TransactionDetailDialog
          id={selectedId}
          destinationId={destinationId}
          t={t}
          showSnackbar={showSnackbar}
          onClose={() => setSelectedId(null)}
        />
      )}
    </Box>
  );
}

// ============================================================================
// TRANSACTION DETAIL DIALOG
// ============================================================================
function TransactionDetailDialog({ id, destinationId, t, showSnackbar, onClose }) {
  const { data, isLoading } = useIntermediaryDetail(id, destinationId);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const consentMutation = useIntermediaryConsent();
  const confirmMutation = useIntermediaryConfirm();
  const shareMutation = useIntermediaryShare();
  const cancelMutation = useIntermediaryCancel();

  const tx = data?.data || {};

  const activeStep = FUNNEL_STEPS.indexOf(tx.status);
  const isCancelled = tx.status === 'cancelled' || tx.status === 'expired';
  const isTerminal = isCancelled || tx.status === 'review' || tx.status === 'reminder';
  const user = useAuthStore(s => s.user);
  const canWrite = user?.role === 'platform_admin';

  const handleAction = async (action) => {
    try {
      if (action === 'consent') {
        await consentMutation.mutateAsync({ id, data: { destinationId } });
        showSnackbar(t('intermediary.consent_recorded'), 'success');
      } else if (action === 'confirm') {
        await confirmMutation.mutateAsync({ id, data: { destinationId } });
        showSnackbar(t('intermediary.confirmed'), 'success');
      } else if (action === 'share') {
        await shareMutation.mutateAsync({ id, data: { destinationId } });
        showSnackbar(t('intermediary.voucher_shared'), 'success');
      }
      onClose();
    } catch (e) {
      showSnackbar(e.response?.data?.error?.message || e.message, 'error');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync({ id, data: { reason: cancelReason, destinationId } });
      showSnackbar(t('intermediary.cancelled'), 'success');
      setCancelOpen(false);
      onClose();
    } catch (e) {
      showSnackbar(e.response?.data?.error?.message || e.message, 'error');
    }
  };

  const fields = [
    { label: t('intermediary.fields.transaction_number'), value: tx.transaction_number },
    { label: 'Status', value: tx.status ? <StatusChip status={tx.status} /> : '—' },
    { label: t('intermediary.fields.partner'), value: tx.partner_name },
    { label: t('intermediary.fields.poi'), value: tx.poi_name },
    { label: t('intermediary.fields.service_type'), value: tx.service_type },
    { label: t('intermediary.fields.service_description'), value: tx.service_description },
    { label: t('intermediary.fields.amount'), value: formatCents(tx.amount_cents) },
    { label: t('intermediary.fields.commission'), value: `${formatCents(tx.commission_cents)} (${tx.commission_rate || 0}%)` },
    { label: t('intermediary.fields.partner_amount'), value: formatCents(tx.partner_amount_cents) },
    { label: t('intermediary.fields.guest_name'), value: tx.guest_name },
    { label: t('intermediary.fields.guest_email'), value: tx.guest_email },
    { label: t('intermediary.fields.activity_date'), value: `${tx.activity_date || '—'} ${tx.activity_time || ''}` },
    { label: t('intermediary.created_at'), value: tx.created_at ? new Date(tx.created_at).toLocaleString() : '—' }
  ];

  return (
    <>
      <Dialog open onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>{t('intermediary.detail_title')}</DialogTitle>
        <DialogContent dividers>
          {isLoading ? (
            <Box sx={{ py: 4, textAlign: 'center' }}><Skeleton width="100%" height={200} /></Box>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('intermediary.state_timeline')}</Typography>
                <Stepper activeStep={isCancelled ? -1 : activeStep} alternativeLabel>
                  {FUNNEL_STEPS.map(step => (
                    <Step key={step} completed={!isCancelled && FUNNEL_STEPS.indexOf(step) <= activeStep}>
                      <StepLabel error={isCancelled && step === tx.status}>
                        {t(`intermediary.status.${step}`)}
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>
                {isCancelled && (
                  <Typography variant="body2" color="error" sx={{ mt: 1, textAlign: 'center' }}>
                    {t(`intermediary.status.${tx.status}`)}
                    {tx.cancellation_reason && ` — ${tx.cancellation_reason}`}
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} md={tx.qr_code_image ? 8 : 12}>
                <Table size="small">
                  <TableBody>
                    {fields.map(({ label, value }) => (
                      <TableRow key={label}>
                        <TableCell sx={{ fontWeight: 600, width: 180, border: 'none', py: 0.5 }}>{label}</TableCell>
                        <TableCell sx={{ border: 'none', py: 0.5 }}>{value || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Grid>

              {tx.qr_code_image && (
                <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('intermediary.fields.qr_code')}</Typography>
                  <Box component="img" src={tx.qr_code_image} alt="QR Code" sx={{ maxWidth: 200, border: '1px solid', borderColor: 'divider', borderRadius: 1 }} />
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {canWrite && !isTerminal && tx.status === 'voorstel' && (
            <Button variant="contained" color="info" onClick={() => handleAction('consent')}>
              {t('intermediary.actions.record_consent')}
            </Button>
          )}
          {canWrite && !isTerminal && tx.status === 'toestemming' && (
            <Button variant="contained" color="primary" onClick={() => handleAction('confirm')}>
              {t('intermediary.actions.confirm_payment')}
            </Button>
          )}
          {canWrite && !isTerminal && tx.status === 'bevestiging' && (
            <Button variant="contained" color="success" onClick={() => handleAction('share')}>
              {t('intermediary.actions.share_voucher')}
            </Button>
          )}
          {canWrite && !isTerminal && !isCancelled && (
            <Button variant="outlined" color="error" onClick={() => setCancelOpen(true)}>
              {t('intermediary.actions.cancel')}
            </Button>
          )}
          <Button onClick={onClose}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('intermediary.actions.cancel')}</DialogTitle>
        <DialogContent>
          <TextField fullWidth multiline rows={3} label={t('intermediary.cancel_reason')}
            value={cancelReason} onChange={e => setCancelReason(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleCancel}
            disabled={!cancelReason.trim()}>{t('common.confirm')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ============================================================================
// SETTLEMENTS TAB
// ============================================================================
function SettlementsTab({ destinationId, t }) {
  const navigate = useNavigate();
  const { data: statsData } = useIntermediaryStats(destinationId, {});
  const stats = statsData?.data || {};
  const unsettled = (stats.confirmed || 0) + (stats.shared || 0) + (stats.reminded || 0) + (stats.reviewed || 0);

  return (
    <Box>
      <Card sx={{ p: 3, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
          {t('intermediary.settlements_info')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('intermediary.unsettled_count')}: <strong>{unsettled}</strong>
        </Typography>
        <Button variant="contained" startIcon={<AccountBalanceIcon />}
          onClick={() => navigate('/financial')}>
          {t('intermediary.go_to_financial')}
        </Button>
      </Card>
    </Box>
  );
}

// ============================================================================
// EXPORT TAB
// ============================================================================
function ExportTab({ destinationId, t, showSnackbar }) {
  const [from, setFrom] = useState(() => getDefaultDates().from);
  const [to, setTo] = useState(() => getDefaultDates().to);
  const [statusFilter, setStatusFilter] = useState('');

  const downloadBlob = (response, fallbackName) => {
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fallbackName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    try {
      const response = await intermediaryService.exportTransactions(destinationId, {
        dateFrom: from, dateTo: to, status: statusFilter || undefined
      });
      downloadBlob(response, `intermediary_transactions_${from}_${to}.csv`);
      showSnackbar(t('intermediary.export_success'), 'success');
    } catch (e) {
      showSnackbar(e.response?.data?.error?.message || e.message, 'error');
    }
  };

  const allStatuses = ['voorstel', 'toestemming', 'bevestiging', 'delen', 'reminder', 'review', 'cancelled', 'expired'];

  return (
    <Box>
      <Card sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          {t('intermediary.export_transactions')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField type="date" size="small" label={t('intermediary.period_from')} value={from}
            onChange={e => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField type="date" size="small" label={t('intermediary.period_to')} value={to}
            onChange={e => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>{t('intermediary.filter_status')}</InputLabel>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              label={t('intermediary.filter_status')}>
              <MenuItem value="">{t('intermediary.filter_all')}</MenuItem>
              {allStatuses.map(s => (
                <MenuItem key={s} value={s}>{t(`intermediary.status.${s}`)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleExport}>
            {t('intermediary.download_csv')}
          </Button>
        </Box>
      </Card>
    </Box>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================
export default function IntermediaryPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const selectedDestination = useDestinationStore(s => s.selectedDestination);
  const destinationId = getDestId(selectedDestination) || 1;

  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnack({ open: true, message, severity });
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('intermediary.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('intermediary.subtitle', 'Beheer intermediaire transacties en afrekeningen')}</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={t('intermediary.tab_dashboard')} />
        <Tab label={t('intermediary.tab_transactions')} />
        <Tab label={t('intermediary.tab_settlements')} />
        <Tab label={t('intermediary.tab_export')} />
      </Tabs>

      {tab === 0 && <DashboardTab destinationId={destinationId} t={t} />}
      {tab === 1 && <TransactionsTab destinationId={destinationId} t={t} showSnackbar={showSnackbar} />}
      {tab === 2 && <SettlementsTab destinationId={destinationId} t={t} />}
      {tab === 3 && <ExportTab destinationId={destinationId} t={t} showSnackbar={showSnackbar} />}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
