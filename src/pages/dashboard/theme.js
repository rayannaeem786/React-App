import { createTheme } from '@mui/material/styles';

const createMuiTheme = (tenant) => createTheme({
  palette: {
    primary: { main: tenant?.primary_color || '#1976d2' },
    secondary: { main: '#ff4081' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    text: { primary: '#1e293b', secondary: '#64748b' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h4: { fontWeight: 800, color: '#1e293b' },
    h5: { fontWeight: 700, color: '#1e293b' },
    h6: { fontWeight: 700, color: '#1e293b' },
    subtitle1: { color: '#64748b' },
    body2: { color: '#64748b', fontSize: '0.875rem' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          background: '#ffffff',
          transition: 'transform 0.3s ease-in-out',
          width: 280,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 12,
          margin: '0 4px',
          minHeight: 48,
          '&.Mui-selected': {
            color: tenant?.primary_color || '#1976d2',
          },
        },
      },
    },
  },
});

export default createMuiTheme;