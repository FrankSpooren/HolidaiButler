import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Grid, Card, CardMedia, CardContent, CardActions, Button, Chip } from '@mui/material';
import { Event as EventIcon, LocationOn, CalendarMonth } from '@mui/icons-material';

const AgendaPage = () => {
  const navigate = useNavigate();

  const events = [
    { id: 1, name: 'Fiestas de Calpe', date: '2024-08-15', location: 'Calpe', category: 'Festival', image: '/images/fiesta.jpg' },
    { id: 2, name: 'Wekelijkse Markt Altea', date: '2024-07-02', location: 'Altea', category: 'Markt', image: '/images/market.jpg' },
    { id: 3, name: 'Live Jazz Night', date: '2024-07-05', location: 'Benidorm', category: 'Muziek', image: '/images/jazz.jpg' },
    { id: 4, name: 'Wine & Tapas Tour', date: '2024-07-10', location: 'Jávea', category: 'Food Tour', image: '/images/wine.jpg' },
    { id: 5, name: 'Sunrise Yoga Beach', date: '2024-07-08', location: 'Calpe', category: 'Wellness', image: '/images/yoga.jpg' },
    { id: 6, name: 'Flamenco Show', date: '2024-07-12', location: 'Benidorm', category: 'Show', image: '/images/flamenco.jpg' },
  ];

  return (
    <Box sx={{ py: 4, bgcolor: 'grey.50', minHeight: '80vh' }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <EventIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          <Box>
            <Typography variant="h3" fontWeight={700}>
              Agenda
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Ontdek evenementen en activiteiten in de regio
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {events.map((event) => (
            <Grid item xs={12} sm={6} md={4} key={event.id}>
              <Card sx={{ cursor: 'pointer', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }, transition: 'all 0.3s' }}>
                <CardMedia component="img" height="180" image={event.image} alt={event.name} />
                <CardContent>
                  <Chip label={event.category} size="small" sx={{ mb: 1 }} />
                  <Typography variant="h6" fontWeight={600} noWrap>
                    {event.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <CalendarMonth sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">{event.date}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">{event.location}</Typography>
                  </Box>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button variant="contained" fullWidth onClick={() => navigate(`/agenda/${event.id}`)}>
                    Meer info
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default AgendaPage;
