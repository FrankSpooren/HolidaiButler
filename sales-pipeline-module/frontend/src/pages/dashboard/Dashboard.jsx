/**
 * Dashboard Page - Main dashboard with KPIs and metrics
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  LinearProgress,
  Avatar,
  AvatarGroup,
  Skeleton,
  Menu,
  MenuItem,
  Tooltip,
  Divider
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  Handshake as DealIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  CalendarToday as CalendarIcon,
  MoreVert as MoreIcon,
  ArrowForward as ArrowForwardIcon,
  People as PeopleIcon,
  Email as EmailIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Add as AddIcon
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { reportsAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const COLORS = ['#667eea', '#764ba2', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6'];

// KPI Card Component
const KPICard = ({ title, value, change, changeLabel, icon: Icon, color, loading }) => {
  const isPositive = change >= 0;

  if (loading) {
    return (
      <Card className="stat-card">
        <CardContent>
          <Skeleton variant="text" width={100} />
          <Skeleton variant="text" width={150} height={40} />
          <Skeleton variant="text" width={80} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="stat-card card-hover">
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {title}
          </Typography>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: `${color}.light`,
              color: `${color}.dark`
            }}
          >
            <Icon fontSize="small" />
          </Avatar>
        </Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {value}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {isPositive ? (
            <TrendingUpIcon fontSize="small" color="success" />
          ) : (
            <TrendingDownIcon fontSize="small" color="error" />
          )}
          <Typography
            variant="body2"
            color={isPositive ? 'success.main' : 'error.main'}
            fontWeight={600}
          >
            {isPositive ? '+' : ''}
            {change}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {changeLabel}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

// Task Item Component
const TaskItem = ({ task, onComplete }) => (
  <Box
    sx={{
      p: 1.5,
      borderRadius: 1,
      bgcolor: 'background.default',
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      mb: 1,
      '&:hover': { bgcolor: 'action.hover' }
    }}
  >
    <IconButton size="small" onClick={() => onComplete(task.id)}>
      <CheckIcon
        fontSize="small"
        sx={{ color: task.completed ? 'success.main' : 'text.disabled' }}
      />
    </IconButton>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography
        variant="body2"
        fontWeight={500}
        sx={{
          textDecoration: task.completed ? 'line-through' : 'none',
          color: task.completed ? 'text.disabled' : 'text.primary'
        }}
        noWrap
      >
        {task.title}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {task.dueDate}
      </Typography>
    </Box>
    <Chip
      size="small"
      label={task.priority}
      color={
        task.priority === 'high'
          ? 'error'
          : task.priority === 'medium'
          ? 'warning'
          : 'default'
      }
      sx={{ height: 20, fontSize: '0.7rem' }}
    />
  </Box>
);

// Deal Card Component
const DealCard = ({ deal }) => (
  <Box
    sx={{
      p: 2,
      borderRadius: 1,
      bgcolor: 'background.default',
      mb: 1,
      '&:hover': { bgcolor: 'action.hover', cursor: 'pointer' }
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
      <Typography variant="subtitle2" fontWeight={600} noWrap>
        {deal.title}
      </Typography>
      <Typography variant="subtitle2" fontWeight={700} color="primary.main">
        {deal.value}
      </Typography>
    </Box>
    <Typography variant="caption" color="text.secondary">
      {deal.company}
    </Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
      <LinearProgress
        variant="determinate"
        value={deal.probability}
        sx={{ flex: 1, height: 4, borderRadius: 2 }}
      />
      <Typography variant="caption" color="text.secondary">
        {deal.probability}%
      </Typography>
    </Box>
  </Box>
);

// Activity Item Component
const ActivityItem = ({ activity }) => (
  <Box className="timeline-item">
    <Typography variant="body2" fontWeight={500}>
      {activity.title}
    </Typography>
    <Typography variant="caption" color="text.secondary" display="block">
      {activity.description}
    </Typography>
    <Typography variant="caption" color="text.secondary">
      {activity.time}
    </Typography>
  </Box>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [dateRange, setDateRange] = useState('month');
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data } = await reportsAPI.getDashboard({ period: dateRange });
      setDashboardData(data.data);
    } catch (error) {
      // Use mock data for demo
      setDashboardData(getMockData());
    } finally {
      setLoading(false);
    }
  };

  const getMockData = () => ({
    kpis: {
      totalRevenue: { value: '$1.2M', change: 12.5 },
      activeDeals: { value: '147', change: 8.3 },
      conversionRate: { value: '24%', change: -2.1 },
      avgDealSize: { value: '$8,200', change: 15.2 },
      salesCycle: { value: '32 days', change: -5.0 },
      responseTime: { value: '2.4h', change: -12.0 }
    },
    revenueChart: [
      { month: 'Jan', revenue: 85000, target: 80000 },
      { month: 'Feb', revenue: 92000, target: 85000 },
      { month: 'Mar', revenue: 78000, target: 90000 },
      { month: 'Apr', revenue: 110000, target: 95000 },
      { month: 'May', revenue: 125000, target: 100000 },
      { month: 'Jun', revenue: 118000, target: 105000 }
    ],
    pipelineStages: [
      { name: 'Lead', value: 45, deals: 45 },
      { name: 'Qualified', value: 32, deals: 32 },
      { name: 'Meeting', value: 28, deals: 28 },
      { name: 'Proposal', value: 22, deals: 22 },
      { name: 'Negotiation', value: 12, deals: 12 },
      { name: 'Won', value: 8, deals: 8 }
    ],
    topDeals: [
      { id: 1, title: 'Enterprise License', company: 'Acme Corp', value: '$125,000', probability: 75 },
      { id: 2, title: 'Platform Integration', company: 'TechStart Inc', value: '$89,000', probability: 60 },
      { id: 3, title: 'Annual Contract', company: 'Global Services', value: '$67,000', probability: 85 }
    ],
    tasks: [
      { id: 1, title: 'Follow up with Acme Corp', dueDate: 'Today', priority: 'high', completed: false },
      { id: 2, title: 'Prepare proposal for TechStart', dueDate: 'Tomorrow', priority: 'medium', completed: false },
      { id: 3, title: 'Review contract terms', dueDate: 'Dec 15', priority: 'low', completed: true }
    ],
    activities: [
      { id: 1, title: 'Meeting with Sarah', description: 'Discussed partnership opportunities', time: '2h ago' },
      { id: 2, title: 'Deal won', description: 'Closed deal with Global Tech - $45,000', time: '4h ago' },
      { id: 3, title: 'Email sent', description: 'Follow-up email to Marcus Chen', time: '6h ago' }
    ],
    teamPerformance: [
      { name: 'John', deals: 12, revenue: 280000 },
      { name: 'Sarah', deals: 10, revenue: 245000 },
      { name: 'Mike', deals: 8, revenue: 195000 },
      { name: 'Lisa', deals: 7, revenue: 168000 }
    ]
  });

  const data = dashboardData || getMockData();

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Welcome back, {user?.firstName || 'User'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Here's what's happening with your sales pipeline today
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<CalendarIcon />}
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            {dateRange === 'week' ? 'This Week' : dateRange === 'month' ? 'This Month' : 'This Quarter'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/deals')}
          >
            New Deal
          </Button>
        </Box>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => { setDateRange('week'); setAnchorEl(null); }}>This Week</MenuItem>
        <MenuItem onClick={() => { setDateRange('month'); setAnchorEl(null); }}>This Month</MenuItem>
        <MenuItem onClick={() => { setDateRange('quarter'); setAnchorEl(null); }}>This Quarter</MenuItem>
      </Menu>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPICard
            title="Total Revenue"
            value={data.kpis.totalRevenue.value}
            change={data.kpis.totalRevenue.change}
            changeLabel="vs last month"
            icon={MoneyIcon}
            color="success"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPICard
            title="Active Deals"
            value={data.kpis.activeDeals.value}
            change={data.kpis.activeDeals.change}
            changeLabel="vs last month"
            icon={DealIcon}
            color="primary"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPICard
            title="Conversion Rate"
            value={data.kpis.conversionRate.value}
            change={data.kpis.conversionRate.change}
            changeLabel="vs last month"
            icon={TrendingUpIcon}
            color="info"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPICard
            title="Avg Deal Size"
            value={data.kpis.avgDealSize.value}
            change={data.kpis.avgDealSize.change}
            changeLabel="vs last month"
            icon={SpeedIcon}
            color="warning"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPICard
            title="Sales Cycle"
            value={data.kpis.salesCycle.value}
            change={data.kpis.salesCycle.change}
            changeLabel="vs last month"
            icon={TimelineIcon}
            color="secondary"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPICard
            title="Response Time"
            value={data.kpis.responseTime.value}
            change={data.kpis.responseTime.change}
            changeLabel="vs last month"
            icon={EmailIcon}
            color="error"
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Revenue Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    Revenue Overview
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Monthly revenue vs target
                  </Typography>
                </Box>
                <IconButton size="small">
                  <MoreIcon />
                </IconButton>
              </Box>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.revenueChart}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
                  <ChartTooltip
                    formatter={(value) => [`$${value.toLocaleString()}`, '']}
                    contentStyle={{ borderRadius: 8 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#667eea"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    name="Revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="target"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="none"
                    name="Target"
                  />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Pipeline Funnel */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    Pipeline Funnel
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Deals by stage
                  </Typography>
                </Box>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/pipeline')}
                >
                  View
                </Button>
              </Box>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={data.pipelineStages}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.pipelineStages.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip formatter={(value, name) => [`${value} deals`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                {data.pipelineStages.map((stage, index) => (
                  <Chip
                    key={stage.name}
                    size="small"
                    label={`${stage.name}: ${stage.deals}`}
                    sx={{
                      bgcolor: COLORS[index % COLORS.length],
                      color: 'white',
                      fontSize: '0.7rem'
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bottom Row */}
      <Grid container spacing={3}>
        {/* Top Deals */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  Top Deals
                </Typography>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/deals')}
                >
                  View All
                </Button>
              </Box>
              {data.topDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Tasks */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  My Tasks
                </Typography>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/tasks')}
                >
                  View All
                </Button>
              </Box>
              {data.tasks.map((task) => (
                <TaskItem key={task.id} task={task} onComplete={() => {}} />
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  Recent Activity
                </Typography>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/activities')}
                >
                  View All
                </Button>
              </Box>
              {data.activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Team Performance */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    Team Performance
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Closed deals and revenue by team member
                  </Typography>
                </Box>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/reports/team-performance')}
                >
                  Full Report
                </Button>
              </Box>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.teamPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis yAxisId="left" stroke="#64748b" fontSize={12} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(v) => `$${v / 1000}k`}
                  />
                  <ChartTooltip
                    formatter={(value, name) =>
                      name === 'revenue' ? [`$${value.toLocaleString()}`, 'Revenue'] : [value, 'Deals']
                    }
                    contentStyle={{ borderRadius: 8 }}
                  />
                  <Bar yAxisId="left" dataKey="deals" fill="#667eea" radius={[4, 4, 0, 0]} name="Deals" />
                  <Bar yAxisId="right" dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
