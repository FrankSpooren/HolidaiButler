import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import {
  Place as PlaceIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Event as EventIcon,
  CalendarMonth as CalendarIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { poiAPI, agendaAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [poiStats, setPoiStats] = useState(null);
  const [agendaStats, setAgendaStats] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    try {
      // Fetch POI and Agenda stats in parallel
      const [poiResponse, agendaResponse, upcomingResponse] = await Promise.all([
        poiAPI.getStats().catch(err => { console.error('POI stats error:', err); return null; }),
        agendaAPI.getStats().catch(err => { console.error('Agenda stats error:', err); return null; }),
        agendaAPI.getUpcoming(5, true).catch(err => { console.error('Upcoming events error:', err); return null; })
      ]);

      if (poiResponse?.data?.overview) {
        setPoiStats(poiResponse.data.overview);
      }
      if (agendaResponse?.data?.overview) {
        setAgendaStats(agendaResponse.data.overview);
      }
      if (upcomingResponse?.data?.agendaItems) {
        setUpcomingEvents(upcomingResponse.data.agendaItems);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const poiStatCards = [
    {
      title: 'Total POIs',
      value: poiStats?.total || 0,
      icon: <PlaceIcon sx={{ fontSize: 40 }} />,
      color: '#667eea',
      onClick: () => navigate('/pois')
    },
    {
      title: 'Active POIs',
      value: poiStats?.active || 0,
      icon: <CheckCircleIcon sx={{ fontSize: 40 }} />,
      color: '#4caf50',
      onClick: () => navigate('/pois?status=active')
    },
    {
      title: 'Pending Review',
      value: poiStats?.pending || 0,
      icon: <PendingIcon sx={{ fontSize: 40 }} />,
      color: '#ff9800',
      onClick: () => navigate('/pois?status=pending')
    }
  ];

  const agendaStatCards = [
    {
      title: 'Total Events',
      value: agendaStats?.total || 0,
      icon: <EventIcon sx={{ fontSize: 40 }} />,
      color: '#9c27b0',
      onClick: () => navigate('/agenda')
    },
    {
      title: 'In Calpe Area',
      value: agendaStats?.inCalpeArea || 0,
      icon: <LocationIcon sx={{ fontSize: 40 }} />,
      color: '#00bcd4',
      onClick: () => navigate('/agenda?inCalpeArea=true')
    },
    {
      title: 'Upcoming',
      value: agendaStats?.upcoming || 0,
      icon: <CalendarIcon sx={{ fontSize: 40 }} />,
      color: '#e91e63',
      onClick: () => navigate('/agenda')
    }
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Welcome back, {user?.profile?.firstName}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Overview of your HolidaiButler Admin Dashboard
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* POI Stats Section */}
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            Points of Interest (POIs)
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {poiStatCards.map((card, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    background: `linear-gradient(135deg, ${card.color}15 0%, ${card.color}05 100%)`,
                    border: `1px solid ${card.color}30`,
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 4px 20px ${card.color}30`
                    }
                  }}
                  onClick={card.onClick}
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

          {/* Agenda Stats Section */}
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            Agenda / Events
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {agendaStatCards.map((card, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    background: `linear-gradient(135deg, ${card.color}15 0%, ${card.color}05 100%)`,
                    border: `1px solid ${card.color}30`,
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 4px 20px ${card.color}30`
                    }
                  }}
                  onClick={card.onClick}
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
            {/* Upcoming Events */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Upcoming Events (Calpe Area)
                </Typography>
                {upcomingEvents.length > 0 ? (
                  <List>
                    {upcomingEvents.map((event, index) => (
                      <ListItem key={event.id || index} divider={index < upcomingEvents.length - 1}>
                        <ListItemText
                          primary={event.title || event.title_en || 'Untitled Event'}
                          secondary={
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                              <Chip
                                label={formatDate(event.date)}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                              {event.time && (
                                <Chip
                                  label={event.time}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                              {event.location_name && (
                                <Typography variant="caption" color="text.secondary">
                                  {event.location_name}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    No upcoming events in the Calpe area
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Quick Stats */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Quick Stats
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography color="text.secondary">POI Average Rating</Typography>
                    <Typography fontWeight="bold">
                      {poiStats?.avgRating?.toFixed(1) || 'N/A'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography color="text.secondary">Inactive POIs</Typography>
                    <Typography fontWeight="bold">
                      {poiStats?.inactive || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography color="text.secondary">Total Event Dates</Typography>
                    <Typography fontWeight="bold">
                      {agendaStats?.totalDates?.toLocaleString() || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">Past Events</Typography>
                    <Typography fontWeight="bold">
                      {agendaStats?.past || 0}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* User Role */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Your Role & Permissions
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
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {user?.permissions?.pois?.create && (
                      <Chip label="Create POIs" size="small" color="primary" variant="outlined" />
                    )}
                    {user?.permissions?.pois?.update && (
                      <Chip label="Edit POIs" size="small" color="primary" variant="outlined" />
                    )}
                    {user?.permissions?.pois?.delete && (
                      <Chip label="Delete POIs" size="small" color="error" variant="outlined" />
                    )}
                    {user?.permissions?.pois?.approve && (
                      <Chip label="Approve POIs" size="small" color="success" variant="outlined" />
                    )}
                    {user?.permissions?.platform?.branding && (
                      <Chip label="Manage Branding" size="small" color="secondary" variant="outlined" />
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
