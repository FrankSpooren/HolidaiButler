import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Container,
  Avatar,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Explore as ExploreIcon,
  ConfirmationNumber as TicketIcon,
  Restaurant as RestaurantIcon,
  Event as EventIcon,
  AccountCircle as AccountIcon,
  Favorite as FavoriteIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
  PersonAdd as SignupIcon,
  Close as CloseIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import useAuthStore from '../../store/authStore';
import Footer from './Footer';

const Layout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [anchorElUser, setAnchorElUser] = useState(null);

  const navigationItems = [
    { label: 'Home', path: '/', icon: <HomeIcon /> },
    { label: 'Ervaringen', path: '/experiences', icon: <ExploreIcon /> },
    { label: 'Tickets', path: '/tickets', icon: <TicketIcon /> },
    { label: 'Restaurants', path: '/restaurants', icon: <RestaurantIcon /> },
    { label: 'Agenda', path: '/agenda', icon: <EventIcon /> },
  ];

  const userMenuItems = isAuthenticated
    ? [
        { label: 'Mijn Account', path: '/account', icon: <AccountIcon /> },
        { label: 'Mijn Boekingen', path: '/account/bookings', icon: <TicketIcon /> },
        { label: 'Favorieten', path: '/account/favorites', icon: <FavoriteIcon /> },
      ]
    : [];

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
    handleCloseUserMenu();
  };

  const handleLogout = () => {
    logout();
    handleCloseUserMenu();
    navigate('/');
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Navigation Bar */}
      <AppBar
        position="sticky"
        sx={{
          bgcolor: 'white',
          color: 'text.primary',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters>
            {/* Logo */}
            <Box
              component={Link}
              to="/"
              sx={{
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
                color: 'inherit',
                mr: 4,
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                HolidaiButler
              </Typography>
            </Box>

            {/* Desktop Navigation */}
            {!isMobile && (
              <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
                {navigationItems.map((item) => (
                  <Button
                    key={item.path}
                    component={Link}
                    to={item.path}
                    startIcon={item.icon}
                    sx={{
                      color: isActive(item.path) ? 'primary.main' : 'text.secondary',
                      fontWeight: isActive(item.path) ? 600 : 500,
                      bgcolor: isActive(item.path)
                        ? alpha(theme.palette.primary.main, 0.08)
                        : 'transparent',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                      },
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Box>
            )}

            {/* Search Button (Desktop) */}
            {!isMobile && (
              <IconButton
                onClick={() => navigate('/search')}
                sx={{ mr: 2 }}
                aria-label="Zoeken"
              >
                <SearchIcon />
              </IconButton>
            )}

            {/* User Menu / Auth Buttons */}
            {!isMobile && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isAuthenticated ? (
                  <>
                    <IconButton onClick={handleOpenUserMenu}>
                      <Avatar
                        sx={{
                          bgcolor: 'primary.main',
                          width: 40,
                          height: 40,
                        }}
                      >
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </Avatar>
                    </IconButton>
                    <Menu
                      anchorEl={anchorElUser}
                      open={Boolean(anchorElUser)}
                      onClose={handleCloseUserMenu}
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                      }}
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                      }}
                    >
                      <Box sx={{ px: 2, py: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {user?.name || 'Gebruiker'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {user?.email}
                        </Typography>
                      </Box>
                      <Divider />
                      {userMenuItems.map((item) => (
                        <MenuItem
                          key={item.path}
                          onClick={() => handleNavigate(item.path)}
                        >
                          <ListItemIcon>{item.icon}</ListItemIcon>
                          <ListItemText>{item.label}</ListItemText>
                        </MenuItem>
                      ))}
                      <Divider />
                      <MenuItem onClick={handleLogout}>
                        <ListItemIcon>
                          <LogoutIcon />
                        </ListItemIcon>
                        <ListItemText>Uitloggen</ListItemText>
                      </MenuItem>
                    </Menu>
                  </>
                ) : (
                  <>
                    <Button
                      component={Link}
                      to="/login"
                      variant="outlined"
                      startIcon={<LoginIcon />}
                    >
                      Inloggen
                    </Button>
                    <Button
                      component={Link}
                      to="/signup"
                      variant="contained"
                      startIcon={<SignupIcon />}
                    >
                      Aanmelden
                    </Button>
                  </>
                )}
              </Box>
            )}

            {/* Mobile Menu Button */}
            {isMobile && (
              <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <IconButton
                  onClick={() => navigate('/search')}
                  sx={{ mr: 1 }}
                  aria-label="Zoeken"
                >
                  <SearchIcon />
                </IconButton>
                <IconButton
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Menu openen"
                >
                  <MenuIcon />
                </IconButton>
              </Box>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{
          sx: { width: '80%', maxWidth: 320 },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={700}>
            Menu
          </Typography>
          <IconButton onClick={() => setMobileMenuOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />

        {/* User Info (Mobile) */}
        {isAuthenticated && (
          <>
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  {user?.name || 'Gebruiker'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>
            </Box>
            <Divider />
          </>
        )}

        <List>
          {navigationItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                selected={isActive(item.path)}
              >
                <ListItemIcon sx={{ color: isActive(item.path) ? 'primary.main' : 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isActive(item.path) ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider />

        {isAuthenticated ? (
          <List>
            {userMenuItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton onClick={() => handleNavigate(item.path)}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
            <ListItem disablePadding>
              <ListItemButton onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Uitloggen" />
              </ListItemButton>
            </ListItem>
          </List>
        ) : (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<LoginIcon />}
              onClick={() => handleNavigate('/login')}
            >
              Inloggen
            </Button>
            <Button
              variant="contained"
              fullWidth
              startIcon={<SignupIcon />}
              onClick={() => handleNavigate('/signup')}
            >
              Aanmelden
            </Button>
          </Box>
        )}
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default Layout;
