import { useState, useEffect, useMemo } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Box, Drawer, useMediaQuery, useTheme } from '@mui/material';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import { SIDEBAR_STYLES } from '../../theme.js';
import useAuthStore from '../../stores/authStore.js';
import OnboardingWidget from '../onboarding/OnboardingWidget.jsx';
import CommandPalette from '../common/CommandPalette.jsx';
import ShortcutsOverlay from '../common/ShortcutsOverlay.jsx';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts.js';

const COLLAPSED_WIDTH = 56;
const EXPANDED_WIDTH = SIDEBAR_STYLES.width || 240;

export default function AdminLayout() {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useAuthStore(s => s.user);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Sidebar collapse state — syncs with Sidebar via CustomEvent
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('hb-sidebar-collapsed') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    const handler = (e) => setSidebarCollapsed(e.detail);
    window.addEventListener('hb:sidebar-collapse', handler);
    return () => window.removeEventListener('hb:sidebar-collapse', handler);
  }, []);

  const sidebarWidth = sidebarCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;



  // Global Cmd+K / Ctrl+K hotkey for command palette
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen(p => !p);
      } else if (e.key === 'Escape' && paletteOpen) {
        setPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [paletteOpen]);

  // Global keyboard shortcuts (sequence-based)
  const shortcuts = useMemo(() => ({
    // Navigation sequences
    'g d': () => navigate('/dashboard'),
    'g c': () => navigate('/content-studio'),
    'g b': () => { navigate('/content-studio'); setTimeout(() => window.dispatchEvent(new CustomEvent('hb:content-studio-tab', { detail: 0 })), 100); },
    'g i': () => { navigate('/content-studio'); setTimeout(() => window.dispatchEvent(new CustomEvent('hb:content-studio-tab', { detail: 1 })), 100); },
    'g t': () => { navigate('/content-studio'); setTimeout(() => window.dispatchEvent(new CustomEvent('hb:content-studio-tab', { detail: 2 })), 100); },
    'g k': () => { navigate('/content-studio'); setTimeout(() => window.dispatchEvent(new CustomEvent('hb:content-studio-tab', { detail: 3 })), 100); },
    'g a': () => { navigate('/content-studio'); setTimeout(() => window.dispatchEvent(new CustomEvent('hb:content-studio-tab', { detail: 4 })), 100); },
    'g m': () => navigate('/media'),
    'g s': () => navigate('/branding'),

    // Create sequences
    'n c': () => navigate('/content-studio?action=new'),
    'n b': () => navigate('/content-studio?action=new&type=blog'),
    'n s': () => navigate('/content-studio?action=new&type=social'),
    'n p': () => navigate('/content-studio?action=campaign'),

    // Single keys
    '/': () => {
      const searchInput = document.querySelector('[data-search-input]') || document.querySelector('input[placeholder*="Zoek"]');
      if (searchInput) { searchInput.focus(); searchInput.select(); }
    },
  }), [navigate]);

  useKeyboardShortcuts(shortcuts, { enabled: !paletteOpen });

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Desktop sidebar */}
      {!isMobile && (
        <Box
          component="nav"
          sx={{
            width: sidebarWidth,
            flexShrink: 0,
            transition: 'width 200ms ease',
          }}
        >
          <Sidebar />
        </Box>
      )}

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { md: 'none' }, '& .MuiDrawer-paper': { width: EXPANDED_WIDTH } }}
      >
        <Sidebar />
      </Drawer>

      {/* Main content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header onMenuToggle={() => setMobileOpen(!mobileOpen)} />
        <Box component="main" sx={{ flex: 1, p: 3, mt: 8 }}>
          <Outlet />
        </Box>
      </Box>

      {/* Onboarding widget for new users */}
      <OnboardingWidget user={user} />

      {/* Command Palette (Cmd+K / Ctrl+K) */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* Shortcuts Overlay (? key) */}
      <ShortcutsOverlay />
    </Box>
  );
}
