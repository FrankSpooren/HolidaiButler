import { useState, useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel,
  Paper, Skeleton, Alert, Button, Tooltip, IconButton, Collapse, List, ListItem,
  ListItemText, useMediaQuery, useTheme, Tab, Tabs,
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
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
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
  const [jobsDialogOpen, setJobsDialogOpen] = useState(false);

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
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setJobsDialogOpen(true)}
          >
            {t('agents.scheduledJobs')} ({data?.scheduledJobs?.length || 0})
          </Button>
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
          <MenuItem value="calpe">{'🇪🇸'} Calpe</MenuItem>
          <MenuItem value="texel">{'🇳🇱'} Texel</MenuItem>
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
                <TableCell>{'🇪🇸'} Calpe</TableCell>
                <TableCell>{'🇳🇱'} Texel</TableCell>
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

      {/* Scheduled Jobs Dialog */}
      {jobsDialogOpen && (
        <Dialog open maxWidth="md" fullWidth onClose={() => setJobsDialogOpen(false)}>
          <DialogTitle>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('agents.scheduledJobs')}</Typography>
          </DialogTitle>
          <DialogContent>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Job</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Agent</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('agents.table.schedule')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('agents.detail.description')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.scheduledJobs || []).map((job, i) => (
                    <TableRow key={i} sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{job.name}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{job.agent}</Typography></TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{job.cron}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{job.description}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setJobsDialogOpen(false)}>{t('agents.close')}</Button>
          </DialogActions>
        </Dialog>
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

/* ===== Agent Detail Dialog (Fase 9C BLOK 2A — 4-tab Enterprise Profile) ===== */
function AgentDetailDialog({ agent, onClose }) {
  const { t, i18n } = useTranslation();
  const currentUser = useAuthStore(s => s.user);
  const isPlatformAdmin = currentUser?.role === 'platform_admin';
  const descriptionNL = getAgentDescription(agent.name);
  const tasks = getAgentTasks(agent.name);
  const hasWarning = agent.status === 'warning' || agent.status === 'error';

  const [tabValue, setTabValue] = useState(0);
  const [snack, setSnack] = useState({ open: false, message: '' });

  // Config state (Tab 3 — only loaded for platform_admin)
  const { data: configsData, isLoading: configLoading } = useAgentConfigs();
  const updateMut = useUpdateAgentConfig();
  const configs = configsData?.data?.configs || [];
  const agentConfig = configs.find(c => c.agent_key === agent.id) || {};

  const [configForm, setConfigForm] = useState(null);
  const [descLang, setDescLang] = useState('nl');
  const [editTasks, setEditTasks] = useState(null);
  const [newTask, setNewTask] = useState('');

  // Initialize config form when data arrives
  if (!configForm && !configLoading) {
    setConfigForm({
      display_name: agentConfig.display_name || agent.name,
      emoji: agentConfig.emoji || '',
      description_nl: agentConfig.description_nl || '',
      description_en: agentConfig.description_en || '',
      description_de: agentConfig.description_de || '',
      description_es: agentConfig.description_es || '',
      is_active: agentConfig.is_active !== false
    });
  }
  if (!editTasks && tasks.length > 0) {
    setEditTasks([...tasks]);
  }

  const handleConfigSave = async () => {
    try {
      const payload = { ...configForm };
      if (editTasks) payload.tasks = editTasks;
      await updateMut.mutateAsync({ key: agent.id, data: payload });
      setSnack({ open: true, message: t('agents.config.saved') });
    } catch (err) {
      // Error shown via updateMut.isError
    }
  };

  const handleAddTask = () => {
    if (newTask.trim() && editTasks) {
      setEditTasks([...editTasks, newTask.trim()]);
      setNewTask('');
    }
  };

  const handleRemoveTask = (idx) => {
    setEditTasks(editTasks.filter((_, i) => i !== idx));
  };

  const destStatusColor = (status) =>
    status === 'success' ? STATUS_COLORS.healthy
    : status === 'partial' ? STATUS_COLORS.warning
    : status === 'error' ? STATUS_COLORS.error
    : STATUS_COLORS.unknown;

  // Build tab list dynamically
  const tabDefs = [
    { key: 'profile', label: t('agents.tabs.profile') },
    { key: 'status', label: t('agents.tabs.status') }
  ];
  if (isPlatformAdmin) tabDefs.push({ key: 'config', label: t('agents.tabs.configuration'), icon: <SettingsIcon sx={{ fontSize: 16 }} /> });
  if (hasWarning) tabDefs.push({
    key: 'warnings', label: t('agents.tabs.warnings'),
    icon: agent.status === 'error' ? <ErrorOutlineIcon sx={{ fontSize: 16 }} /> : <WarningAmberIcon sx={{ fontSize: 16 }} />
  });

  const currentTab = tabDefs[tabValue]?.key || 'profile';

  return (
    <>
    <Dialog open maxWidth="md" fullWidth onClose={onClose}>
      <DialogTitle sx={{ pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span style={{ fontSize: '1.6rem' }}>{getAgentIcon(agent.name)}</span>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{agent.name}</Typography>
              <Chip label={t(`agents.filter.${agent.category}`)} size="small"
                sx={{ bgcolor: CATEGORY_COLORS[agent.category] || '#607d8b', color: '#fff', fontSize: '0.7rem', height: 20 }} />
              <Chip label={agent.type === 'A' ? 'Type A' : 'Type B'} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
            </Box>
          </Box>
        </Box>
      </DialogTitle>

      {/* Tab Bar */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}
        sx={{ borderBottom: 1, borderColor: 'divider', px: 3, minHeight: 40 }}
        variant="scrollable" scrollButtons="auto">
        {tabDefs.map((tab, i) => (
          <Tab key={tab.key} label={tab.label}
            icon={tab.icon || undefined} iconPosition="start"
            sx={{ minHeight: 40, textTransform: 'none', fontSize: '0.85rem' }} />
        ))}
      </Tabs>

      <DialogContent sx={{ minHeight: 320, pt: 2 }}>
        {/* ═══ TAB 1 — PROFIEL (readonly) ═══ */}
        {currentTab === 'profile' && (
          <Box>
            {/* Description */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {i18n.language === 'nl' ? (descriptionNL || agent.description) : (agent.description_en || agent.description)}
            </Typography>

            {/* Identity grid */}
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

            <Divider sx={{ my: 1.5 }} />

            {/* Tasks */}
            {tasks.length > 0 && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <AssignmentIcon fontSize="small" color="action" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {t('agents.detail.tasks')} ({tasks.length})
                  </Typography>
                </Box>
                <List dense disablePadding sx={{ mb: 2 }}>
                  {tasks.map((task, i) => (
                    <ListItem key={i} sx={{ py: 0.15, pl: 2 }}>
                      <ListItemText primary={<Typography variant="body2">• {task}</Typography>} />
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {/* Monitoring Scope */}
            {agent.monitoring_scope && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {t('agents.detail.monitoringScope')}
                </Typography>
                <Typography variant="body2">{agent.monitoring_scope}</Typography>
              </Box>
            )}

            {/* Output Details */}
            {agent.output && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {t('agents.detail.outputTitle')}
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">{t('agents.detail.outputType')}</Typography>
                    <Typography variant="body2">{agent.output.type}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">{t('agents.detail.outputFrequency')}</Typography>
                    <Typography variant="body2">{agent.output.frequency}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">{t('agents.detail.outputRecipients')}</Typography>
                    <Typography variant="body2">{agent.output.recipients}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption" color="text.secondary">{t('agents.detail.description')}</Typography>
                    <Typography variant="body2">{agent.output.description}</Typography>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Dependencies */}
            {agent.dependencies?.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {t('agents.detail.dependencies')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {agent.dependencies.map((dep, i) => (
                    <Chip key={i} label={dep} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* ═══ TAB 2 — STATUS (readonly) ═══ */}
        {currentTab === 'status' && (
          <Box>
            {/* Overall status */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t('agents.table.status')}:</Typography>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: STATUS_COLORS[agent.status] || STATUS_COLORS.unknown }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: STATUS_COLORS[agent.status], textTransform: 'capitalize' }}>
                {t(`agents.${agent.status}`) || agent.status}
              </Typography>
            </Box>

            {/* Destination Status (Cat A) */}
            {agent.type === 'A' && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  {t('agents.detail.destinationStatus')}
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {['calpe', 'texel'].map(dest => {
                    const d = agent.destinations?.[dest];
                    return (
                      <Grid item xs={6} key={dest}>
                        <Card variant="outlined" sx={{ p: 1.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {dest === 'calpe' ? '🇪🇸 Calpe' : '🇳🇱 Texel'}
                          </Typography>
                          {d ? (
                            <>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: destStatusColor(d.status) }} />
                                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{d.status || 'unknown'}</Typography>
                              </Box>
                              {d.lastRun && (
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(d.lastRun).toLocaleString('nl-NL')}
                                </Typography>
                              )}
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">{'\u2014'}</Typography>
                          )}
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </>
            )}

            {/* Scheduled Jobs for this agent */}
            {agent.scheduledJobs?.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  {t('agents.detail.scheduledJobs')} ({agent.scheduledJobs.length})
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 600, py: 0.5 }}>Job</TableCell>
                        <TableCell sx={{ fontWeight: 600, py: 0.5 }}>{t('agents.table.schedule')}</TableCell>
                        <TableCell sx={{ fontWeight: 600, py: 0.5 }}>{t('agents.detail.description')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {agent.scheduledJobs.map((job, i) => (
                        <TableRow key={i}>
                          <TableCell sx={{ py: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{job.name}</Typography>
                          </TableCell>
                          <TableCell sx={{ py: 0.5 }}>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{job.cronHuman}</Typography>
                          </TableCell>
                          <TableCell sx={{ py: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">{job.description}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {/* Last run info */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">{t('agents.lastUpdated')}</Typography>
                <Typography variant="body2">
                  {agent.lastRun?.timestamp ? new Date(agent.lastRun.timestamp).toLocaleString('nl-NL') : '\u2014'}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">{t('agents.detail.duration')}</Typography>
                <Typography variant="body2">{agent.lastRun?.duration ? `${agent.lastRun.duration}ms` : '\u2014'}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">{t('agents.detail.lastStatus')}</Typography>
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {agent.lastRun?.status || '\u2014'}
                </Typography>
              </Grid>
            </Grid>

            {/* Recent activity (last 5) */}
            {agent.recentRuns?.length > 0 && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  {t('agents.detail.recentActivity')}
                </Typography>
                <List dense disablePadding>
                  {agent.recentRuns.map((run, i) => (
                    <ListItem key={i} sx={{ py: 0.25, px: 1 }} divider={i < agent.recentRuns.length - 1}>
                      <ListItemText primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>
                            {formatTimestamp(run.timestamp)}
                          </Typography>
                          <Box sx={{
                            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                            bgcolor: run.status === 'success' ? STATUS_COLORS.healthy : run.status === 'error' ? STATUS_COLORS.error : STATUS_COLORS.unknown
                          }} />
                          <Typography variant="body2">{run.action}</Typography>
                          {run.destination && <Chip label={run.destination} size="small" sx={{ height: 16, fontSize: '0.6rem' }} />}
                        </Box>
                      } />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Box>
        )}

        {/* ═══ TAB 3 — CONFIGURATIE (platform_admin only) ═══ */}
        {currentTab === 'config' && isPlatformAdmin && (
          <Box>
            {configLoading || !configForm ? (
              <Box sx={{ py: 2 }}>
                {[...Array(4)].map((_, i) => <Skeleton key={i} height={56} sx={{ mb: 1 }} />)}
              </Box>
            ) : (
              <Grid container spacing={2}>
                {updateMut.isError && (
                  <Grid item xs={12}>
                    <Alert severity="error">
                      {updateMut.error?.response?.data?.error?.message || t('common.error')}
                    </Alert>
                  </Grid>
                )}
                <Grid item xs={12} md={8}>
                  <TextField size="small" fullWidth
                    label={t('agents.config.displayName')}
                    value={configForm.display_name}
                    onChange={e => setConfigForm(f => ({ ...f, display_name: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField size="small" fullWidth
                    label={t('agents.config.emoji')}
                    value={configForm.emoji}
                    onChange={e => setConfigForm(f => ({ ...f, emoji: e.target.value }))}
                    inputProps={{ maxLength: 4 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch checked={configForm.is_active}
                      onChange={e => setConfigForm(f => ({ ...f, is_active: e.target.checked }))} />}
                    label={t('agents.config.active')}
                  />
                </Grid>

                {/* Description with 4-language tabs */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    {t('agents.detail.description')}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                    {['nl', 'en', 'de', 'es'].map(lang => (
                      <Chip key={lang} label={lang.toUpperCase()} size="small"
                        variant={descLang === lang ? 'filled' : 'outlined'}
                        color={descLang === lang ? 'primary' : 'default'}
                        onClick={() => setDescLang(lang)}
                        sx={{ fontWeight: descLang === lang ? 700 : 400, cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                  <TextField size="small" fullWidth multiline rows={3}
                    value={configForm[`description_${descLang}`] || ''}
                    onChange={e => setConfigForm(f => ({ ...f, [`description_${descLang}`]: e.target.value }))}
                  />
                </Grid>

                {/* Editable tasks array */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    {t('agents.detail.tasks')}
                  </Typography>
                  {editTasks?.map((task, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <TextField size="small" fullWidth value={task}
                        onChange={e => {
                          const next = [...editTasks];
                          next[i] = e.target.value;
                          setEditTasks(next);
                        }}
                      />
                      <IconButton size="small" color="error" onClick={() => handleRemoveTask(i)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                    <TextField size="small" fullWidth
                      placeholder={t('agents.config.addTask')}
                      value={newTask}
                      onChange={e => setNewTask(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                    />
                    <IconButton size="small" color="primary" onClick={handleAddTask} disabled={!newTask.trim()}>
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Grid>

                {/* Save button */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1 }}>
                    <Button variant="contained" onClick={handleConfigSave}
                      disabled={updateMut.isPending}>
                      {updateMut.isPending ? t('agents.config.saving') : t('agents.config.save')}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            )}
          </Box>
        )}

        {/* ═══ TAB 4 — WAARSCHUWINGEN (only when warning/error) ═══ */}
        {currentTab === 'warnings' && hasWarning && (
          <Box>
            <Alert
              severity={agent.status === 'error' ? 'error' : 'warning'}
              icon={agent.status === 'error' ? <ErrorOutlineIcon /> : <WarningAmberIcon />}
              sx={{ mb: 2 }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                {agent.status === 'error' ? t('agents.detail.errorTitle') : t('agents.detail.warningTitle')}
              </Typography>
              <Typography variant="body2">
                {agent.warningDetail || agent.lastRun?.error || t('agents.detail.checkLogs')}
              </Typography>
            </Alert>

            {/* Recommended action with copy */}
            {agent.recommendedAction && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {t('agents.detail.recommendedAction')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1, wordBreak: 'break-all' }}>
                    {agent.recommendedAction}
                  </Typography>
                  <Tooltip title={t('agents.detail.copyCommand')}>
                    <IconButton size="small" onClick={() => {
                      navigator.clipboard.writeText(agent.recommendedAction);
                      setSnack({ open: true, message: t('agents.detail.copied') });
                    }}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            )}

            {/* Recent errors */}
            {agent.recentRuns?.filter(r => r.status === 'error').length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  {t('agents.detail.recentErrors')}
                </Typography>
                <List dense disablePadding>
                  {agent.recentRuns.filter(r => r.status === 'error').map((run, i) => (
                    <ListItem key={i} sx={{ py: 0.25, px: 1, bgcolor: 'rgba(244,67,54,0.04)', borderRadius: 1, mb: 0.5 }}>
                      <ListItemText primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>
                            {formatTimestamp(run.timestamp)}
                          </Typography>
                          <Typography variant="body2">{run.action}</Typography>
                          {run.destination && <Chip label={run.destination} size="small" sx={{ height: 16, fontSize: '0.6rem' }} />}
                        </Box>
                      } />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('agents.close')}</Button>
      </DialogActions>
    </Dialog>

    <Snackbar
      open={snack.open}
      autoHideDuration={4000}
      onClose={() => setSnack({ open: false, message: '' })}
      message={snack.message}
    />
    </>
  );
}
