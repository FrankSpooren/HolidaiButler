import { useState, useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel,
  Paper, Skeleton, Alert, Button, Tooltip, IconButton, Collapse, List, ListItem,
  ListItemText, useMediaQuery, useTheme,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  TextField, Switch, FormControlLabel, Snackbar
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AssignmentIcon from '@mui/icons-material/Assignment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import { useTranslation } from 'react-i18next';
import { useAgentStatus, useAgentConfigs, useUpdateAgentConfig } from '../hooks/useAgentStatus';
import useAuthStore from '../stores/authStore.js';
import { getAgentIcon, getAgentDescription, getAgentTasks, formatTimestamp, CATEGORY_COLORS, STATUS_COLORS } from '../utils/agents';

const CATEGORIES = ['all', 'core', 'operations', 'development', 'strategy', 'monitoring'];

export default function AgentsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [destinationFilter, setDestinationFilter] = useState('all');
  const [sortBy, setSortBy] = useState('category');
  const [sortDir, setSortDir] = useState('asc');
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);

  const { data, isLoading, error, refetch, isFetching } = useAgentStatus({});

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const handleRefresh = () => refetch({ queryKey: ['agent-status', { refresh: true }] });

  const filteredAgents = useMemo(() => {
    if (!data?.agents) return [];
    let list = [...data.agents];
    if (categoryFilter !== 'all') list = list.filter(a => a.category === categoryFilter);
    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'category') cmp = a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
      else if (sortBy === 'type') cmp = a.type.localeCompare(b.type);
      else if (sortBy === 'status') {
        const order = { error: 0, warning: 1, unknown: 2, healthy: 3 };
        cmp = (order[a.status] ?? 2) - (order[b.status] ?? 2);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [data?.agents, categoryFilter, sortDir, sortBy]);

  const summary = data?.summary || { total: 0, healthy: 0, warning: 0, error: 0, unknown: 0 };
  const visibleActivity = activityExpanded ? (data?.recentActivity || []).slice(0, 50) : (data?.recentActivity || []).slice(0, 10);

  // Status dot component
  const StatusDot = ({ status, size = 12 }) => (
    <Box sx={{
      width: size, height: size, borderRadius: '50%',
      bgcolor: STATUS_COLORS[status] || STATUS_COLORS.unknown,
      display: 'inline-block', flexShrink: 0
    }} />
  );

  // Destination cell for a Cat A agent
  const DestCell = ({ destData }) => {
    if (!destData) return <Typography variant="body2" color="text.secondary">\u2014</Typography>;
    const statusColor = destData.status === 'success' ? STATUS_COLORS.healthy
      : destData.status === 'partial' ? STATUS_COLORS.warning
      : destData.status === 'error' ? STATUS_COLORS.error
      : STATUS_COLORS.unknown;
    return (
      <Tooltip title={destData.lastRun ? `${destData.status} \u2014 ${new Date(destData.lastRun).toLocaleString('nl-NL')}` : t('agents.unknown')}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusColor, flexShrink: 0 }} />
          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
            {destData.lastRun ? formatTimestamp(destData.lastRun) : '\u2014'}
          </Typography>
        </Box>
      </Tooltip>
    );
  };

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[0,1,2,3].map(i => <Grid item xs={6} md={3} key={i}><Skeleton variant="rounded" height={90} /></Grid>)}
        </Grid>
        <Skeleton variant="rounded" height={400} />
      </Box>
    );
  }

  return (
    <Box>
      {/* ROW 1: Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {t('agents.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('agents.subtitle', { count: summary.total })} &bull; {t('agents.autoRefresh')}
          </Typography>
          {data?.timestamp && (
            <Typography variant="caption" color="text.secondary">
              {t('agents.lastUpdated')}: {new Date(data.timestamp).toLocaleString('nl-NL')}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={isFetching}
        >
          {t('agents.refresh')}
        </Button>
      </Box>

      {/* Error / Partial warning */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button size="small" onClick={handleRefresh}>{t('common.retry')}</Button>}>
          {t('common.error')}
        </Alert>
      )}
      {data?.partial && (
        <Alert severity="warning" sx={{ mb: 2 }}>{t('agents.partial')}</Alert>
      )}

      {/* ROW 2: Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { key: 'healthy', value: summary.healthy, color: STATUS_COLORS.healthy },
          { key: 'warning', value: summary.warning, color: STATUS_COLORS.warning },
          { key: 'error', value: summary.error, color: STATUS_COLORS.error },
          { key: 'unknown', value: summary.unknown, color: STATUS_COLORS.unknown }
        ].map(({ key, value, color }) => (
          <Grid item xs={6} md={3} key={key}>
            <Card sx={{ borderTop: `3px solid ${color}` }}>
              <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color }}>{value}</Typography>
                <Typography variant="body2" color="text.secondary">{t(`agents.${key}`)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ROW 3: Filter Bar */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {CATEGORIES.map(cat => (
          <Chip
            key={cat}
            label={t(`agents.filter.${cat}`)}
            variant={categoryFilter === cat ? 'filled' : 'outlined'}
            onClick={() => setCategoryFilter(cat)}
            sx={{
              fontWeight: categoryFilter === cat ? 700 : 400,
              bgcolor: categoryFilter === cat ? (CATEGORY_COLORS[cat] || '#1976d2') : undefined,
              color: categoryFilter === cat ? '#fff' : undefined,
              borderColor: CATEGORY_COLORS[cat] || undefined,
              '&:hover': { opacity: 0.85 }
            }}
          />
        ))}
        <Select
          size="small"
          value={destinationFilter}
          onChange={e => setDestinationFilter(e.target.value)}
          sx={{ ml: 'auto', minWidth: 130 }}
        >
          <MenuItem value="all">{t('agents.filter.destination')}: {t('agents.filter.all')}</MenuItem>
          <MenuItem value="calpe">\uD83C\uDDEA\uD83C\uDDF8 Calpe</MenuItem>
          <MenuItem value="texel">\uD83C\uDDF3\uD83C\uDDF1 Texel</MenuItem>
        </Select>
      </Box>

      {/* ROW 4: Agent Table */}
      {filteredAgents.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>{t('agents.noResults')}</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ width: 40 }}>#</TableCell>
                <TableCell>
                  <TableSortLabel active={sortBy === 'name'} direction={sortBy === 'name' ? sortDir : 'asc'} onClick={() => handleSort('name')}>
                    {t('agents.table.name')}
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel active={sortBy === 'category'} direction={sortBy === 'category' ? sortDir : 'asc'} onClick={() => handleSort('category')}>
                    {t('agents.table.category')}
                  </TableSortLabel>
                </TableCell>
                {!isMobile && (
                  <TableCell>
                    <TableSortLabel active={sortBy === 'type'} direction={sortBy === 'type' ? sortDir : 'asc'} onClick={() => handleSort('type')}>
                      {t('agents.table.type')}
                    </TableSortLabel>
                  </TableCell>
                )}
                <TableCell>{t('agents.table.schedule')}</TableCell>
                <TableCell>\uD83C\uDDEA\uD83C\uDDF8 Calpe</TableCell>
                <TableCell>\uD83C\uDDF3\uD83C\uDDF1 Texel</TableCell>
                <TableCell>
                  <TableSortLabel active={sortBy === 'status'} direction={sortBy === 'status' ? sortDir : 'asc'} onClick={() => handleSort('status')}>
                    {t('agents.table.status')}
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAgents.map((agent, idx) => (
                <TableRow
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: agent.status === 'error' ? 'rgba(244,67,54,0.04)' : undefined,
                    '&:hover': { bgcolor: 'grey.50' }
                  }}
                >
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{idx + 1}</TableCell>
                  <TableCell>
                    <Tooltip title={getAgentDescription(agent.name) || agent.description} arrow>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <span style={{ fontSize: '1.1rem' }}>{getAgentIcon(agent.name)}</span>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{agent.name}</Typography>
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={t(`agents.filter.${agent.category}`)}
                      size="small"
                      sx={{
                        bgcolor: CATEGORY_COLORS[agent.category] || '#607d8b',
                        color: '#fff',
                        fontSize: '0.7rem',
                        height: 22
                      }}
                    />
                  </TableCell>
                  {!isMobile && <TableCell><Typography variant="body2">{agent.type}</Typography></TableCell>}
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{agent.scheduleHuman}</Typography>
                  </TableCell>
                  {agent.type === 'B' ? (
                    <TableCell colSpan={2}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.8rem' }}>
                        {t('agents.table.shared')}
                      </Typography>
                    </TableCell>
                  ) : (
                    <>
                      <TableCell><DestCell destData={agent.destinations?.calpe} /></TableCell>
                      <TableCell><DestCell destData={agent.destinations?.texel} /></TableCell>
                    </>
                  )}
                  <TableCell>
                    <Tooltip title={agent.lastRun?.error || (agent.lastRun ? `${agent.lastRun.status} \u2014 ${agent.lastRun.duration ? `${agent.lastRun.duration}ms` : ''}` : t('agents.unknown'))} arrow>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <StatusDot status={agent.status} />
                        {!isMobile && (
                          <Typography variant="caption" sx={{ color: STATUS_COLORS[agent.status] }}>
                            {agent.lastRun ? formatTimestamp(agent.lastRun.timestamp) : ''}
                          </Typography>
                        )}
                      </Box>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Agent Detail Dialog */}
      {selectedAgent && (
        <AgentDetailDialog agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      )}

      {/* ROW 5: Recent Activity */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t('agents.activity.title')}</Typography>
          {(data?.recentActivity?.length || 0) > 10 && (
            <Button size="small" endIcon={activityExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />} onClick={() => setActivityExpanded(!activityExpanded)}>
              {activityExpanded ? t('agents.activity.showLess') : t('agents.activity.showMore')}
            </Button>
          )}
        </Box>
        {visibleActivity.length === 0 ? (
          <Typography variant="body2" color="text.secondary">{t('agents.noActivity')}</Typography>
        ) : (
          <List dense disablePadding>
            {visibleActivity.map((entry, i) => (
              <ListItem
                key={i}
                sx={{
                  py: 0.5, px: 1, borderRadius: 1,
                  bgcolor: entry.status === 'error' || entry.status === 'failed' ? 'rgba(244,67,54,0.04)' : undefined,
                  '&:hover': { bgcolor: 'grey.50' }
                }}
                divider={i < visibleActivity.length - 1}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>
                        {formatTimestamp(entry.timestamp)}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {getAgentIcon(entry.agent)} {entry.agent}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">{entry.action}</Typography>
                      <Chip label={entry.destination} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                      <Box sx={{
                        width: 8, height: 8, borderRadius: '50%',
                        bgcolor: entry.status === 'success' ? STATUS_COLORS.healthy
                          : entry.status === 'error' || entry.status === 'failed' ? STATUS_COLORS.error
                          : STATUS_COLORS.unknown
                      }} />
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}

/* ===== Agent Detail Dialog (Uitgebreid - Fase 8E + 9A-1 Config) ===== */
function AgentDetailDialog({ agent, onClose }) {
  const { t } = useTranslation();
  const currentUser = useAuthStore(s => s.user);
  const isPlatformAdmin = currentUser?.role === 'platform_admin';
  const descriptionNL = getAgentDescription(agent.name);
  const tasks = getAgentTasks(agent.name);
  const [configOpen, setConfigOpen] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '' });

  return (
    <>
    <Dialog open maxWidth="sm" fullWidth onClose={onClose}>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span style={{ fontSize: '1.6rem' }}>{getAgentIcon(agent.name)}</span>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{agent.name}</Typography>
              <Chip
                label={t(`agents.filter.${agent.category}`)}
                size="small"
                sx={{ bgcolor: CATEGORY_COLORS[agent.category] || '#607d8b', color: '#fff', fontSize: '0.7rem', height: 20 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {descriptionNL || agent.description}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {/* Status + Type + Schema */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">{t('agents.table.type')}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {agent.type === 'A' ? 'A (per destination)' : 'B (platform-breed)'}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">{t('agents.table.schedule')}</Typography>
            <Typography variant="body2">{agent.scheduleHuman || '\u2014'}</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">{t('agents.table.status')}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_COLORS[agent.status] || STATUS_COLORS.unknown }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: STATUS_COLORS[agent.status], textTransform: 'capitalize' }}>
                {agent.status}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Warning / Error Details */}
        {(agent.status === 'warning' || agent.status === 'error') && (
          <Alert
            severity={agent.status === 'error' ? 'error' : 'warning'}
            icon={agent.status === 'error' ? <ErrorOutlineIcon /> : <WarningAmberIcon />}
            sx={{ mb: 2 }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {agent.status === 'error' ? t('agents.detail.errorTitle') : t('agents.detail.warningTitle')}
            </Typography>
            <Typography variant="body2">
              {agent.lastRun?.error || agent.statusMessage || t('agents.detail.checkLogs')}
            </Typography>
          </Alert>
        )}

        <Divider sx={{ my: 1.5 }} />

        {/* Takenpakket */}
        {tasks.length > 0 && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <AssignmentIcon fontSize="small" color="action" />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t('agents.detail.tasks')}
              </Typography>
            </Box>
            <List dense disablePadding sx={{ mb: 2 }}>
              {tasks.map((task, i) => (
                <ListItem key={i} sx={{ py: 0.25, pl: 2 }}>
                  <ListItemText
                    primary={<Typography variant="body2">\u2022 {task}</Typography>}
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}

        {/* Destination Status (Cat A agents) */}
        {agent.type === 'A' && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              {t('agents.detail.destinationStatus')}
            </Typography>
            <Grid container spacing={2}>
              {['calpe', 'texel'].map(dest => {
                const d = agent.destinations?.[dest];
                return (
                  <Grid item xs={6} key={dest}>
                    <Card variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {dest === 'calpe' ? '\uD83C\uDDEA\uD83C\uDDF8 Calpe' : '\uD83C\uDDF3\uD83C\uDDF1 Texel'}
                      </Typography>
                      {d ? (
                        <>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{
                              width: 8, height: 8, borderRadius: '50%',
                              bgcolor: d.status === 'success' ? STATUS_COLORS.healthy
                                : d.status === 'partial' ? STATUS_COLORS.warning
                                : d.status === 'error' ? STATUS_COLORS.error
                                : STATUS_COLORS.unknown
                            }} />
                            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{d.status || 'unknown'}</Typography>
                          </Box>
                          {d.lastRun && (
                            <Typography variant="caption" color="text.secondary">
                              {new Date(d.lastRun).toLocaleString('nl-NL')}
                            </Typography>
                          )}
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">\u2014</Typography>
                      )}
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </>
        )}

        {/* Laatste run info */}
        <Divider sx={{ my: 1.5 }} />
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">{t('agents.lastUpdated')}</Typography>
            <Typography variant="body2">
              {agent.lastRun?.timestamp ? new Date(agent.lastRun.timestamp).toLocaleString('nl-NL') : '\u2014'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">{t('agents.detail.duration')}</Typography>
            <Typography variant="body2">
              {agent.lastRun?.duration ? `${agent.lastRun.duration}ms` : '\u2014'}
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        {isPlatformAdmin && (
          <Button
            startIcon={<SettingsIcon />}
            onClick={() => setConfigOpen(true)}
            sx={{ mr: 'auto' }}
          >
            {t('agents.config.edit')}
          </Button>
        )}
        <Button onClick={onClose}>{t('agents.close')}</Button>
      </DialogActions>
    </Dialog>

    {/* Agent Config Dialog */}
    {configOpen && (
      <AgentConfigDialog
        agentKey={agent.id}
        agentName={agent.name}
        onClose={() => setConfigOpen(false)}
        onSaved={(msg) => { setConfigOpen(false); setSnack({ open: true, message: msg }); }}
      />
    )}
    <Snackbar
      open={snack.open}
      autoHideDuration={4000}
      onClose={() => setSnack({ open: false, message: '' })}
      message={snack.message}
    />
    </>
  );
}

/* ===== Agent Config Dialog (Fase 9A-1) ===== */
function AgentConfigDialog({ agentKey, agentName, onClose, onSaved }) {
  const { t } = useTranslation();
  const { data: configsData, isLoading } = useAgentConfigs();
  const updateMut = useUpdateAgentConfig();

  const configs = configsData?.data?.configs || [];
  const agentConfig = configs.find(c => c.agent_key === agentKey) || {};

  const initialForm = useMemo(() => {
    if (isLoading) return null;
    return {
      display_name: agentConfig.display_name || agentName,
      emoji: agentConfig.emoji || '',
      description_nl: agentConfig.description_nl || '',
      description_en: agentConfig.description_en || '',
      is_active: agentConfig.is_active !== false
    };
  }, [isLoading, agentConfig.display_name, agentConfig.emoji, agentConfig.description_nl, agentConfig.description_en, agentConfig.is_active, agentName]);

  const [form, setForm] = useState(null);

  // Initialize form when data arrives
  if (!form && initialForm) {
    setForm(initialForm);
  }

  const handleSave = async () => {
    try {
      await updateMut.mutateAsync({ key: agentKey, data: form });
      onSaved(t('agents.config.saved'));
    } catch (err) {
      // Show error in the dialog
    }
  };

  return (
    <Dialog open maxWidth="sm" fullWidth onClose={onClose}>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {t('agents.config.title')}: {agentName}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {isLoading || !form ? (
          <Box sx={{ py: 2 }}>
            {[...Array(4)].map((_, i) => <Skeleton key={i} height={56} sx={{ mb: 1 }} />)}
          </Box>
        ) : (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {updateMut.isError && (
              <Grid item xs={12}>
                <Alert severity="error">
                  {updateMut.error?.response?.data?.error?.message || t('common.error')}
                </Alert>
              </Grid>
            )}
            <Grid item xs={12} md={8}>
              <TextField
                size="small" fullWidth
                label={t('agents.config.displayName')}
                value={form.display_name}
                onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                size="small" fullWidth
                label={t('agents.config.emoji')}
                value={form.emoji}
                onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                inputProps={{ maxLength: 4 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                size="small" fullWidth multiline rows={2}
                label={t('agents.config.descriptionNL')}
                value={form.description_nl}
                onChange={e => setForm(f => ({ ...f, description_nl: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                size="small" fullWidth multiline rows={2}
                label={t('agents.config.descriptionEN')}
                value={form.description_en}
                onChange={e => setForm(f => ({ ...f, description_en: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  />
                }
                label={t('agents.config.active')}
              />
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('agents.close')}</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={updateMut.isPending || !form}
        >
          {updateMut.isPending ? t('agents.config.saving') : t('agents.config.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
