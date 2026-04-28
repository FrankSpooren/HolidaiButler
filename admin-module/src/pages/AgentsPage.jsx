import React, { useState, useMemo, useEffect } from 'react';
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
import { useAgentStatus, useAgentConfigs, useUpdateAgentConfig, useAgentResults } from '../hooks/useAgentStatus';
import useAuthStore from '../stores/authStore.js';
import { getAgentIcon, getAgentDescription, getAgentTasks, formatTimestamp, CATEGORY_COLORS, STATUS_COLORS } from '../utils/agents';

const CATEGORIES = ['all', 'core', 'operations', 'development', 'strategy', 'monitoring', 'content', 'intelligence', 'commerce', 'support', 'compliance'];

export default function AgentsPage({ embedded = false }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [destinationFilter, setDestinationFilter] = useState('all');
  const [sortBy, setSortBy] = useState('category');
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [diagnoseAgent, setDiagnoseAgent] = useState(null);
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
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        a.name?.toLowerCase().includes(q) ||
        a.id?.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q) ||
        a.scheduleHuman?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q)
      );
    }
    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'category') cmp = a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
      else if (sortBy === 'type') cmp = a.type.localeCompare(b.type);
      else if (sortBy === 'status') {
        const order = { error: 0, warning: 1, unknown: 2, healthy: 3, deactivated: 4 };
        cmp = (order[a.status] ?? 2) - (order[b.status] ?? 2);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [data?.agents, categoryFilter, sortDir, sortBy, searchQuery]);

  // Grouped by category for collapsible view
  const groupedAgents = useMemo(() => {
    if (!filteredAgents) return {};
    const groups = {};
    for (const agent of filteredAgents) {
      const cat = agent.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(agent);
    }
    // Sort categories: error/warning first
    const catOrder = ['core', 'operations', 'content', 'intelligence', 'development', 'strategy', 'commerce', 'monitoring', 'support', 'compliance'];
    const sorted = {};
    for (const cat of catOrder) {
      if (groups[cat]) sorted[cat] = groups[cat];
    }
    // Add any remaining
    for (const cat of Object.keys(groups)) {
      if (!sorted[cat]) sorted[cat] = groups[cat];
    }
    return sorted;
  }, [filteredAgents]);

  // Relative time helper
  const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Toggle category accordion
  const toggleCategory = (cat) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  // Auto-expand categories with errors/warnings
  useEffect(() => {
    if (data?.agents) {
      const needsAttention = new Set();
      for (const a of data.agents) {
        if (a.status === 'error' || a.status === 'warning') needsAttention.add(a.category);
      }
      needsAttention.add('core'); setExpandedCategories(needsAttention);
    }
  }, [data?.agents]);

  // Business output helper
  const getBusinessOutput = (agent) => {
    if (!agent.lastRun) return 'standby';
    const ageMs = Date.now() - new Date(agent.lastRun.timestamp).getTime();
    if (agent.lastRun.status === 'success' && ageMs < 48 * 3600 * 1000) return 'delivering';
    if (agent.status === 'healthy') return 'monitoring';
    return 'standby';
  };

  const summary = data?.summary || { total: 0, healthy: 0, warning: 0, error: 0, unknown: 0, deactivated: 0 };
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
      {/* ROW 1: Page Header (hidden when embedded in Agents & System tab) */}
      {!embedded && <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 1 }}>
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
      </Box>}

      {/* Group toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <FormControlLabel
          control={<Switch checked={groupByCategory} onChange={e => setGroupByCategory(e.target.checked)} size="small" />}
          label={<Typography variant="caption">Groepeer per categorie</Typography>}
        />
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

            {/* OVERVIEW BLOCKS */}
      <Typography variant="overline" color="text.secondary" sx={{ mb: 1 }}>OVERVIEW</Typography>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {[
          { key: 'total', value: summary.total, bg: '#f5f5f5', tc: '#333' },
          { key: 'healthy', value: summary.healthy, bg: '#e8f5e9', tc: '#2e7d32' },
          { key: 'warning', value: summary.warning, bg: '#fff3e0', tc: '#e65100' },
          { key: 'error', value: summary.error, bg: '#ffebee', tc: '#c62828' },
          { key: 'deactivated', value: summary.deactivated, bg: '#fafafa', tc: '#9e9e9e' }
        ].map(({ key, value, bg, tc }) => (
          <Grid item xs={4} sm={2.4} key={key}>
            <Box sx={{ bgcolor: bg, borderRadius: 2, p: 2, textAlign: 'center', minHeight: 70, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: tc, lineHeight: 1 }}>{value}</Typography>
              <Typography variant="caption" sx={{ color: tc, opacity: 0.8 }}>{t(`agents.${key}`)}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* SEARCH BAR */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, alignItems: 'center' }}>
        <TextField size="small" fullWidth placeholder="Search agents by name, schedule, or category..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} sx={{ maxWidth: 500 }} />
        <Button variant="outlined" size="small" onClick={handleRefresh} disabled={isFetching} startIcon={<RefreshIcon />}>
          {isFetching ? '...' : 'Refresh'}
        </Button>
      </Box>

{/* AGENT CATEGORIES — Accordion Layout */}
      {filteredAgents.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>{t('agents.noResults')}</Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 3 }}>
          {Object.entries(groupedAgents).map(([category, catAgents]) => {
            const isExpanded = expandedCategories.has(category);
            const hasIssues = catAgents.some(a => a.status === 'error' || a.status === 'warning');
            const errorCount = catAgents.filter(a => a.status === 'error').length;
            const warningCount = catAgents.filter(a => a.status === 'warning').length;
            const catSummary = hasIssues
              ? `${errorCount > 0 ? errorCount + ' error' : ''}${errorCount > 0 && warningCount > 0 ? ' · ' : ''}${warningCount > 0 ? warningCount + ' attention' : ''}`
              : 'all healthy';

            return (
              <Paper key={category} variant="outlined" sx={{ overflow: 'hidden' }}>
                {/* Category Header — clickable */}
                <Box
                  onClick={() => toggleCategory(category)}
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    px: 2, py: 1.5, cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                    borderLeft: `4px solid ${CATEGORY_COLORS[category] || '#607d8b'}`
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '1.1rem', color: 'text.secondary', cursor: 'pointer' }}>
                      {isExpanded ? '▾' : '▸'}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {t(`agents.filter.${category}`)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {hasIssues && (
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: errorCount > 0 ? STATUS_COLORS.error : STATUS_COLORS.warning }} />
                    )}
                    <Typography variant="body2" color="text.secondary">
                      {catAgents.length} agents{hasIssues ? ` · ${catSummary}` : ' · all healthy'}
                    </Typography>
                  </Box>
                </Box>

                {/* Category Content — collapsible */}
                <Collapse in={isExpanded}>
                  <Divider />
                  {catAgents.map(agent => {
                    const bo = getBusinessOutput(agent);
                    const boColor = { delivering: '#e8f5e9', monitoring: '#e3f2fd', standby: '#f5f5f5' }[bo] || '#f5f5f5';
                    const boTextColor = { delivering: '#2e7d32', monitoring: '#1565c0', standby: '#9e9e9e' }[bo] || '#9e9e9e';

                    return (
                      <Box
                        key={agent.id}
                        onClick={() => setSelectedAgent(agent)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5,
                          cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' },
                          borderBottom: '1px solid', borderColor: 'divider',
                          opacity: agent.status === 'deactivated' ? 0.5 : 1
                        }}
                      >
                        {/* Icon + Name + Subtitle */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 220, flex: 1 }}>
                          <Box sx={{
                            width: 36, height: 36, borderRadius: 1, bgcolor: `${CATEGORY_COLORS[category] || '#607d8b'}15`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0
                          }}>
                            {getAgentIcon(agent.name)}
                          </Box>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{agent.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {agent.scheduleHuman || agent.schedule || 'On-demand'} · {(agent.description || '').substring(0, 40)}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Status Chips */}
                        <Box sx={{ display: 'flex', gap: 0.5, minWidth: 160 }}>
                          <Chip
                            label={t(`agents.${agent.status}`)}
                            size="small"
                            sx={{
                              bgcolor: `${STATUS_COLORS[agent.status]}20`,
                              color: STATUS_COLORS[agent.status],
                              fontWeight: 600, fontSize: '0.7rem', height: 22
                            }}
                          />
                          <Chip
                            label={t(`agents.businessOutput.${bo}`)}
                            size="small"
                            sx={{ bgcolor: boColor, color: boTextColor, fontSize: '0.7rem', height: 22 }}
                          />
                        </Box>

                        {/* Timestamp */}
                        {!isMobile && (
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70, textAlign: 'right' }}>
                            {timeAgo(agent.lastRun?.timestamp)}
                          </Typography>
                        )}

                        {/* Diagnose button for warning/error */}
                        {(agent.status === 'warning' || agent.status === 'error') && (
                          <Button
                            size="small"
                            variant="outlined"
                            color={agent.status === 'error' ? 'error' : 'warning'}
                            onClick={(e) => { e.stopPropagation(); setDiagnoseAgent(agent); }}
                            sx={{ fontSize: '0.7rem', minWidth: 70 }}
                          >
                            Diagnose
                          </Button>
                        )}
                      </Box>
                    );
                  })}
                </Collapse>
              </Paper>
            );
          })}
        </Box>
      )}


      {/* Diagnose Dialog */}
      {diagnoseAgent && (
        <Dialog open={!!diagnoseAgent} onClose={() => setDiagnoseAgent(null)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ErrorOutlineIcon color={diagnoseAgent.status === "error" ? "error" : "warning"} />
            Diagnose: {diagnoseAgent.name}
          </DialogTitle>
          <DialogContent dividers>
            <Typography variant="subtitle2" gutterBottom>Laatste runs</Typography>
            {(diagnoseAgent.recentRuns || []).slice(0, 5).map((run, i) => (
              <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "center", mb: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: run.status === "success" ? "#4caf50" : "#f44336" }} />
                <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                  {new Date(run.timestamp).toLocaleString("nl-NL")} — {run.action || run.status}
                </Typography>
              </Box>
            ))}
            {diagnoseAgent.warningDetail && (
              <Alert severity={diagnoseAgent.status === "error" ? "error" : "warning"} sx={{ mt: 2, mb: 1 }}>
                {diagnoseAgent.warningDetail}
              </Alert>
            )}
            {diagnoseAgent.errorInstructions?.default && (
              <>
                <Typography variant="subtitle2" sx={{ mt: 2 }}>Troubleshooting</Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-line", fontFamily: "monospace", fontSize: "0.8rem", bgcolor: "action.hover", p: 1, borderRadius: 1, mt: 0.5 }}>
                  {diagnoseAgent.errorInstructions.default}
                </Typography>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDiagnoseAgent(null)}>Sluiten</Button>
          </DialogActions>
        </Dialog>
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
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Job</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Agent</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('agents.table.schedule')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('agents.detail.description')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.scheduledJobs || []).map((job, i) => (
                    <TableRow key={i} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
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
                  '&:hover': { bgcolor: 'action.hover' }
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
  const isDeactivated = agent.status === 'deactivated' || agent.active === false;

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

  // Initialize config form when data arrives (useEffect prevents render-body race conditions)
  useEffect(() => {
    if (!configLoading && configForm === null) {
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
  }, [configLoading, agent.id]);

  useEffect(() => {
    if (!configLoading && editTasks === null) {
      // Prefer MongoDB-persisted tasks over static AGENT_TASKS fallback
      const savedTasks = agentConfig.tasks || agent.tasks || [];
      // Filter out placeholder patterns ("Task 1", "Task 2", etc.) and empty strings
      const cleanTasks = savedTasks.filter(t => t && typeof t === 'string' && t.trim() !== '' && !/^Task \d+$/.test(t.trim()));
      const initialTasks = cleanTasks.length > 0 ? cleanTasks : tasks;
      setEditTasks([...initialTasks]);
    }
  }, [configLoading, agent.id]);

  const handleConfigSave = async () => {
    try {
      const payload = { ...configForm };
      if (editTasks) {
        // Filter out placeholder patterns and empty strings before saving
        payload.tasks = editTasks.filter(t => t && typeof t === 'string' && t.trim() !== '' && !/^Task \d+$/.test(t.trim()));
      }
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

  // Agent results hook
  const { data: resultsData, isLoading: resultsLoading } = useAgentResults(agent.id);

  // Build tab list dynamically
  const tabDefs = [
    { key: 'profile', label: t('agents.tabs.profile') },
    { key: 'status', label: t('agents.tabs.status') },
    { key: 'results', label: t('agents.tabs.results') }
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

            {/* Deactivated info banner */}
            {isDeactivated && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {t('agents.detail.deactivatedTitle')}
                </Typography>
                {agent.deactivatedDate && (
                  <Typography variant="body2">
                    {t('agents.detail.deactivatedSince')}: {agent.deactivatedDate}
                  </Typography>
                )}
                {agent.deactivatedReason && (
                  <Typography variant="body2">
                    {t('agents.detail.deactivatedReason')}: {agent.deactivatedReason}
                  </Typography>
                )}
              </Alert>
            )}

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

            {/* Tasks — use MongoDB-backed editTasks when available, fallback to static */}
            {((editTasks && editTasks.length > 0 ? editTasks : tasks).length > 0) && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <AssignmentIcon fontSize="small" color="action" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {t('agents.detail.tasks')} ({(editTasks && editTasks.length > 0 ? editTasks : tasks).length})
                  </Typography>
                </Box>
                <List dense disablePadding sx={{ mb: 2 }}>
                  {(editTasks && editTasks.length > 0 ? editTasks : tasks).map((task, i) => (
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
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
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

        {/* ═══ TAB 3 — RESULTATEN ═══ */}
        {currentTab === 'results' && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
              {t('agents.detail.resultsTitle')}
            </Typography>
            {resultsLoading ? (
              <Box sx={{ py: 2 }}>
                {[...Array(3)].map((_, i) => <Skeleton key={i} height={48} sx={{ mb: 1 }} />)}
              </Box>
            ) : (resultsData?.results?.length || 0) === 0 ? (
              <Alert severity="info">{t('agents.detail.noResults')}</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 600, py: 0.5 }}>{t('agents.lastUpdated')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 0.5 }}>{t('agents.detail.resultAction')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 0.5 }}>{t('agents.detail.resultStatus')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 0.5 }}>{t('agents.detail.resultDestination')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 0.5 }}>{t('agents.detail.resultDuration')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 0.5 }}>{t('agents.detail.resultTrend')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 0.5 }}>{t('agents.detail.resultDetails')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resultsData.results.map((run, i) => (
                      <TableRow key={i} sx={{
                        bgcolor: run.status === 'error' ? 'rgba(244,67,54,0.04)' : undefined,
                        '&:hover': { bgcolor: 'action.hover' }
                      }}>
                        <TableCell sx={{ py: 0.5 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {run.timestamp ? new Date(run.timestamp).toLocaleString('nl-NL') : '\u2014'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{run.action}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{
                              width: 8, height: 8, borderRadius: '50%',
                              bgcolor: run.status === 'success' ? STATUS_COLORS.healthy
                                : run.status === 'error' ? STATUS_COLORS.error
                                : run.status === 'partial' ? STATUS_COLORS.warning
                                : STATUS_COLORS.unknown
                            }} />
                            <Typography variant="body2" sx={{ textTransform: 'capitalize', fontSize: '0.8rem' }}>
                              {run.status}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <Chip label={run.destination || 'All'} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {run.duration ? `${run.duration}ms` : '\u2014'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          {run.result?.trend?.direction ? (
                            <Chip size="small" sx={{ height: 20, fontSize: '0.7rem' }}
                              label={t(`agents.detail.trend.${run.result.trend.direction}`)}
                              color={
                                ['WORSE', 'SLOWER'].includes(run.result.trend.direction) ? 'error' :
                                ['BETTER', 'FASTER'].includes(run.result.trend.direction) ? 'success' :
                                'default'
                              }
                            />
                          ) : '\u2014'}
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {run.details || (run.result ? JSON.stringify(run.result).substring(0, 80) : '\u2014')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* ═══ TAB 4 — CONFIGURATIE (platform_admin only) ═══ */}
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 500, flex: 1 }}>
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

            {/* Instructies bij warnings/errors */}
            {(agent.status === 'error' || agent.status === 'warning' ||
              agent.statusMessage?.includes('gefaald') ||
              agent.statusMessage?.includes('warning')) && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {t('agents.detail.instructions', 'Instructies')}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.primary',
                    whiteSpace: 'pre-line',
                    bgcolor: 'action.hover',
                    p: 1.5,
                    borderRadius: 1,
                    fontFamily: 'inherit'
                  }}
                >
                  {agent.errorInstructions?.default ||
                   agent.errorInstructions?.[agent.status] ||
                   t('agents.detail.instructionsDefault',
                     'Controleer de PM2 logs voor details over deze melding. ' +
                     'Neem contact op met de Platform Admin als het probleem aanhoudt.')}
                </Typography>
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
