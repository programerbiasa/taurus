import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a237e', // Biru Gelap Taurus
      light: '#534bae',
      dark: '#000051',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#d97706', // Aksen Emas / Amber Gold
      light: '#fbbf24',
      dark: '#b45309',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f4f6f8',
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    },
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#ed6c02',
    },
    info: {
      main: '#0288d1',
    },
    success: {
      main: '#2e7d32',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 13, // Skala font dasar lebih ringkas dan proporsional
    h4: {
      fontWeight: 700,
      fontSize: '1.5rem',
      letterSpacing: '-0.5px',
    },
    h5: {
      fontWeight: 700,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.05rem',
    },
    subtitle1: {
      fontSize: '0.9rem',
    },
    subtitle2: {
      fontSize: '0.8rem',
    },
    body1: {
      fontSize: '0.85rem',
    },
    body2: {
      fontSize: '0.78rem',
    },
    caption: {
      fontSize: '0.7rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '0.8rem',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          boxShadow: 'none',
          padding: '5px 14px',
          fontSize: '0.8rem',
          '&:hover': {
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(45deg, #1a237e 30%, #283593 90%)',
          boxShadow: '0 2px 8px rgba(26, 35, 126, 0.25)',
        },
        containedSecondary: {
          background: 'linear-gradient(45deg, #d97706 20%, #f59e0b 60%, #d4af37 100%)',
          boxShadow: '0 2px 10px rgba(217, 119, 6, 0.35)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: '0 2px 12px 0 rgba(0,0,0,0.04)',
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        elevation1: {
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '6px 12px',
          fontSize: '0.8rem',
        },
        head: {
          fontWeight: 700,
          backgroundColor: '#f8fafc',
          color: '#334155',
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        },
      },
    },
  },
});
