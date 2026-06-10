import { createTheme, type ThemeOptions } from '@mui/material/styles';

const baseTheme: ThemeOptions = {
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    h1: { fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' },
    h3: { fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontSize: 16, fontWeight: 600 },
    h5: { fontSize: 14, fontWeight: 600 },
    h6: { fontSize: 13, fontWeight: 600 },
    body1: { fontSize: 14 },
    body2: { fontSize: 13 },
    caption: { fontSize: 12, fontWeight: 500 },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 500, textTransform: 'none' as const },
        contained: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 12, border: '1px solid', backgroundImage: 'none' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: '1px solid' },
        head: { fontWeight: 600, fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 500, fontSize: 12 },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { borderRight: 'none' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backdropFilter: 'blur(12px)', boxShadow: 'none' },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiSelect: {
      defaultProps: { size: 'small' },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none' as const, fontWeight: 500, minHeight: 40 },
      },
    },
    MuiTooltip: {
      defaultProps: { arrow: true },
    },
  },
};

export const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'light',
    primary: { main: '#2563EB', light: '#3B82F6', dark: '#1D4ED8' },
    secondary: { main: '#7C3AED' },
    success: { main: '#059669' },
    warning: { main: '#D97706' },
    error: { main: '#DC2626' },
    info: { main: '#0284C7' },
    background: { default: '#F8F9FA', paper: '#FFFFFF' },
    text: { primary: '#1A1D21', secondary: '#6B7280' },
    divider: '#E5E7EB',
    grey: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 400: '#9CA3AF', 500: '#6B7280', 600: '#4B5563', 700: '#374151', 800: '#1F2937', 900: '#111827' },
  },
  components: {
    ...baseTheme.components,
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 12, border: '1px solid #E5E7EB', boxShadow: 'none', backgroundImage: 'none' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backdropFilter: 'blur(12px)', backgroundColor: 'rgba(255,255,255,0.85)', boxShadow: 'none', borderBottom: '1px solid #E5E7EB' },
      },
    },
  },
});

export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: { main: '#3B82F6', light: '#60A5FA', dark: '#2563EB' },
    secondary: { main: '#8B5CF6' },
    success: { main: '#10B981' },
    warning: { main: '#F59E0B' },
    error: { main: '#EF4444' },
    info: { main: '#0EA5E9' },
    background: { default: '#0A0B0D', paper: '#111318' },
    text: { primary: '#F1F3F5', secondary: '#9CA3AF' },
    divider: '#2A2D35',
    grey: { 50: '#111318', 100: '#1A1D23', 200: '#22252D', 300: '#2A2D35', 400: '#3A3D45', 500: '#6B7280', 600: '#9CA3AF', 700: '#D1D5DB', 800: '#E5E7EB', 900: '#F3F4F6' },
  },
  components: {
    ...baseTheme.components,
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 12, border: '1px solid #2A2D35', boxShadow: 'none', backgroundImage: 'none', backgroundColor: '#111318' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backdropFilter: 'blur(12px)', backgroundColor: 'rgba(10,11,13,0.85)', boxShadow: 'none', borderBottom: '1px solid #2A2D35' },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { borderRight: 'none', backgroundColor: '#0A0B0D' },
      },
    },
  },
});
