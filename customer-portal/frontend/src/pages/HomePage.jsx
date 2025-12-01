import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Chip,
  Avatar,
  IconButton,
  useTheme,
  useMediaQuery,
  alpha,
  Skeleton,
} from '@mui/material';
import {
  Search as SearchIcon,
  LocationOn as LocationIcon,
  Star as StarIcon,
  TrendingUp as TrendingIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  ArrowForward as ArrowForwardIcon,
  LocalActivity as ActivityIcon,
  Restaurant as RestaurantIcon,
  BeachAccess as BeachIcon,
  Museum as MuseumIcon,
  FamilyRestroom as FamilyIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

/**
 * HomePage - Customer Portal Landing Page
 *
 * Enterprise-level landing page designed to impress investors with:
 * - Beautiful hero section with search
 * - Featured experiences carousel
 * - Category browsing
 * - Social proof and trust signals
 * - Mobile-first responsive design
 * - Smooth animations
 *
 * Optimized for investor demo scenarios
 */
const HomePage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredPOIs, setFeaturedPOIs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Animation hook for sections
  const [heroRef, heroInView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [categoriesRef, categoriesInView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [featuredRef, featuredInView] = useInView({ triggerOnce: true, threshold: 0.1 });

  // Categories for Costa Blanca
  const categories = [
    {
      id: 'nature',
      name: 'Natuur & Outdoor',
      icon: <BeachIcon sx={{ fontSize: 40 }} />,
      color: '#4CAF50',
      count: 24
    },
    {
      id: 'culture',
      name: 'Cultuur & Musea',
      icon: <MuseumIcon sx={{ fontSize: 40 }} />,
      color: '#FF9800',
      count: 15
    },
    {
      id: 'family',
      name: 'Familie & Kinderen',
      icon: <FamilyIcon sx={{ fontSize: 40 }} />,
      color: '#E91E63',
      count: 18
    },
    {
      id: 'food',
      name: 'Eten & Drinken',
      icon: <RestaurantIcon sx={{ fontSize: 40 }} />,
      color: '#FF5722',
      count: 32
    },
    {
      id: 'activities',
      name: 'Activiteiten',
      icon: <ActivityIcon sx={{ fontSize: 40 }} />,
      color: '#2196F3',
      count: 27
    },
  ];

  // Mock featured POIs (in production, fetch from API)
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setFeaturedPOIs([
        {
          id: 1,
          name: 'Terra Natura Benidorm',
          category: 'Familie & Kinderen',
          location: 'Benidorm',
          price: 25,
          originalPrice: 32,
          rating: 4.7,
          reviewCount: 1243,
          image: '/images/terra-natura.jpg',
          verified: true,
          popular: true,
          bookingsToday: 127,
          tags: ['Dierentuin', 'Kinderen', 'Familie'],
          discount: 22,
        },
        {
          id: 2,
          name: 'Peñón de Ifach Wandeling',
          category: 'Natuur & Outdoor',
          location: 'Calpe',
          price: 15,
          rating: 4.9,
          reviewCount: 892,
          image: '/images/penon-ifach.jpg',
          verified: true,
          bookingsToday: 84,
          tags: ['Wandelen', 'Natuur', 'Uitzicht'],
        },
        {
          id: 3,
          name: 'Guadalest & Algar Watervallen',
          category: 'Natuur & Outdoor',
          location: 'Guadalest',
          price: 38,
          rating: 4.8,
          reviewCount: 2156,
          image: '/images/guadalest.jpg',
          verified: true,
          popular: true,
          bookingsToday: 156,
          tags: ['Dagtocht', 'Natuur', 'Fotografie'],
        },
        {
          id: 4,
          name: 'Restaurant La Perla - Calpe',
          category: 'Eten & Drinken',
          location: 'Calpe',
          price: 45,
          rating: 4.6,
          reviewCount: 567,
          image: '/images/restaurant-perla.jpg',
          verified: true,
          bookingsToday: 43,
          tags: ['Mediterraans', 'Zeezicht', 'Premium'],
        },
        {
          id: 5,
          name: 'Aqualandia Waterpark',
          category: 'Familie & Kinderen',
          location: 'Benidorm',
          price: 32,
          originalPrice: 40,
          rating: 4.5,
          reviewCount: 1891,
          image: '/images/aqualandia.jpg',
          verified: true,
          bookingsToday: 203,
          tags: ['Waterpark', 'Familie', 'Zomer'],
          discount: 20,
        },
        {
          id: 6,
          name: 'Altea Old Town Tour',
          category: 'Cultuur & Musea',
          location: 'Altea',
          price: 20,
          rating: 4.8,
          reviewCount: 445,
          image: '/images/altea.jpg',
          verified: true,
          bookingsToday: 67,
          tags: ['Cultuur', 'Wandeltocht', 'Geschiedenis'],
        },
      ]);
      setLoading(false);
    }, 800);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    // Navigate to search results
    console.log('Searching for:', searchQuery);
  };

  const handleCategoryClick = (categoryId) => {
    // Navigate to category page
    console.log('Category clicked:', categoryId);
  };

  const handleBookNow = (poiId) => {
    // Navigate to booking page
    console.log('Book POI:', poiId);
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Hero Section - Calpe Hero Image */}
      <Box
        ref={heroRef}
        component={motion.div}
        initial={{ opacity: 0 }}
        animate={heroInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8 }}
        sx={{
          position: 'relative',
          minHeight: isMobile ? '70vh' : '85vh',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url(/assets/images/hero-calpe.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 30%',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%)',
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={heroInView ? { y: 0, opacity: 1 } : {}}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            {/* HolidaiButler Logo */}
            <Box
              component="img"
              src="/assets/images/HolidaiButler_Icon_Web.png"
              alt="HolidaiButler"
              sx={{
                height: isMobile ? 60 : 80,
                width: 'auto',
                mb: 2,
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
              }}
            />
            <Typography
              variant={isMobile ? 'h3' : 'h1'}
              sx={{
                color: 'white',
                fontWeight: 800,
                mb: 1,
                textShadow: '0 2px 20px rgba(0,0,0,0.5)',
              }}
            >
              HolidaiButler
            </Typography>
            <Typography
              variant={isMobile ? 'h5' : 'h4'}
              sx={{
                color: 'rgba(255,255,255,0.95)',
                fontWeight: 600,
                mb: 2,
                textShadow: '0 2px 10px rgba(0,0,0,0.4)',
              }}
            >
              Jouw Persoonlijke Butler aan de Costa Blanca
            </Typography>
            <Typography
              variant={isMobile ? 'h6' : 'h5'}
              sx={{
                color: 'rgba(255,255,255,0.95)',
                mb: 4,
                maxWidth: 600,
                textShadow: '0 2px 10px rgba(0,0,0,0.3)',
              }}
            >
              Boek unieke ervaringen, restaurants en activiteiten in Spanje's mooiste kuststreek
            </Typography>

            {/* Search Bar */}
            <Box
              component="form"
              onSubmit={handleSearch}
              sx={{
                display: 'flex',
                gap: 1,
                maxWidth: 700,
                flexDirection: isMobile ? 'column' : 'row',
              }}
            >
              <TextField
                fullWidth
                placeholder="Wat wil je beleven? (bijv. 'strand', 'museum', 'restaurant')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'primary.main' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  bgcolor: 'white',
                  borderRadius: 2,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: 'transparent',
                    },
                    '&:hover fieldset': {
                      borderColor: 'primary.main',
                    },
                  },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                endIcon={<SearchIcon />}
                sx={{
                  minWidth: isMobile ? '100%' : 160,
                  height: 56,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 30px rgba(0,0,0,0.3)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Zoeken
              </Button>
            </Box>

            {/* HolidaiButler USPs */}
            <Box
              sx={{
                mt: 4,
                display: 'flex',
                gap: isMobile ? 2 : 4,
                flexWrap: 'wrap',
                alignItems: 'center',
                bgcolor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                borderRadius: 2,
                p: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VerifiedIcon sx={{ color: '#D4AF37', fontSize: 28 }} />
                <Typography variant="body1" sx={{ color: 'white', fontWeight: 600 }}>
                  Lokale Experts
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StarIcon sx={{ color: '#D4AF37', fontSize: 28 }} />
                <Typography variant="body1" sx={{ color: 'white', fontWeight: 600 }}>
                  Curated Ervaringen
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingIcon sx={{ color: '#D4AF37', fontSize: 28 }} />
                <Typography variant="body1" sx={{ color: 'white', fontWeight: 600 }}>
                  Direct Boeken
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FavoriteIcon sx={{ color: '#D4AF37', fontSize: 28 }} />
                <Typography variant="body1" sx={{ color: 'white', fontWeight: 600 }}>
                  Persoonlijke Service
                </Typography>
              </Box>
            </Box>
          </motion.div>
        </Container>

        {/* Decorative wave */}
        <Box
          sx={{
            position: 'absolute',
            bottom: -1,
            left: 0,
            right: 0,
            height: 100,
            background: theme.palette.background.default,
            clipPath: 'polygon(0 50%, 100% 0, 100% 100%, 0 100%)',
          }}
        />
      </Box>

      {/* Categories Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <motion.div
          ref={categoriesRef}
          initial={{ y: 50, opacity: 0 }}
          animate={categoriesInView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
        >
          <Typography variant="h3" sx={{ mb: 1, fontWeight: 700, textAlign: 'center' }}>
            Blader op Categorie
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 5, textAlign: 'center' }}>
            Vind precies wat je zoekt in de Costa Blanca
          </Typography>

          <Grid container spacing={3}>
            {categories.map((category, index) => (
              <Grid item xs={6} sm={4} md={2.4} key={category.id}>
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={categoriesInView ? { y: 0, opacity: 1 } : {}}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  <Card
                    onClick={() => handleCategoryClick(category.id)}
                    sx={{
                      cursor: 'pointer',
                      textAlign: 'center',
                      p: 3,
                      height: '100%',
                      transition: 'all 0.3s ease',
                      border: '2px solid transparent',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: `0 12px 24px ${alpha(category.color, 0.2)}`,
                        borderColor: category.color,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        bgcolor: alpha(category.color, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 2,
                        color: category.color,
                      }}
                    >
                      {category.icon}
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {category.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {category.count} ervaringen
                    </Typography>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>
      </Container>

      {/* Featured Experiences */}
      <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.02), py: 8 }}>
        <Container maxWidth="lg">
          <motion.div
            ref={featuredRef}
            initial={{ y: 50, opacity: 0 }}
            animate={featuredInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.6 }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 5 }}>
              <Box>
                <Typography variant="h3" sx={{ mb: 1, fontWeight: 700 }}>
                  Populaire Ervaringen
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Door onze gasten gewaardeerd en aanbevolen
                </Typography>
              </Box>
              {!isMobile && (
                <Button
                  variant="outlined"
                  endIcon={<ArrowForwardIcon />}
                  size="large"
                  sx={{ minWidth: 160 }}
                >
                  Bekijk alles
                </Button>
              )}
            </Box>

            <Grid container spacing={3}>
              {loading
                ? Array.from(new Array(6)).map((_, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card>
                        <Skeleton variant="rectangular" height={240} />
                        <CardContent>
                          <Skeleton />
                          <Skeleton width="60%" />
                        </CardContent>
                      </Card>
                    </Grid>
                  ))
                : featuredPOIs.map((poi, index) => (
                    <Grid item xs={12} sm={6} md={4} key={poi.id}>
                      <motion.div
                        initial={{ y: 30, opacity: 0 }}
                        animate={featuredInView ? { y: 0, opacity: 1 } : {}}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                      >
                        <POICard poi={poi} onBook={handleBookNow} />
                      </motion.div>
                    </Grid>
                  ))}
            </Grid>

            {isMobile && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Button
                  variant="outlined"
                  endIcon={<ArrowForwardIcon />}
                  size="large"
                  fullWidth
                  sx={{ maxWidth: 300 }}
                >
                  Bekijk alle ervaringen
                </Button>
              </Box>
            )}
          </motion.div>
        </Container>
      </Box>

      {/* Social Proof Banner */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                Word lid van duizenden tevreden reizigers
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Ontdek waarom HolidaiButler de #1 keuze is voor Costa Blanca ervaringen
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: isMobile ? 'center' : 'right' }}>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                sx={{
                  minWidth: 200,
                  height: 56,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
              >
                Maak een account
              </Button>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

/**
 * POI Card Component
 * Beautiful card with trust signals, ratings, and booking CTA
 */
const POICard = ({ poi, onBook }) => {
  const [favorite, setFavorite] = useState(false);

  return (
    <Card
      sx={{
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
      {/* Image */}
      <Box sx={{ position: 'relative' }}>
        <CardMedia
          component="img"
          height="240"
          image={poi.image}
          alt={poi.name}
          sx={{ objectFit: 'cover' }}
        />

        {/* Badges */}
        <Box sx={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {poi.verified && (
            <Chip
              icon={<VerifiedIcon />}
              label="Geverifieerd"
              size="small"
              sx={{ bgcolor: 'success.main', color: 'white', fontWeight: 600 }}
            />
          )}
          {poi.popular && (
            <Chip
              icon={<TrendingIcon />}
              label="Populair"
              size="small"
              sx={{ bgcolor: 'warning.main', color: 'white', fontWeight: 600 }}
            />
          )}
          {poi.discount && (
            <Chip
              label={`-${poi.discount}%`}
              size="small"
              sx={{ bgcolor: 'error.main', color: 'white', fontWeight: 600 }}
            />
          )}
        </Box>

        {/* Favorite Button */}
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            setFavorite(!favorite);
          }}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            bgcolor: 'white',
            '&:hover': { bgcolor: 'white' },
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
          aria-label="Add to favorites"
        >
          {favorite ? (
            <FavoriteIcon sx={{ color: 'error.main' }} />
          ) : (
            <FavoriteBorderIcon />
          )}
        </IconButton>
      </Box>

      {/* Content */}
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* Category */}
        <Chip label={poi.category} size="small" sx={{ mb: 1 }} />

        {/* Title */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, lineHeight: 1.3 }}>
          {poi.name}
        </Typography>

        {/* Location */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
          <LocationIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {poi.location}
          </Typography>
        </Box>

        {/* Rating */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <StarIcon sx={{ fontSize: 20, color: 'warning.main' }} />
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {poi.rating}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            ({poi.reviewCount.toLocaleString()} reviews)
          </Typography>
        </Box>

        {/* Social Proof */}
        {poi.bookingsToday > 50 && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.5,
              bgcolor: alpha('#4CAF50', 0.1),
              borderRadius: 1,
              mb: 1.5,
            }}
          >
            <TrendingIcon sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="caption" sx={{ color: 'success.dark', fontWeight: 600 }}>
              {poi.bookingsToday} mensen boekten vandaag
            </Typography>
          </Box>
        )}

        {/* Tags */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {poi.tags.slice(0, 3).map((tag) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
        </Box>
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
              €{poi.price}
            </Typography>
            {poi.originalPrice && (
              <Typography
                variant="body2"
                sx={{ textDecoration: 'line-through', color: 'text.secondary' }}
              >
                €{poi.originalPrice}
              </Typography>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            per persoon
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          onClick={() => onBook(poi.id)}
          sx={{
            minWidth: 120,
            fontWeight: 600,
          }}
        >
          Boek nu
        </Button>
      </CardActions>
    </Card>
  );
};

export default HomePage;
