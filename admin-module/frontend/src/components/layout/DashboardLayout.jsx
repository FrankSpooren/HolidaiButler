import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Place as PlaceIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Palette as PaletteIcon,
  Article as ArticleIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  ChevronLeft as ChevronLeftIcon
} from '@mui/icons-material';
import useAuthStore from '../../store/authStore';

const drawerWidth = 260;

export default function DashboardLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermission } = useAuthStore();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      permission: null
    },
    {
      text: 'POIs',
      icon: <PlaceIcon />,
      path: '/pois',
      permission: 'pois.read'
    },
    {
      text: 'Platform',
      icon: <PaletteIcon />,
      path: '/platform',
      permission: 'platform',
      submenu: [
        { text: 'Branding', path: '/platform/branding', permission: 'platform.branding' },
        { text: 'Content', path: '/platform/content', permission: 'platform.content' },
        { text: 'Contact', path: '/platform/contact', permission: 'platform.content' },
        { text: 'Legal', path: '/platform/legal', permission: 'platform.settings' }
      ]
    },
    {
      text: 'Users',
      icon: <PeopleIcon />,
      path: '/users',
      permission: 'users.view'
    }
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  const drawer = (
    <Box>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight="bold">
            HolidaiButler
          </Typography>
          <Typography variant="caption">
            Admin Panel
          </Typography>
        </Box>
        {isMobile && (
          <IconButton onClick={handleDrawerToggle} sx={{ color: 'white' }}>
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Toolbar>

      <Divider />

      <Box sx={{ px: 2, py: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            bgcolor: 'background.default',
            borderRadius: 2
          }}
        >
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            {user?.profile?.firstName?.[0]}{user?.profile?.lastName?.[0]}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight="bold" noWrap>
              {user?.profile?.firstName} {user?.profile?.lastName}
            </Typography>
            <Chip
              label={user?.role?.replace('_', ' ')}
              size="small"
              color="primary"
              sx={{ mt: 0.5, textTransform: 'capitalize' }}
            />
          </Box>
        </Box>
      </Box>

      <Divider />

      <List sx={{ px: 1, py: 2 }}>
        {filteredMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              sx={{
                borderRadius: 1,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark'
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white'
                  }
                }
              }}
            >
              <ListItemIcon
                sx={{
                  color: location.pathname === item.path ? 'white' : 'text.secondary'
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'white',
          color: 'text.primary',
          boxShadow: 1
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {/* Page title will be set by child components */}
          </Typography>

          <IconButton onClick={handleProfileMenuOpen}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
              {user?.profile?.firstName?.[0]}{user?.profile?.lastName?.[0]}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right'
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right'
            }}
          >
            <MenuItem onClick={() => { navigate('/profile'); handleProfileMenuClose(); }}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Profile</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { navigate('/settings'); handleProfileMenuClose(); }}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Settings</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Logout</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth
            }
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth
            }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default'
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
