import { createTheme } from '@mui/material/styles';

export function buildTheme(mode = 'light') {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: { main: '#1976d2' },
      secondary: { main: '#7FA594' },
      background: {
        default: isDark ? '#0f172a' : '#f5f7fa',
        paper: isDark ? '#1e293b' : '#ffffff'
      },
      ...(isDark && {
        text: {
          primary: '#e2e8f0',
          secondary: '#94a3b8'
        }
      })
    },
    typography: {
      fontFamily: "'Inter', 'Roboto', sans-serif"
    },
    shape: {
      borderRadius: 8
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600 }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
            ...(isDark && { backgroundImage: 'none' })
          }
        }
      },
      MuiTableHead: {
        styleOverrides: {
          root: isDark ? { '& th': { backgroundColor: '#1e293b !important' } } : {}
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: isDark ? { backgroundColor: '#1e293b', color: '#e2e8f0' } : {}
        }
      }
    }
  });
}

// Default export for backward compat
const theme = buildTheme('light');
export default theme;

export const DESTINATION_COLORS = {
  calpe: '#7FA594',
  texel: '#30c59b'
};

export const SIDEBAR_STYLES = {
  bg: '#1e293b',
  text: '#e2e8f0',
  activeText: '#ffffff',
  activeBg: 'rgba(255,255,255,0.08)',
  hoverBg: 'rgba(255,255,255,0.04)',
  width: 240
};
