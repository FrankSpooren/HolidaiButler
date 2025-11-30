import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Grid, Card, CardMedia, CardContent, CardActions, Button, Chip, Rating } from '@mui/material';
import { Restaurant as RestaurantIcon, LocationOn } from '@mui/icons-material';

const RestaurantsPage = () => {
  const navigate = useNavigate();

  const restaurants = [
    { id: 1, name: 'La Perla - Calpe', cuisine: 'Mediterraans', location: 'Calpe', rating: 4.6, priceRange: '€€€', image: '/images/restaurant1.jpg' },
    { id: 2, name: 'El Cirer', cuisine: 'Spaans', location: 'Altea', rating: 4.8, priceRange: '€€', image: '/images/restaurant2.jpg' },
    { id: 3, name: 'Casa Pepe', cuisine: 'Tapas', location: 'Benidorm', rating: 4.5, priceRange: '€€', image: '/images/restaurant3.jpg' },
    { id: 4, name: 'Marisquería El Puerto', cuisine: 'Zeevruchten', location: 'Calpe', rating: 4.7, priceRange: '€€€€', image: '/images/restaurant4.jpg' },
    { id: 5, name: 'Pizzería Italiana', cuisine: 'Italiaans', location: 'Moraira', rating: 4.4, priceRange: '€€', image: '/images/restaurant5.jpg' },
    { id: 6, name: 'El Mirador', cuisine: 'Mediterraans', location: 'Guadalest', rating: 4.9, priceRange: '€€€', image: '/images/restaurant6.jpg' },
  ];

  return (
    <Box sx={{ py: 4, bgcolor: 'grey.50', minHeight: '80vh' }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <RestaurantIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          <Box>
            <Typography variant="h3" fontWeight={700}>
              Restaurants
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Reserveer een tafel bij de beste restaurants
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {restaurants.map((restaurant) => (
            <Grid item xs={12} sm={6} md={4} key={restaurant.id}>
              <Card sx={{ cursor: 'pointer', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }, transition: 'all 0.3s' }}>
                <CardMedia component="img" height="180" image={restaurant.image} alt={restaurant.name} />
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Chip label={restaurant.cuisine} size="small" />
                    <Typography variant="body2" color="text.secondary">{restaurant.priceRange}</Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={600} noWrap>
                    {restaurant.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">{restaurant.location}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Rating value={restaurant.rating} readOnly size="small" precision={0.1} />
                    <Typography variant="body2">({restaurant.rating})</Typography>
                  </Box>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button variant="contained" fullWidth onClick={() => navigate(`/restaurants/${restaurant.id}`)}>
                    Reserveren
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

export default RestaurantsPage;
