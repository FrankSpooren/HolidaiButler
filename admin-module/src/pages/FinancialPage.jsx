import { useState, useCallback } from 'react';
import {
  Box, Typography, Card, Grid, Skeleton, Button, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  TextField, Chip, Snackbar, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, Select, MenuItem, FormControl, InputLabel, Pagination,
  IconButton, Tooltip
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PaymentIcon from '@mui/icons-material/Payment';
import ErrorIcon from '@mui/icons-material/Error';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { useTranslation } from 'react-i18next';
import useDestinationStore from '../stores/destinationStore.js';
import useAuthStore from '../stores/authStore.js';
import { financialService } from '../api/financialService.js';
import { formatCents } from '../utils/currencyFormat.js';
import {
  useFinancialDashboard, useFinancialMonthlyReport,
  useSettlementList, usePayoutList, useCreditNoteList,
  useFinancialAuditLog, useCreateSettlement, useApproveSettlement,
  useCancelSettlement, useMarkPayoutPaid, useMarkPayoutFailed,
  useCreateCreditNote, useFinalizeCreditNote
} from '../hooks/useFinancial.js';

const CHART_COLORS = ['#1976d2', '#22c55e', '#f59e0b', '#ef4444'];

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
  const colorMap = {
    draft: 'default', calculated: 'info', approved: 'primary',
    processing: 'warning', completed: 'success', cancelled: 'error',
    pending: 'default', paid: 'success', failed: 'error', final: 'success', voided: 'error'
  };
  return <Chip size="small" label={status} color={colorMap[status] || 'default'} />;
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
  const year = new Date().getFullYear();

  const { data: dashboard, isLoading, refetch } = useFinancialDashboard(destinationId, from, to);
  const { data: monthlyData } = useFinancialMonthlyReport(destinationId, year);

  const d = dashboard?.data || {};
  const settlements = d.settlements || {};
  const payouts = d.payouts || {};
  const creditNotes = d.credit_notes || {};
  const unsettled = d.unsettled || {};

  const monthNames = [
    t('financial.jan'), t('financial.feb'), t('financial.mar'), t('financial.apr'),
    t('financial.may'), t('financial.jun'), t('financial.jul'), t('financial.aug'),
    t('financial.sep'), t('financial.oct'), t('financial.nov'), t('financial.dec')
  ];
  const chartData = (monthlyData?.data || []).map((m, i) => ({
    name: monthNames[i] || `M${m.month}`,
    commission: (m.commission_cents || 0) / 100,
    payout: (m.payout_cents || 0) / 100
  }));

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField type="date" size="small" label={t('financial.period_from')} value={from}
          onChange={e => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField type="date" size="small" label={t('financial.period_to')} value={to}
          onChange={e => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        <Button size="small" variant="contained" startIcon={<RefreshIcon />} onClick={refetch}>
          {t('common.refresh')}
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <KPICard title={t('financial.total_settlements')} value={settlements.total || 0}
            subtitle={`${settlements.completed || 0} ${t('financial.completed')}`} loading={isLoading} color="#1976d2" />
        </Grid>
        <Grid item xs={6} md={3}>
          <KPICard title={t('financial.total_payout')} value={formatCents(payouts.total_payout_cents)}
            subtitle={`${formatCents(payouts.paid_payout_cents)} ${t('financial.paid')}`} loading={isLoading} color="#22c55e" />
        </Grid>
        <Grid item xs={6} md={3}>
          <KPICard title={t('financial.total_commission')} value={formatCents(payouts.total_commission_cents)}
            subtitle={`${creditNotes.final_count || 0} ${t('financial.credit_notes')}`} loading={isLoading} color="#f59e0b" />
        </Grid>
        <Grid item xs={6} md={3}>
          <KPICard title={t('financial.unsettled')} value={unsettled.transaction_count || 0}
            subtitle={formatCents(unsettled.total_cents)} loading={isLoading} color="#ef4444" />
        </Grid>
      </Grid>

      {chartData.length > 0 && (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>{t('financial.monthly_overview')} {year}</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <ReTooltip formatter={(v) => `€${v.toFixed(2)}`} />
              <Bar dataKey="commission" name={t('financial.commission')} fill={CHART_COLORS[2]} />
              <Bar dataKey="payout" name={t('financial.payout')} fill={CHART_COLORS[1]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </Box>
  );
}

// ============================================================================
// SETTLEMENTS TAB
// ============================================================================
function SettlementsTab({ destinationId, t, showSnackbar }) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const { data, isLoading, refetch } = useSettlementList(destinationId, { status: statusFilter || undefined, page, limit: 25 });
  const createMutation = useCreateSettlement();
  const approveMutation = useApproveSettlement();
  const cancelMutation = useCancelSettlement();

  const items = data?.data?.items || [];
  const pagination = data?.data?.pagination || {};

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync({ destinationId, periodStart, periodEnd });
      setCreateOpen(false);
      showSnackbar(t('financial.settlement_created'), 'success');
    } catch (e) {
      showSnackbar(e.response?.data?.error?.message || e.message, 'error');
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveMutation.mutateAsync(id);
      showSnackbar(t('financial.settlement_approved'), 'success');
    } catch (e) {
      showSnackbar(e.response?.data?.error?.message || e.message, 'error');
    }
  };

  const handleCancel = async (id) => {
    const reason = prompt(t('financial.cancel_reason'));
    if (reason === null) return;
    try {
      await cancelMutation.mutateAsync({ id, reason });
      showSnackbar(t('financial.settlement_cancelled'), 'success');
    } catch (e) {
      showSnackbar(e.response?.data?.error?.message || e.message, 'error');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>{t('financial.status')}</InputLabel>
          <Select value={statusFilter} label={t('financial.status')} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            {['draft', 'calculated', 'approved', 'processing', 'completed', 'cancelled'].map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={() => setCreateOpen(true)}>{t('financial.create_settlement')}</Button>
        <Button size="small" startIcon={<RefreshIcon />} onClick={refetch}>{t('common.refresh')}</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
              <TableCell>{t('financial.batch_number')}</TableCell>
              <TableCell>{t('financial.period')}</TableCell>
              <TableCell>{t('financial.partners')}</TableCell>
              <TableCell align="right">{t('financial.gross')}</TableCell>
              <TableCell align="right">{t('financial.commission')}</TableCell>
              <TableCell align="right">{t('financial.payout')}</TableCell>
              <TableCell>{t('financial.status')}</TableCell>
              <TableCell>{t('financial.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8}><Skeleton /></TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} sx={{ py: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">{t('financial.no_settlements', 'Nog geen settlements')}</Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>{t('financial.settlements_hint', 'Settlements worden automatisch aangemaakt op de 1e van elke maand')}</Typography>
                </TableCell>
              </TableRow>
            ) : items.map(s => (
              <TableRow key={s.id}>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{s.batch_number}</TableCell>
                <TableCell>{s.period_start} — {s.period_end}</TableCell>
                <TableCell>{s.total_partner_count}</TableCell>
                <TableCell align="right">{formatCents(s.total_gross_cents)}</TableCell>
                <TableCell align="right">{formatCents(s.total_commission_cents)}</TableCell>
                <TableCell align="right">{formatCents(s.total_payout_cents)}</TableCell>
                <TableCell><StatusChip status={s.status} /></TableCell>
                <TableCell>
                  {['draft', 'calculated'].includes(s.status) && (
                    <Tooltip title={t('financial.approve')}>
                      <IconButton size="small" color="primary" onClick={() => handleApprove(s.id)}>
                        <CheckCircleIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {['draft', 'calculated', 'approved'].includes(s.status) && (
                    <Tooltip title={t('financial.cancel')}>
                      <IconButton size="small" color="error" onClick={() => handleCancel(s.id)}>
                        <CancelIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={pagination.totalPages} page={page} onChange={(_, p) => setPage(p)} />
        </Box>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('financial.create_settlement')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField type="date" label={t('financial.period_from')} value={periodStart}
            onChange={e => setPeriodStart(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField type="date" label={t('financial.period_to')} value={periodEnd}
            onChange={e => setPeriodEnd(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!periodStart || !periodEnd || createMutation.isPending}>
            {t('financial.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ============================================================================
// PAYOUTS TAB
// ============================================================================
function PayoutsTab({ destinationId, t, showSnackbar }) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, refetch } = usePayoutList(destinationId, { status: statusFilter || undefined, page, limit: 25 });
  const payMutation = useMarkPayoutPaid();
  const failMutation = useMarkPayoutFailed();

  const items = data?.data?.items || [];
  const pagination = data?.data?.pagination || {};

  const handlePaid = async (id) => {
    const ref = prompt(t('financial.payment_reference'));
    if (ref === null) return;
    try {
      await payMutation.mutateAsync({ id, paidReference: ref });
      showSnackbar(t('financial.payout_marked_paid'), 'success');
    } catch (e) {
      showSnackbar(e.response?.data?.error?.message || e.message, 'error');
    }
  };

  const handleFailed = async (id) => {
    const reason = prompt(t('financial.failure_reason'));
    if (reason === null) return;
    try {
      await failMutation.mutateAsync({ id, failureReason: reason });
      showSnackbar(t('financial.payout_marked_failed'), 'warning');
    } catch (e) {
      showSnackbar(e.response?.data?.error?.message || e.message, 'error');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>{t('financial.status')}</InputLabel>
          <Select value={statusFilter} label={t('financial.status')} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            {['pending', 'approved', 'processing', 'paid', 'failed', 'cancelled'].map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button size="small" startIcon={<RefreshIcon />} onClick={refetch}>{t('common.refresh')}</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
              <TableCell>{t('financial.payout_number')}</TableCell>
              <TableCell>{t('financial.partner')}</TableCell>
              <TableCell>{t('financial.batch')}</TableCell>
              <TableCell align="right">{t('financial.gross')}</TableCell>
              <TableCell align="right">{t('financial.commission')}</TableCell>
              <TableCell align="right">{t('financial.payout')}</TableCell>
              <TableCell>{t('financial.status')}</TableCell>
              <TableCell>{t('financial.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8}><Skeleton /></TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center">{t('financial.no_payouts')}</TableCell></TableRow>
            ) : items.map(p => (
              <TableRow key={p.id}>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.payout_number}</TableCell>
                <TableCell>{p.partner_company_name || p.current_company_name || '—'}</TableCell>
                <TableCell sx={{ fontSize: '0.75rem' }}>{p.batch_number || '—'}</TableCell>
                <TableCell align="right">{formatCents(p.gross_cents)}</TableCell>
                <TableCell align="right">{formatCents(p.commission_cents)}</TableCell>
                <TableCell align="right">{formatCents(p.payout_cents)}</TableCell>
                <TableCell><StatusChip status={p.status} /></TableCell>
                <TableCell>
                  {p.status === 'processing' && (
                    <>
                      <Tooltip title={t('financial.mark_paid')}>
                        <IconButton size="small" color="success" onClick={() => handlePaid(p.id)}>
                          <PaymentIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('financial.mark_failed')}>
                        <IconButton size="small" color="error" onClick={() => handleFailed(p.id)}>
                          <ErrorIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={pagination.totalPages} page={page} onChange={(_, p) => setPage(p)} />
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// CREDIT NOTES TAB
// ============================================================================
function CreditNotesTab({ destinationId, t, showSnackbar }) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, refetch } = useCreditNoteList(destinationId, { status: statusFilter || undefined, page, limit: 25 });
  const finalizeMutation = useFinalizeCreditNote();

  const items = data?.data?.items || [];
  const pagination = data?.data?.pagination || {};

  const handleFinalize = async (id) => {
    try {
      await finalizeMutation.mutateAsync(id);
      showSnackbar(t('financial.credit_note_finalized'), 'success');
    } catch (e) {
      showSnackbar(e.response?.data?.error?.message || e.message, 'error');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>{t('financial.status')}</InputLabel>
          <Select value={statusFilter} label={t('financial.status')} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            {['draft', 'final', 'voided'].map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button size="small" startIcon={<RefreshIcon />} onClick={refetch}>{t('common.refresh')}</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
              <TableCell>{t('financial.credit_note_number')}</TableCell>
              <TableCell>{t('financial.partner')}</TableCell>
              <TableCell>{t('financial.period')}</TableCell>
              <TableCell align="right">{t('financial.subtotal')}</TableCell>
              <TableCell align="right">{t('financial.vat')}</TableCell>
              <TableCell align="right">{t('financial.total')}</TableCell>
              <TableCell>{t('financial.status')}</TableCell>
              <TableCell>{t('financial.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8}><Skeleton /></TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center">{t('financial.no_credit_notes')}</TableCell></TableRow>
            ) : items.map(cn => (
              <TableRow key={cn.id}>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{cn.credit_note_number}</TableCell>
                <TableCell>{cn.partner_company_name || '—'}</TableCell>
                <TableCell>{cn.period_start} — {cn.period_end}</TableCell>
                <TableCell align="right">{formatCents(cn.subtotal_cents)}</TableCell>
                <TableCell align="right">{formatCents(cn.vat_cents)} ({cn.vat_rate}%)</TableCell>
                <TableCell align="right">{formatCents(cn.total_cents)}</TableCell>
                <TableCell><StatusChip status={cn.status} /></TableCell>
                <TableCell>
                  {cn.status === 'draft' && (
                    <Tooltip title={t('financial.finalize')}>
                      <IconButton size="small" color="primary" onClick={() => handleFinalize(cn.id)}>
                        <ReceiptLongIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={pagination.totalPages} page={page} onChange={(_, p) => setPage(p)} />
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// EXPORT TAB
// ============================================================================
function ExportTab({ destinationId, t, showSnackbar }) {
  const [from, setFrom] = useState(() => getDefaultDates().from);
  const [to, setTo] = useState(() => getDefaultDates().to);
  const [year, setYear] = useState(() => new Date().getFullYear());

  const downloadBlob = (response, fallbackName) => {
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fallbackName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async (type) => {
    try {
      let response;
      if (type === 'payouts') {
        response = await financialService.exportPayouts(destinationId, from, to);
        downloadBlob(response, `payouts_${from}_${to}.csv`);
      } else if (type === 'credit-notes') {
        response = await financialService.exportCreditNotes(destinationId, from, to);
        downloadBlob(response, `credit_notes_${from}_${to}.csv`);
      } else if (type === 'tax-summary') {
        response = await financialService.exportTaxSummary(destinationId, year);
        downloadBlob(response, `tax_summary_${year}.csv`);
      }
      showSnackbar(t('financial.export_success'), 'success');
    } catch (e) {
      showSnackbar(e.response?.data?.error?.message || e.message, 'error');
    }
  };

  return (
    <Box>
      <Card sx={{ p: 3, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>{t('financial.export_payouts')}</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField type="date" size="small" label={t('financial.period_from')} value={from}
            onChange={e => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField type="date" size="small" label={t('financial.period_to')} value={to}
            onChange={e => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => handleExport('payouts')}>
            {t('financial.download_csv')}
          </Button>
        </Box>
      </Card>

      <Card sx={{ p: 3, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>{t('financial.export_credit_notes')}</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField type="date" size="small" label={t('financial.period_from')} value={from}
            onChange={e => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField type="date" size="small" label={t('financial.period_to')} value={to}
            onChange={e => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => handleExport('credit-notes')}>
            {t('financial.download_csv')}
          </Button>
        </Box>
      </Card>

      <Card sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>{t('financial.export_tax_summary')}</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField type="number" size="small" label={t('financial.year')} value={year}
            onChange={e => setYear(parseInt(e.target.value))} sx={{ width: 120 }} />
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => handleExport('tax-summary')}>
            {t('financial.download_csv')}
          </Button>
        </Box>
      </Card>
    </Box>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================
export default function FinancialPage() {
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
      <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('financial.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('financial.subtitle', "Overzicht van settlements, uitbetalingen en creditnota's")}</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={t('financial.tab_dashboard')} />
        <Tab label={t('financial.tab_settlements')} />
        <Tab label={t('financial.tab_payouts')} />
        <Tab label={t('financial.tab_credit_notes')} />
        <Tab label={t('financial.tab_export')} />
      </Tabs>

      {tab === 0 && <DashboardTab destinationId={destinationId} t={t} />}
      {tab === 1 && <SettlementsTab destinationId={destinationId} t={t} showSnackbar={showSnackbar} />}
      {tab === 2 && <PayoutsTab destinationId={destinationId} t={t} showSnackbar={showSnackbar} />}
      {tab === 3 && <CreditNotesTab destinationId={destinationId} t={t} showSnackbar={showSnackbar} />}
      {tab === 4 && <ExportTab destinationId={destinationId} t={t} showSnackbar={showSnackbar} />}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
