import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, Grid, Skeleton, Button, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  TextField, ToggleButton, ToggleButtonGroup, Chip, Snackbar, Alert,
  Select, MenuItem, FormControl, InputLabel
, CircularProgress
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, BarChart, Bar, LineChart, Line
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { lazy, Suspense } from 'react';
const GuestsTab = lazy(() => import('../components/commerce/GuestsTab.jsx'));
const VouchersTab = lazy(() => import('../components/commerce/VouchersTab.jsx'));
const ReservationsTab = lazy(() => import('../components/commerce/ReservationsTab.jsx'));
const TicketsTab = lazy(() => import('../components/commerce/TicketsTab.jsx'));
import useDestinationStore from '../stores/destinationStore.js';
import useAuthStore from '../stores/authStore.js';
import { commerceService } from '../api/commerceService.js';
import { formatCents, formatPercentage } from '../utils/currencyFormat.js';

const CHART_COLORS = ['#1976d2', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function getDefaultDates() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const to = now.toISOString().split('T')[0];
  return { from, to };
}

// ============================================================================
// KPI Card
// ============================================================================
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
// Period Selector
// ============================================================================
function PeriodSelector({ from, to, onFromChange, onToChange, onRefresh, t }) {
  const presets = [
    { label: t('commerce.today'), getRange: () => { const d = new Date().toISOString().split('T')[0]; return { from: d, to: d }; } },
    { label: t('commerce.this_week'), getRange: () => { const n = new Date(); const d = new Date(n); d.setDate(n.getDate() - n.getDay() + 1); return { from: d.toISOString().split('T')[0], to: n.toISOString().split('T')[0] }; } },
    { label: t('commerce.this_month'), getRange: () => { const n = new Date(); return { from: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split('T')[0], to: n.toISOString().split('T')[0] }; } },
    { label: t('commerce.this_year'), getRange: () => { const n = new Date(); return { from: `${n.getFullYear()}-01-01`, to: n.toISOString().split('T')[0] }; } },
  ];

  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
      <TextField type="date" size="small" label={t('commerce.period_from')} value={from}
        onChange={e => onFromChange(e.target.value)} InputLabelProps={{ shrink: true }} />
      <TextField type="date" size="small" label={t('commerce.period_to')} value={to}
        onChange={e => onToChange(e.target.value)} InputLabelProps={{ shrink: true }} />
      {presets.map(p => (
        <Button key={p.label} size="small" variant="outlined"
          onClick={() => { const r = p.getRange(); onFromChange(r.from); onToChange(r.to); }}>
          {p.label}
        </Button>
      ))}
      <Button size="small" variant="contained" startIcon={<RefreshIcon />} onClick={onRefresh}>
        {t('common.refresh')}
      </Button>
    </Box>
  );
}

