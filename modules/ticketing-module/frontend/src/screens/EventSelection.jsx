import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Container,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Button,
  TextField,
  Box,
  CircularProgress,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  EventAvailable as EventIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import ticketingService from '../services/ticketingService';
import useBookingStore from '../utils/bookingStore';

function EventSelection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { setCurrentEvent, resetBooking } = useBookingStore();

  const { data: events, isLoading, error } = useQuery(
    ['events', { status: 'active' }],
    () => ticketingService.getEvents({ status: 'active' })
  );

  const handleSelectEvent = (event) => {
    resetBooking();
    setCurrentEvent(event);
    navigate(`/events/${event.id}/tickets`);
  };

  const filteredEvents = events?.data?.filter((event) =>
    event.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography color="error" align="center">
          {t('common.error')}: {error.message}
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          {t('events.title')}
        </Typography>
        <TextField
          fullWidth
          placeholder={t('events.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 600 }}
        />
      </Box>

      {filteredEvents && filteredEvents.length === 0 ? (
        <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>
          {t('events.noEvents')}
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {filteredEvents?.map((event) => (
            <Grid item xs={12} sm={6} md={4} key={event.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                {event.imageUrl && (
                  <CardMedia
                    component="img"
                    height="200"
                    image={event.imageUrl}
                    alt={event.name}
                  />
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h5" component="h2">
                    {event.name}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <EventIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {format(new Date(event.startDate), 'dd MMMM yyyy, HH:mm', {
                        locale: nl,
                      })}
                    </Typography>
                  </Box>

                  {event.location && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <LocationIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {event.location}
                      </Typography>
                    </Box>
                  )}

                  <Typography variant="body2" sx={{ mt: 2 }}>
                    {event.description?.substring(0, 120)}
                    {event.description?.length > 120 && '...'}
                  </Typography>

                  <Box sx={{ mt: 2 }}>
                    <Chip
                      label={`${event.availableTickets || 0} ${t('events.availableTickets')}`}
                      color={event.availableTickets > 50 ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleSelectEvent(event)}
                    disabled={!event.availableTickets || event.availableTickets === 0}
                  >
                    {event.availableTickets > 0 ? 'Tickets kopen' : t('tickets.soldOut')}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}

export default EventSelection;
