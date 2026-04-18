import { useState, useEffect, useMemo } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Box, Drawer, useMediaQuery, useTheme } from '@mui/material';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import { SIDEBAR_STYLES } from '../../theme.js';
import useAuthStore from '../../stores/authStore.js';
import AdminOnboardingGuide from '../onboarding/AdminOnboardingGuide.jsx';
import CommandPalette from '../common/CommandPalette.jsx';
import ShortcutsOverlay from '../common/ShortcutsOverlay.jsx';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts.js';

export default function AdminLayout() {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useAuthStore(s => s.user);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Show onboarding guide for users who haven't completed it
  useEffect(() => {
    if (user && user.onboardingCompleted === false && user.role !== 'platform_admin') {
      setShowOnboarding(true);
    }
  }, [user]);

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
    'g b': () => navigate('/content-studio?tab=sources'),
    'g i': () => navigate('/content-studio?tab=suggestions'),
    'g t': () => navigate('/content-studio?tab=items'),
    'g k': () => navigate('/content-studio?tab=calendar'),
    'g a': () => navigate('/content-studio?tab=analytics'),
    'g m': () => navigate('/media'),
    'g s': () => navigate('/branding'),

    // Create sequences
    'n c': () => navigate('/content-studio?action=new'),
    'n b': () => navigate('/content-studio?action=new&type=blog'),
    'n s': () => navigate('/content-studio?action=new&type=social'),
    'n p': () => navigate('/content-studio?action=campaign'),

    // Single keys
    '/': () => {
      // Focus the search input on current page if available
      const searchInput = document.querySelector('[data-search-input]') || document.querySelector('input[placeholder*="Zoek"]');
      if (searchInput) { searchInput.focus(); searchInput.select(); }
    },
  }), [navigate]);

  useKeyboardShortcuts(shortcuts, { enabled: !paletteOpen });

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

      {/* Onboarding guide for new users */}
      <AdminOnboardingGuide
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />

      {/* Command Palette (Cmd+K / Ctrl+K) */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* Shortcuts Overlay (? key) */}
      <ShortcutsOverlay />
    </Box>
  );
}
