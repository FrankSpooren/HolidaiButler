import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, Select, MenuItem,
  FormControl, InputLabel, Grid, Skeleton, TablePagination,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Alert
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from 'react-i18next';
import { useIssuesList, useIssuesStats, useUpdateIssueStatus } from '../hooks/useIssues';

const SEVERITY_COLORS = {
  critical: 'error',
  high: 'warning',
  medium: 'info',
  low: 'default',
  info: 'default'
};

const STATUS_COLORS = {
  open: 'error',
  acknowledged: 'warning',
  in_progress: 'info',
  resolved: 'success',
  auto_closed: 'success',
  wont_fix: 'default'
};

export default function IssuesPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resolution, setResolution] = useState('');
  const [snack, setSnack] = useState('');

  const filters = {
    page: page + 1,
    limit: rowsPerPage,
    ...(statusFilter && { status: statusFilter }),
    ...(severityFilter && { severity: severityFilter }),
    ...(agentFilter && { agent: agentFilter })
  };

  const { data, isLoading, refetch } = useIssuesList(filters);
  const { data: stats } = useIssuesStats();
  const updateMutation = useUpdateIssueStatus();

  const issues = data?.issues || [];
  const total = data?.total || 0;

  const handleStatusChange = async (issueId, newStatus) => {
    try {
      await updateMutation.mutateAsync({
        issueId,
        status: newStatus,
        resolution: (newStatus === 'resolved' || newStatus === 'wont_fix') ? resolution : undefined
      });
      setSnack(t('issues.statusUpdated'));
      setDialogOpen(false);
      setResolution('');
    } catch {
      setSnack(t('issues.updateError'));
    }
  };

  const openDetail = (issue) => {
    setSelectedIssue(issue);
    setResolution('');
    setDialogOpen(true);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('nl-NL', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : '-';

  const isSLABreached = (issue) =>
    issue.slaTarget && new Date(issue.slaTarget) < new Date() &&
    ['open', 'acknowledged', 'in_progress'].includes(issue.status);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">{t('issues.title')}</Typography>
        <Tooltip title={t('common.refresh')}>
          <IconButton onClick={() => refetch()}><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h4" color={stats?.totalOpen > 0 ? 'error.main' : 'success.main'}>
                {stats?.totalOpen ?? <Skeleton width={30} sx={{ mx: 'auto' }} />}
              </Typography>
              <Typography variant="body2" color="text.secondary">{t('issues.openIssues')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h4" color={
                (stats?.bySeverity?.critical > 0 || stats?.bySeverity?.high > 0) ? 'error.main' : 'text.primary'
              }>
                {stats ? (stats.bySeverity?.critical || 0) + (stats.bySeverity?.high || 0) : <Skeleton width={30} sx={{ mx: 'auto' }} />}
              </Typography>
              <Typography variant="body2" color="text.secondary">{t('issues.criticalHigh')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h4" color={stats?.slaBreaches > 0 ? 'error.main' : 'text.primary'}>
                {stats?.slaBreaches ?? <Skeleton width={30} sx={{ mx: 'auto' }} />}
              </Typography>
              <Typography variant="body2" color="text.secondary">{t('issues.slaBreaches')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h4">
                {stats?.avgResolutionTimeHours != null ? `${stats.avgResolutionTimeHours}h` : '-'}
              </Typography>
              <Typography variant="body2" color="text.secondary">{t('issues.avgResolution')}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>{t('issues.filter.status')}</InputLabel>
          <Select value={statusFilter} label={t('issues.filter.status')}
            onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            {['open', 'acknowledged', 'in_progress', 'resolved', 'auto_closed', 'wont_fix'].map(s =>
              <MenuItem key={s} value={s}>{t(`issues.status.${s}`)}</MenuItem>
            )}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>{t('issues.filter.severity')}</InputLabel>
          <Select value={severityFilter} label={t('issues.filter.severity')}
            onChange={e => { setSeverityFilter(e.target.value); setPage(0); }}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            {['critical', 'high', 'medium', 'low', 'info'].map(s =>
              <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
            )}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>{t('issues.filter.agent')}</InputLabel>
          <Select value={agentFilter} label={t('issues.filter.agent')}
            onChange={e => { setAgentFilter(e.target.value); setPage(0); }}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            <MenuItem value="security-reviewer">De Bewaker</MenuItem>
            <MenuItem value="code-reviewer">De Corrector</MenuItem>
            <MenuItem value="ux-ui-reviewer">De Stylist</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>{t('issues.table.severity')}</TableCell>
              <TableCell>{t('issues.table.agent')}</TableCell>
              <TableCell>{t('issues.table.title')}</TableCell>
              <TableCell>{t('issues.table.status')}</TableCell>
              <TableCell>{t('issues.table.detected')}</TableCell>
              <TableCell>SLA</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(8)].map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                </TableRow>
              ))
            ) : issues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1, display: 'block', mx: 'auto' }} />
                  <Typography color="text.secondary">{t('issues.noIssues')}</Typography>
                </TableCell>
              </TableRow>
            ) : issues.map(issue => (
              <TableRow key={issue.issueId} hover
                sx={{ cursor: 'pointer', bgcolor: isSLABreached(issue) ? 'error.50' : undefined }}
                onClick={() => openDetail(issue)}>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{issue.issueId}</TableCell>
                <TableCell>
                  <Chip label={issue.severity} size="small" color={SEVERITY_COLORS[issue.severity]} />
                </TableCell>
                <TableCell>{issue.agentLabel}</TableCell>
                <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {issue.title}
                </TableCell>
                <TableCell>
                  <Chip label={t(`issues.status.${issue.status}`)} size="small"
                    color={STATUS_COLORS[issue.status]} variant="outlined" />
                </TableCell>
                <TableCell sx={{ fontSize: '0.75rem' }}>{formatDate(issue.detectedAt)}</TableCell>
                <TableCell>
                  {isSLABreached(issue)
                    ? <Chip label="SLA!" size="small" color="error" />
                    : issue.slaTarget
                      ? <Typography variant="caption">{formatDate(issue.slaTarget)}</Typography>
                      : '-'}
                </TableCell>
                <TableCell>
                  <Tooltip title={t('issues.detail.title')}>
                    <IconButton size="small"><VisibilityIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination component="div" count={total} page={page}
          onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50]} />
      </TableContainer>

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        {selectedIssue && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label={selectedIssue.severity} size="small" color={SEVERITY_COLORS[selectedIssue.severity]} />
              {selectedIssue.issueId}
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="h6" gutterBottom>{selectedIssue.title}</Typography>
              {selectedIssue.description && (
                <Typography color="text.secondary" sx={{ mb: 2 }}>{selectedIssue.description}</Typography>
              )}

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">{t('issues.table.agent')}</Typography>
                  <Typography>{selectedIssue.agentLabel}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">{t('issues.table.status')}</Typography>
                  <Chip label={t(`issues.status.${selectedIssue.status}`)} size="small"
                    color={STATUS_COLORS[selectedIssue.status]} />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">{t('issues.table.detected')}</Typography>
                  <Typography variant="body2">{formatDate(selectedIssue.detectedAt)}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">{t('issues.occurrences')}</Typography>
                  <Typography>{selectedIssue.occurrenceCount || 1}x</Typography>
                </Grid>
              </Grid>

              {/* Timeline */}
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>{t('issues.detail.timeline')}</Typography>
              <Box sx={{ pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
                <Typography variant="body2">{formatDate(selectedIssue.detectedAt)} - {t('issues.status.open')}</Typography>
                {selectedIssue.acknowledgedAt && (
                  <Typography variant="body2">{formatDate(selectedIssue.acknowledgedAt)} - {t('issues.status.acknowledged')}</Typography>
                )}
                {selectedIssue.resolvedAt && (
                  <Typography variant="body2">{formatDate(selectedIssue.resolvedAt)} - {t(`issues.status.${selectedIssue.status}`)}
                    {selectedIssue.resolvedBy && ` (${selectedIssue.resolvedBy})`}</Typography>
                )}
              </Box>

              {selectedIssue.resolution && (
                <Alert severity="info" sx={{ mt: 2 }}>{selectedIssue.resolution}</Alert>
              )}

              {/* Raw Details */}
              {selectedIssue.details && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Details (JSON)</Typography>
                  <Paper variant="outlined" sx={{ p: 1, maxHeight: 200, overflow: 'auto', bgcolor: 'grey.50' }}>
                    <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(selectedIssue.details, null, 2)}
                    </pre>
                  </Paper>
                </Box>
              )}

              {/* Resolution input for resolve/wontfix */}
              {['open', 'acknowledged', 'in_progress'].includes(selectedIssue.status) && (
                <TextField fullWidth multiline rows={2} sx={{ mt: 2 }}
                  label={t('issues.detail.resolution')}
                  value={resolution} onChange={e => setResolution(e.target.value)} />
              )}
            </DialogContent>
            <DialogActions>
              {selectedIssue.status === 'open' && (
                <Button onClick={() => handleStatusChange(selectedIssue.issueId, 'acknowledged')}>
                  {t('issues.actions.acknowledge')}
                </Button>
              )}
              {['open', 'acknowledged'].includes(selectedIssue.status) && (
                <Button onClick={() => handleStatusChange(selectedIssue.issueId, 'in_progress')}>
                  {t('issues.actions.startProgress')}
                </Button>
              )}
              {['open', 'acknowledged', 'in_progress'].includes(selectedIssue.status) && (
                <>
                  <Button color="success" variant="contained"
                    onClick={() => handleStatusChange(selectedIssue.issueId, 'resolved')}>
                    {t('issues.actions.resolve')}
                  </Button>
                  <Button color="inherit"
                    onClick={() => handleStatusChange(selectedIssue.issueId, 'wont_fix')}>
                    {t('issues.actions.wontFix')}
                  </Button>
                </>
              )}
              <Button onClick={() => setDialogOpen(false)}>{t('common.close')}</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Snackbar */}
      {snack && (
        <Alert severity="info" sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999 }}
          onClose={() => setSnack('')}>{snack}</Alert>
      )}
    </Box>
  );
}
