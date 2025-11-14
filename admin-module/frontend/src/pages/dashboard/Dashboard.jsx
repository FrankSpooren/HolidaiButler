import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress
} from '@mui/material';
import {
  Place as PlaceIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { poiAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await poiAPI.getStats();
      setStats(response.data.overview);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total POIs',
      value: stats?.total || 0,
      icon: <PlaceIcon sx={{ fontSize: 40 }} />,
      color: '#667eea'
    },
    {
      title: 'Active POIs',
      value: stats?.active || 0,
      icon: <CheckCircleIcon sx={{ fontSize: 40 }} />,
      color: '#4caf50'
    },
    {
      title: 'Pending Review',
      value: stats?.pending || 0,
      icon: <PendingIcon sx={{ fontSize: 40 }} />,
      color: '#ff9800'
    },
    {
      title: 'Total Views',
      value: stats?.totalViews || 0,
      icon: <VisibilityIcon sx={{ fontSize: 40 }} />,
      color: '#2196f3'
    }
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Welcome back, {user?.profile?.firstName}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's an overview of your POI management dashboard
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {statCards.map((card, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    background: `linear-gradient(135deg, ${card.color}15 0%, ${card.color}05 100%)`,
                    border: `1px solid ${card.color}30`
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ color: card.color }}>
                        {card.icon}
                      </Box>
                    </Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                      {card.value.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.title}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Quick Stats
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography color="text.secondary">Average Rating</Typography>
                    <Typography fontWeight="bold">
                      {stats?.avgRating?.toFixed(1) || 'N/A'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography color="text.secondary">Total Bookings</Typography>
                    <Typography fontWeight="bold">
                      {stats?.totalBookings?.toLocaleString() || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography color="text.secondary">Needs Review</Typography>
                    <Typography fontWeight="bold" color={stats?.needsReview > 0 ? 'warning.main' : 'inherit'}>
                      {stats?.needsReview || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">Inactive POIs</Typography>
                    <Typography fontWeight="bold">
                      {stats?.inactive || 0}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Your Role
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Role
                  </Typography>
                  <Typography variant="h6" sx={{ mb: 2, textTransform: 'capitalize' }}>
                    {user?.role?.replace('_', ' ')}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Permissions
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {user?.permissions?.pois?.create && (
                      <Typography variant="body2">• Can create POIs</Typography>
                    )}
                    {user?.permissions?.pois?.update && (
                      <Typography variant="body2">• Can edit POIs</Typography>
                    )}
                    {user?.permissions?.pois?.delete && (
                      <Typography variant="body2">• Can delete POIs</Typography>
                    )}
                    {user?.permissions?.pois?.approve && (
                      <Typography variant="body2">• Can approve POIs</Typography>
                    )}
                    {user?.permissions?.platform?.branding && (
                      <Typography variant="body2">• Can manage platform branding</Typography>
                    )}
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
