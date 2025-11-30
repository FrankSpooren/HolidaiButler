import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, Grid, Chip, Rating, Skeleton } from '@mui/material';
import { useQuery } from '@tanstack/react-query';

const POIDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: poi, isLoading } = useQuery({
    queryKey: ['poi', id],
    queryFn: async () => {
      // Mock data for demo
      return {
        id,
        name: 'Terra Natura Benidorm',
        category: 'Familie & Kinderen',
        location: 'Benidorm',
        price: 25,
        rating: 4.7,
        reviewCount: 1243,
        description: 'Terra Natura Benidorm is een uniek dierenpark waar je meer dan 1.500 dieren uit de hele wereld kunt ontdekken in hun natuurlijke habitats.',
        features: ['Dierentuin', 'Waterpark', 'Shows', 'Restaurant'],
        images: ['/images/terra-natura.jpg'],
      };
    },
  });

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" height={400} sx={{ mb: 4 }} />
        <Skeleton variant="text" width="60%" height={60} />
        <Skeleton variant="text" width="40%" />
      </Container>
    );
  }

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Box
              component="img"
              src={poi?.images?.[0] || '/images/placeholder.jpg'}
              alt={poi?.name}
              sx={{ width: '100%', height: 400, objectFit: 'cover', borderRadius: 2, mb: 3 }}
            />
            <Chip label={poi?.category} sx={{ mb: 2 }} />
            <Typography variant="h3" fontWeight={700} gutterBottom>
              {poi?.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Rating value={poi?.rating} readOnly precision={0.1} />
              <Typography>({poi?.reviewCount} reviews)</Typography>
              <Typography color="text.secondary">{poi?.location}</Typography>
            </Box>
            <Typography variant="body1" color="text.secondary" paragraph>
              {poi?.description}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ bgcolor: 'grey.100', p: 3, borderRadius: 2, position: 'sticky', top: 100 }}>
              <Typography variant="h4" fontWeight={700} color="primary" gutterBottom>
                €{poi?.price}
                <Typography component="span" variant="body2" color="text.secondary">
                  {' '}per persoon
                </Typography>
              </Typography>
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={() => navigate(`/checkout?type=poi&id=${id}`)}
                sx={{ mt: 2 }}
              >
                Boek nu
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default POIDetailPage;
