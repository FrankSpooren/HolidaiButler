import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Drawer, useMediaQuery, useTheme } from '@mui/material';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import { SIDEBAR_STYLES } from '../../theme.js';

export default function AdminLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Desktop sidebar */}
      {!isMobile && (
        <Box component="nav" sx={{ width: SIDEBAR_STYLES.width, flexShrink: 0 }}>
          <Sidebar />
        </Box>
      )}

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { md: 'none' }, '& .MuiDrawer-paper': { width: SIDEBAR_STYLES.width } }}
      >
        <Sidebar />
      </Drawer>

      {/* Main content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header onMenuToggle={() => setMobileOpen(!mobileOpen)} />
        <Box component="main" sx={{ flex: 1, p: 3, mt: 8 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
