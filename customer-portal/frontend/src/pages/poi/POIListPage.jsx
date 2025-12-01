import React, { useState, useEffect, useCallback } from 'react';
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
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Fab,
  Badge,
  Checkbox,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  LocationOn as LocationIcon,
  Star as StarIcon,
  Verified as VerifiedIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  ViewModule as GridIcon,
  ViewList as ListIcon,
  Map as MapIcon,
  Compare as CompareIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  MapView,
  ListView,
  EnhancedFilterBar,
  SearchAutocomplete,
  POIComparisonModal,
  TrustBadges,
} from '../../components/poi';
import { useFilterState } from '../../hooks/useFilterState';
import { filterByDistance, sortByDistance } from '../../utils/distance';

const POIListPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'rating');
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'grid');

  // Sprint 2: Enhanced filter state
  const { filters, setFilter, clearFilters, activeFilterCount, applyFilters } = useFilterState({
    categories: searchParams.get('category') ? [searchParams.get('category')] : [],
  });

  // Sprint 2: Comparison feature
  const [compareItems, setCompareItems] = useState([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const MAX_COMPARE_ITEMS = 4;

  // Sprint 2: User location for distance filtering
  const [userLocation, setUserLocation] = useState(null);

  const sortOptions = [
    { value: 'rating', label: 'Hoogste beoordeling' },
    { value: 'popularity', label: 'Meest populair' },
    { value: 'price_low', label: 'Prijs: laag naar hoog' },
    { value: 'price_high', label: 'Prijs: hoog naar laag' },
    { value: 'distance', label: 'Dichtbij' },
    { value: 'newest', label: 'Nieuwste' },
  ];

  // Get user location for distance features
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          // Use Calpe center as default
          setUserLocation({ latitude: 38.6439, longitude: 0.0410 });
        }
      );
    }
  }, []);

  // Fetch POIs from API with enhanced filters
  const { data, isLoading, error } = useQuery({
    queryKey: ['pois', { q: searchQuery, filters, sortBy, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (filters.categories.length > 0) {
        filters.categories.forEach(cat => params.append('category', cat));
      }
      if (filters.priceFilter) params.append('price', filters.priceFilter);
      if (filters.minRating > 0) params.append('minRating', filters.minRating);
      if (filters.accessibility) params.append('accessibility', filters.accessibility);
      params.append('sort', sortBy);
      params.append('page', page);
      params.append('limit', 12);

      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/v1/pois?${params}`
        );
        let pois = response.data.pois || response.data;

        // Apply distance filtering if enabled
        if (filters.distance && filters.distance < 100 && userLocation) {
          pois = filterByDistance(pois, userLocation, filters.distance);
        }

        // Sort by distance if selected
        if (sortBy === 'distance' && userLocation) {
          pois = sortByDistance(pois, userLocation);
        }

        return {
          ...response.data,
          pois,
        };
      } catch (err) {
        // Fallback mock data for demo
        let pois = mockPOIs;

        // Apply distance filtering to mock data
        if (filters.distance && filters.distance < 100 && userLocation) {
          pois = filterByDistance(pois, userLocation, filters.distance);
        }

        return {
          pois,
          total: pois.length,
          page: 1,
          totalPages: Math.ceil(pois.length / 12),
        };
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Update URL params including filters
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (filters.categories.length > 0) params.set('category', filters.categories.join(','));
    if (sortBy !== 'rating') params.set('sort', sortBy);
    if (page > 1) params.set('page', page);
    if (viewMode !== 'grid') params.set('view', viewMode);
    if (activeFilterCount > 0) params.set('filters', activeFilterCount);
    setSearchParams(params);
  }, [searchQuery, filters, sortBy, page, viewMode, activeFilterCount]);

  // Toggle item in comparison
  const toggleCompareItem = useCallback((poi) => {
    setCompareItems(prev => {
      const isSelected = prev.some(item => item.id === poi.id);
      if (isSelected) {
        return prev.filter(item => item.id !== poi.id);
      }
      if (prev.length >= MAX_COMPARE_ITEMS) {
        return prev; // Max items reached
      }
      return [...prev, poi];
    });
  }, []);

  // Handle search from autocomplete
  const handleSearchSelect = useCallback((option) => {
    if (typeof option === 'string') {
      setSearchQuery(option);
    } else if (option?.id) {
      // Navigate to POI detail if selected from suggestions
      navigate(`/experiences/${option.id}`);
    } else if (option?.label) {
      setSearchQuery(option.label);
    }
    setPage(1);
  }, [navigate]);

  // Handle view mode change
  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
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

        {/* Search with Autocomplete */}
        <Box sx={{ mb: 3 }}>
          <SearchAutocomplete
            value={searchQuery}
            onChange={setSearchQuery}
            onSelect={handleSearchSelect}
            fullWidth
          />
        </Box>

        {/* Enhanced Filter Bar */}
        <EnhancedFilterBar
          filters={filters}
          onFilterChange={setFilter}
          onClearFilters={clearFilters}
          activeFilterCount={activeFilterCount}
          sortBy={sortBy}
          onSortChange={setSortBy}
          sortOptions={sortOptions}
        />

        {/* Results count & View Toggle */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            mt: 3,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {data?.total || 0} {t('poi.experiencesFound', 'ervaringen gevonden')}
            </Typography>
            {compareItems.length > 0 && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<CompareIcon />}
                onClick={() => setIsCompareModalOpen(true)}
              >
                {t('poi.compareSelected', 'Vergelijk')} ({compareItems.length})
              </Button>
            )}
          </Box>

          {/* View Mode Toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            aria-label={t('poi.viewMode', 'Weergave modus')}
            size="small"
          >
            <ToggleButton value="grid" aria-label={t('poi.gridView', 'Grid weergave')}>
              <Tooltip title={t('poi.gridView', 'Grid weergave')}>
                <GridIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="list" aria-label={t('poi.listView', 'Lijst weergave')}>
              <Tooltip title={t('poi.listView', 'Lijst weergave')}>
                <ListIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="map" aria-label={t('poi.mapView', 'Kaart weergave')}>
              <Tooltip title={t('poi.mapView', 'Kaart weergave')}>
                <MapIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* POI Content - Grid/List/Map Views */}
        {isLoading ? (
          // Loading skeleton
          <Grid container spacing={3}>
            {Array.from(new Array(12)).map((_, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Card>
                  <Skeleton variant="rectangular" height={200} />
                  <CardContent>
                    <Skeleton />
                    <Skeleton width="60%" />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : viewMode === 'map' ? (
          // Map View
          <MapView
            pois={data?.pois?.map(poi => ({
              ...poi,
              // Add coordinates for Calpe area (mock for demo)
              latitude: poi.latitude || 38.6429 + (Math.random() - 0.5) * 0.05,
              longitude: poi.longitude || 0.0462 + (Math.random() - 0.5) * 0.05,
            })) || []}
            height="600px"
          />
        ) : viewMode === 'list' ? (
          // List View
          <ListView
            pois={data?.pois || []}
            onItemClick={(poi) => navigate(`/experiences/${poi.id}`)}
          />
        ) : (
          // Grid View (default)
          <Grid container spacing={3}>
            {data?.pois?.map((poi) => (
              <Grid item xs={12} sm={6} md={4} key={poi.id}>
                <POICard
                  poi={poi}
                  onClick={() => navigate(`/experiences/${poi.id}`)}
                  isCompareSelected={compareItems.some(item => item.id === poi.id)}
                  onCompareToggle={() => toggleCompareItem(poi)}
                  showCompare={compareItems.length < MAX_COMPARE_ITEMS || compareItems.some(item => item.id === poi.id)}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Comparison Modal */}
        <POIComparisonModal
          pois={compareItems}
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
        />

        {/* Floating Compare Button (when items selected) */}
        {compareItems.length >= 2 && (
          <Fab
            color="primary"
            variant="extended"
            onClick={() => setIsCompareModalOpen(true)}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1000,
            }}
            aria-label={t('poi.compareItems', 'Vergelijk geselecteerde items')}
          >
            <Badge badgeContent={compareItems.length} color="secondary" sx={{ mr: 1 }}>
              <CompareIcon />
            </Badge>
            {t('poi.compare', 'Vergelijk')}
          </Fab>
        )}

        {/* Pagination - hidden in map view */}
        {viewMode !== 'map' && data?.totalPages > 1 && (
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

// POI Card Component with Sprint 2 enhancements
const POICard = ({ poi, onClick, isCompareSelected, onCompareToggle, showCompare }) => {
  const [favorite, setFavorite] = useState(false);
  const { t } = useTranslation();

  // Determine which trust badges to show
  const trustBadges = [];
  if (poi.verified) trustBadges.push('verified');
  if (poi.freeCancellation) trustBadges.push('freeCancellation');
  if (poi.instantConfirmation) trustBadges.push('instantConfirmation');
  if (poi.bestPrice) trustBadges.push('bestPrice');

  return (
    <Card
      sx={{
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        border: isCompareSelected ? '2px solid' : 'none',
        borderColor: isCompareSelected ? 'primary.main' : 'transparent',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
        },
      }}
    >
      <Box sx={{ position: 'relative' }} onClick={onClick}>
        <CardMedia
          component="img"
          height="200"
          image={poi.image || '/images/placeholder.jpg'}
          alt={poi.name}
        />
        {poi.verified && (
          <Chip
            icon={<VerifiedIcon />}
            label={t('poi.verified', 'Geverifieerd')}
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
        <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
          {showCompare && (
            <Tooltip title={isCompareSelected ? t('poi.removeCompare', 'Verwijder uit vergelijking') : t('poi.addCompare', 'Toevoegen aan vergelijking')}>
              <Checkbox
                checked={isCompareSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  onCompareToggle?.();
                }}
                onClick={(e) => e.stopPropagation()}
                icon={<CompareIcon />}
                checkedIcon={<CompareIcon />}
                sx={{
                  bgcolor: 'white',
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'grey.100' },
                  '&.Mui-checked': { color: 'primary.main' },
                }}
                inputProps={{ 'aria-label': t('poi.compareCheckbox', 'Vergelijk dit item') }}
              />
            </Tooltip>
          )}
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              setFavorite(!favorite);
            }}
            sx={{
              bgcolor: 'white',
              '&:hover': { bgcolor: 'grey.100' },
            }}
            aria-label={favorite ? t('poi.removeFavorite', 'Verwijder uit favorieten') : t('poi.addFavorite', 'Toevoegen aan favorieten')}
          >
            {favorite ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
          </IconButton>
        </Box>
      </Box>
      <CardContent sx={{ flexGrow: 1 }} onClick={onClick}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Chip label={poi.category} size="small" />
        </Box>
        <Typography variant="h6" fontWeight={600} noWrap>
          {poi.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <LocationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {poi.location}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <Rating value={poi.rating} readOnly size="small" precision={0.1} />
          <Typography variant="body2" color="text.secondary">
            ({poi.reviewCount})
          </Typography>
        </Box>

        {/* Trust Badges */}
        {trustBadges.length > 0 && (
          <TrustBadges badges={trustBadges} variant="compact" />
        )}
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Box>
          <Typography variant="h6" color="primary" fontWeight={700}>
            {'\u20AC'}{poi.price}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('poi.perPerson', 'per persoon')}
          </Typography>
        </Box>
        <Button variant="contained" size="small" onClick={onClick}>
          {t('poi.view', 'Bekijk')}
        </Button>
      </CardActions>
    </Card>
  );
};

// Mock data for demo with Sprint 2 fields
const mockPOIs = [
  { id: 1, name: 'Terra Natura Benidorm', category: 'Familie', location: 'Benidorm', price: 25, rating: 4.7, reviewCount: 1243, verified: true, freeCancellation: true, instantConfirmation: true, latitude: 38.5653, longitude: -0.1148, image: '/images/terra-natura.jpg' },
  { id: 2, name: 'Peñón de Ifach', category: 'Natuur', location: 'Calpe', price: 15, rating: 4.9, reviewCount: 892, verified: true, freeCancellation: true, bestPrice: true, latitude: 38.6363, longitude: 0.0732, image: '/images/penon.jpg' },
  { id: 3, name: 'Guadalest & Watervallen', category: 'Natuur', location: 'Guadalest', price: 38, rating: 4.8, reviewCount: 2156, verified: true, instantConfirmation: true, latitude: 38.6787, longitude: -0.1927, image: '/images/guadalest.jpg' },
  { id: 4, name: 'Aqualandia Waterpark', category: 'Familie', location: 'Benidorm', price: 32, rating: 4.5, reviewCount: 1891, verified: true, freeCancellation: true, bestPrice: true, latitude: 38.5518, longitude: -0.0905, image: '/images/aqualandia.jpg' },
  { id: 5, name: 'Altea Old Town Tour', category: 'Cultuur', location: 'Altea', price: 20, rating: 4.8, reviewCount: 445, verified: true, freeCancellation: true, instantConfirmation: true, latitude: 38.5988, longitude: -0.0502, image: '/images/altea.jpg' },
  { id: 6, name: 'Mundomar', category: 'Familie', location: 'Benidorm', price: 28, rating: 4.6, reviewCount: 987, verified: true, instantConfirmation: true, bestPrice: true, latitude: 38.5312, longitude: -0.1238, image: '/images/mundomar.jpg' },
];

export default POIListPage;
