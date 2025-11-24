/**
 * Sidebar Component - Navigation menu
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Collapse,
  Tooltip,
  Divider,
  alpha
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ViewKanban as PipelineIcon,
  Handshake as DealsIcon,
  Business as AccountsIcon,
  People as ContactsIcon,
  PersonSearch as LeadsIcon,
  Campaign as CampaignsIcon,
  Task as TasksIcon,
  History as ActivitiesIcon,
  Inbox as InboxIcon,
  Assessment as ReportsIcon,
  ImportExport as ImportExportIcon,
  AdminPanelSettings as AdminIcon,
  Group as TeamIcon,
  ExpandLess,
  ExpandMore,
  Settings as SettingsIcon
} from '@mui/icons-material';
import useAuthStore from '../../store/authStore';

const menuItems = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: DashboardIcon
  },
  {
    title: 'Sales',
    icon: DealsIcon,
    children: [
      { title: 'Pipeline', path: '/pipeline', icon: PipelineIcon },
      { title: 'Deals', path: '/deals', icon: DealsIcon },
      { title: 'Leads', path: '/leads', icon: LeadsIcon }
    ]
  },
  {
    title: 'CRM',
    icon: ContactsIcon,
    children: [
      { title: 'Accounts', path: '/accounts', icon: AccountsIcon },
      { title: 'Contacts', path: '/contacts', icon: ContactsIcon }
    ]
  },
  {
    title: 'Marketing',
    icon: CampaignsIcon,
    children: [
      { title: 'Campaigns', path: '/campaigns', icon: CampaignsIcon }
    ]
  },
  {
    title: 'Tasks',
    path: '/tasks',
    icon: TasksIcon
  },
  {
    title: 'Activities',
    path: '/activities',
    icon: ActivitiesIcon
  },
  {
    title: 'Shared Inbox',
    path: '/inbox',
    icon: InboxIcon
  },
  {
    title: 'Reports',
    path: '/reports',
    icon: ReportsIcon
  },
  {
    title: 'Import / Export',
    path: '/import-export',
    icon: ImportExportIcon
  }
];

const adminItems = [
  {
    title: 'Administration',
    icon: AdminIcon,
    children: [
      { title: 'Users', path: '/admin/users', icon: ContactsIcon },
      { title: 'Teams', path: '/admin/teams', icon: TeamIcon },
      { title: 'Settings', path: '/settings', icon: SettingsIcon }
    ]
  }
];

const Sidebar = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasRole } = useAuthStore();
  const [openMenus, setOpenMenus] = React.useState({});

  const handleMenuClick = (item) => {
    if (item.children) {
      setOpenMenus((prev) => ({
        ...prev,
        [item.title]: !prev[item.title]
      }));
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const renderMenuItem = (item, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const active = item.path && isActive(item.path);
    const Icon = item.icon;

    const listItemButton = (
      <ListItemButton
        onClick={() => handleMenuClick(item)}
        selected={active}
        sx={{
          minHeight: 44,
          px: collapsed ? 2 : 2.5,
          pl: collapsed ? 2 : 2 + level * 2,
          borderRadius: 1,
          mx: 1,
          mb: 0.5,
          justifyContent: collapsed ? 'center' : 'flex-start',
          '&.Mui-selected': {
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
            color: 'primary.main',
            '& .MuiListItemIcon-root': {
              color: 'primary.main'
            },
            '&:hover': {
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16)
            }
          }
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: collapsed ? 0 : 40,
            justifyContent: 'center',
            color: active ? 'primary.main' : 'text.secondary'
          }}
        >
          <Icon fontSize="small" />
        </ListItemIcon>
        {!collapsed && (
          <>
            <ListItemText
              primary={item.title}
              primaryTypographyProps={{
                fontSize: '0.875rem',
                fontWeight: active ? 600 : 500
              }}
            />
            {hasChildren && (openMenus[item.title] ? <ExpandLess /> : <ExpandMore />)}
          </>
        )}
      </ListItemButton>
    );

    return (
      <React.Fragment key={item.title}>
        <ListItem disablePadding sx={{ display: 'block' }}>
          {collapsed && Icon ? (
            <Tooltip title={item.title} placement="right">
              {listItemButton}
            </Tooltip>
          ) : (
            listItemButton
          )}
        </ListItem>
        {hasChildren && !collapsed && (
          <Collapse in={openMenus[item.title]} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map((child) => renderMenuItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper'
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 1.5,
          minHeight: 64
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: '1rem'
          }}
        >
          SP
        </Box>
        {!collapsed && (
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Sales Pipeline
          </Typography>
        )}
      </Box>

      <Divider />

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        <List component="nav" disablePadding>
          {menuItems.map((item) => renderMenuItem(item))}
        </List>

        {/* Admin Section */}
        {hasRole(['admin', 'manager']) && (
          <>
            <Divider sx={{ my: 1 }} />
            <List component="nav" disablePadding>
              {adminItems.map((item) => renderMenuItem(item))}
            </List>
          </>
        )}
      </Box>

      {/* User Info */}
      {!collapsed && user && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'background.default',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '0.875rem'
                }}
              >
                {user.firstName?.[0]}
                {user.lastName?.[0]}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  noWrap
                  sx={{ fontWeight: 600 }}
                >
                  {user.firstName} {user.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {user.role}
                </Typography>
              </Box>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

export default Sidebar;
