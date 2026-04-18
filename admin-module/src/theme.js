import { createTheme } from '@mui/material/styles';
import { tokens } from './theme/tokens.js';

export { tokens } from './theme/tokens.js';

export function buildTheme(mode = 'light') {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: { main: tokens.brand.teal },
      secondary: { main: '#7FA594' },
      background: {
        default: isDark ? tokens.bg.page : '#f5f7fa',
        paper: isDark ? tokens.bg.panel : '#ffffff'
      },
      success: { main: tokens.semantic.success },
      warning: { main: tokens.semantic.warning },
      error: { main: tokens.semantic.error },
      info: { main: tokens.semantic.info },
      ...(isDark && {
        text: {
          primary: tokens.text.primary,
          secondary: tokens.text.secondary
        }
      })
    },
    typography: {
      fontFamily: "'Inter', 'Roboto', sans-serif",
      h1: {
        fontSize: tokens.type.h1.size,
        fontWeight: tokens.type.h1.weight,
        lineHeight: tokens.type.h1.lineHeight,
      },
      h2: {
        fontSize: tokens.type.h2.size,
        fontWeight: tokens.type.h2.weight,
        lineHeight: tokens.type.h2.lineHeight,
      },
      h3: {
        fontSize: tokens.type.h3.size,
        fontWeight: tokens.type.h3.weight,
        lineHeight: tokens.type.h3.lineHeight,
      },
      h4: {
        fontSize: tokens.type.h4.size,
        fontWeight: tokens.type.h4.weight,
        lineHeight: tokens.type.h4.lineHeight,
      },
      body1: {
        fontSize: tokens.type.body.size,
        fontWeight: tokens.type.body.weight,
        lineHeight: tokens.type.body.lineHeight,
      },
      body2: {
        fontSize: tokens.type.small.size,
        fontWeight: tokens.type.small.weight,
        lineHeight: tokens.type.small.lineHeight,
      },
      caption: {
        fontSize: tokens.type.micro.size,
        fontWeight: tokens.type.micro.weight,
        lineHeight: tokens.type.micro.lineHeight,
      },
    },
    shape: {
      borderRadius: tokens.radius.md
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
            boxShadow: isDark ? tokens.shadow.sm : '0 1px 3px rgba(0,0,0,0.08)',
            ...(isDark && { backgroundImage: 'none' })
          }
        }
      },
      MuiTableHead: {
        styleOverrides: {
          root: isDark ? { '& th': { backgroundColor: tokens.bg.panel + ' !important' } } : {}
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: isDark ? { backgroundColor: tokens.bg.panel, color: tokens.text.primary } : {}
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
  bg: tokens.bg.panel,
  text: tokens.text.primary,
  activeText: '#ffffff',
  activeBg: 'rgba(255,255,255,0.08)',
  hoverBg: 'rgba(255,255,255,0.04)',
  width: 240
};
