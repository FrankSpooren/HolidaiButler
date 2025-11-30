import React from 'react';
import { Box, Container, Typography, Grid, Card, CardMedia, CardContent, CardActions, Button, IconButton } from '@mui/material';
import { Delete as DeleteIcon, LocationOn } from '@mui/icons-material';

const FavoritesPage = () => {
  const favorites = [
    { id: 1, name: 'Terra Natura Benidorm', location: 'Benidorm', price: 25, image: '/images/terra-natura.jpg' },
    { id: 2, name: 'Peñón de Ifach', location: 'Calpe', price: 15, image: '/images/penon.jpg' },
    { id: 3, name: 'La Perla Restaurant', location: 'Calpe', price: 45, image: '/images/restaurant1.jpg' },
  ];

  return (
    <Box sx={{ py: 4, bgcolor: 'grey.50', minHeight: '80vh' }}>
      <Container maxWidth="lg">
        <Typography variant="h3" fontWeight={700} gutterBottom>
          Mijn Favorieten
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Je opgeslagen ervaringen en locaties.
        </Typography>

        <Grid container spacing={3}>
          {favorites.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <Card>
                <CardMedia component="img" height="180" image={item.image} alt={item.name} />
                <CardContent>
                  <Typography variant="h6" fontWeight={600} noWrap>{item.name}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">{item.location}</Typography>
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Typography variant="h6" color="primary" fontWeight={700}>€{item.price}</Typography>
                  <Box>
                    <IconButton color="error"><DeleteIcon /></IconButton>
                    <Button variant="contained" size="small">Boek nu</Button>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default FavoritesPage;
