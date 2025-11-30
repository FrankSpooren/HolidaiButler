import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
  Pagination,
  IconButton,
  Rating,
  alpha,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  LocationOn as LocationIcon,
  Star as StarIcon,
  Verified as VerifiedIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const POIListPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'rating');
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);

  const categories = [
    { value: '', label: 'Alle categorieën' },
    { value: 'nature', label: 'Natuur & Outdoor' },
    { value: 'culture', label: 'Cultuur & Musea' },
    { value: 'family', label: 'Familie & Kinderen' },
    { value: 'food', label: 'Eten & Drinken' },
    { value: 'activities', label: 'Activiteiten' },
    { value: 'beach', label: 'Strand & Water' },
  ];

  const sortOptions = [
    { value: 'rating', label: 'Hoogste beoordeling' },
    { value: 'popularity', label: 'Meest populair' },
    { value: 'price_low', label: 'Prijs: laag naar hoog' },
    { value: 'price_high', label: 'Prijs: hoog naar laag' },
    { value: 'newest', label: 'Nieuwste' },
  ];

  // Fetch POIs from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['pois', { q: searchQuery, category, sortBy, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (category) params.append('category', category);
      params.append('sort', sortBy);
      params.append('page', page);
      params.append('limit', 12);

      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/v1/pois?${params}`
        );
        return response.data;
      } catch (err) {
        // Fallback mock data for demo
        return {
          pois: mockPOIs,
          total: 48,
          page: 1,
          totalPages: 4,
        };
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (category) params.set('category', category);
    if (sortBy !== 'rating') params.set('sort', sortBy);
    if (page > 1) params.set('page', page);
    setSearchParams(params);
  }, [searchQuery, category, sortBy, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <Box sx={{ py: 4, bgcolor: 'grey.50', minHeight: '80vh' }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" fontWeight={700} gutterBottom>
            Ontdek Costa Blanca
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Vind de beste ervaringen, attracties en activiteiten
          </Typography>
        </Box>

        {/* Filters */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mb: 4,
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          <TextField
            component="form"
            onSubmit={handleSearch}
            placeholder="Zoek ervaringen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1, bgcolor: 'white' }}
          />
          <FormControl sx={{ minWidth: 200, bgcolor: 'white' }}>
            <InputLabel>Categorie</InputLabel>
            <Select
              value={category}
              label="Categorie"
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              {categories.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 180, bgcolor: 'white' }}>
            <InputLabel>Sorteren</InputLabel>
            <Select
              value={sortBy}
              label="Sorteren"
              onChange={(e) => setSortBy(e.target.value)}
            >
              {sortOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Results count */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {data?.total || 0} ervaringen gevonden
        </Typography>

        {/* POI Grid */}
        <Grid container spacing={3}>
          {isLoading
            ? Array.from(new Array(12)).map((_, i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <Card>
                    <Skeleton variant="rectangular" height={200} />
                    <CardContent>
                      <Skeleton />
                      <Skeleton width="60%" />
                    </CardContent>
                  </Card>
                </Grid>
              ))
            : data?.pois?.map((poi) => (
                <Grid item xs={12} sm={6} md={4} key={poi.id}>
                  <POICard poi={poi} onClick={() => navigate(`/experiences/${poi.id}`)} />
                </Grid>
              ))}
        </Grid>

        {/* Pagination */}
        {data?.totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={data.totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
              size="large"
            />
          </Box>
        )}
      </Container>
    </Box>
  );
};

// POI Card Component
const POICard = ({ poi, onClick }) => {
  const [favorite, setFavorite] = useState(false);

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
        },
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <CardMedia
          component="img"
          height="200"
          image={poi.image || '/images/placeholder.jpg'}
          alt={poi.name}
        />
        {poi.verified && (
          <Chip
            icon={<VerifiedIcon />}
            label="Geverifieerd"
            size="small"
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              bgcolor: 'success.main',
              color: 'white',
            }}
          />
        )}
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            setFavorite(!favorite);
          }}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'white',
            '&:hover': { bgcolor: 'white' },
          }}
        >
          {favorite ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
        </IconButton>
      </Box>
      <CardContent sx={{ flexGrow: 1 }}>
        <Chip label={poi.category} size="small" sx={{ mb: 1 }} />
        <Typography variant="h6" fontWeight={600} noWrap>
          {poi.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <LocationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {poi.location}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Rating value={poi.rating} readOnly size="small" precision={0.1} />
          <Typography variant="body2" color="text.secondary">
            ({poi.reviewCount})
          </Typography>
        </Box>
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Box>
          <Typography variant="h6" color="primary" fontWeight={700}>
            €{poi.price}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            per persoon
          </Typography>
        </Box>
        <Button variant="contained" size="small">
          Bekijk
        </Button>
      </CardActions>
    </Card>
  );
};

// Mock data for demo
const mockPOIs = [
  { id: 1, name: 'Terra Natura Benidorm', category: 'Familie', location: 'Benidorm', price: 25, rating: 4.7, reviewCount: 1243, verified: true, image: '/images/terra-natura.jpg' },
  { id: 2, name: 'Peñón de Ifach', category: 'Natuur', location: 'Calpe', price: 15, rating: 4.9, reviewCount: 892, verified: true, image: '/images/penon.jpg' },
  { id: 3, name: 'Guadalest & Watervallen', category: 'Natuur', location: 'Guadalest', price: 38, rating: 4.8, reviewCount: 2156, verified: true, image: '/images/guadalest.jpg' },
  { id: 4, name: 'Aqualandia Waterpark', category: 'Familie', location: 'Benidorm', price: 32, rating: 4.5, reviewCount: 1891, verified: true, image: '/images/aqualandia.jpg' },
  { id: 5, name: 'Altea Old Town Tour', category: 'Cultuur', location: 'Altea', price: 20, rating: 4.8, reviewCount: 445, verified: true, image: '/images/altea.jpg' },
  { id: 6, name: 'Mundomar', category: 'Familie', location: 'Benidorm', price: 28, rating: 4.6, reviewCount: 987, verified: true, image: '/images/mundomar.jpg' },
];

export default POIListPage;
