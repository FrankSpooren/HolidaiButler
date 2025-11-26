import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Avatar,
  Button,
  Chip,
  Tabs,
  Tab,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemButton,
  Badge,
  useTheme,
  useMediaQuery,
  alpha,
  LinearProgress,
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  QrCode as QrCodeIcon,
  Download as DownloadIcon,
  Star as StarIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Favorite as FavoriteIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  LocalActivity as TicketIcon,
  TrendingUp as TrendingIcon,
  EmojiEvents as RewardsIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

/**
 * UserDashboard - Customer Account Management Dashboard
 *
 * Enterprise-level user dashboard for investors to see:
 * - User profile management
 * - Booking history (upcoming & past)
 * - Favorite POIs
 * - Rewards/loyalty program
 * - Account settings
 *
 * Shows strong user retention features
 */

const UserDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [activeTab, setActiveTab] = useState(0);
  const [user, setUser] = useState(null);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [pastBookings, setPastBookings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data - in production, fetch from API
  useEffect(() => {
    setTimeout(() => {
      setUser({
        id: 1,
        name: 'Maria Garcia',
        email: 'maria.garcia@example.com',
        avatar: null,
        memberSince: '2024-06-15',
        preferences: {
          language: 'nl',
          currency: 'EUR',
          interests: ['Natuur', 'Cultuur', 'Familie'],
        },
        stats: {
          totalBookings: 12,
          upcomingBookings: 3,
          savedAmount: 156,
          rewardPoints: 850,
        },
        loyaltyTier: 'Silver',
      });

      setUpcomingBookings([
        {
          id: 1,
          poiName: 'Terra Natura Benidorm',
          date: '2025-12-02',
          time: '10:00',
          tickets: 4,
          totalPrice: 100,
          status: 'confirmed',
          qrCode: '/qr/booking-1.png',
          image: '/images/terra-natura.jpg',
          location: 'Benidorm',
          category: 'Familie & Kinderen',
        },
        {
          id: 2,
          poiName: 'Restaurant La Perla',
          date: '2025-12-05',
          time: '19:30',
          guests: 2,
          totalPrice: 90,
          status: 'confirmed',
          image: '/images/restaurant-perla.jpg',
          location: 'Calpe',
          category: 'Eten & Drinken',
        },
        {
          id: 3,
          poiName: 'Guadalest & Algar Watervallen',
          date: '2025-12-08',
          time: '09:00',
          tickets: 2,
          totalPrice: 76,
          status: 'confirmed',
          qrCode: '/qr/booking-3.png',
          image: '/images/guadalest.jpg',
          location: 'Guadalest',
          category: 'Natuur & Outdoor',
        },
      ]);

      setPastBookings([
        {
          id: 4,
          poiName: 'Peñón de Ifach Wandeling',
          date: '2025-11-18',
          tickets: 2,
          totalPrice: 30,
          status: 'completed',
          rating: 5,
          image: '/images/penon-ifach.jpg',
          location: 'Calpe',
        },
        {
          id: 5,
          poiName: 'Altea Old Town Tour',
          date: '2025-11-10',
          tickets: 2,
          totalPrice: 40,
          status: 'completed',
          rating: 4,
          image: '/images/altea.jpg',
          location: 'Altea',
        },
      ]);

      setFavorites([
        {
          id: 1,
          name: 'Aqualandia Waterpark',
          location: 'Benidorm',
          price: 32,
          rating: 4.5,
          image: '/images/aqualandia.jpg',
        },
        {
          id: 2,
          name: 'Benidorm Palace Show',
          location: 'Benidorm',
          price: 45,
          rating: 4.8,
          image: '/images/benidorm-palace.jpg',
        },
      ]);

      setLoading(false);
    }, 1000);
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleEditProfile = () => {
    console.log('Edit profile');
  };

  const handleLogout = () => {
    console.log('Logout');
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  sx={{
                    width: isMobile ? 64 : 80,
                    height: isMobile ? 64 : 80,
                    bgcolor: 'primary.main',
                    fontSize: isMobile ? '1.5rem' : '2rem',
                  }}
                >
                  {user.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700, mb: 0.5 }}>
                    Welkom terug, {user.name.split(' ')[0]}!
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Chip
                      label={`${user.loyaltyTier} Member`}
                      color="primary"
                      size="small"
                      icon={<RewardsIcon />}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Lid sinds {new Date(user.memberSince).toLocaleDateString('nl-NL', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={handleEditProfile}
                  sx={{ minWidth: 140 }}
                >
                  Profiel
                </Button>
                <IconButton
                  onClick={() => console.log('Notifications')}
                  sx={{ bgcolor: 'background.paper' }}
                >
                  <Badge badgeContent={3} color="error">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
                <IconButton onClick={() => console.log('Settings')} sx={{ bgcolor: 'background.paper' }}>
                  <SettingsIcon />
                </IconButton>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={6} sm={3}>
            <StatsCard
              icon={<TrendingIcon />}
              title="Totale boekingen"
              value={user.stats.totalBookings}
              color="primary.main"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatsCard
              icon={<TicketIcon />}
              title="Aankomende"
              value={user.stats.upcomingBookings}
              color="success.main"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatsCard
              icon={<RewardsIcon />}
              title="Reward Punten"
              value={user.stats.rewardPoints}
              color="warning.main"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatsCard
              icon={<StarIcon />}
              title="Bespaard"
              value={`€${user.stats.savedAmount}`}
              color="error.main"
            />
          </Grid>
        </Grid>

        {/* Tabs */}
        <Card sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant={isMobile ? 'scrollable' : 'fullWidth'}
            scrollButtons={isMobile ? 'auto' : false}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Aankomende Boekingen" icon={<CalendarIcon />} iconPosition="start" />
            <Tab label="Vorige Boekingen" icon={<TicketIcon />} iconPosition="start" />
            <Tab label="Favorieten" icon={<FavoriteIcon />} iconPosition="start" />
          </Tabs>
        </Card>

        {/* Tab Panels */}
        <TabPanel value={activeTab} index={0}>
          {upcomingBookings.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon />}
              title="Geen aankomende boekingen"
              description="Begin met het verkennen van geweldige ervaringen in de Costa Blanca!"
              actionLabel="Ontdek ervaringen"
              onAction={() => console.log('Browse')}
            />
          ) : (
            <Grid container spacing={3}>
              {upcomingBookings.map((booking, index) => (
                <Grid item xs={12} key={booking.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <UpcomingBookingCard booking={booking} />
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {pastBookings.length === 0 ? (
            <EmptyState
              icon={<TicketIcon />}
              title="Nog geen voltooide boekingen"
              description="Je boekingengeschiedenis verschijnt hier na je eerste ervaring"
            />
          ) : (
            <Grid container spacing={3}>
              {pastBookings.map((booking, index) => (
                <Grid item xs={12} sm={6} key={booking.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <PastBookingCard booking={booking} />
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {favorites.length === 0 ? (
            <EmptyState
              icon={<FavoriteIcon />}
              title="Geen favorieten opgeslagen"
              description="Markeer ervaringen als favoriet om ze later gemakkelijk terug te vinden"
              actionLabel="Ontdek ervaringen"
              onAction={() => console.log('Browse')}
            />
          ) : (
            <Grid container spacing={3}>
              {favorites.map((poi, index) => (
                <Grid item xs={12} sm={6} md={4} key={poi.id}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <FavoriteCard poi={poi} />
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>
      </Container>
    </Box>
  );
};

// Stats Card Component
const StatsCard = ({ icon, title, value, color }) => (
  <Card
    sx={{
      height: '100%',
      transition: 'transform 0.2s',
      '&:hover': {
        transform: 'translateY(-4px)',
      },
    }}
  >
    <CardContent sx={{ textAlign: 'center' }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          bgcolor: alpha(color, 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 1,
          color,
        }}
      >
        {icon}
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
    </CardContent>
  </Card>
);

// Upcoming Booking Card
const UpcomingBookingCard = ({ booking }) => (
  <Card
    sx={{
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      transition: 'box-shadow 0.2s',
      '&:hover': {
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      },
    }}
  >
    <CardMedia
      component="img"
      sx={{
        width: { xs: '100%', sm: 200 },
        height: { xs: 200, sm: 'auto' },
        objectFit: 'cover',
      }}
      image={booking.image}
      alt={booking.poiName}
    />
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Chip label={booking.category} size="small" />
          <Chip label={booking.status === 'confirmed' ? 'Bevestigd' : booking.status} color="success" size="small" />
        </Box>

        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          {booking.poiName}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {booking.location}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {new Date(booking.date).toLocaleDateString('nl-NL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}{' '}
              om {booking.time}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TicketIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {booking.tickets || booking.guests} {booking.tickets ? 'tickets' : 'gasten'} • €{booking.totalPrice}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {booking.qrCode && (
            <Button variant="outlined" size="small" startIcon={<QrCodeIcon />}>
              QR Code
            </Button>
          )}
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />}>
            Tickets
          </Button>
          <Button variant="outlined" size="small" startIcon={<ShareIcon />}>
            Delen
          </Button>
        </Box>
      </CardContent>
    </Box>
  </Card>
);

// Past Booking Card
const PastBookingCard = ({ booking }) => (
  <Card
    sx={{
      transition: 'transform 0.2s',
      '&:hover': {
        transform: 'scale(1.02)',
      },
    }}
  >
    <CardMedia component="img" height="180" image={booking.image} alt={booking.poiName} />
    <CardContent>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        {booking.poiName}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {new Date(booking.date).toLocaleDateString('nl-NL')} • {booking.location}
      </Typography>

      {booking.rating ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Jouw beoordeling:
          </Typography>
          {Array.from({ length: 5 }).map((_, i) => (
            <StarIcon
              key={i}
              sx={{
                fontSize: 20,
                color: i < booking.rating ? 'warning.main' : 'action.disabled',
              }}
            />
          ))}
        </Box>
      ) : (
        <Button variant="outlined" size="small" fullWidth sx={{ mb: 1 }}>
          Beoordeel ervaring
        </Button>
      )}

      <Button variant="text" size="small" fullWidth>
        Opnieuw boeken
      </Button>
    </CardContent>
  </Card>
);

// Favorite Card
const FavoriteCard = ({ poi }) => (
  <Card
    sx={{
      transition: 'transform 0.2s',
      '&:hover': {
        transform: 'scale(1.05)',
        cursor: 'pointer',
      },
    }}
  >
    <CardMedia component="img" height="160" image={poi.image} alt={poi.name} />
    <CardContent>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        {poi.name}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {poi.location}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {poi.rating}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" color="primary.main" sx={{ fontWeight: 700 }}>
          €{poi.price}
        </Typography>
        <Button variant="contained" size="small">
          Boeken
        </Button>
      </Box>
    </CardContent>
  </Card>
);

// Tab Panel Component
const TabPanel = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index}>
    {value === index && <Box>{children}</Box>}
  </Box>
);

// Empty State Component
const EmptyState = ({ icon, title, description, actionLabel, onAction }) => (
  <Card sx={{ textAlign: 'center', py: 8 }}>
    <Box
      sx={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        bgcolor: 'action.hover',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mx: 'auto',
        mb: 3,
        color: 'text.secondary',
      }}
    >
      {React.cloneElement(icon, { sx: { fontSize: 40 } })}
    </Box>
    <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
      {title}
    </Typography>
    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
      {description}
    </Typography>
    {actionLabel && onAction && (
      <Button variant="contained" size="large" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </Card>
);

export default UserDashboard;
