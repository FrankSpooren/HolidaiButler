import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  IconButton,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  Alert
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Publish as PublishIcon,
  Visibility as ViewIcon,
  AttachMoney as MoneyIcon,
  Event as EventIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { eventsAPI } from '../../services/api';

export default function EventDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const response = await eventsAPI.getById(id);
      if (response.success) {
        setEvent(response.data.event);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      const response = await eventsAPI.publish(id);
      if (response.success) {
        fetchEvent();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish event');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        const response = await eventsAPI.delete(id);
        if (response.success) {
          navigate('/events');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete event');
      }
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading event...</Typography>
      </Box>
    );
  }

  if (!event) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Event not found</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/events')}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {event.title?.en || 'Untitled Event'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Event ID: {event._id}
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          {event.status === 'draft' && (
            <Button
              variant="outlined"
              startIcon={<PublishIcon />}
              onClick={handlePublish}
            >
              Publish
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/events/edit/${event._id}`)}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <ViewIcon color="primary" />
                <Typography variant="h6">{event.stats?.views || 0}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Views
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <EventIcon color="primary" />
                <Typography variant="h6">{event.stats?.bookings || 0}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Bookings
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <MoneyIcon color="primary" />
                <Typography variant="h6">€{event.stats?.revenue || 0}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Revenue
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PeopleIcon color="primary" />
                <Typography variant="h6">
                  {event.capacity?.available || 0}/{event.capacity?.total || 0}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Capacity
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Basic Information */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">
                  Category
                </Typography>
                <Typography variant="body1">
                  <Chip
                    label={event.category?.replace('_', ' ').toUpperCase()}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">
                  Status
                </Typography>
                <Typography variant="body1">
                  <Chip
                    label={event.status}
                    color={
                      event.status === 'published' ? 'success' :
                      event.status === 'cancelled' ? 'error' : 'default'
                    }
                    size="small"
                    sx={{ mt: 0.5, textTransform: 'capitalize' }}
                  />
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">
                  Start Date
                </Typography>
                <Typography variant="body1">
                  {formatDate(event.startDate)}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">
                  End Date
                </Typography>
                <Typography variant="body1">
                  {event.endDate ? formatDate(event.endDate) : 'N/A'}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">
                  Time of Day
                </Typography>
                <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                  {event.timeOfDay?.replace('_', ' ')}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">
                  Pricing
                </Typography>
                <Typography variant="body1">
                  {event.isFree ? 'Free Event' :
                    `€${event.priceRange?.min} - €${event.priceRange?.max}`
                  }
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Description (EN)
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {event.description?.en || 'No description'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Location & Contact */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              <LocationIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Location
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Typography variant="body2" fontWeight="medium">
              {event.location?.name || 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {event.location?.address}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {event.location?.city}, {event.location?.state}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {event.location?.country}
            </Typography>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Contact Information
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {event.contact?.email && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Email:</strong> {event.contact.email}
              </Typography>
            )}
            {event.contact?.phone && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Phone:</strong> {event.contact.phone}
              </Typography>
            )}
            {event.contact?.website && (
              <Typography variant="body2">
                <strong>Website:</strong>{' '}
                <a href={event.contact.website} target="_blank" rel="noopener noreferrer">
                  {event.contact.website}
                </a>
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Organizer Information */}
        {event.organizer?.name && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Organizer Information
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    Name
                  </Typography>
                  <Typography variant="body1">
                    {event.organizer.name}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1">
                    {event.organizer.email || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography variant="body1">
                    {event.organizer.phone || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    Website
                  </Typography>
                  <Typography variant="body1">
                    {event.organizer.website || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Tags
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                {event.tags.map((tag, index) => (
                  <Chip key={index} label={tag} variant="outlined" />
                ))}
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Images */}
        {event.images && event.images.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Images
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {event.images.map((img, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Box
                      component="img"
                      src={img.url}
                      alt={img.alt || `Event image ${index + 1}`}
                      sx={{
                        width: '100%',
                        height: 200,
                        objectFit: 'cover',
                        borderRadius: 1
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
