/**
 * Favorites Page
 * Displays user's saved POIs with localStorage persistence
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Alert,
  Skeleton,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  LocationOn,
  Favorite as FavoriteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFavorites } from '../../contexts/FavoritesContext';
import { poiService } from '../../services';

const FavoritesPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getFavoriteIds, removeFavorite, favoriteCount } = useFavorites();
  const [favoritePOIs, setFavoritePOIs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch POI details for all favorite IDs
  useEffect(() => {
    const fetchFavorites = async () => {
      setLoading(true);
      setError(null);

      const favoriteIds = getFavoriteIds();

      if (favoriteIds.length === 0) {
        setFavoritePOIs([]);
        setLoading(false);
        return;
      }

      try {
        // Try to fetch real POI data
        const pois = await Promise.all(
          favoriteIds.map(async (id) => {
            try {
              const poi = await poiService.getPOIById(id);
              return poi;
            } catch (err) {
              // Return mock data if API fails
              return getMockPOI(id);
            }
          })
        );
        setFavoritePOIs(pois.filter(Boolean));
      } catch (err) {
        console.error('Error fetching favorites:', err);
        // Use mock data as fallback
        setFavoritePOIs(favoriteIds.map(getMockPOI));
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [favoriteCount]); // Re-fetch when favorite count changes

  const handleRemove = (poiId) => {
    removeFavorite(poiId);
    setFavoritePOIs((prev) => prev.filter((poi) => poi.id !== poiId));
  };

  const handleViewDetails = (poiId) => {
    navigate(`/experiences/${poiId}`);
  };

  if (loading) {
    return (
      <Box sx={{ py: 4, bgcolor: 'grey.50', minHeight: '80vh' }}>
        <Container maxWidth="lg">
          <Typography variant="h3" fontWeight={700} gutterBottom>
            {t('favorites.title', 'Mijn Favorieten')}
          </Typography>
          <Grid container spacing={3}>
            {[1, 2, 3].map((i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Card>
                  <Skeleton variant="rectangular" height={180} />
                  <CardContent>
                    <Skeleton width="80%" height={28} />
                    <Skeleton width="60%" height={20} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 4, bgcolor: 'grey.50', minHeight: '80vh' }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <FavoriteIcon color="error" sx={{ fontSize: 40 }} />
          <Typography variant="h3" fontWeight={700}>
            {t('favorites.title', 'Mijn Favorieten')}
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {t('favorites.description', 'Je opgeslagen ervaringen en locaties.')}
          {favoriteCount > 0 && ` (${favoriteCount} ${t('favorites.items', 'items')})`}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {favoritePOIs.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              px: 2,
              bgcolor: 'white',
              borderRadius: 2,
              boxShadow: 1,
            }}
          >
            <FavoriteIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              {t('favorites.empty', 'Nog geen favorieten')}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {t('favorites.emptyDescription', 'Voeg ervaringen toe aan je favorieten door op het hartje te klikken.')}
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/experiences')}
            >
              {t('favorites.explore', 'Ontdek ervaringen')}
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {favoritePOIs.map((poi) => (
              <Grid item xs={12} sm={6} md={4} key={poi.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardMedia
                    component="img"
                    height="180"
                    image={poi.image || '/images/placeholder.jpg'}
                    alt={poi.name}
                    onClick={() => handleViewDetails(poi.id)}
                  />
                  <CardContent
                    sx={{ flexGrow: 1 }}
                    onClick={() => handleViewDetails(poi.id)}
                  >
                    <Typography variant="h6" fontWeight={600} noWrap>
                      {poi.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {poi.location}
                      </Typography>
                    </Box>
                    {poi.category && (
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'inline-block',
                          mt: 1,
                          px: 1,
                          py: 0.5,
                          bgcolor: 'primary.light',
                          color: 'white',
                          borderRadius: 1,
                        }}
                      >
                        {poi.category}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Typography variant="h6" color="primary" fontWeight={700}>
                      {poi.price ? `€${poi.price}` : t('favorites.free', 'Gratis')}
                    </Typography>
                    <Box>
                      <IconButton
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(poi.id);
                        }}
                        aria-label={t('favorites.remove', 'Verwijderen uit favorieten')}
                      >
                        <DeleteIcon />
                      </IconButton>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleViewDetails(poi.id)}
                      >
                        {t('favorites.view', 'Bekijk')}
                      </Button>
                    </Box>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
};

// Mock POI data for fallback when API is unavailable
function getMockPOI(id) {
  const mockPOIs = {
    1: {
      id: 1,
      name: 'Terra Natura Benidorm',
      location: 'Benidorm',
      category: 'Familie',
      price: 25,
      image: '/images/terra-natura.jpg',
    },
    2: {
      id: 2,
      name: 'Peñón de Ifach',
      location: 'Calpe',
      category: 'Natuur',
      price: 15,
      image: '/images/penon.jpg',
    },
    3: {
      id: 3,
      name: 'Guadalest & Watervallen',
      location: 'Guadalest',
      category: 'Natuur',
      price: 38,
      image: '/images/guadalest.jpg',
    },
    4: {
      id: 4,
      name: 'Aqualandia Waterpark',
      location: 'Benidorm',
      category: 'Familie',
      price: 32,
      image: '/images/aqualandia.jpg',
    },
    5: {
      id: 5,
      name: 'Altea Old Town Tour',
      location: 'Altea',
      category: 'Cultuur',
      price: 20,
      image: '/images/altea.jpg',
    },
    6: {
      id: 6,
      name: 'Mundomar',
      location: 'Benidorm',
      category: 'Familie',
      price: 28,
      image: '/images/mundomar.jpg',
    },
  };

  return mockPOIs[id] || {
    id,
    name: `Experience #${id}`,
    location: 'Costa Blanca',
    category: 'Experience',
    price: 0,
    image: '/images/placeholder.jpg',
  };
}

export default FavoritesPage;
