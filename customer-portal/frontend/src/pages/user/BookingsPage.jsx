import React from 'react';
import { Box, Container, Typography, Card, CardContent, Chip, Button, Grid } from '@mui/material';
import { ConfirmationNumber, Restaurant, Event } from '@mui/icons-material';

const BookingsPage = () => {
  const bookings = [
    { id: 1, type: 'ticket', name: 'Terra Natura Benidorm', date: '2024-07-15', status: 'confirmed', price: 50 },
    { id: 2, type: 'restaurant', name: 'La Perla - Calpe', date: '2024-07-18', time: '20:00', status: 'confirmed', guests: 2 },
    { id: 3, type: 'event', name: 'Flamenco Show', date: '2024-07-20', status: 'pending', price: 35 },
  ];

  const getIcon = (type) => {
    switch (type) {
      case 'ticket': return <ConfirmationNumber />;
      case 'restaurant': return <Restaurant />;
      case 'event': return <Event />;
      default: return <ConfirmationNumber />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ py: 4, bgcolor: 'grey.50', minHeight: '80vh' }}>
      <Container maxWidth="lg">
        <Typography variant="h3" fontWeight={700} gutterBottom>
          Mijn Boekingen
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Bekijk en beheer al je boekingen op één plek.
        </Typography>

        <Grid container spacing={3}>
          {bookings.map((booking) => (
            <Grid item xs={12} md={6} key={booking.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ p: 1.5, bgcolor: 'primary.light', borderRadius: 2, color: 'white' }}>
                        {getIcon(booking.type)}
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight={600}>{booking.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{booking.date} {booking.time && `om ${booking.time}`}</Typography>
                      </Box>
                    </Box>
                    <Chip label={booking.status === 'confirmed' ? 'Bevestigd' : 'In behandeling'} color={getStatusColor(booking.status)} size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {booking.price && <Typography variant="h6" color="primary">€{booking.price}</Typography>}
                    {booking.guests && <Typography variant="body2" color="text.secondary">{booking.guests} personen</Typography>}
                    <Button variant="outlined" size="small">Bekijk details</Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default BookingsPage;