// ============================================================================
// DASHBOARD TAB
// ============================================================================
function DashboardTab({ destinationId, t, lang }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [topPois, setTopPois] = useState([]);
  const defaults = getDefaultDates();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dash, daily, top] = await Promise.all([
        commerceService.getDashboard(destinationId, from, to),
        commerceService.getDailyReport(destinationId, from, to).catch(() => ({ data: [] })),
        commerceService.getTopPOIs(destinationId, from, to, 'revenue', 10).catch(() => ({ data: [] }))
      ]);
      setData(dash.data);
      setDailyData(Array.isArray(daily.data) ? daily.data : []);
      setTopPois(Array.isArray(top.data) ? top.data : []);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [destinationId, from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!loading && data?.empty) {
    return (
      <Box>
        <PeriodSelector from={from} to={to} onFromChange={setFrom} onToChange={setTo} onRefresh={fetchData} t={t} />
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <ShoppingCartIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6">{t('commerce.no_data')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('commerce.no_data_description')}</Typography>
          <Button variant="outlined" size="small" href="/settings">{t('commerce.goToSettings', 'Commerce activeren in Instellingen')}</Button>
        </Card>
      </Box>
    );
  }

  const rv = data?.revenue || {};
  const tx = data?.transactions || {};
  const tk = data?.tickets || {};
  const rs = data?.reservations || {};

  return (
    <Box>
      <PeriodSelector from={from} to={to} onFromChange={setFrom} onToChange={setTo} onRefresh={fetchData} t={t} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title={t('commerce.revenue')} value={formatCents(rv.net_revenue_cents, lang)}
            subtitle={`${t('commerce.refunds')}: ${formatCents(rv.refunds_cents, lang)}`} loading={loading} color="#22c55e" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title={t('commerce.transactions')} value={tx.total || 0}
            subtitle={`${formatPercentage(tx.success_rate)} ${t('commerce.success_rate')}`} loading={loading} color="#1976d2" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title={t('commerce.tickets_sold')} value={tk.sold || 0}
            subtitle={`${tk.validated || 0} ${t('commerce.validated')}`} loading={loading} color="#f59e0b" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title={t('commerce.reservations_created')} value={rs.created || 0}
            subtitle={`${formatPercentage(rs.occupancy_rate)} ${t('commerce.occupancy_rate')}`} loading={loading} color="#8b5cf6" />
        </Grid>
      </Grid>

      {dailyData.length > 0 && (
        <Card sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>{t('commerce.revenue_chart')}</Typography>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `${(v / 100).toFixed(0)}`} tick={{ fontSize: 11 }} />
              <ReTooltip formatter={(v) => formatCents(v, lang)} />
              <Bar dataKey="ticket_cents" stackId="rev" fill={CHART_COLORS[0]} name={t('commerce.ticket_revenue')} />
              <Bar dataKey="deposit_cents" stackId="rev" fill={CHART_COLORS[1]} name={t('commerce.deposit_revenue')} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>{t('commerce.tickets_sold')}</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box><Typography variant="body2" color="text.secondary">{t('commerce.sold')}</Typography><Typography variant="h6">{tk.sold || 0}</Typography></Box>
              <Box><Typography variant="body2" color="text.secondary">{t('commerce.validated')}</Typography><Typography variant="h6">{tk.validated || 0}</Typography></Box>
              <Box><Typography variant="body2" color="text.secondary">{t('commerce.cancelled')}</Typography><Typography variant="h6">{tk.cancelled || 0}</Typography></Box>
              <Box><Typography variant="body2" color="text.secondary">{t('commerce.validation_rate')}</Typography><Typography variant="h6">{formatPercentage(tk.validation_rate)}</Typography></Box>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>{t('commerce.reservations_created')}</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box><Typography variant="body2" color="text.secondary">{t('commerce.completed')}</Typography><Typography variant="h6">{rs.completed || 0}</Typography></Box>
              <Box><Typography variant="body2" color="text.secondary">{t('commerce.no_shows')}</Typography><Typography variant="h6">{rs.no_shows || 0}</Typography></Box>
              <Box><Typography variant="body2" color="text.secondary">{t('commerce.no_show_rate')}</Typography><Typography variant="h6">{formatPercentage(rs.no_show_rate)}</Typography></Box>
              <Box><Typography variant="body2" color="text.secondary">{t('commerce.avg_party_size')}</Typography><Typography variant="h6">{rs.avg_party_size || 0}</Typography></Box>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {topPois.length > 0 && (
        <Card sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}><EmojiEventsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />{t('commerce.top_pois')}</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>#</TableCell><TableCell>{t('common.name')}</TableCell>
                <TableCell>{t('common.category')}</TableCell><TableCell align="right">{t('commerce.revenue')}</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {topPois.map(p => (
                  <TableRow key={p.poi_id}>
                    <TableCell>{p.rank}</TableCell><TableCell>{p.poi_name}</TableCell>
                    <TableCell><Chip label={p.category} size="small" /></TableCell>
                    <TableCell align="right">{formatCents(p.value, lang)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Box>
  );
}

// ============================================================================
// REPORTS TAB
// ============================================================================
function ReportsTab({ destinationId, t, lang }) {
  const [granularity, setGranularity] = useState('daily');
  const defaults = getDefaultDates();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reconDate, setReconDate] = useState(defaults.to);
  const [reconData, setReconData] = useState(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      let result;
      if (granularity === 'daily') result = await commerceService.getDailyReport(destinationId, from, to);
      else if (granularity === 'weekly') result = await commerceService.getWeeklyReport(destinationId, from, to);
      else result = await commerceService.getMonthlyReport(destinationId, year);
      setData(Array.isArray(result.data) ? result.data : []);
    } catch { setData([]); }
    finally { setLoading(false); }
  }, [destinationId, granularity, from, to, year]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const fetchRecon = async () => {
    try {
      const result = await commerceService.getReconciliation(destinationId, reconDate);
      setReconData(result.data);
    } catch { setReconData(null); }
  };

  const periodLabel = (row) => {
    if (granularity === 'daily') return row.date;
    if (granularity === 'weekly') return `W${row.week} (${row.week_start})`;
    return row.month_names?.[lang] || row.month_names?.en || `M${row.month}`;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <ToggleButtonGroup value={granularity} exclusive onChange={(_, v) => v && setGranularity(v)} size="small">
          <ToggleButton value="daily">{t('commerce.daily')}</ToggleButton>
          <ToggleButton value="weekly">{t('commerce.weekly')}</ToggleButton>
          <ToggleButton value="monthly">{t('commerce.monthly')}</ToggleButton>
        </ToggleButtonGroup>
        {granularity !== 'monthly' ? (
          <>
            <TextField type="date" size="small" value={from} onChange={e => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField type="date" size="small" value={to} onChange={e => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
          </>
        ) : (
          <TextField type="number" size="small" label={t('commerce.year')} value={year}
            onChange={e => setYear(Number(e.target.value))} inputProps={{ min: 2020, max: 2100 }} sx={{ width: 100 }} />
        )}
        <Button size="small" variant="contained" onClick={fetchReport} startIcon={<RefreshIcon />}>{t('common.refresh')}</Button>
      </Box>

      {data.length > 0 && (
        <Card sx={{ p: 2, mb: 3 }}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={granularity === 'monthly' ? 'month' : 'date'} tick={{ fontSize: 11 }}
                tickFormatter={granularity === 'weekly' ? (v, i) => `W${data[i]?.week || ''}` : undefined} />
              <YAxis tickFormatter={v => `${(v / 100).toFixed(0)}`} tick={{ fontSize: 11 }} />
              <ReTooltip formatter={v => formatCents(v, lang)} />
              <Line type="monotone" dataKey="net_cents" stroke={CHART_COLORS[0]} strokeWidth={2} name={t('commerce.net_revenue')} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card sx={{ p: 2, mb: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>{t('commerce.period')}</TableCell>
              <TableCell align="right">{t('commerce.transactions')}</TableCell>
              <TableCell align="right">{t('commerce.ticket_revenue')}</TableCell>
              <TableCell align="right">{t('commerce.deposit_revenue')}</TableCell>
              <TableCell align="right">{t('commerce.refunds')}</TableCell>
              <TableCell align="right">{t('commerce.net_revenue')}</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6}><Skeleton /></TableCell></TableRow> :
                data.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{periodLabel(row)}</TableCell>
                    <TableCell align="right">{row.transactions}</TableCell>
                    <TableCell align="right">{formatCents(row.ticket_cents, lang)}</TableCell>
                    <TableCell align="right">{formatCents(row.deposit_cents, lang)}</TableCell>
                    <TableCell align="right">{formatCents(row.refunds_cents, lang)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCents(row.net_cents, lang)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Card sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>{t('commerce.reconciliation')}</Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField type="date" size="small" value={reconDate} onChange={e => setReconDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <Button size="small" variant="outlined" onClick={fetchRecon}>{t('common.load')}</Button>
        </Box>
        {reconData && (
          <>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Chip label={`${t('commerce.transactions')}: ${reconData.summary?.transaction_count || 0}`} />
              <Chip label={`${t('commerce.captured')}: ${formatCents(reconData.summary?.total_captured_cents, lang)}`} color="success" />
              <Chip label={`${t('commerce.refunds')}: ${formatCents(reconData.summary?.total_refunded_cents, lang)}`} color="warning" />
              <Chip label={`${t('commerce.net_revenue')}: ${formatCents(reconData.summary?.net_cents, lang)}`} color="primary" />
            </Box>
            <Typography variant="caption" color="text.secondary">{t('commerce.reconciliation_note')}</Typography>
          </>
        )}
      </Card>
    </Box>
  );
}

// ============================================================================
// ALERTS TAB
// ============================================================================
function AlertsTab({ destinationId, t }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const result = await commerceService.getAlerts(destinationId);
        setData(result.data);
      } catch { setData(null); }
      finally { setLoading(false); }
    })();
  }, [destinationId]);

  const severityIcon = (s) => {
    if (s === 'critical') return <ErrorOutlineIcon color="error" />;
    if (s === 'warning') return <WarningAmberIcon color="warning" />;
    return <InfoOutlinedIcon color="info" />;
  };

  const severityColor = (s) => {
    if (s === 'critical') return 'error.main';
    if (s === 'warning') return 'warning.main';
    return 'info.main';
  };

  if (loading) return <Skeleton height={200} />;

  if (!data || data.total === 0) {
    return (
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
        <Typography variant="h6">{t('commerce.no_alerts')}</Typography>
      </Card>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        {data.critical > 0 && <Chip label={`${data.critical} ${t('commerce.critical')}`} color="error" />}
        {data.warning > 0 && <Chip label={`${data.warning} ${t('commerce.warning')}`} color="warning" />}
        {data.info > 0 && <Chip label={`${data.info} ${t('commerce.info')}`} color="info" />}
      </Box>
      {data.alerts.map((alert, i) => (
        <Card key={i} sx={{ p: 2, mb: 1, borderLeft: `4px solid`, borderLeftColor: severityColor(alert.severity) }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {severityIcon(alert.severity)}
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{t(`commerce.alert_${alert.type}`)}</Typography>
              <Typography variant="body2" color="text.secondary">{alert.description}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">{alert.created_at ? new Date(alert.created_at).toLocaleDateString() : ''}</Typography>
          </Box>
        </Card>
      ))}
    </Box>
  );
}

// ============================================================================
// EXPORT TAB
// ============================================================================
function ExportTab({ destinationId, t }) {
  const defaults = getDefaultDates();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [snackMsg, setSnackMsg] = useState('');

  const handleExport = async (type) => {
    try {
      let response;
      if (type === 'transactions') response = await commerceService.exportTransactions(destinationId, from, to);
      else if (type === 'reservations') response = await commerceService.exportReservations(destinationId, from, to);
      else response = await commerceService.exportTicketOrders(destinationId, from, to);

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
      const filename = response.headers?.['content-disposition']?.split('filename="')[1]?.replace('"', '')
        || `export_${type}_${from}_${to}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      const rowCount = response.headers?.['x-row-count'] || '?';
      setSnackMsg(t('commerce.rows_exported', { count: rowCount }));
    } catch {
      setSnackMsg('Export failed');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <TextField type="date" size="small" label={t('commerce.period_from')} value={from}
          onChange={e => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField type="date" size="small" label={t('commerce.period_to')} value={to}
          onChange={e => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
      </Box>

      <Grid container spacing={2}>
        {[
          { key: 'transactions', label: t('commerce.export_transactions') },
          { key: 'reservations', label: t('commerce.export_reservations') },
          { key: 'tickets', label: t('commerce.export_tickets') }
        ].map(({ key, label }) => (
          <Grid item xs={12} sm={4} key={key}>
            <Card sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>{label}</Typography>
              <Button variant="contained" startIcon={<DownloadIcon />}
                onClick={() => handleExport(key)}>
                {t('commerce.download_csv')}
              </Button>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Snackbar open={!!snackMsg} autoHideDuration={4000} onClose={() => setSnackMsg('')}>
        <Alert severity="success" onClose={() => setSnackMsg('')}>{snackMsg}</Alert>
      </Snackbar>
    </Box>
  );
}

// ============================================================================
// MAIN COMMERCE PAGE
// ============================================================================
export default function CommercePage() {
  const { t, i18n } = useTranslation();
  const destination = useDestinationStore(s => s.selectedDestination);
  const user = useAuthStore(s => s.user);
  const [tab, setTab] = useState(0);

  const lang = i18n.language || 'nl';
  const destId = destination || (user?.allowed_destination_ids?.[0]) || 1;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('commerce.title')}</Typography>
        <Typography variant="body2" color="text.secondary">{t('commerce.subtitle', 'Beheer bestellingen, tickets en reserveringen')}</Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={t('commerce.dashboard')} />
        <Tab label={t('commerce.reports')} />
        <Tab label={t('commerce.alerts')} />
        <Tab label={t('commerce.export')} />
        <Tab label="Gasten" />
        <Tab label="Vouchers" />
        <Tab label="Reserveringen" />
        <Tab label="Tickets" />
      </Tabs>

      {tab === 0 && <DashboardTab destinationId={destId} t={t} lang={lang} />}
      {tab === 1 && <ReportsTab destinationId={destId} t={t} lang={lang} />}
      {tab === 2 && <AlertsTab destinationId={destId} t={t} />}
      {tab === 3 && <ExportTab destinationId={destId} t={t} />}
      {tab === 4 && <Suspense fallback={<Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>}><GuestsTab destinationId={destId} t={t} /></Suspense>}
      {tab === 5 && <Suspense fallback={<Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>}><VouchersTab destinationId={destId} t={t} /></Suspense>}
      {tab === 6 && <Suspense fallback={<Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>}><ReservationsTab destinationId={destId} t={t} /></Suspense>}
      {tab === 7 && <Suspense fallback={<Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>}><TicketsTab destinationId={destId} t={t} /></Suspense>}
    </Box>
  );
}
