import { useState, useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel,
  Paper, Skeleton, Alert, Button, Tooltip, IconButton, Collapse, List, ListItem,
  ListItemText, useMediaQuery, useTheme
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useTranslation } from 'react-i18next';
import { useAgentStatus } from '../hooks/useAgentStatus';
import { getAgentIcon, formatTimestamp, CATEGORY_COLORS, STATUS_COLORS } from '../utils/agents';

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
    if (!destData) return <Typography variant="body2" color="text.secondary">—</Typography>;
    const statusColor = destData.status === 'success' ? STATUS_COLORS.healthy
      : destData.status === 'partial' ? STATUS_COLORS.warning
      : destData.status === 'error' ? STATUS_COLORS.error
      : STATUS_COLORS.unknown;
    return (
      <Tooltip title={destData.lastRun ? `${destData.status} — ${new Date(destData.lastRun).toLocaleString('nl-NL')}` : t('agents.unknown')}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusColor, flexShrink: 0 }} />
          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
            {destData.lastRun ? formatTimestamp(destData.lastRun) : '—'}
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
          <MenuItem value="calpe">Calpe</MenuItem>
          <MenuItem value="texel">Texel</MenuItem>
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
                <TableCell>{t('agents.table.calpe')}</TableCell>
                <TableCell>{t('agents.table.texel')}</TableCell>
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
                  sx={{
                    bgcolor: agent.status === 'error' ? 'rgba(244,67,54,0.04)' : undefined,
                    '&:hover': { bgcolor: 'grey.50' }
                  }}
                >
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{idx + 1}</TableCell>
                  <TableCell>
                    <Tooltip title={agent.description} arrow>
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
                    <Tooltip title={agent.lastRun?.error || (agent.lastRun ? `${agent.lastRun.status} — ${agent.lastRun.duration ? `${agent.lastRun.duration}ms` : ''}` : t('agents.unknown'))} arrow>
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
          <Typography variant="body2" color="text.secondary">Geen recente activiteit</Typography>
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
