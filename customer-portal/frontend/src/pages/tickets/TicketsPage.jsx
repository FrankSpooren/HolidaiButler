import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Grid, Card, CardMedia, CardContent, CardActions, Button, Chip } from '@mui/material';
import { ConfirmationNumber as TicketIcon } from '@mui/icons-material';

const TicketsPage = () => {
  const navigate = useNavigate();

  const tickets = [
    { id: 1, name: 'Terra Natura Benidorm - Dagticket', price: 25, category: 'Dierentuin', image: '/images/terra-natura.jpg' },
    { id: 2, name: 'Aqualandia Waterpark', price: 32, category: 'Waterpark', image: '/images/aqualandia.jpg' },
    { id: 3, name: 'Mundomar', price: 28, category: 'Zeeleven', image: '/images/mundomar.jpg' },
    { id: 4, name: 'Cave of Canelobre', price: 8, category: 'Grot', image: '/images/caves.jpg' },
    { id: 5, name: 'Castell de Guadalest', price: 4, category: 'Museum', image: '/images/guadalest.jpg' },
    { id: 6, name: 'Safari Aitana', price: 20, category: 'Safari', image: '/images/safari.jpg' },
  ];

  return (
    <Box sx={{ py: 4, bgcolor: 'grey.50', minHeight: '80vh' }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <TicketIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          <Box>
            <Typography variant="h3" fontWeight={700}>
              Tickets
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Koop tickets voor attracties en bezienswaardigheden
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {tickets.map((ticket) => (
            <Grid item xs={12} sm={6} md={4} key={ticket.id}>
              <Card sx={{ cursor: 'pointer', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }, transition: 'all 0.3s' }}>
                <CardMedia component="img" height="180" image={ticket.image} alt={ticket.name} />
                <CardContent>
                  <Chip label={ticket.category} size="small" sx={{ mb: 1 }} />
                  <Typography variant="h6" fontWeight={600} noWrap>
                    {ticket.name}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Typography variant="h6" color="primary" fontWeight={700}>
                    €{ticket.price}
                  </Typography>
                  <Button variant="contained" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                    Koop ticket
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

export default TicketsPage;
