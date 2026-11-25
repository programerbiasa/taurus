import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, Theme } from '@mui/material/styles';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleTheme: () => {},
  setMode: () => {},
});

export const useAppTheme = () => useContext(ThemeContext);

const getDesignTokens = (mode: ThemeMode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          primary: {
            main: '#1a237e', // Biru Gelap Taurus
            light: '#534bae',
            dark: '#000051',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#d97706', // Amber Gold
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
          error: { main: '#d32f2f' },
          warning: { main: '#ed6c02' },
          info: { main: '#0288d1' },
          success: { main: '#2e7d32' },
          divider: '#e2e8f0',
        }
      : {
          // TEMA GELAP / HACKER CYBERPUNK (High Contrast, Ultra-readable)
          primary: {
            main: '#00ff66', // Neon Cyber Green
            light: '#66ff99',
            dark: '#00cc44',
            contrastText: '#050b14',
          },
          secondary: {
            main: '#00e5ff', // Cyber Cyan
            light: '#6effff',
            dark: '#00b4d8',
            contrastText: '#050b14',
          },
          background: {
            default: '#070d18', // Deep Void Dark
            paper: '#0d1829',   // Dark Slate Terminal Paper
          },
          text: {
            primary: '#ffffff', // 100% Super Bright Crisp White
            secondary: '#e2e8f0', // Bright Readable Silver Slate
          },
          error: { main: '#ff3366', light: '#ff6688', dark: '#cc0033', contrastText: '#ffffff' },
          warning: { main: '#ffaa00', light: '#ffc04d', dark: '#cc8800', contrastText: '#050b14' },
          info: { main: '#00d4ff', light: '#5ce1e6', dark: '#0099cc', contrastText: '#050b14' },
          success: { main: '#00ff66', light: '#55ffa0', dark: '#00bb44', contrastText: '#050b14' },
          divider: '#1e293b',
        }),
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 13,
    h4: {
      fontWeight: 800,
      fontSize: '1.5rem',
      letterSpacing: '-0.5px',
      color: mode === 'dark' ? '#ffd600' : '#1a237e',
    },
    h5: {
      fontWeight: 800,
      fontSize: '1.25rem',
      color: mode === 'dark' ? '#ffd600' : '#1a237e',
    },
    h6: {
      fontWeight: 700,
      fontSize: '1.05rem',
      color: mode === 'dark' ? '#ffd600' : '#1a237e',
    },
    subtitle1: { fontSize: '0.9rem' },
    subtitle2: { fontSize: '0.8rem' },
    body1: { fontSize: '0.85rem' },
    body2: { fontSize: '0.78rem' },
    caption: { fontSize: '0.7rem' },
    button: {
      textTransform: 'none' as const,
      fontWeight: 600,
      fontSize: '0.8rem',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          color: mode === 'dark' ? '#ffd600' : '#1a237e',
          fontWeight: 800,
          borderBottom: mode === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: mode === 'dark' ? '#00ff66 #070d18' : '#94a3b8 #f1f5f9',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: mode === 'dark' ? '#1e293b' : '#cbd5e1',
            border: mode === 'dark' ? '1px solid #00ff6633' : 'none',
          },
          '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
            backgroundColor: mode === 'dark' ? '#00ff66' : '#94a3b8',
          },
        },
        ...(mode === 'dark'
          ? {
              '.dark h1, .dark h2, .dark h3, .dark h4, .dark h5, .dark h6': {
                color: '#ffd600 !important',
              },
              '.dark .MuiTypography-h4, .dark .MuiTypography-h5, .dark .MuiTypography-h6': {
                color: '#ffd600 !important',
              },
              '.dark [style*="color: rgb(26, 35, 126)"], .dark [style*="color: #1a237e"], .dark [style*="color:#1a237e"]': {
                color: '#ffd600 !important',
              },
              '.dark [style*="color: rgb(30, 41, 59)"], .dark [style*="color: #1e293b"], .dark [style*="color:#1e293b"], .dark [style*="color: #0f172a"]': {
                color: '#ffffff !important',
              },
              '.dark [style*="color: rgb(71, 85, 105)"], .dark [style*="color: #475569"], .dark [style*="color:#475569"]': {
                color: '#e2e8f0 !important',
              },
              '.dark [style*="color: rgb(100, 116, 139)"], .dark [style*="color: #64748b"], .dark [style*="color:#64748b"]': {
                color: '#cbd5e1 !important',
              },
              '.dark [style*="color: rgb(51, 65, 85)"], .dark [style*="color: #334155"], .dark [style*="color:#334155"]': {
                color: '#ffffff !important',
              },
              '.dark .MuiTableCell-root': {
                color: '#f8fafc',
              },
              '.dark .MuiTableCell-body': {
                color: '#ffffff',
              },
              '.dark .MuiTypography-body2': {
                color: '#e2e8f0',
              },
              '.dark .MuiTypography-caption': {
                color: '#cbd5e1',
              },
            }
          : {}),
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          boxShadow: 'none',
          padding: '5px 14px',
          fontSize: '0.8rem',
          fontWeight: 700,
          '&:hover': {
            boxShadow: mode === 'dark' ? '0 0 12px rgba(0, 255, 102, 0.4)' : '0 2px 6px rgba(0,0,0,0.12)',
          },
        },
        containedPrimary: {
          background: mode === 'dark'
            ? 'linear-gradient(45deg, #00ff66 0%, #00e5ff 100%)'
            : 'linear-gradient(45deg, #1a237e 30%, #283593 90%)',
          color: mode === 'dark' ? '#050b14' : '#ffffff',
          fontWeight: 800,
          boxShadow: mode === 'dark' ? '0 0 10px rgba(0,255,102,0.3)' : '0 2px 8px rgba(26, 35, 126, 0.25)',
        },
        containedSecondary: {
          background: mode === 'dark'
            ? 'linear-gradient(45deg, #00e5ff 0%, #38bdf8 100%)'
            : 'linear-gradient(45deg, #d97706 20%, #f59e0b 60%, #d4af37 100%)',
          color: mode === 'dark' ? '#050b14' : '#ffffff',
          fontWeight: 800,
          boxShadow: mode === 'dark' ? '0 0 10px rgba(0,229,255,0.3)' : '0 2px 10px rgba(217, 119, 6, 0.35)',
        },
        outlined: {
          borderColor: mode === 'dark' ? '#00ff66' : undefined,
          color: mode === 'dark' ? '#00ff66' : undefined,
          '&:hover': {
            borderColor: mode === 'dark' ? '#66ff99' : undefined,
            backgroundColor: mode === 'dark' ? 'rgba(0, 255, 102, 0.08)' : undefined,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.5)' : '0 2px 12px 0 rgba(0,0,0,0.04)',
          border: mode === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0',
          backgroundColor: mode === 'dark' ? '#0d1829' : '#ffffff',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: mode === 'dark' ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 10px rgba(0,0,0,0.04)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '6px 12px',
          fontSize: '0.8rem',
          borderBottom: mode === 'dark' ? '1px solid #1e293b' : '1px solid #f1f5f9',
          color: mode === 'dark' ? '#f8fafc' : undefined,
        },
        body: {
          color: mode === 'dark' ? '#ffffff' : undefined,
        },
        head: {
          fontWeight: 800,
          backgroundColor: mode === 'dark' ? '#0a1220' : '#f8fafc',
          color: mode === 'dark' ? '#00ff66' : '#334155',
          fontSize: '0.75rem',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.5px',
          borderBottom: mode === 'dark' ? '2px solid #00ff6644' : '1px solid #e2e8f0',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: mode === 'dark' ? 'rgba(0, 255, 102, 0.04) !important' : '#f8fafc !important',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: mode === 'dark' ? '#09111e' : '#ffffff',
            '& fieldset': {
              borderColor: mode === 'dark' ? '#1e293b' : '#cbd5e1',
            },
            '&:hover fieldset': {
              borderColor: mode === 'dark' ? '#00ff66' : '#1a237e',
            },
            '&.Mui-focused fieldset': {
              borderColor: mode === 'dark' ? '#00ff66' : '#1a237e',
            },
          },
        },
      },
    },
  },
});

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('taurus_theme_mode');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const toggleTheme = () => {
    setModeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('taurus_theme_mode', next);
      return next;
    });
  };

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem('taurus_theme_mode', newMode);
  };

  useEffect(() => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode]);

  const theme = createTheme(getDesignTokens(mode));

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, setMode }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
