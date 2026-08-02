import { createTheme, alpha } from '@mui/material/styles';

// A calmer, more professional palette than the previous rainbow gradient -
// indigo as the primary brand color with a teal accent for
// science/molecular highlights. Works for both light and dark mode.
export const BRAND = {
  primaryLight: '#4f46e5',
  primaryDark: '#818cf8',
  secondaryLight: '#0d9488',
  secondaryDark: '#2dd4bf',
};

export default function getAppTheme(mode) {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? BRAND.primaryDark : BRAND.primaryLight,
      },
      secondary: {
        main: isDark ? BRAND.secondaryDark : BRAND.secondaryLight,
      },
      background: {
        default: isDark ? '#0b1020' : '#f3f5fa',
        paper: isDark ? '#141b2d' : '#ffffff',
      },
      success: { main: isDark ? '#4ade80' : '#16a34a' },
      warning: { main: isDark ? '#fbbf24' : '#d97706' },
      error: { main: isDark ? '#f87171' : '#dc2626' },
      info: { main: isDark ? '#38bdf8' : '#0284c7' },
      text: {
        primary: isDark ? '#e8ecf6' : '#1a2033',
        secondary: isDark ? '#94a1c4' : '#5b6478',
      },
      divider: isDark ? alpha('#ffffff', 0.09) : alpha('#0b1020', 0.08),
    },
    shape: {
      borderRadius: 14,
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h3: { fontWeight: 800, letterSpacing: -0.5 },
      h4: { fontWeight: 800, letterSpacing: -0.5 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      subtitle1: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    shadows: Object.assign([], createTheme().shadows, {
      1: isDark
        ? '0 1px 2px rgba(0,0,0,0.4)'
        : '0 1px 2px rgba(20,24,45,0.06)',
    }),
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            transition: 'background-color 0.25s ease, color 0.25s ease',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 10, fontWeight: 600 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600 },
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'small',
        },
      },
    },
  });
}
