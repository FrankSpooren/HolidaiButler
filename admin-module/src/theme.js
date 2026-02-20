import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#7FA594' },
    background: {
      default: '#f5f7fa',
      paper: '#ffffff'
    }
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
        root: { boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
      }
    }
  }
});

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

export default theme;
