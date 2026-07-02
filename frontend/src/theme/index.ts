import { createTheme, type ThemeOptions } from '@mui/material/styles';

// ===================== 赛博朋克设计语言 =====================
// 主色调: Cyan #00D4FF -> Purple #7C3AED -> Magenta #FF006E
// 背景层次: #050507 (深底) -> #0A0C10 (纸面) -> #0F1117 (卡片)
// 发光: box-shadow 0 0 Npx rgba(0,212,255,α)
// 毛玻璃: backdrop-filter: blur(16px)

const NEON = {
  cyan: '#00D4FF',
  cyanDark: '#0099BB',
  purple: '#7C3AED',
  purpleLight: '#A78BFA',
  magenta: '#FF006E',
  green: '#00FF88',
  amber: '#FFB800',
  red: '#FF3366',
};

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
    primary: { main: NEON.cyan, light: '#33DDFF', dark: NEON.cyanDark },
    secondary: { main: NEON.purple, light: NEON.purpleLight, dark: '#6D28D9' },
    success: { main: NEON.green },
    warning: { main: NEON.amber },
    error: { main: NEON.red },
    info: { main: '#0EA5E9' },
    background: { default: '#050507', paper: '#0A0C10' },
    text: { primary: '#E8ECF0', secondary: '#94A0B0' },
    divider: 'rgba(0,212,255,0.08)',
    grey: {
      50: '#0A0C10', 100: '#0F1117', 200: '#151820', 300: '#1C1F2A',
      400: '#2A2E3A', 500: '#4A5060', 600: '#7A8494', 700: '#B0B8C4',
      800: '#D0D6DE', 900: '#E8ECF0',
    },
  },
  components: {
    ...baseTheme.components,
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(0,212,255,0.03) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(124,58,237,0.03) 0%, transparent 50%)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(0,212,255,0.1)',
          boxShadow: '0 0 20px rgba(0,212,255,0.03)',
          backgroundImage: 'none',
          backgroundColor: 'rgba(10,12,16,0.8)',
          backdropFilter: 'blur(8px)',
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            borderColor: 'rgba(0,212,255,0.2)',
            boxShadow: '0 0 30px rgba(0,212,255,0.06)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          textTransform: 'none' as const,
          transition: 'all 0.25s ease',
        },
        contained: {
          background: `linear-gradient(135deg, ${NEON.cyan}, ${NEON.purple})`,
          boxShadow: `0 0 20px rgba(0,212,255,0.2)`,
          color: '#fff',
          '&:hover': {
            background: `linear-gradient(135deg, #33DDFF, #9B5DE5)`,
            boxShadow: `0 0 30px rgba(0,212,255,0.35), 0 0 60px rgba(124,58,237,0.15)`,
          },
          '&.Mui-disabled': {
            background: 'rgba(255,255,255,0.08)',
            boxShadow: 'none',
          },
        },
        outlined: {
          borderColor: 'rgba(0,212,255,0.25)',
          color: NEON.cyan,
          '&:hover': {
            borderColor: NEON.cyan,
            backgroundColor: 'rgba(0,212,255,0.06)',
            boxShadow: `0 0 15px rgba(0,212,255,0.15)`,
          },
        },
        text: {
          color: '#B0B8C4',
          '&:hover': {
            backgroundColor: 'rgba(0,212,255,0.06)',
            color: NEON.cyan,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(20px)',
          backgroundColor: 'rgba(5,5,7,0.75)',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(0,212,255,0.08)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(0,212,255,0.08)',
          backgroundColor: '#050507',
          backgroundImage: 'linear-gradient(180deg, rgba(0,212,255,0.02) 0%, transparent 50%)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(0,212,255,0.06)',
        },
        head: {
          fontWeight: 600,
          fontSize: 11,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.08em',
          color: '#7A8494',
          backgroundColor: 'rgba(0,212,255,0.03)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0D0F14',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0,212,255,0.15)',
          boxShadow: '0 0 40px rgba(0,212,255,0.08), 0 25px 50px rgba(0,0,0,0.5)',
          backgroundImage: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          fontSize: 12,
        },
        outlined: {
          borderColor: 'rgba(0,212,255,0.2)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: 'rgba(15,17,23,0.8)',
          fontSize: 14,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0,212,255,0.18)',
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0,212,255,0.35)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: NEON.cyan,
            boxShadow: `0 0 12px rgba(0,212,255,0.2)`,
          },
          '& input, & textarea': {
            color: '#E8ECF0',
            fontSize: 14,
            '&::placeholder': {
              color: 'rgba(148,160,176,0.7)',
              opacity: 1,
            },
          },
          '& .MuiSelect-select': {
            color: '#E8ECF0',
            fontSize: 14,
          },
        },
        input: {
          padding: '10px 14px',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: 'rgba(200,210,220,0.65)',
          fontSize: 13,
          fontWeight: 500,
          '&.Mui-focused': {
            color: NEON.cyan,
          },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          fontSize: 11,
          color: 'rgba(148,160,176,0.6)',
          marginTop: 4,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: 'rgba(0,212,255,0.08)',
        },
        bar: {
          borderRadius: 4,
        },
      },
    },
    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(10,12,16,0.95)',
          border: '1px solid rgba(0,212,255,0.15)',
          backdropFilter: 'blur(8px)',
          fontSize: 12,
        },
        arrow: {
          color: 'rgba(10,12,16,0.95)',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(10,12,16,0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0,212,255,0.1)',
          backgroundImage: 'none',
        },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        root: {
          borderTop: '1px solid rgba(0,212,255,0.06)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 500,
          minHeight: 40,
          fontSize: 13,
          transition: 'all 0.25s ease',
          '&.Mui-selected': {
            color: NEON.cyan,
            textShadow: '0 0 8px rgba(0,212,255,0.3)',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          background: `linear-gradient(90deg, ${NEON.cyan}, ${NEON.purple})`,
          height: 2,
          borderRadius: 2,
          boxShadow: '0 0 8px rgba(0,212,255,0.4)',
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiInputLabel-root': {
            fontSize: 13,
            fontWeight: 500,
            color: 'rgba(200,210,220,0.65)',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: NEON.cyan,
          },
          '& .MuiInputLabel-root.MuiInputLabel-shrink': {
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.02em',
          },
        },
      },
    },
    MuiSelect: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          fontSize: 14,
        },
        icon: {
          color: 'rgba(200,210,220,0.5)',
        },
      },
    },
  },
});
